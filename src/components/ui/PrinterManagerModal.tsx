import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { printerService, PrinterConfig } from '../../services/printerService';
import {
  Printer,
  Usb,
  Bluetooth,
  Wifi,
  FileText,
  DollarSign,
  Scissors,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Settings,
  HelpCircle,
  Zap,
  Layers,
  CreditCard,
  Sliders,
  Power,
  ChevronRight,
  School as SchoolIcon,
} from 'lucide-react';

interface PrinterManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrinterManagerModal: React.FC<PrinterManagerModalProps> = ({ isOpen, onClose }) => {
  const { school } = useAuth();
  const { showToast } = useToast();
  const [config, setConfig] = useState<PrinterConfig>(printerService.getConfig());
  const [connecting, setConnecting] = useState(false);
  const [testingType, setTestingType] = useState<string | null>(null);
  const capabilities = printerService.getCapabilities();

  useEffect(() => {
    if (isOpen) {
      setConfig(printerService.getConfig());
    }
  }, [isOpen]);

  const handleConnectSerial = async () => {
    setConnecting(true);
    try {
      const res = await printerService.connectSerial(config.baudRate);
      if (res.success) {
        setConfig(printerService.getConfig());
        showToast(`Connected to physical printer: ${res.deviceName}`, 'success');
      } else {
        showToast(`Could not connect: ${res.error}`, 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error connecting to Serial printer', 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleConnectBluetooth = async () => {
    setConnecting(true);
    try {
      const res = await printerService.connectBluetooth();
      if (res.success) {
        setConfig(printerService.getConfig());
        showToast(`Connected to Bluetooth printer: ${res.deviceName}`, 'success');
      } else {
        showToast(`Bluetooth pairing cancelled or failed: ${res.error}`, 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error connecting to Bluetooth printer', 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await printerService.disconnect();
    setConfig(printerService.getConfig());
    showToast('Disconnected physical hardware port', 'info');
  };

  const handleSelectSystemDriver = () => {
    const updated = printerService.updateConfig({
      connectionType: 'SYSTEM',
      isConnected: true,
      deviceName: 'System Print Driver / Network Spooler',
    });
    setConfig(updated);
    showToast('Set to Universal System Print Driver (Works with all USB, Network & Virtual PDF printers)', 'success');
  };

  const handleUpdateConfig = (updates: Partial<PrinterConfig>) => {
    const updated = printerService.updateConfig(updates);
    setConfig(updated);
    showToast('Printer settings updated', 'success');
  };

  const handleRunTest = async (
    type: 'THERMAL_80' | 'THERMAL_58' | 'A4_RECEIPT' | 'A4_REPORT' | 'ID_CARD' | 'DRAWER',
    label: string
  ) => {
    setTestingType(type);
    try {
      await printerService.runTestPrint(type, school);
      showToast(`Sent ${label} to physical printer!`, 'success');
    } catch (e: any) {
      showToast(`Test print failed: ${e.message}`, 'error');
    } finally {
      setTestingType(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Physical Printer & Hardware Integration" maxWidth="3xl">
      <div className="space-y-6 text-slate-800">
        {/* Status Banner */}
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            config.isConnected
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/80 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                config.isConnected ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
              }`}
            >
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">
                  {config.isConnected ? 'Printer Ready & Connected' : 'Hardware Disconnected / Standby'}
                </h3>
                <Badge variant={config.isConnected ? 'success' : 'warning'} size="sm">
                  {config.connectionType}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {config.deviceName || 'Universal System Print Driver (Standard USB, Network & Thermal Spoolers)'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {config.isConnected && config.connectionType !== 'SYSTEM' ? (
              <Button variant="danger" size="sm" icon={<Power className="w-3.5 h-3.5" />} onClick={handleDisconnect}>
                Disconnect
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              icon={<Zap className="w-3.5 h-3.5" />}
              loading={testingType === 'THERMAL_80'}
              onClick={() => handleRunTest('THERMAL_80', 'Quick Test Receipt')}
            >
              Quick Test
            </Button>
          </div>
        </div>

        {/* 1. Connection Method Cards */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <Usb className="w-3.5 h-3.5" /> 1. Connect Physical Hardware
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Direct USB Serial */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                config.connectionType === 'SERIAL' && config.isConnected
                  ? 'border-blue-900 bg-blue-50/50 ring-2 ring-blue-900/10'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-100 text-blue-900 rounded-xl">
                  <Usb className="w-5 h-5" />
                </div>
                {capabilities.hasSerial ? (
                  <Badge variant="success" size="sm">Supported</Badge>
                ) : (
                  <Badge variant="neutral" size="sm">Chrome/Edge Only</Badge>
                )}
              </div>
              <h5 className="font-bold text-xs text-slate-900">Direct USB / Serial Port</h5>
              <p className="text-[11px] text-slate-500 mt-1 mb-3">
                Connects directly to Epson, Xprinter, Rongta ESC/POS thermal printers via Web Serial.
              </p>
              <Button
                variant={config.connectionType === 'SERIAL' && config.isConnected ? 'primary' : 'outline'}
                size="sm"
                className="w-full text-xs font-semibold"
                disabled={!capabilities.hasSerial || connecting}
                loading={connecting}
                onClick={handleConnectSerial}
              >
                {config.connectionType === 'SERIAL' && config.isConnected ? 'Port Active (Reconnect)' : 'Pair USB / COM'}
              </Button>
            </div>

            {/* Wireless Bluetooth */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                config.connectionType === 'BLUETOOTH' && config.isConnected
                  ? 'border-blue-900 bg-blue-50/50 ring-2 ring-blue-900/10'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-indigo-100 text-indigo-900 rounded-xl">
                  <Bluetooth className="w-5 h-5" />
                </div>
                {capabilities.hasBluetooth ? (
                  <Badge variant="success" size="sm">Supported</Badge>
                ) : (
                  <Badge variant="neutral" size="sm">Web Bluetooth</Badge>
                )}
              </div>
              <h5 className="font-bold text-xs text-slate-900">Bluetooth Thermal Printer</h5>
              <p className="text-[11px] text-slate-500 mt-1 mb-3">
                Wireless pairing for battery-powered 58mm / 80mm mobile bursar and gate printers.
              </p>
              <Button
                variant={config.connectionType === 'BLUETOOTH' && config.isConnected ? 'primary' : 'outline'}
                size="sm"
                className="w-full text-xs font-semibold"
                disabled={!capabilities.hasBluetooth || connecting}
                loading={connecting}
                onClick={handleConnectBluetooth}
              >
                {config.connectionType === 'BLUETOOTH' && config.isConnected ? 'Bluetooth Active' : 'Scan Bluetooth'}
              </Button>
            </div>

            {/* Universal System Driver */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                config.connectionType === 'SYSTEM'
                  ? 'border-blue-900 bg-blue-50/50 ring-2 ring-blue-900/10'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-emerald-100 text-emerald-900 rounded-xl">
                  <Wifi className="w-5 h-5" />
                </div>
                <Badge variant="success" size="sm">Universal</Badge>
              </div>
              <h5 className="font-bold text-xs text-slate-900">System & Network Driver</h5>
              <p className="text-[11px] text-slate-500 mt-1 mb-3">
                Uses Windows/macOS/Linux installed print spoolers (Wi-Fi, LAN, USB, HP LaserJet, PDF).
              </p>
              <Button
                variant={config.connectionType === 'SYSTEM' ? 'primary' : 'outline'}
                size="sm"
                className="w-full text-xs font-semibold"
                onClick={handleSelectSystemDriver}
              >
                {config.connectionType === 'SYSTEM' ? 'Currently Selected' : 'Use System Driver'}
              </Button>
            </div>
          </div>
        </div>

        {/* 2. Interactive Diagnostic Hardware Test Bench */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" /> 2. Hardware Test Bench & Sample Printouts
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <button
              onClick={() => handleRunTest('THERMAL_80', '80mm Thermal Receipt')}
              disabled={testingType !== null}
              className="p-3 bg-white border border-slate-200 hover:border-blue-900 hover:bg-slate-50 rounded-xl text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-xs text-slate-900 group-hover:text-blue-900">80mm POS Slip</div>
                <Printer className="w-4 h-4 text-slate-400 group-hover:text-blue-900" />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Canteen & Uniform POS</div>
            </button>

            <button
              onClick={() => handleRunTest('THERMAL_58', '58mm Mini Receipt')}
              disabled={testingType !== null}
              className="p-3 bg-white border border-slate-200 hover:border-blue-900 hover:bg-slate-50 rounded-xl text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-xs text-slate-900 group-hover:text-blue-900">58mm Mini Roll</div>
                <Printer className="w-4 h-4 text-slate-400 group-hover:text-blue-900" />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Compact mobile POS</div>
            </button>

            <button
              onClick={() => handleRunTest('A4_RECEIPT', 'Official A4 Fee Receipt')}
              disabled={testingType !== null}
              className="p-3 bg-white border border-slate-200 hover:border-blue-900 hover:bg-slate-50 rounded-xl text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-xs text-slate-900 group-hover:text-blue-900">Official A4 Receipt</div>
                <FileText className="w-4 h-4 text-slate-400 group-hover:text-blue-900" />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Bursar seal & signature</div>
            </button>

            <button
              onClick={() => handleRunTest('A4_REPORT', 'CBC Report Card')}
              disabled={testingType !== null}
              className="p-3 bg-white border border-slate-200 hover:border-blue-900 hover:bg-slate-50 rounded-xl text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-xs text-slate-900 group-hover:text-blue-900">CBC Report Card</div>
                <SchoolIcon className="w-4 h-4 text-slate-400 group-hover:text-blue-900" />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Assessment rubric & grades</div>
            </button>

            <button
              onClick={() => handleRunTest('ID_CARD', 'Student ID Badge')}
              disabled={testingType !== null}
              className="p-3 bg-white border border-slate-200 hover:border-blue-900 hover:bg-slate-50 rounded-xl text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-xs text-slate-900 group-hover:text-blue-900">Student ID Card</div>
                <CreditCard className="w-4 h-4 text-slate-400 group-hover:text-blue-900" />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">PVC Badge with barcode</div>
            </button>

            <button
              onClick={() => handleRunTest('DRAWER', 'Cash Drawer Pulse')}
              disabled={testingType !== null}
              className="p-3 bg-white border border-slate-200 hover:border-blue-900 hover:bg-slate-50 rounded-xl text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-xs text-slate-900 group-hover:text-blue-900">Pulse Cash Drawer</div>
                <Scissors className="w-4 h-4 text-slate-400 group-hover:text-blue-900" />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">RJ11/RJ12 24V trigger</div>
            </button>
          </div>
        </div>

        {/* 3. Hardware Settings & Customization */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4 text-xs">
          <h4 className="font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5" /> 3. Hardware Preferences & Formatting
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Receipt Paper Size</label>
              <select
                value={config.paperWidth}
                onChange={(e) => handleUpdateConfig({ paperWidth: e.target.value as any })}
                className="w-full bg-white px-3 py-2 border border-slate-200 rounded-xl font-semibold text-slate-800"
              >
                <option value="80mm">80mm Standard Thermal Roll (Recommended)</option>
                <option value="58mm">58mm Compact Mini Thermal Roll</option>
                <option value="A4">A4 Full Page Document Format</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Serial Port Baud Rate</label>
              <select
                value={config.baudRate}
                onChange={(e) => handleUpdateConfig({ baudRate: parseInt(e.target.value, 10) })}
                className="w-full bg-white px-3 py-2 border border-slate-200 rounded-xl font-semibold text-slate-800 font-mono"
              >
                <option value="9600">9600 baud (Standard ESC/POS)</option>
                <option value="19200">19200 baud</option>
                <option value="38400">38400 baud (Star / Citizen)</option>
                <option value="115200">115200 baud (High-Speed USB)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="font-semibold text-slate-700 block mb-1">Automations</label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={config.autoCut}
                  onChange={(e) => handleUpdateConfig({ autoCut: e.target.checked })}
                  className="rounded text-blue-900"
                />
                <span>Auto-cut paper after receipt</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={config.kickCashDrawer}
                  onChange={(e) => handleUpdateConfig({ kickCashDrawer: e.target.checked })}
                  className="rounded text-blue-900"
                />
                <span>Kick cash drawer on Cash sale</span>
              </label>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Receipt Header Motto</label>
              <input
                type="text"
                value={config.receiptHeader || ''}
                onChange={(e) => handleUpdateConfig({ receiptHeader: e.target.value })}
                className="w-full bg-white px-3 py-2 border border-slate-200 rounded-xl text-slate-800"
                placeholder="e.g. Nurturing Potential, Inspiring Excellence"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Receipt Footer Note</label>
              <input
                type="text"
                value={config.receiptFooter || ''}
                onChange={(e) => handleUpdateConfig({ receiptFooter: e.target.value })}
                className="w-full bg-white px-3 py-2 border border-slate-200 rounded-xl text-slate-800"
                placeholder="e.g. Thank you for supporting our learners!"
              />
            </div>
          </div>
        </div>

        {/* 4. Troubleshooting & Connection Guide */}
        <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 text-xs text-blue-950 space-y-2">
          <div className="font-bold flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-blue-700" /> Physical Printer Connection Tips for Kenya Schools
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
            <li><strong>Thermal POS Receipt Printers (80mm/58mm):</strong> Connect via USB cable. When pairing via "Pair USB / COM", select your printer's COM/Serial device in the browser prompt.</li>
            <li><strong>Network & Wi-Fi Printers:</strong> Simply choose <strong>"System & Network Driver"</strong>. The system will automatically route print jobs through your operating system's default network printer.</li>
            <li><strong>Cash Drawer (RJ11/RJ12):</strong> Connect the cash drawer phone-jack style cable directly to the DK (Drawer Kick) port at the back of your thermal receipt printer.</li>
          </ul>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
};
