/**
 * Physical Printer & Hardware Integration Service
 * Supports:
 * 1. Web Serial API (Direct USB / COM / RS-232 ESC/POS thermal receipt printers)
 * 2. Web Bluetooth API (Wireless 58mm / 80mm ESC/POS thermal printers)
 * 3. Web USB API
 * 4. System / Network Print Driver (Formatted 80mm, 58mm, A4, and ID Card layouts via browser/OS driver)
 */

import { School, Payment, Student, ReportCard, FeeStructure, UserProfile } from '../types';
import QRCode from 'qrcode';

export type PaperWidth = '80mm' | '58mm' | 'A4';

export interface PrinterConfig {
  connectionType: 'SYSTEM' | 'SERIAL' | 'BLUETOOTH' | 'USB';
  type?: 'SYSTEM' | 'SERIAL' | 'BLUETOOTH' | 'USB';
  paperWidth: PaperWidth;
  baudRate: number;
  autoCut: boolean;
  kickCashDrawer: boolean;
  openCashDrawer?: boolean;
  autoPrintOnSale: boolean;
  receiptHeader?: string;
  receiptFooter?: string;
  deviceName?: string;
  isConnected?: boolean;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface DailyAttendanceReportData {
  date: string;
  academicYear?: string;
  term?: string;
  totalEnrolled: number;
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
  totalExcused: number;
  attendanceRate: number;
  boysEnrolled?: number;
  boysPresent?: number;
  girlsEnrolled?: number;
  girlsPresent?: number;
  classSummaries: {
    classLevel: string;
    stream: string;
    enrolled: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
    rate: number;
    recordedBy?: string;
  }[];
  absenteeList: {
    admissionNumber: string;
    studentName: string;
    classLevel: string;
    stream: string;
    parentName?: string;
    parentPhone?: string;
    status: 'ABSENT' | 'LATE' | 'EXCUSED' | 'SICK';
    remarks?: string;
  }[];
  notes?: string;
}

export interface ThermalReceiptData {
  receiptNumber: string;
  date: string | Date;
  cashierName: string;
  customerName?: string;
  studentName?: string;
  admissionNumber?: string;
  classLevel?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  amountPaid?: number;
  previousBalance?: number;
  remainingBalance?: number;
  change?: number;
  paymentMethod: 'CASH' | 'MPESA' | 'BANK' | 'CARD' | 'CHEQUE' | 'BANK_TRANSFER';
  transactionReference?: string;
  notes?: string;
}

const STORAGE_KEY = 'school_erp_printer_config';

const DEFAULT_CONFIG: PrinterConfig = {
  connectionType: 'SYSTEM',
  paperWidth: '80mm',
  baudRate: 9600,
  autoCut: true,
  kickCashDrawer: true,
  autoPrintOnSale: true,
  receiptHeader: 'Nurturing Potential, Inspiring Excellence',
  receiptFooter: 'Thank you for supporting our learners! Education is the key to success.',
  isConnected: false,
};

// Raw ESC/POS Commands
const ESC = 0x1b;
const GS = 0x1d;

class PrinterService {
  private config: PrinterConfig = { ...DEFAULT_CONFIG };
  private serialPort: any = null;
  private serialWriter: any = null;
  private bluetoothDevice: any = null;
  private bluetoothCharacteristic: any = null;

  constructor() {
    this.loadConfig();
  }

  public getConfig(): PrinterConfig {
    const cfg = { ...this.config };
    cfg.type = cfg.connectionType;
    cfg.openCashDrawer = cfg.kickCashDrawer;
    return cfg;
  }

  public isSerialSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public isBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public updateConfig(updates: Partial<PrinterConfig>): PrinterConfig {
    if (updates.type && !updates.connectionType) {
      updates.connectionType = updates.type;
    }
    if (updates.openCashDrawer !== undefined && updates.kickCashDrawer === undefined) {
      updates.kickCashDrawer = updates.openCashDrawer;
    }
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    return this.getConfig();
  }

  private loadConfig(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Could not load printer config from storage:', e);
    }
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.warn('Could not save printer config to storage:', e);
    }
  }

  /**
   * Check browser hardware API capabilities
   */
  public getCapabilities() {
    return {
      hasSerial: typeof navigator !== 'undefined' && 'serial' in navigator,
      hasBluetooth: typeof navigator !== 'undefined' && 'bluetooth' in navigator,
      hasUSB: typeof navigator !== 'undefined' && 'usb' in navigator,
      hasWindowPrint: typeof window !== 'undefined' && typeof window.print === 'function',
    };
  }

  /**
   * Connect to Physical USB / Serial ESC/POS Printer via Web Serial API
   */
  public async connectSerial(baudRate?: number): Promise<{ success: boolean; deviceName: string; error?: string }> {
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Opera.');
    }

    try {
      // Request serial port from user
      // @ts-ignore
      const port = await (navigator as any).serial.requestPort();
      const rate = baudRate || this.config.baudRate || 9600;
      await port.open({ baudRate: rate });

      this.serialPort = port;
      const textEncoder = new TextEncoderStream();
      textEncoder.readable.pipeTo(port.writable);
      this.serialWriter = textEncoder.writable.getWriter();

      // Retrieve port info if available
      const info = port.getInfo?.() || {};
      const deviceName = `Serial Printer (USB Vendor: ${info.usbVendorId || 'Generic'}, Baud: ${rate})`;

      this.updateConfig({
        connectionType: 'SERIAL',
        deviceName,
        baudRate: rate,
        isConnected: true,
      });

      return { success: true, deviceName };
    } catch (err: any) {
      this.updateConfig({ isConnected: false });
      return { success: false, deviceName: '', error: err.message || 'Failed to connect to Serial printer' };
    }
  }

  /**
   * Connect to Physical Bluetooth ESC/POS Printer via Web Bluetooth API
   */
  public async connectBluetooth(): Promise<{ success: boolean; deviceName: string; error?: string }> {
    if (!('bluetooth' in navigator)) {
      throw new Error('Web Bluetooth API is not supported in this browser. Please use Chrome or Edge.');
    }

    try {
      // @ts-ignore
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', '49535343-fe7d-4ae5-8fa9-9fafd205e455'],
      });

      const server = await device.gatt.connect();
      this.bluetoothDevice = device;

      const deviceName = device.name || 'Bluetooth Thermal Printer';
      this.updateConfig({
        connectionType: 'BLUETOOTH',
        deviceName,
        isConnected: true,
      });

      return { success: true, deviceName };
    } catch (err: any) {
      this.updateConfig({ isConnected: false });
      return { success: false, deviceName: '', error: err.message || 'Failed to connect to Bluetooth printer' };
    }
  }

  /**
   * Disconnect physical hardware
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.serialWriter) {
        await this.serialWriter.close();
        this.serialWriter = null;
      }
      if (this.serialPort) {
        await this.serialPort.close();
        this.serialPort = null;
      }
      if (this.bluetoothDevice && this.bluetoothDevice.gatt.connected) {
        this.bluetoothDevice.gatt.disconnect();
        this.bluetoothDevice = null;
      }
    } catch (e) {
      console.warn('Error during disconnect:', e);
    } finally {
      this.updateConfig({ isConnected: false });
    }
  }

  /**
   * Send Raw ESC/POS bytes to connected hardware or fallback to window print
   */
  public async sendRawBytes(bytes: Uint8Array): Promise<boolean> {
    if (this.config.connectionType === 'SERIAL' && this.serialWriter) {
      try {
        await this.serialWriter.write(bytes);
        return true;
      } catch (err) {
        console.error('Failed to write raw bytes to serial port:', err);
      }
    }
    return false;
  }

  /**
   * Pulse Cash Drawer (Pin 2 / Pin 5 trigger)
   */
  public async kickCashDrawer(): Promise<boolean> {
    // ESC p m t1 t2
    const drawerCmd = new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xfa]);
    const sent = await this.sendRawBytes(drawerCmd);
    if (!sent) {
      console.log('Cash drawer pulse simulated (System print driver mode)');
    }
    return sent;
  }

  /**
   * Generate raw ESC/POS binary buffer for thermal receipt
   */
  public buildEscPosReceipt(data: ThermalReceiptData, school: School | null): Uint8Array {
    const commands: number[] = [];

    // Helper pushers
    const appendBytes = (...nums: number[]) => commands.push(...nums);
    const appendText = (str: string) => {
      for (let i = 0; i < str.length; i++) {
        commands.push(str.charCodeAt(i));
      }
    };
    const appendLine = (str: string = '') => {
      appendText(str + '\n');
    };

    const is58mm = this.config.paperWidth === '58mm';
    const charWidth = is58mm ? 32 : 42; // Standard font characters per line

    const padRow = (left: string, right: string) => {
      const remaining = charWidth - (left.length + right.length);
      if (remaining > 0) {
        return left + ' '.repeat(remaining) + right;
      }
      return left + ' ' + right;
    };

    const divider = '-'.repeat(charWidth);

    // 1. Initialize Printer (ESC @)
    appendBytes(ESC, 0x40);

    // 2. Center Align (ESC a 1)
    appendBytes(ESC, 0x61, 1);

    // 3. Double Height & Bold for School Name (ESC ! 0x30, ESC E 1)
    appendBytes(ESC, 0x21, 0x30);
    appendBytes(ESC, 0x45, 1);
    appendLine(school?.name || 'Gracia Learning Centre');

    // Reset font formatting (ESC ! 0, ESC E 0)
    appendBytes(ESC, 0x21, 0x00);
    appendBytes(ESC, 0x45, 0);

    if (school?.motto) {
      appendLine(school.motto);
    }
    if (school?.address) {
      appendLine(school.address);
    }
    if (school?.phone) {
      appendLine(`Tel: ${school.phone}`);
    }

    appendLine(divider);
    appendBytes(ESC, 0x45, 1);
    appendLine('OFFICIAL RECEIPT / POS SLIP');
    appendBytes(ESC, 0x45, 0);
    appendLine(divider);

    // Left Align (ESC a 0)
    appendBytes(ESC, 0x61, 0);

    appendLine(padRow('Receipt #:', data.receiptNumber));
    appendLine(padRow('Date & Time:', new Date(data.date).toLocaleString()));
    appendLine(padRow('Cashier:', data.cashierName));

    if (data.studentName) {
      appendLine(padRow('Student:', data.studentName));
    }
    if (data.admissionNumber) {
      appendLine(padRow('Adm No:', data.admissionNumber));
    }
    if (data.customerName && !data.studentName) {
      appendLine(padRow('Customer:', data.customerName));
    }
    if (data.classLevel) {
      appendLine(padRow('Class:', data.classLevel));
    }

    appendLine(divider);
    appendLine(padRow('Item Description', 'Amount'));
    appendLine(divider);

    data.items.forEach((item) => {
      const itemTitle = `${item.name} x${item.quantity}`;
      const itemPrice = `${school?.currencySymbol || 'KSh'} ${item.totalPrice.toLocaleString()}`;
      appendLine(padRow(itemTitle, itemPrice));
    });

    appendLine(divider);

    // Totals
    appendBytes(ESC, 0x45, 1);
    appendLine(padRow('TOTAL AMOUNT:', `${school?.currencySymbol || 'KSh'} ${data.total.toLocaleString()}`));
    appendBytes(ESC, 0x45, 0);

    appendLine(padRow('Payment Mode:', data.paymentMethod));
    if (data.transactionReference) {
      appendLine(padRow('Txn Ref / M-Pesa:', data.transactionReference));
    }
    if (data.previousBalance !== undefined) {
      appendLine(padRow('Previous Balance:', `${school?.currencySymbol || 'KSh'} ${data.previousBalance.toLocaleString()}`));
    }
    if (data.amountPaid !== undefined) {
      appendLine(padRow('Amount Paid:', `${school?.currencySymbol || 'KSh'} ${data.amountPaid.toLocaleString()}`));
    }
    if (data.remainingBalance !== undefined) {
      const balStr = data.remainingBalance === 0 ? 'KSh 0 (CLEARED)' : `${school?.currencySymbol || 'KSh'} ${data.remainingBalance.toLocaleString()}`;
      appendBytes(ESC, 0x45, 1);
      appendLine(padRow('NEW BALANCE DUE:', balStr));
      appendBytes(ESC, 0x45, 0);
    }
    if (data.change !== undefined) {
      appendLine(padRow('Change Given:', `${school?.currencySymbol || 'KSh'} ${data.change.toLocaleString()}`));
    }

    appendLine(divider);

    // Center Align for footer (ESC a 1)
    appendBytes(ESC, 0x61, 1);
    if (this.config.receiptFooter) {
      appendLine(this.config.receiptFooter);
    }
    appendLine('*** Thank You ***');

    // Feed lines & Cut paper (GS V 66 0)
    appendBytes(0x0a, 0x0a, 0x0a, 0x0a);
    if (this.config.autoCut) {
      appendBytes(GS, 0x56, 0x42, 0x00);
    }

    // Cash drawer kick if enabled & Cash payment
    if (this.config.kickCashDrawer && data.paymentMethod === 'CASH') {
      appendBytes(ESC, 0x70, 0x00, 0x19, 0xfa);
    }

    return new Uint8Array(commands);
  }

  /**
   * Primary Print Dispatcher for Thermal Receipt
   * If physical printer connected via Serial/Bluetooth, sends raw bytes;
   * otherwise opens an isolated, pixel-perfect printable thermal frame.
   */
  public async printThermalReceipt(data: ThermalReceiptData, school: School | null): Promise<boolean> {
    // 1. Try direct hardware if connected
    if (this.config.isConnected && this.serialWriter) {
      try {
        const bytes = this.buildEscPosReceipt(data, school);
        await this.serialWriter.write(bytes);
        return true;
      } catch (err) {
        console.warn('Direct serial print failed, falling back to browser driver:', err);
      }
    }

    // 2. Fallback: Browser System Print Driver with 80mm/58mm CSS
    this.printViaIframe(this.generateThermalReceiptHtml(data, school), this.config.paperWidth);
    return true;
  }

  /**
   * Print Official A4 Document (Fee Receipt, Invoice, CBC Report, Profile)
   */
  public printA4Document(htmlContent: string, documentTitle: string = 'Document'): void {
    this.printViaIframe(htmlContent, 'A4', documentTitle);
  }

  /**
   * Print Official Fee Receipt (Supports both A4 and Thermal 80mm)
   */
  public printFeeReceipt(payment: Payment, school: School | null, format?: '80mm' | '58mm' | 'A4'): void {
    const targetFormat = format || this.config.paperWidth;

    const prevBal = payment.previousBalance !== undefined
      ? payment.previousBalance
      : payment.remainingBalance !== undefined
      ? payment.remainingBalance + payment.amount
      : undefined;

    const remBal = payment.remainingBalance !== undefined
      ? payment.remainingBalance
      : payment.previousBalance !== undefined
      ? Math.max(0, payment.previousBalance - payment.amount)
      : undefined;

    if (targetFormat === '80mm' || targetFormat === '58mm') {
      const thermalData: ThermalReceiptData = {
        receiptNumber: payment.receiptNumber,
        date: payment.createdAt,
        cashierName: payment.cashierName || 'Bursar Office',
        studentName: payment.studentName,
        admissionNumber: payment.admissionNumber,
        classLevel: (payment as any).classLevel || '',
        customerName: payment.parentName,
        items: [
          {
            name: payment.notes || 'School Fee Installment',
            quantity: 1,
            unitPrice: payment.amount,
            totalPrice: payment.amount,
          },
        ],
        subtotal: payment.amount,
        total: payment.amount,
        amountPaid: payment.amount,
        previousBalance: prevBal,
        remainingBalance: remBal,
        paymentMethod: payment.paymentMethod,
        transactionReference: payment.transactionReference,
        notes: payment.notes,
      };
      this.printThermalReceipt(thermalData, school);
    } else {
      // A4 Official Format
      const html = this.generateA4FeeReceiptHtml(payment, school);
      this.printA4Document(html, `Receipt_${payment.receiptNumber}`);
    }
  }

  /**
   * Print CBC Assessment Report Card on A4
   */
  public printReportCard(reportCard: ReportCard, school: School | null): void {
    const html = this.generateReportCardHtml(reportCard, school);
    this.printA4Document(html, `CBC_Report_${reportCard.admissionNumber.replace(/\//g, '_')}`);
  }

  /**
   * Print Student ID Card / Lanyard Badge (Front & Back standard CR80)
   */
  public async printStudentIDCard(student: Student, school: School | null): Promise<void> {
    const html = await this.generateStudentIDCardHtml(student, school);
    this.printViaIframe(html, 'ID_CARD', `ID_Card_${student.admissionNumber.replace(/\//g, '_')}`);
  }

  /**
   * Print All Student ID Cards in a grid on A4 sheets (CR80 cards, scannable QR codes)
   */
  public async printAllStudentIDCards(students: Student[], school: School | null): Promise<void> {
    const schoolLogo = (school?.logoUrl && !school.logoUrl.includes('unsplash.com')) ? school.logoUrl : '/gracia_logo.svg';
    
    let cardsHtml = '';
    for (const student of students) {
      let qrCodeDataUrl = '';
      try {
        const qrPayload = JSON.stringify({
          type: 'STUDENT_ATTENDANCE',
          schoolId: school?.id || 'default',
          studentId: student.id,
          admissionNumber: student.admissionNumber,
          fullName: student.fullName,
          classLevel: `${student.currentClass} ${student.stream || ''}`.trim(),
        });
        qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 150,
          color: { dark: '#0f172a', light: '#ffffff' }
        });
      } catch (e) {
        console.error('Error generating ID card QR:', e);
      }

      const photoHtml = student.photoUrl
        ? `<img src="${student.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />`
        : `<span style="font-size: 7px; color: #94a3b8;">NO PHOTO</span>`;

      cardsHtml += `
        <div class="id-card">
          <div class="card-header">
            <div style="display: flex; align-items: center;">
              <img src="${schoolLogo}" class="school-logo" alt="Logo" />
              <div class="school-info">
                <div class="school-name">${school?.name || 'Gracia Learning Centre'}</div>
                <div class="school-sub">Official Learner Identity Card</div>
              </div>
            </div>
            <div class="badge-type">STUDENT</div>
          </div>

          <div class="card-body">
            <div class="photo-box">
              ${photoHtml}
            </div>
            <div class="info-list">
              <div class="name">${student.fullName}</div>
              <div><strong>Adm No:</strong> <span style="font-family: monospace; color: #60a5fa; font-weight: bold;">${student.admissionNumber}</span></div>
              <div><strong>Grade:</strong> ${student.currentClass} ${student.stream ? `• ${student.stream}` : ''}</div>
              <div><strong>Gender:</strong> ${student.gender || 'N/A'} | <strong>Blood:</strong> ${student.bloodGroup || 'O+'}</div>
              <div><strong>Emergency:</strong> ${student.parentPhone || student.emergencyPhone || school?.phone || '+254 722 000 000'}</div>
            </div>
          </div>

          <div class="card-footer">
            <div>
              <div style="font-weight: bold; color: #fff;">Valid: 2026 Academic Yr</div>
              <div style="font-size: 6.5px; color: #93c5fd;">Ministry of Education CBC</div>
            </div>
            <div class="qr-box">
              ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" alt="QR" />` : `<span style="font-size:6px; color:#000;">QR</span>`}
            </div>
          </div>
        </div>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Student ID Cards - Batch (${students.length})</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #fff; padding: 5mm; }
          .grid-container {
            display: grid;
            grid-template-columns: repeat(2, 85.6mm);
            gap: 8mm;
            justify-content: center;
            align-content: start;
          }
          .id-card {
            width: 85.6mm;
            height: 53.98mm;
            background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
            color: #fff;
            border-radius: 8px;
            overflow: hidden;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            border: 1.5px solid #3b82f6;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .card-header {
            padding: 6px 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid rgba(255,255,255,0.15);
          }
          .school-logo { width: 24px; height: 24px; object-fit: contain; background: #fff; border-radius: 3px; padding: 1px; }
          .school-info { display: flex; flex-direction: column; margin-left: 6px; }
          .school-name { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.2px; }
          .school-sub { font-size: 6px; color: #93c5fd; }
          .badge-type { background: #2563eb; color: #fff; font-size: 6.5px; font-weight: bold; padding: 2px 5px; border-radius: 3px; text-transform: uppercase; }
          
          .card-body {
            padding: 6px 10px;
            display: flex;
            gap: 8px;
            align-items: center;
          }
          .photo-box {
            width: 54px;
            height: 66px;
            background: #1e293b;
            border: 1.5px solid #60a5fa;
            border-radius: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 7px;
            color: #94a3b8;
            text-align: center;
            overflow: hidden;
            flex-shrink: 0;
          }
          .info-list { font-size: 8px; line-height: 1.3; color: #f8fafc; flex-grow: 1; }
          .info-list .name { font-size: 11px; font-weight: 900; color: #ffffff; margin-bottom: 2px; text-transform: uppercase; }
          
          .card-footer {
            background: rgba(0,0,0,0.2);
            padding: 4px 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 7px;
            color: #cbd5e1;
            border-top: 1px solid rgba(255,255,255,0.1);
          }
          .qr-box {
            width: 32px;
            height: 32px;
            background: #fff;
            padding: 2px;
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .qr-box img { width: 100%; height: 100%; object-fit: contain; }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 12px; font-size: 11px; font-weight: bold; color: #0f172a;">
          ${school?.name || 'Gracia Learning Centre'} — Batch Student ID Cards (${students.length} Cards)
        </div>
        <div class="grid-container">
          ${cardsHtml}
        </div>
      </body>
      </html>
    `;

    this.printViaIframe(html, 'A4', `Student_ID_Cards_Grid_${school?.code || 'School'}`);
  }

  /**
   * Print Official Institutional Fee Schedule on Clean Single-Page A4
   */
  public printFeeStructure(structure: FeeStructure, school: School | null): void {
    const html = this.generateFeeStructureHtml(structure, school);
    this.printA4Document(html, `Fee_Schedule_${structure.classLevel.replace(/\s+/g, '_')}_${structure.term.replace(/\s+/g, '_')}`);
  }

  /**
   * Print Complete Multi-Grade Master Fee Schedule (Playgroup to Grade 9)
   */
  public printMasterFeeSchedule(structures: FeeStructure[], school: School | null, academicYear: string = '2026'): void {
    const html = this.generateMasterFeeScheduleHtml(structures, school, academicYear);
    this.printA4Document(html, `Official_Fee_Schedule_${academicYear}_All_Grades`);
  }

  /**
   * Universal Helper: Print any target DOM element in a clean, isolated frame
   */
  public printTargetElement(elementId: string, documentTitle: string = 'Document'): void {
    const el = document.getElementById(elementId);
    if (!el) {
      window.print();
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${documentTitle}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; background: #fff; line-height: 1.5; font-size: 12px; }
          button, .no-print, nav, header { display: none !important; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; border: 1px solid #e2e8f0; }
          th { background: #f1f5f9; font-weight: bold; }
        </style>
      </head>
      <body>
        ${el.innerHTML}
      </body>
      </html>
    `;
    this.printViaIframe(html, 'A4', documentTitle);
  }

  /**
   * Run Test Print
   */
  public async runTestPrint(type: 'THERMAL_80' | 'THERMAL_58' | 'A4_RECEIPT' | 'A4_REPORT' | 'ID_CARD' | 'DRAWER', school: School | null): Promise<boolean> {
    if (type === 'DRAWER') {
      return this.kickCashDrawer();
    }

    if (type === 'THERMAL_80' || type === 'THERMAL_58') {
      const testData: ThermalReceiptData = {
        receiptNumber: `TEST-${Date.now().toString().slice(-6)}`,
        date: new Date(),
        cashierName: 'POS Cashier / Admin',
        studentName: 'Brian Mwangi Kamau',
        admissionNumber: 'GLCM/2026/001',
        classLevel: 'Grade 6 East',
        items: [
          { name: 'CBC Exercise Books (Set of 6)', quantity: 2, unitPrice: 450, totalPrice: 900 },
          { name: 'School Tie & Badge', quantity: 1, unitPrice: 750, totalPrice: 750 },
          { name: 'Healthy Canteen Fruit Salad', quantity: 1, unitPrice: 150, totalPrice: 150 },
        ],
        subtotal: 1800,
        total: 1800,
        amountPaid: 2000,
        change: 200,
        paymentMethod: 'MPESA',
        transactionReference: 'QK992819XA',
        notes: 'PHYSICAL PRINTER DIAGNOSTIC TEST OK',
      };
      return this.printThermalReceipt(testData, school);
    }

    if (type === 'A4_RECEIPT') {
      const testPayment: Payment = {
        id: 'test-pay-01',
        schoolId: school?.id || 'default',
        invoiceId: 'inv-test-01',
        receiptNumber: `REC-2026-${Date.now().toString().slice(-4)}`,
        studentId: 'std-01',
        studentName: 'Brian Mwangi Kamau',
        admissionNumber: 'GLCM/2026/001',
        parentName: 'Dr. Joseph Kamau Njoroge',
        parentPhone: '+254 722 345 678',
        amount: 47500,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'MPESA',
        transactionReference: 'QK991209AB',
        cashierId: 'usr-01',
        cashierName: 'Jane Wanjiku (Bursar)',
        notes: 'Term 1 2026 CBC Tuition & Activity Fee Clearance',
        createdAt: new Date().toISOString(),
      };
      this.printFeeReceipt(testPayment, school, 'A4');
      return true;
    }

    if (type === 'A4_REPORT') {
      const testReport: ReportCard = {
        id: 'test-rc-01',
        schoolId: school?.id || 'default',
        studentId: 'std-01',
        studentName: 'Brian Mwangi Kamau',
        admissionNumber: 'GLCM/2026/001',
        classLevel: 'Grade 6',
        stream: 'East',
        academicYear: school?.academicYear || '2026',
        term: school?.currentTerm || 'Term 1',
        attendanceDaysPresent: 64,
        attendanceTotalDays: 65,
        totalScore: 515,
        averagePercentage: 86,
        overallCBCRating: 'EE',
        classTeacherComment: 'Outstanding performance across STEM and Language competencies.',
        headTeacherComment: 'Promising young scholar. Keep up the high standards!',
        closingDateThisTerm: '2026-04-03',
        openingDateNextTerm: '2026-05-04',
        generatedAt: new Date().toISOString(),
        results: [
          { subjectName: 'Mathematics', score: 88, maxScore: 100, percentage: 88, grade: 'A', cbcRating: 'EE', teacherComment: 'Superb computational reasoning.' },
          { subjectName: 'English Language', score: 82, maxScore: 100, percentage: 82, grade: 'A', cbcRating: 'EE', teacherComment: 'Rich oral expression and composition.' },
          { subjectName: 'Kiswahili / KSL', score: 76, maxScore: 100, percentage: 76, grade: 'B+', cbcRating: 'ME', teacherComment: 'Ustadi mzuri wa lugha na sarufi.' },
          { subjectName: 'Integrated Science & Tech', score: 91, maxScore: 100, percentage: 91, grade: 'A', cbcRating: 'EE', teacherComment: 'Brilliant in coding and scientific experiments.' },
          { subjectName: 'Social Studies & Life Skills', score: 84, maxScore: 100, percentage: 84, grade: 'A', cbcRating: 'EE', teacherComment: 'Strong understanding of citizenship and heritage.' },
          { subjectName: 'Creative Arts & Physical Education', score: 94, maxScore: 100, percentage: 94, grade: 'A', cbcRating: 'EE', teacherComment: 'Exceptional artistic flair and teamwork.' },
        ],
      };
      this.printReportCard(testReport, school);
      return true;
    }

    if (type === 'ID_CARD') {
      const testStudent: Student = {
        id: 'std-01',
        schoolId: school?.id || 'default',
        admissionNumber: 'GLCM/2026/001',
        firstName: 'Brian',
        middleName: 'Mwangi',
        lastName: 'Kamau',
        fullName: 'Brian Mwangi Kamau',
        gender: 'MALE',
        dateOfBirth: '2014-04-12',
        nationality: 'Kenyan',
        admissionDate: '2026-01-05',
        currentClass: 'Grade 6',
        stream: 'East',
        status: 'ACTIVE',
        parentName: 'Dr. Joseph Kamau Njoroge',
        parentPhone: '+254 722 345 678',
        parentEmail: 'joseph.kamau@example.com',
        totalBalance: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.printStudentIDCard(testStudent, school);
      return true;
    }

    return false;
  }

  /**
   * HTML Template: Thermal 80mm / 58mm Receipt
   */
  private generateThermalReceiptHtml(data: ThermalReceiptData, school: School | null): string {
    const is58 = this.config.paperWidth === '58mm';
    const widthCss = is58 ? '58mm' : '80mm';
    const bodyWidth = is58 ? '48mm' : '72mm';

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const baseTag = origin ? `<base href="${origin}/">` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        ${baseTag}
        <title>Receipt ${data.receiptNumber}</title>
        <style>
          @page {
            size: ${widthCss} auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace, -apple-system, sans-serif;
            font-size: ${is58 ? '10px' : '12px'};
            line-height: 1.3;
            color: #000;
            background: #fff;
            width: ${bodyWidth};
            margin: 0 auto;
            padding: 8px 4px;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .title { font-size: ${is58 ? '13px' : '16px'}; font-weight: 900; text-transform: uppercase; margin-bottom: 2px; }
          .subtitle { font-size: ${is58 ? '9px' : '10px'}; margin-bottom: 4px; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .item-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: ${is58 ? '9.5px' : '11px'}; }
          .badge { display: inline-block; border: 1px solid #000; padding: 1px 4px; font-size: 9px; font-weight: bold; }
          .total-box { font-size: ${is58 ? '12px' : '14px'}; font-weight: 900; margin: 4px 0; }
          .footer { font-size: ${is58 ? '8.5px' : '10px'}; margin-top: 8px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div style="margin-bottom: 6px;">
            <img src="${(school?.logoUrl && !school.logoUrl.includes('unsplash.com')) ? school.logoUrl : '/gracia_logo.svg'}" alt="Logo" style="max-height: ${is58 ? '42px' : '56px'}; max-width: 80%; object-fit: contain;" />
          </div>
          <div class="title">${school?.name || 'Gracia Learning Centre'}</div>
          <div class="subtitle" style="font-weight: bold; color: #333;">${school?.motto || '— I can! I will! —'}</div>
          <div class="subtitle">${school?.address || 'Mariru Park, Kasarani Mwiki, Nairobi, Kenya'}</div>
          <div class="subtitle">Tel: ${school?.phone || '+254 722 000 123'}</div>
          <div class="divider"></div>
          <div class="badge">OFFICIAL RECEIPT / POS SLIP</div>
        </div>

        <div class="divider"></div>
        <div class="row"><span>Receipt #:</span><span class="font-bold">${data.receiptNumber}</span></div>
        <div class="row"><span>Date:</span><span>${new Date(data.date).toLocaleDateString()} ${new Date(data.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
        <div class="row"><span>Cashier:</span><span>${data.cashierName}</span></div>
        ${data.studentName ? `<div class="row"><span>Student:</span><span class="font-bold">${data.studentName}</span></div>` : ''}
        ${data.admissionNumber ? `<div class="row"><span>Adm No:</span><span>${data.admissionNumber}</span></div>` : ''}
        ${data.classLevel ? `<div class="row"><span>Class:</span><span>${data.classLevel}</span></div>` : ''}
        ${data.customerName && !data.studentName ? `<div class="row"><span>Customer:</span><span>${data.customerName}</span></div>` : ''}

        <div class="divider"></div>
        <div class="row font-bold"><span>Description</span><span>Amount</span></div>
        <div class="divider"></div>

        ${data.items
          .map(
            (i) => `
          <div class="item-row">
            <span>${i.name} (x${i.quantity})</span>
            <span class="font-bold">${school?.currencySymbol || 'KSh'} ${i.totalPrice.toLocaleString()}</span>
          </div>
        `
          )
          .join('')}

        <div class="divider"></div>
        <div class="row total-box">
          <span>AMOUNT PAID:</span>
          <span>${school?.currencySymbol || 'KSh'} ${data.total.toLocaleString()}</span>
        </div>
        <div class="row"><span>Payment Mode:</span><span class="font-bold">${data.paymentMethod}</span></div>
        ${data.transactionReference ? `<div class="row"><span>Reference:</span><span>${data.transactionReference}</span></div>` : ''}
        ${data.previousBalance !== undefined ? `<div class="row"><span>Previous Bal:</span><span>${school?.currencySymbol || 'KSh'} ${data.previousBalance.toLocaleString()}</span></div>` : ''}
        ${data.remainingBalance !== undefined ? `<div class="row font-bold" style="font-size: ${is58 ? '11px' : '13px'}; border-top: 1px dashed #000; padding-top: 3px; margin-top: 3px;"><span>BALANCE DUE:</span><span>${data.remainingBalance === 0 ? 'KSh 0 (CLEARED)' : `${school?.currencySymbol || 'KSh'} ${data.remainingBalance.toLocaleString()}`}</span></div>` : ''}
        ${data.change ? `<div class="row"><span>Change:</span><span>${school?.currencySymbol || 'KSh'} ${data.change.toLocaleString()}</span></div>` : ''}

        <div class="divider"></div>
        <div class="footer">
          <div>${this.config.receiptFooter || 'Thank you for your partnership in education.'}</div>
          <div style="margin-top: 4px; font-weight: bold;">*** System Verified ***</div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * HTML Template: Official A4 Fee Receipt
   */
  private generateA4FeeReceiptHtml(payment: Payment, school: School | null): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const baseTag = origin ? `<base href="${origin}/">` : '';

    const prevBalance = payment.previousBalance !== undefined
      ? payment.previousBalance
      : payment.remainingBalance !== undefined
      ? payment.remainingBalance + payment.amount
      : undefined;

    const remBalance = payment.remainingBalance !== undefined
      ? payment.remainingBalance
      : payment.previousBalance !== undefined
      ? Math.max(0, payment.previousBalance - payment.amount)
      : 0;

    const isCleared = remBalance === 0;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        ${baseTag}
        <title>Official Receipt - ${payment.receiptNumber}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; background: #fff; line-height: 1.5; font-size: 13px; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .school-name { font-size: 22px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: -0.5px; }
          .school-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
          .badge { display: inline-block; background: #0f172a; color: #fff; padding: 4px 12px; font-size: 12px; font-weight: bold; border-radius: 4px; text-transform: uppercase; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 14px 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
          .meta-item label { font-size: 10.5px; font-weight: 600; color: #64748b; text-transform: uppercase; display: block; }
          .meta-item span { font-size: 13.5px; font-weight: 700; color: #0f172a; }
          
          .ledger-container { border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; margin-bottom: 25px; }
          .ledger-header { background: #0f172a; color: #fff; padding: 8px 16px; font-size: 11px; font-weight: bold; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center; }
          .ledger-status-cleared { background: #15803d; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 10px; }
          .ledger-status-due { background: #b45309; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 10px; }
          
          .ledger-table { width: 100%; border-collapse: collapse; text-align: left; }
          .ledger-table th { background: #f1f5f9; padding: 10px 14px; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; }
          .ledger-table td { padding: 14px; border-bottom: 1px solid #e2e8f0; }
          
          .financial-cards { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 25px; }
          .f-card { padding: 12px 14px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .f-card-label { font-size: 10px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
          .f-card-val { font-size: 18px; font-weight: 900; font-family: monospace; }
          
          .footer-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 35px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
          .stamp-box { border: 2px dashed #94a3b8; width: 140px; height: 70px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8; font-weight: bold; text-align: center; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 16px;">
            <img src="${(school?.logoUrl && !school.logoUrl.includes('unsplash.com')) ? school.logoUrl : '/gracia_logo.svg'}" alt="School Crest" style="width: 76px; height: 76px; object-fit: contain; padding: 2px;" />
            <div>
              <div class="school-name">${school?.name || 'Gracia Learning Centre'}</div>
              <div class="school-sub" style="font-weight: bold; color: #ea580c;">${school?.motto || '— I can! I will! —'}</div>
              <div class="school-sub">${school?.address || 'Mariru Park, Kasarani Mwiki, Nairobi, Kenya'} • Tel: ${school?.phone || '+254 722 000 123'} • Email: ${school?.email || 'admissions@gracialearningcentre.ac.ke'}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div class="badge">OFFICIAL RECEIPT</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Original Copy (Bursar Dept)</div>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item"><label>Receipt Number</label><span>${payment.receiptNumber}</span></div>
          <div class="meta-item"><label>Payment Date & Time</label><span>${new Date(payment.createdAt).toLocaleString()}</span></div>
          <div class="meta-item"><label>Learner Name</label><span>${payment.studentName}</span></div>
          <div class="meta-item"><label>Admission Number</label><span>${payment.admissionNumber}</span></div>
          <div class="meta-item"><label>Paid By / Guardian</label><span>${payment.parentName || 'Parent / Guardian'} (${payment.parentPhone || 'N/A'})</span></div>
          <div class="meta-item"><label>Payment Mode</label><span>${payment.paymentMethod} ${payment.transactionReference ? `[Ref: ${payment.transactionReference}]` : ''}</span></div>
        </div>

        <!-- Financial Summary Cards -->
        <div class="financial-cards">
          <div class="f-card" style="background: #f8fafc; border-color: #cbd5e1;">
            <div class="f-card-label" style="color: #64748b;">Previous Balance</div>
            <div class="f-card-val" style="color: #334155;">
              ${prevBalance !== undefined ? `${school?.currencySymbol || 'KSh'} ${prevBalance.toLocaleString()}` : '-'}
            </div>
            <span style="font-size: 10px; color: #94a3b8;">Prior to this transaction</span>
          </div>
          
          <div class="f-card" style="background: #ecfdf5; border-color: #a7f3d0;">
            <div class="f-card-label" style="color: #065f46;">Amount Paid (Received)</div>
            <div class="f-card-val" style="color: #047857;">
              ${school?.currencySymbol || 'KSh'} ${payment.amount.toLocaleString()}
            </div>
            <span style="font-size: 10px; color: #059669;">Credited to Student Account</span>
          </div>

          <div class="f-card" style="background: ${isCleared ? '#f0fdf4' : '#fffbeb'}; border-color: ${isCleared ? '#86efac' : '#fde68a'};">
            <div class="f-card-label" style="color: ${isCleared ? '#15803d' : '#92400e'};">Remaining Balance Due</div>
            <div class="f-card-val" style="color: ${isCleared ? '#166534' : '#b45309'};">
              ${isCleared ? 'KSh 0.00 (NIL)' : `${school?.currencySymbol || 'KSh'} ${remBalance.toLocaleString()}`}
            </div>
            <span style="font-size: 10px; color: ${isCleared ? '#15803d' : '#b45309'}; font-weight: bold;">
              ${isCleared ? '✓ Account Fully Cleared' : 'Outstanding Balance Pending'}
            </span>
          </div>
        </div>

        <!-- Fee Ledger Details -->
        <div class="ledger-container">
          <div class="ledger-header">
            <span>Transaction & Fee Allocation Breakdown</span>
            <span class="${isCleared ? 'ledger-status-cleared' : 'ledger-status-due'}">
              ${isCleared ? 'NIL BALANCE / FULLY CLEARED' : 'PENDING BALANCE'}
            </span>
          </div>
          <table class="ledger-table">
            <thead>
              <tr>
                <th>Description / Purpose</th>
                <th style="text-align: right;">Total Amount</th>
                <th style="text-align: right;">Amount Paid</th>
                <th style="text-align: right;">Net Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong style="color: #0f172a; display: block;">${payment.notes || 'School Fee Installment & CBC Learning Program'}</strong>
                  <span style="font-size: 11px; color: #64748b;">Ref: ${payment.transactionReference || 'Direct'} • Mode: ${payment.paymentMethod}</span>
                </td>
                <td style="text-align: right; font-family: monospace; font-size: 13px; font-weight: 600; color: #475569;">
                  ${prevBalance !== undefined ? `${school?.currencySymbol || 'KSh'} ${prevBalance.toLocaleString()}` : `${school?.currencySymbol || 'KSh'} ${payment.amount.toLocaleString()}`}
                </td>
                <td style="text-align: right; font-family: monospace; font-size: 14px; font-weight: bold; color: #047857; background: #f0fdf4;">
                  ${school?.currencySymbol || 'KSh'} ${payment.amount.toLocaleString()}
                </td>
                <td style="text-align: right; font-family: monospace; font-size: 14px; font-weight: bold; ${isCleared ? 'color: #15803d;' : 'color: #b45309;'}">
                  ${isCleared ? 'KSh 0.00' : `${school?.currencySymbol || 'KSh'} ${remBalance.toLocaleString()}`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="footer-section">
          <div>
            <div style="font-weight: 600;">Served by Cashier / Bursar: <span style="font-weight: 400;">${payment.cashierName || 'Bursar'}</span></div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">This is an electronically generated official receipt verified by Primary School ERP.</div>
          </div>
          <div style="text-align: center;">
            <div class="stamp-box">Authorized Bursar Stamp & Signature</div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * HTML Template: CBC Learner Assessment Report Card (A4)
   */
  private generateReportCardHtml(reportCard: ReportCard, school: School | null): string {
    const results = reportCard.results || [];
    const totalScore = results.reduce((s, r) => s + r.score, 0);
    const avgPct = reportCard.averagePercentage || Math.round(totalScore / (results.length || 1));

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>CBC Report - ${reportCard.studentName}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; background: #fff; line-height: 1.4; font-size: 12px; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
          .school-title { font-size: 20px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
          .school-meta { font-size: 11px; color: #475569; }
          .cbc-tag { background: #0f172a; color: #fff; padding: 4px 10px; font-size: 11px; font-weight: bold; border-radius: 4px; }
          .student-box { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 10px; background: #f8fafc; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 15px; font-size: 11.5px; }
          .student-box label { font-size: 9.5px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block; }
          .student-box span { font-weight: bold; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11.5px; }
          th { background: #0f172a; color: #fff; text-align: left; padding: 8px; font-weight: bold; }
          td { border: 1px solid #e2e8f0; padding: 7px 8px; }
          tr:nth-child(even) { background: #f8fafc; }
          .rating-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; }
          .rating-EE { background: #dcfce7; color: #166534; }
          .rating-ME { background: #e0f2fe; color: #0369a1; }
          .rating-AE { background: #fef3c7; color: #92400e; }
          .rating-BE { background: #fee2e2; color: #991b1b; }
          .remarks-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
          .remark-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background: #fff; }
          .remark-title { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
          .footer-box { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #cbd5e1; padding-top: 15px; }
          .seal-box { border: 2px dashed #94a3b8; width: 130px; height: 60px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 9.5px; color: #94a3b8; font-weight: bold; text-align: center; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="${(school?.logoUrl && !school.logoUrl.includes('unsplash.com')) ? school.logoUrl : '/gracia_logo.svg'}" alt="School Crest" style="width: 65px; height: 65px; object-fit: contain; padding: 2px;" />
            <div>
              <div class="school-title">${school?.name || 'Gracia Learning Centre'}</div>
              <div class="school-meta" style="font-weight: bold; color: #ea580c;">${school?.motto || '— I can! I will! —'}</div>
              <div class="school-meta">${school?.address || 'Mariru Park, Kasarani Mwiki, Nairobi, Kenya'} • Tel: ${school?.phone || '+254 722 000 123'} • Email: ${school?.email || 'admissions@gracialearningcentre.ac.ke'}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div class="cbc-tag">KENYA CBC PROGRESS REPORT</div>
            <div style="font-weight: bold; margin-top: 4px; font-size: 12px;">${reportCard.academicYear} • ${reportCard.term}</div>
          </div>
        </div>

        <div class="student-box">
          <div><label>Learner Name</label><span>${reportCard.studentName}</span></div>
          <div><label>Admission No</label><span>${reportCard.admissionNumber}</span></div>
          <div><label>Grade & Stream</label><span>${reportCard.classLevel} - ${reportCard.stream}</span></div>
          <div><label>Attendance</label><span>${reportCard.attendanceDaysPresent} / ${reportCard.attendanceTotalDays} Days</span></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30%;">Learning Area / Subject</th>
              <th style="width: 12%; text-align: center;">Score</th>
              <th style="width: 10%; text-align: center;">Grade</th>
              <th style="width: 18%; text-align: center;">CBC Rubric</th>
              <th style="width: 30%;">Facilitator Comments</th>
            </tr>
          </thead>
          <tbody>
            ${results
              .map(
                (r) => `
              <tr>
                <td style="font-weight: 600;">${r.subjectName}</td>
                <td style="text-align: center; font-family: monospace; font-weight: bold;">${r.score} / ${r.maxScore}</td>
                <td style="text-align: center; font-weight: bold;">${r.grade}</td>
                <td style="text-align: center;"><span class="rating-badge rating-${r.cbcRating}">${r.cbcRating}</span></td>
                <td style="font-size: 11px; color: #334155;">${r.teacherComment || 'Mastered core competencies.'}</td>
              </tr>
            `
              )
              .join('')}
            <tr style="background: #f1f5f9; font-weight: bold;">
              <td>SUMMARY / AVERAGE</td>
              <td style="text-align: center; font-family: monospace;">${avgPct}%</td>
              <td style="text-align: center;">${avgPct >= 80 ? 'A' : avgPct >= 65 ? 'B' : 'C'}</td>
              <td style="text-align: center;">${avgPct >= 80 ? 'EE' : avgPct >= 60 ? 'ME' : 'AE'}</td>
              <td style="font-size: 10.5px; color: #065f46;">Overall Grade Mastery: ${reportCard.overallCBCRating || 'EE'}</td>
            </tr>
          </tbody>
        </table>

        <div class="remarks-grid">
          <div class="remark-card">
            <div class="remark-title">Class Facilitator's Remarks</div>
            <div style="font-size: 11.5px; color: #1e293b;">${reportCard.classTeacherComment || 'Good progress shown this term.'}</div>
          </div>
          <div class="remark-card">
            <div class="remark-title">Head Teacher / Principal's Remarks</div>
            <div style="font-size: 11.5px; color: #1e293b;">${reportCard.headTeacherComment || 'Excellent attitude and academic dedication.'}</div>
          </div>
        </div>

        <div class="footer-box">
          <div>
            <div style="font-size: 11px; color: #475569;">Next Term Opening Date: <strong style="color: #0f172a;">${reportCard.openingDateNextTerm || 'May 2026'}</strong></div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Competency-Based Curriculum Assessment Framework • MoE / KNEC Standards</div>
          </div>
          <div class="seal-box">
            Official School Stamp & Seal
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * HTML Template: Student ID Card (Standard CR80 85.6mm x 53.98mm)
   */
  private async generateStudentIDCardHtml(student: Student, school: School | null): Promise<string> {
    const schoolLogo = (school?.logoUrl && !school.logoUrl.includes('unsplash.com')) ? school.logoUrl : '/gracia_logo.svg';
    let qrCodeDataUrl = '';
    try {
      const qrPayload = JSON.stringify({
        type: 'STUDENT_ATTENDANCE',
        schoolId: school?.id || 'default',
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        fullName: student.fullName,
        classLevel: `${student.currentClass} ${student.stream || ''}`.trim(),
      });
      qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 150,
        color: { dark: '#0f172a', light: '#ffffff' }
      });
    } catch (e) {
      console.error('Error generating ID card QR:', e);
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Student ID - ${student.admissionNumber}</title>
        <style>
          @page { size: auto; margin: 5mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #fff; padding: 10px; display: flex; flex-direction: column; gap: 15px; align-items: center; }
          .card-container { display: flex; gap: 15px; flex-wrap: wrap; justify-content: center; page-break-inside: avoid; }
          .id-card {
            width: 85.6mm;
            height: 53.98mm;
            background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
            color: #fff;
            border-radius: 10px;
            overflow: hidden;
            position: relative;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            border: 1.5px solid #3b82f6;
          }
          .card-back {
            background: #ffffff;
            color: #0f172a;
            border: 1.5px solid #cbd5e1;
          }
          .card-header {
            padding: 8px 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid rgba(255,255,255,0.15);
          }
          .card-back .card-header {
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            color: #0f172a;
          }
          .school-logo { width: 28px; height: 28px; object-fit: contain; background: #fff; border-radius: 4px; padding: 2px; }
          .school-info { display: flex; flex-direction: column; margin-left: 8px; }
          .school-name { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.2px; }
          .school-sub { font-size: 6.5px; color: #93c5fd; }
          .card-back .school-sub { color: #64748b; }
          .badge-type { background: #2563eb; color: #fff; font-size: 7px; font-weight: bold; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
          
          .card-body {
            padding: 8px 12px;
            display: flex;
            gap: 10px;
            align-items: center;
          }
          .photo-box {
            width: 62px;
            height: 74px;
            background: #1e293b;
            border: 2px solid #60a5fa;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            color: #94a3b8;
            text-align: center;
            overflow: hidden;
            flex-shrink: 0;
          }
          .info-list { font-size: 8.5px; line-height: 1.35; color: #f8fafc; flex-grow: 1; }
          .card-back .info-list { color: #334155; }
          .info-list .name { font-size: 11.5px; font-weight: 900; color: #ffffff; margin-bottom: 2px; text-transform: uppercase; }
          .card-back .info-list .name { color: #0f172a; }
          
          .card-footer {
            background: rgba(0,0,0,0.2);
            padding: 5px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 7.5px;
            color: #cbd5e1;
            border-top: 1px solid rgba(255,255,255,0.1);
          }
          .card-back .card-footer {
            background: #f8fafc;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
          }
          .qr-box {
            width: 38px;
            height: 38px;
            background: #fff;
            padding: 2px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .qr-box img { width: 100%; height: 100%; object-fit: contain; }
        </style>
      </head>
      <body>
        <div class="card-container">
          <!-- FRONT SIDE -->
          <div class="id-card">
            <div class="card-header">
              <div style="display: flex; align-items: center;">
                <img src="${schoolLogo}" class="school-logo" alt="Logo" />
                <div class="school-info">
                  <div class="school-name">${school?.name || 'Gracia Learning Centre'}</div>
                  <div class="school-sub">Official Learner Identity Card</div>
                </div>
              </div>
              <div class="badge-type">STUDENT</div>
            </div>

            <div class="card-body">
              <div class="photo-box">
                ${
                  student.photoUrl
                    ? `<img src="${student.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />`
                    : `<span style="font-size: 7px; color: #94a3b8;">NO PHOTO</span>`
                }
              </div>
              <div class="info-list">
                <div class="name">${student.fullName}</div>
                <div><strong>Adm No:</strong> <span style="font-family: monospace; color: #60a5fa; font-weight: bold;">${student.admissionNumber}</span></div>
                <div><strong>Grade:</strong> ${student.currentClass} ${student.stream ? `• ${student.stream}` : ''}</div>
                <div><strong>Gender:</strong> ${student.gender || 'N/A'} | <strong>Blood:</strong> ${student.bloodGroup || 'O+'}</div>
                <div><strong>Emergency:</strong> ${student.parentPhone || student.emergencyPhone || school?.phone || '+254 722 000 000'}</div>
              </div>
            </div>

            <div class="card-footer">
              <div>
                <div style="font-weight: bold; color: #fff;">Valid: 2026 Academic Yr</div>
                <div style="font-size: 6.5px; color: #93c5fd;">Ministry of Education CBC</div>
              </div>
              <div class="qr-box">
                ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" alt="QR" />` : `<span style="font-size:6px; color:#000;">QR</span>`}
              </div>
            </div>
          </div>

          <!-- BACK SIDE -->
          <div class="id-card card-back">
            <div class="card-header">
              <div style="display: flex; align-items: center;">
                <img src="${schoolLogo}" class="school-logo" style="border: 1px solid #e2e8f0;" alt="Logo" />
                <div class="school-info">
                  <div class="school-name" style="color: #0f172a;">Terms & Conditions</div>
                  <div class="school-sub">Emergency & Administration</div>
                </div>
              </div>
              <div style="font-size: 7px; font-weight: bold; color: #2563eb;">CR80 SECURE</div>
            </div>

            <div style="padding: 8px 12px; font-size: 7.5px; color: #334155; line-height: 1.4;">
              <p>1. This card is the property of <strong>${school?.name || 'Gracia Learning Centre'}</strong>. If found, please return to the administration.</p>
              <p style="margin-top: 3px;">2. This ID card grants access to school premises, library, transport, and digital attendance gates.</p>
              <p style="margin-top: 3px;">3. <strong>School Helpline:</strong> ${school?.phone || '+254 722 000 000'}</p>
              <p>4. <strong>Email:</strong> ${school?.email || 'admin@school.ac.ke'}</p>
            </div>

            <div class="card-footer">
              <div>
                <span style="font-weight: bold; color: #0f172a;">Authorized Signature</span>
                <div style="font-size: 6.5px; color: #64748b;">Principal / Headteacher</div>
              </div>
              <div style="text-align: right;">
                <span style="font-weight: bold; color: #1e3a8a; font-family: monospace;">CBC-ID-2026</span>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * HTML Template: Official Institutional Fee Schedule (A4 single page)
   */
  private generateFeeStructureHtml(structure: FeeStructure, school: School | null): string {
    const items = structure.items || [];
    const total = structure.totalAmount || items.reduce((sum, it) => sum + (it.amount || 0), 0);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Official Fee Schedule - ${structure.classLevel} (${structure.term} ${structure.academicYear})</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; background: #fff; line-height: 1.5; font-size: 13px; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; }
          .school-title { font-size: 22px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: -0.5px; }
          .school-sub { font-size: 11px; color: #475569; margin-top: 2px; }
          .badge { display: inline-block; background: #0f172a; color: #fff; padding: 5px 12px; font-size: 12px; font-weight: bold; border-radius: 4px; text-transform: uppercase; }
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .meta-class { font-size: 15px; font-weight: 800; color: #0f172a; }
          .meta-curr { font-size: 12px; color: #64748b; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 13px; }
          th { background: #0f172a; color: #fff; text-align: left; padding: 10px 14px; font-weight: bold; }
          td { border: 1px solid #e2e8f0; padding: 10px 14px; }
          tr:nth-child(even) { background: #f8fafc; }
          .total-row { background: #eff6ff !important; font-weight: 900; color: #1e3a8a; font-size: 14px; }
          .payment-channels { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; margin-bottom: 25px; }
          .channel-title { font-size: 12px; font-weight: bold; color: #0f172a; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
          .channels-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .channel-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
          .channel-name { font-size: 11px; font-weight: 800; color: #065f46; text-transform: uppercase; margin-bottom: 4px; }
          .channel-detail { font-size: 11.5px; color: #334155; }
          .footer-box { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #cbd5e1; padding-top: 18px; margin-top: 15px; }
          .stamp-box { border: 2px dashed #94a3b8; width: 140px; height: 65px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8; font-weight: bold; text-align: center; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="${(school?.logoUrl && !school.logoUrl.includes('unsplash.com')) ? school.logoUrl : '/gracia_logo.svg'}" alt="School Crest" style="width: 65px; height: 65px; object-fit: contain; padding: 2px;" />
            <div>
              <div class="school-title">${school?.name || 'Gracia Learning Centre'}</div>
              <div class="school-sub" style="font-weight: bold; color: #ea580c;">${school?.motto || '— I can! I will! —'}</div>
              <div class="school-sub">${school?.address || 'Mariru Park, Kasarani Mwiki, Nairobi, Kenya'} • Tel: ${school?.phone || '+254 722 000 123'} • Email: ${school?.email || 'admissions@gracialearningcentre.ac.ke'}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div class="badge">${structure.term} ${structure.academicYear}</div>
            <div style="font-size: 10.5px; color: #64748b; margin-top: 4px;">Institutional Fee Schedule</div>
          </div>
        </div>

        <div class="meta-box">
          <div class="meta-class">Target Class: <strong>${structure.classLevel}</strong></div>
          <div class="meta-curr">Curriculum: Kenya CBC 2-6-3-3-3</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 70%;">Fee Vote Head Description</th>
              <th style="width: 30%; text-align: right;">Amount (${school?.currencySymbol || 'KSh'})</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item) => `
              <tr>
                <td style="font-weight: 500;">${item.name}</td>
                <td style="text-align: right; font-family: monospace; font-weight: bold;">${(item.amount || 0).toLocaleString()}</td>
              </tr>
            `
              )
              .join('')}
            <tr class="total-row">
              <td>TOTAL TERMLY FEE</td>
              <td style="text-align: right; font-family: monospace;">${school?.currencySymbol || 'KSh'} ${total.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div class="payment-channels">
          <div class="channel-title">Official School Payment Channels</div>
          <div class="channels-grid">
            <div class="channel-card">
              <div class="channel-name" style="color: #065f46;">M-PESA PAYBILL</div>
              <div class="channel-detail">Business No: <strong>522522</strong></div>
              <div class="channel-detail">Account No: <strong>[Learner Admission Number]</strong></div>
            </div>
            <div class="channel-card">
              <div class="channel-name" style="color: #1e3a8a;">EQUITY BANK ACCOUNT</div>
              <div class="channel-detail">Account Name: <strong>${school?.name || 'Gracia Learning Centre'}</strong></div>
              <div class="channel-detail">Account No: <strong>${school?.paymentSettings?.bankAccountNumber || '0180293847192'}</strong></div>
            </div>
          </div>
        </div>

        <div class="footer-box">
          <div>
            <div style="font-size: 11px; color: #475569;">Issued by: <strong>Bursar / Accounts Office</strong></div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 3px;">Payment slips & M-Pesa codes must be submitted to the accounts office for official receipting.</div>
          </div>
          <div class="stamp-box">
            Official School Stamp & Seal
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * HTML Template: Master Institutional Fee Schedule (All Grades)
   */
  private generateMasterFeeScheduleHtml(structures: FeeStructure[], school: School | null, academicYear: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const baseTag = origin ? `<base href="${origin}/">` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        ${baseTag}
        <title>Official Fee Schedule - Academic Year ${academicYear}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; background: #fff; line-height: 1.4; font-size: 11.5px; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }
          .school-title { font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: -0.5px; }
          .school-sub { font-size: 10.5px; color: #475569; margin-top: 2px; }
          .badge { display: inline-block; background: #0f172a; color: #fff; padding: 4px 10px; font-size: 11px; font-weight: bold; border-radius: 4px; text-transform: uppercase; }
          
          .lead-notice { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 14px; font-size: 11px; color: #334155; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
          th { background: #0f172a; color: #fff; text-align: left; padding: 7px 9px; font-weight: 700; }
          td { border: 1px solid #e2e8f0; padding: 7px 9px; }
          tr:nth-child(even) { background: #f8fafc; }
          
          .category-header { background: #e2e8f0; font-weight: 800; color: #1e293b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          
          .ancillary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
          .ancillary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; }
          .ancillary-title { font-size: 11px; font-weight: bold; color: #0f172a; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; }
          
          .payment-channels { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; margin-bottom: 14px; }
          .channel-title { font-size: 11px; font-weight: bold; color: #0f172a; margin-bottom: 6px; }
          .channels-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .channel-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px 10px; }
          .channel-name { font-size: 10px; font-weight: 800; color: #065f46; text-transform: uppercase; margin-bottom: 2px; }
          
          .footer-box { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #cbd5e1; padding-top: 10px; margin-top: 10px; }
          .stamp-box { border: 2px dashed #94a3b8; width: 130px; height: 55px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 9.5px; color: #94a3b8; font-weight: bold; text-align: center; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${(school?.logoUrl && !school.logoUrl.includes('unsplash.com')) ? school.logoUrl : '/gracia_logo.svg'}" alt="School Crest" style="width: 55px; height: 55px; object-fit: contain; padding: 2px;" />
            <div>
              <div class="school-title">${school?.name || 'Gracia Learning Centre'}</div>
              <div class="school-sub" style="font-weight: bold; color: #ea580c;">${school?.motto || '— I can! I will! —'}</div>
              <div class="school-sub">${school?.address || 'Mariru Park, Kasarani Mwiki, Nairobi, Kenya'} • Tel: ${school?.phone || '+254 722 000 123'}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div class="badge">ACADEMIC YEAR ${academicYear}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 3px;">Full Official CBC Fee Structure</div>
          </div>
        </div>

        <div class="lead-notice">
          <strong>Official Kenyan Competency-Based Curriculum (CBC) Fee Schedule:</strong> All figures below represent exact termly fees covering full tuition, continuous assessment portfolios, nutritious midday meals, coding lab, and co-curricular programs.
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 18%;">Class Level</th>
              <th style="width: 14%;">Curriculum Tier</th>
              <th style="width: 48%;">Itemized Term Inclusions</th>
              <th style="width: 20%; text-align: right;">Term Fee (${school?.currencySymbol || 'KSh'})</th>
            </tr>
          </thead>
          <tbody>
            ${structures
              .map(
                (fs) => `
              <tr>
                <td style="font-weight: 800; color: #0f172a;">${fs.classLevel}</td>
                <td style="color: #475569; font-size: 10.5px;">
                  ${['Playgroup', 'PP1', 'PP2'].includes(fs.classLevel)
                    ? 'Early Years (EYE)'
                    : ['Grade 1', 'Grade 2', 'Grade 3'].includes(fs.classLevel)
                    ? 'Lower Primary'
                    : ['Grade 4', 'Grade 5', 'Grade 6'].includes(fs.classLevel)
                    ? 'Upper Primary (KPSEA)'
                    : 'Junior School (KJSEA)'}
                </td>
                <td style="font-size: 10.5px; color: #334155;">
                  ${fs.items.map((i) => `${i.name} (KSh ${i.amount.toLocaleString()})`).join(' • ')}
                </td>
                <td style="text-align: right; font-family: monospace; font-weight: 800; color: #0f172a; font-size: 12px;">
                  ${school?.currencySymbol || 'KSh'} ${fs.totalAmount.toLocaleString()}
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="ancillary-grid">
          <div class="ancillary-card">
            <div class="ancillary-title">One-Time & Ancillary Fees</div>
            <div style="font-size: 10.5px; color: #475569; line-height: 1.5;">
              <div>• <strong>New Student Admission & Registration:</strong> KSh 3,000 (one-off)</div>
              <div>• <strong>Full School Uniform Package:</strong> KSh 6,500 (2 sets, jacket, sportswear)</div>
              <div>• <strong>KPSEA / KJSEA KNEC Candidate Registration:</strong> Free (Fully MoE Subsidized)</div>
            </div>
          </div>
          <div class="ancillary-card">
            <div class="ancillary-title">Optional Door-to-Door School Transport</div>
            <div style="font-size: 10.5px; color: #475569; line-height: 1.5;">
              <div>• <strong>Zone 1 (Immediate / Kasarani / Clay City):</strong> KSh 13,500 / term</div>
              <div>• <strong>Zone 2 (Mwiki / Hunters / Roysambu / Mirema):</strong> KSh 17,400 / term</div>
              <div>• <strong>Zone 3 (Kahawa West / Zimmerman / Thome):</strong> KSh 21,600 / term</div>
            </div>
          </div>
        </div>

        <div class="payment-channels">
          <div class="channel-title">Authorized Institutional Payment Channels</div>
          <div class="channels-grid">
            <div class="channel-card">
              <div class="channel-name">LIPA NA M-PESA PAYBILL</div>
              <div style="font-size: 10.5px;">Business No: <strong>522522</strong></div>
              <div style="font-size: 10.5px;">Account No: <strong>[Student Admission Number]</strong></div>
            </div>
            <div class="channel-card">
              <div class="channel-name" style="color: #1e3a8a;">EQUITY BANK DIRECT DEPOSIT</div>
              <div style="font-size: 10.5px;">Account Name: <strong>${school?.name || 'Gracia Learning Centre'}</strong></div>
              <div style="font-size: 10.5px;">Account No: <strong>${school?.paymentSettings?.bankAccountNumber || '0180293847192'}</strong> • Nyahururu Branch</div>
            </div>
          </div>
        </div>

        <div class="footer-box">
          <div>
            <div style="font-size: 10.5px; color: #475569;">Bursar & Finance Office • ${school?.name || 'Gracia Learning Centre'}</div>
            <div style="font-size: 9.5px; color: #94a3b8; margin-top: 2px;">Fees are payable on or before the first day of each term. Flexible 3-month installments available upon request.</div>
          </div>
          <div class="stamp-box">
            Official School Stamp & Seal
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Print Official User Credential & Login Access Slip
   */
  public printUserCredentialSlip(
    user: UserProfile,
    plainPassword?: string,
    school?: School | null
  ): void {
    const schoolName = school?.name || 'Gracia Learning Centre';
    const schoolMotto = school?.motto || 'Empowering Future Leaders';
    const schoolPhone = school?.phone || '+254 700 000 000';
    const schoolEmail = school?.email || 'admin@school.ac.ke';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Login Credentials - ${user.fullName}</title>
        <style>
          @page { size: A5 landscape; margin: 10mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 12px;
            font-size: 13px;
            line-height: 1.4;
          }
          .slip-container {
            border: 2px solid #1e3a8a;
            border-radius: 12px;
            padding: 18px;
            position: relative;
            background: #f8fafc;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 10px;
            margin-bottom: 14px;
          }
          .brand h1 {
            margin: 0;
            font-size: 17px;
            color: #1e3a8a;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .brand p {
            margin: 2px 0 0 0;
            font-size: 11px;
            color: #64748b;
            font-style: italic;
          }
          .badge {
            background: #1e3a8a;
            color: #ffffff;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 12px;
          }
          .card-box {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 10px;
          }
          .card-box h3 {
            margin: 0 0 6px 0;
            font-size: 10px;
            font-weight: 800;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 4px;
          }
          .field {
            margin-bottom: 4px;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
          }
          .field-label {
            color: #64748b;
            font-weight: 600;
          }
          .field-value {
            color: #0f172a;
            font-weight: 700;
          }
          .credential-highlight {
            background: #eff6ff;
            border: 1.5px dashed #3b82f6;
            border-radius: 8px;
            padding: 10px 14px;
            margin-bottom: 12px;
          }
          .cred-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 3px 0;
          }
          .cred-val {
            font-family: monospace;
            font-size: 13px;
            font-weight: 800;
            color: #1e3a8a;
            background: #ffffff;
            padding: 2px 8px;
            border-radius: 4px;
            border: 1px solid #bfdbfe;
          }
          .instructions {
            font-size: 10.5px;
            color: #475569;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 10px;
            margin-bottom: 12px;
          }
          .instructions ol {
            margin: 3px 0 0 0;
            padding-left: 16px;
          }
          .footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
            font-size: 9.5px;
            color: #64748b;
          }
          .sign-box {
            text-align: center;
            border-top: 1px solid #94a3b8;
            padding-top: 3px;
            width: 130px;
          }
        </style>
      </head>
      <body>
        <div class="slip-container">
          <div class="header">
            <div class="brand">
              <h1>${schoolName}</h1>
              <p>${schoolMotto} • Tel: ${schoolPhone}</p>
            </div>
            <div class="badge">Official Staff Login Slip</div>
          </div>

          <div class="details-grid">
            <div class="card-box">
              <h3>User Account Details</h3>
              <div class="field">
                <span class="field-label">Full Name:</span>
                <span class="field-value">${user.fullName}</span>
              </div>
              <div class="field">
                <span class="field-label">Assigned Role:</span>
                <span class="field-value">${user.role.replace(/_/g, ' ')}</span>
              </div>
              <div class="field">
                <span class="field-label">Registered Email:</span>
                <span class="field-value">${user.email}</span>
              </div>
            </div>

            <div class="card-box">
              <h3>Portal Access Info</h3>
              <div class="field">
                <span class="field-label">System Portal:</span>
                <span class="field-value">Staff & Faculty Portal</span>
              </div>
              <div class="field">
                <span class="field-label">Account Status:</span>
                <span class="field-value">${user.status || 'ACTIVE'}</span>
              </div>
              <div class="field">
                <span class="field-label">Date Issued:</span>
                <span class="field-value">${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          </div>

          <div class="credential-highlight">
            <div class="cred-row">
              <span style="font-weight: 700; color: #1e3a8a;">Portal Username:</span>
              <span class="cred-val">${user.username ? `@${user.username}` : user.email}</span>
            </div>
            <div class="cred-row" style="margin-top: 4px;">
              <span style="font-weight: 700; color: #1e3a8a;">Initial Password / PIN:</span>
              <span class="cred-val">${plainPassword || user.plainPasswordForAdmin || 'Password@2026'}</span>
            </div>
          </div>

          <div class="instructions">
            <strong>Important Security Instructions:</strong>
            <ol>
              <li>Navigate to the school website homepage and click <strong>"Staff Login"</strong> in the top header.</li>
              <li>Type your assigned Username (or email) and Password into the login modal.</li>
              <li>Keep your password confidential and do not share it with unauthorized persons.</li>
            </ol>
          </div>

          <div class="footer">
            <div>
              <span>System Generated by ERP Administrator</span><br>
              <span>Support: ${schoolEmail}</span>
            </div>
            <div class="sign-box">
              <span>Administrator Signature / Stamp</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    this.printViaIframe(html, 'A5', `Login-Credentials-${user.fullName}`);
  }

  /**
   * Print Official Daily Attendance Diary & Summary Report (A4 Format)
   */
  public printDailyAttendanceReport(reportData: DailyAttendanceReportData, school: School | null): void {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const baseTag = origin ? `<base href="${origin}/">` : '';
    const schoolName = school?.name || 'GRACIA LEARNING CENTRE';
    const schoolMotto = school?.motto || 'Nurturing Potential, Inspiring Excellence';
    const schoolAddress = school?.address || 'P.O. Box 1234 - 00100, Nairobi, Kenya';
    const schoolPhone = school?.phone || '+254 700 000 000';
    const schoolEmail = school?.email || 'admin@graciaschool.ac.ke';
    const regNo = (school as any)?.registrationNumber || (school as any)?.regNo || 'MOE/PRI/2024/9941';

    const formattedDate = new Date(reportData.date).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const isHighAttendance = reportData.attendanceRate >= 90;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daily Attendance Diary - ${reportData.date}</title>
        ${baseTag}
        <meta charset="utf-8">
        <style>
          @page { size: A4 portrait; margin: 12mm 12mm 12mm 12mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            font-size: 11px;
            line-height: 1.4;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .report-container { max-width: 100%; margin: 0 auto; }
          
          /* Header */
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; }
          .logo-cell { width: 75px; vertical-align: middle; text-align: center; }
          .logo-img { width: 68px; height: 68px; object-fit: contain; }
          .logo-placeholder { width: 65px; height: 65px; background: #0f172a; color: #fff; border-radius: 8px; font-size: 24px; font-weight: 900; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
          .school-info { text-align: center; vertical-align: middle; padding: 0 10px; }
          .school-name { font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
          .school-motto { font-size: 10px; font-style: italic; color: #475569; margin-top: 1px; }
          .school-contacts { font-size: 9.5px; color: #64748b; margin-top: 2px; }
          .doc-badge-cell { width: 110px; vertical-align: middle; text-align: right; }
          .doc-badge { display: inline-block; background: #0f172a; color: #fff; padding: 4px 8px; font-size: 10px; font-weight: 800; border-radius: 4px; text-transform: uppercase; text-align: center; }
          .doc-badge-sub { font-size: 8.5px; color: #64748b; margin-top: 3px; display: block; }

          /* Meta Grid */
          .meta-strip { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 7px 12px; margin-bottom: 12px; }
          .meta-item { font-size: 10px; }
          .meta-label { color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 8.5px; display: block; }
          .meta-value { font-weight: 800; color: #0f172a; font-size: 11px; }

          /* KPI Summary Cards */
          .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 12px; }
          .kpi-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center; background: #ffffff; }
          .kpi-title { font-size: 8.5px; font-weight: 700; text-transform: uppercase; color: #64748b; }
          .kpi-num { font-size: 18px; font-weight: 900; font-family: monospace; margin: 2px 0; }
          .kpi-sub { font-size: 8.5px; color: #94a3b8; font-weight: 600; }

          /* Section Titles */
          .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; border-left: 3px solid #0f172a; padding-left: 6px; }
          
          /* Tables */
          .data-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 9.5px; }
          .data-table th { background: #0f172a; color: #ffffff; padding: 5px 6px; font-weight: 700; text-align: left; text-transform: uppercase; font-size: 8.5px; border: 1px solid #0f172a; }
          .data-table td { padding: 5px 6px; border: 1px solid #e2e8f0; vertical-align: middle; }
          .data-table tr:nth-child(even) td { background: #f8fafc; }
          .data-table tr.total-row td { font-weight: 800; background: #f1f5f9; border-top: 2px solid #0f172a; font-size: 10px; }
          
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: 700; }
          .font-mono { font-family: monospace; }
          
          .badge-present { background: #ecfdf5; color: #065f46; font-weight: 700; padding: 2px 5px; border-radius: 3px; font-size: 8.5px; }
          .badge-absent { background: #fef2f2; color: #991b1b; font-weight: 700; padding: 2px 5px; border-radius: 3px; font-size: 8.5px; }
          .badge-late { background: #fffbeb; color: #92400e; font-weight: 700; padding: 2px 5px; border-radius: 3px; font-size: 8.5px; }
          .badge-excused { background: #f0f9ff; color: #0369a1; font-weight: 700; padding: 2px 5px; border-radius: 3px; font-size: 8.5px; }

          /* Signatures */
          .sign-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 20px; padding-top: 10px; }
          .sign-box { border-top: 1px solid #94a3b8; padding-top: 4px; font-size: 9px; text-align: center; }
          .sign-role { font-weight: 800; color: #0f172a; text-transform: uppercase; font-size: 9.5px; }
          .sign-date { color: #64748b; margin-top: 2px; }

          .footer-note { margin-top: 15px; font-size: 8px; color: #94a3b8; text-align: center; border-top: 1px dashed #e2e8f0; padding-top: 4px; }
        </style>
      </head>
      <body>
        <div class="report-container">
          <!-- School Letterhead -->
          <table class="header-table">
            <tr>
              <td class="logo-cell">
                ${school?.logoUrl ? `<img src="${school.logoUrl}" class="logo-img" alt="School Crest">` : `<div class="logo-placeholder">${schoolName.charAt(0)}</div>`}
              </td>
              <td class="school-info">
                <div class="school-name">${schoolName}</div>
                <div class="school-motto">"${schoolMotto}"</div>
                <div class="school-contacts">${schoolAddress} • Tel: ${schoolPhone} • Email: ${schoolEmail}</div>
              </td>
              <td class="doc-badge-cell">
                <div class="doc-badge">DAILY ATTENDANCE DIARY</div>
                <span class="doc-badge-sub">Reg: ${regNo}</span>
              </td>
            </tr>
          </table>

          <!-- Meta Information -->
          <div class="meta-strip">
            <div class="meta-item">
              <span class="meta-label">Date of Roll Call</span>
              <span class="meta-value">${formattedDate}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Academic Year / Term</span>
              <span class="meta-value">${reportData.academicYear || new Date().getFullYear()} • ${reportData.term || 'Term 1'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Overall School Attendance</span>
              <span class="meta-value" style="color: ${isHighAttendance ? '#15803d' : '#b45309'}; font-size: 13px;">${reportData.attendanceRate.toFixed(1)}%</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Ministry Report Code</span>
              <span class="meta-value">NEMIS-ATT-D${reportData.date.replace(/-/g, '')}</span>
            </div>
          </div>

          <!-- KPI Summary Cards -->
          <div class="kpi-grid">
            <div class="kpi-card" style="background: #f8fafc;">
              <div class="kpi-title">Total on Roll</div>
              <div class="kpi-num" style="color: #0f172a;">${reportData.totalEnrolled}</div>
              <div class="kpi-sub">Registered Learners</div>
            </div>
            <div class="kpi-card" style="background: #ecfdf5; border-color: #a7f3d0;">
              <div class="kpi-title" style="color: #065f46;">Present</div>
              <div class="kpi-num" style="color: #047857;">${reportData.totalPresent}</div>
              <div class="kpi-sub" style="color: #059669;">${reportData.totalEnrolled > 0 ? ((reportData.totalPresent / reportData.totalEnrolled) * 100).toFixed(1) : 0}% of Total</div>
            </div>
            <div class="kpi-card" style="background: #fffbeb; border-color: #fde68a;">
              <div class="kpi-title" style="color: #92400e;">Late Arrivals</div>
              <div class="kpi-num" style="color: #b45309;">${reportData.totalLate}</div>
              <div class="kpi-sub" style="color: #b45309;">Gate / Tardy</div>
            </div>
            <div class="kpi-card" style="background: #fef2f2; border-color: #fecaca;">
              <div class="kpi-title" style="color: #991b1b;">Absent</div>
              <div class="kpi-num" style="color: #dc2626;">${reportData.totalAbsent}</div>
              <div class="kpi-sub" style="color: #dc2626;">Unexcused</div>
            </div>
            <div class="kpi-card" style="background: #f0f9ff; border-color: #bae6fd;">
              <div class="kpi-title" style="color: #0369a1;">Excused / Sick</div>
              <div class="kpi-num" style="color: #0284c7;">${reportData.totalExcused}</div>
              <div class="kpi-sub" style="color: #0284c7;">With Permission</div>
            </div>
          </div>

          <!-- Class-by-Class Attendance Summary -->
          <div class="section-title">
            <span>1. Class-by-Class Attendance Breakdown</span>
            <span style="font-size: 8.5px; font-weight: normal; color: #64748b;">All Streams & Grades</span>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 25px;">#</th>
                <th>Class / Grade</th>
                <th>Stream</th>
                <th class="text-center" style="width: 60px;">Enrolled</th>
                <th class="text-center" style="width: 60px;">Present</th>
                <th class="text-center" style="width: 50px;">Late</th>
                <th class="text-center" style="width: 50px;">Absent</th>
                <th class="text-center" style="width: 50px;">Excused</th>
                <th class="text-right" style="width: 70px;">Rate (%)</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.classSummaries.map((cls, idx) => `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td class="font-bold">${cls.classLevel}</td>
                  <td>${cls.stream}</td>
                  <td class="text-center font-mono">${cls.enrolled}</td>
                  <td class="text-center font-mono font-bold" style="color: #047857;">${cls.present}</td>
                  <td class="text-center font-mono" style="color: #b45309;">${cls.late}</td>
                  <td class="text-center font-mono font-bold" style="color: #dc2626;">${cls.absent}</td>
                  <td class="text-center font-mono" style="color: #0284c7;">${cls.excused}</td>
                  <td class="text-right font-mono font-bold" style="${cls.rate >= 90 ? 'color: #15803d;' : 'color: #b45309;'}">${cls.rate.toFixed(1)}%</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3" class="font-bold">TOTAL SCHOOL ROLL</td>
                <td class="text-center font-mono">${reportData.totalEnrolled}</td>
                <td class="text-center font-mono" style="color: #047857;">${reportData.totalPresent}</td>
                <td class="text-center font-mono" style="color: #b45309;">${reportData.totalLate}</td>
                <td class="text-center font-mono" style="color: #dc2626;">${reportData.totalAbsent}</td>
                <td class="text-center font-mono" style="color: #0284c7;">${reportData.totalExcused}</td>
                <td class="text-right font-mono">${reportData.attendanceRate.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>

          <!-- Absentee Follow-Up Register -->
          <div class="section-title" style="margin-top: 10px;">
            <span>2. Absentee & Disciplinary Follow-Up Register (${reportData.absenteeList.length} Learners)</span>
            <span style="font-size: 8.5px; font-weight: normal; color: #64748b;">Required for Parent Contact & NEMIS Logging</span>
          </div>

          ${reportData.absenteeList.length === 0 ? `
            <div style="padding: 10px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 4px; text-align: center; color: #065f46; font-weight: 700; margin-bottom: 14px;">
              ✓ Exemplary Record: 100% Attendance recorded today across all scheduled classes! No absentees.
            </div>
          ` : `
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 25px;">#</th>
                  <th style="width: 70px;">Adm No</th>
                  <th>Learner Name</th>
                  <th>Class & Stream</th>
                  <th style="width: 75px;">Status</th>
                  <th>Guardian Name</th>
                  <th style="width: 95px;">Guardian Phone</th>
                  <th>Remarks / Reason</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.absenteeList.map((abs, idx) => `
                  <tr>
                    <td class="text-center">${idx + 1}</td>
                    <td class="font-mono font-bold">${abs.admissionNumber}</td>
                    <td class="font-bold">${abs.studentName}</td>
                    <td>${abs.classLevel} ${abs.stream}</td>
                    <td>
                      <span class="${abs.status === 'LATE' ? 'badge-late' : abs.status === 'EXCUSED' || abs.status === 'SICK' ? 'badge-excused' : 'badge-absent'}">
                        ${abs.status}
                      </span>
                    </td>
                    <td>${abs.parentName || 'Parent/Guardian'}</td>
                    <td class="font-mono">${abs.parentPhone || '-'}</td>
                    <td style="color: #475569;">${abs.remarks || 'No reason provided'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}

          <!-- Administrative Signatures -->
          <div class="sign-grid">
            <div class="sign-box">
              <div class="sign-role">Duty Master / Teacher</div>
              <div class="sign-date">Sign: ___________________ Date: ${reportData.date}</div>
            </div>
            <div class="sign-box">
              <div class="sign-role">Deputy Headteacher</div>
              <div class="sign-date">Sign: ___________________ Date: ${reportData.date}</div>
            </div>
            <div class="sign-box">
              <div class="sign-role">Headteacher / Principal</div>
              <div class="sign-date">Official Stamp & Date</div>
            </div>
          </div>

          <div class="footer-note">
            Official Ministry of Education Attendance Record • System Generated on ${new Date().toLocaleString('en-GB')} by ${schoolName} ERP
          </div>
        </div>
      </body>
      </html>
    `;

    this.printViaIframe(html, 'A4', `Daily-Attendance-Diary-${reportData.date}`);
  }

  /**
   * Helper: Print HTML via hidden iframe without disturbing the active screen
   */
  private printViaIframe(htmlContent: string, format: string, title?: string): void {
    const existingFrame = document.getElementById('printer_service_iframe');
    if (existingFrame) {
      existingFrame.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'printer_service_iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      // Fallback
      window.print();
      return;
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();

    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn('Iframe print failed, falling back to window.open:', e);
        const win = window.open('', '_blank');
        if (win) {
          win.document.open();
          win.document.write(htmlContent);
          win.document.close();
          win.focus();
          setTimeout(() => win.print(), 500);
        }
      } finally {
        setTimeout(() => iframe.remove(), 2500);
      }
    };

    // Wait for images (like the school logo/crest) to finish loading before triggering print
    const images = Array.from(doc.images);
    if (images.length === 0) {
      setTimeout(triggerPrint, 250);
    } else {
      let loaded = 0;
      let triggered = false;
      const onImgDone = () => {
        loaded++;
        if (loaded >= images.length && !triggered) {
          triggered = true;
          setTimeout(triggerPrint, 100);
        }
      };

      images.forEach((img) => {
        if (img.complete) {
          onImgDone();
        } else {
          img.onload = onImgDone;
          img.onerror = onImgDone;
        }
      });

      // Safety timeout in case an image takes too long
      setTimeout(() => {
        if (!triggered) {
          triggered = true;
          triggerPrint();
        }
      }, 1000);
    }
  }
}

export const printerService = new PrinterService();
