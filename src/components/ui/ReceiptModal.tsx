import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Printer, CheckCircle, School as SchoolIcon, Zap, FileText } from 'lucide-react';
import { Payment, School } from '../../types';
import { printerService } from '../../services/printerService';
import { PrinterManagerModal } from './PrinterManagerModal';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  school: School | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
  school,
}) => {
  const [printerModalOpen, setPrinterModalOpen] = useState(false);

  if (!payment) return null;

  const handlePrintA4 = () => {
    printerService.printFeeReceipt(payment, school, 'A4');
  };

  const handlePrintThermal = () => {
    printerService.printFeeReceipt(payment, school, '80mm');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Official Payment Receipt" maxWidth="lg">
      <div id="printable-receipt" className="p-6 bg-white border border-slate-200 rounded-xl space-y-6 text-slate-800">
        {/* School Header */}
        <div className="text-center border-b border-slate-200 pb-4">
          <div className="flex justify-center mb-3">
            <img
              src={(school?.logoUrl && !school.logoUrl.includes('unsplash.com')) ? school.logoUrl : '/gracia_logo.svg'}
              alt={school?.name || 'Gracia Learning Centre'}
              className="w-24 h-24 object-contain drop-shadow-sm"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = '/gracia_logo.svg';
              }}
            />
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-wide">
            {school?.name || 'Gracia Learning Centre'}
          </h2>
          <p className="text-xs text-orange-600 font-bold tracking-wider italic mt-0.5">
            {school?.motto || '— I can! I will! —'}
          </p>
          <p className="text-xs text-slate-600 mt-1">{school?.address || 'Mariru Park, Kasarani Mwiki, Nairobi'} • Tel: {school?.phone || '+254 722 000 123'}</p>
          <div className="mt-2.5 inline-block px-3 py-0.5 bg-blue-900 text-white text-[11px] font-bold tracking-wider rounded-md uppercase">
            Official Fee Payment Receipt
          </div>
        </div>

        {/* Receipt Meta */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs text-slate-400 font-medium">Receipt No:</span>
            <p className="font-bold text-slate-900">{payment.receiptNumber}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium">Date & Time:</span>
            <p className="font-medium text-slate-900">{new Date(payment.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Student Name:</span>
            <p className="font-semibold text-slate-900">{payment.studentName}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium">Admission No:</span>
            <p className="font-semibold text-slate-900">{payment.admissionNumber}</p>
          </div>
          {payment.parentName && (
            <div>
              <span className="text-xs text-slate-400 font-medium">Received From:</span>
              <p className="font-medium text-slate-800">{payment.parentName} ({payment.parentPhone || 'N/A'})</p>
            </div>
          )}
          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium">Payment Mode:</span>
            <p className="font-bold text-emerald-800 uppercase">{payment.paymentMethod} {payment.transactionReference ? `(${payment.transactionReference})` : ''}</p>
          </div>
        </div>

        {/* Payment Amount Box */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount Paid</span>
            <p className="text-xs text-slate-500">{payment.notes || 'School Fee Installment'}</p>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {school?.currencySymbol || 'KSh'} {payment.amount.toLocaleString()}
          </div>
        </div>

        {/* Footer & Signature */}
        <div className="pt-4 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
          <div>
            <p>Served By: <span className="font-semibold text-slate-700">{payment.cashierName}</span></p>
            <p className="italic text-[11px] text-slate-400 mt-1">Thank you for your timely payment.</p>
          </div>
          <div className="text-center">
            <div className="w-28 border-b border-slate-400 mb-1"></div>
            <span className="text-[10px] uppercase font-semibold text-slate-500">Authorized Bursar Stamp</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setPrinterModalOpen(true)}
          className="text-xs text-blue-900 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Printer Setup / Device Status</span>
        </button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="outline"
            icon={<Zap className="w-4 h-4" />}
            onClick={handlePrintThermal}
            title="Send to 80mm / 58mm Thermal Slip Printer"
          >
            Thermal Slip (80mm)
          </Button>
          <Button
            variant="primary"
            icon={<FileText className="w-4 h-4" />}
            onClick={handlePrintA4}
            title="Print Official A4 Document"
          >
            Print Official A4
          </Button>
        </div>
      </div>

      <PrinterManagerModal
        isOpen={printerModalOpen}
        onClose={() => setPrinterModalOpen(false)}
      />
    </Modal>
  );
};
