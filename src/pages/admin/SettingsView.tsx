import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { schoolService, DEFAULT_SCHOOL_ID, DEFAULT_SCHOOL, DEFAULT_LEVELS } from '../../services/schoolService';
import { operationsService } from '../../services/operationsService';
import { compressImage } from '../../utils/imageCompressor';
import { printerService, PrinterConfig, PaperWidth } from '../../services/printerService';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { School, SchoolLevelConfig, TermDatesConfig, PaymentSettingsConfig, CBCGradingConfig, SystemPreferencesConfig } from '../../types';
import {
  Settings,
  Save,
  School as SchoolIcon,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Calendar,
  Sparkles,
  Upload,
  Image as ImageIcon,
  ShieldCheck,
  Palette,
  CreditCard,
  GraduationCap,
  Bell,
  Database,
  RefreshCw,
  Download,
  FileJson,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Sliders,
  Award,
  Printer,
  Usb,
  Bluetooth,
  Monitor,
  Zap,
  Scissors,
  Smartphone,
  Key,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
} from 'lucide-react';

type SettingsTab =
  | 'general'
  | 'terms'
  | 'levels'
  | 'financial'
  | 'cbc_grading'
  | 'preferences'
  | 'hardware_printers'
  | 'data_management';

const PRESET_LOGOS = [
  {
    name: 'Modern Torch of Knowledge',
    url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=200&q=80',
  },
  {
    name: 'Excellence Crest & Open Book',
    url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=200&q=80',
  },
];

export const SettingsView: React.FC = () => {
  const { school, reloadSchoolData, seedDemoData } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [saving, setSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Printer Hardware state
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(printerService.getConfig());
  const [connectingPrinter, setConnectingPrinter] = useState(false);
  const [testingPrinter, setTestingPrinter] = useState(false);

  const isSerialSupported = printerService.isSerialSupported();
  const isBluetoothSupported = printerService.isBluetoothSupported();

  const handleUpdatePrinterConfig = (updates: Partial<PrinterConfig>) => {
    const updated = printerService.updateConfig(updates);
    setPrinterConfig({ ...updated });
    showToast('Hardware printer configuration updated', 'success');
  };

  const handleConnectSerial = async () => {
    setConnectingPrinter(true);
    try {
      const port = await printerService.connectSerial();
      if (port) {
        setPrinterConfig(printerService.getConfig());
        showToast('USB Thermal Printer connected successfully!', 'success');
      } else {
        showToast('No USB / Serial device selected or unsupported browser.', 'warning');
      }
    } catch (e: any) {
      showToast('USB Connection failed: ' + e.message, 'error');
    } finally {
      setConnectingPrinter(false);
    }
  };

  const handleConnectBluetooth = async () => {
    setConnectingPrinter(true);
    try {
      const dev = await printerService.connectBluetooth();
      if (dev.success) {
        setPrinterConfig(printerService.getConfig());
        showToast(`Connected to Bluetooth printer: ${dev.deviceName || 'Device'}`, 'success');
      } else {
        showToast('Bluetooth device selection was cancelled or failed.', 'warning');
      }
    } catch (e: any) {
      showToast('Bluetooth connection failed: ' + e.message, 'error');
    } finally {
      setConnectingPrinter(false);
    }
  };

  const handleDisconnectPrinter = async () => {
    await printerService.disconnect();
    setPrinterConfig(printerService.getConfig());
    showToast('Printer disconnected. Reverted to System Driver mode.', 'info');
  };

  const handleRunPrinterTest = async (testType: 'sample_slip' | 'diagnostic') => {
    setTestingPrinter(true);
    try {
      const testData = {
        receiptNumber: `TEST-${Date.now().toString().slice(-4)}`,
        date: new Date(),
        cashierName: 'System Hardware Diagnostics',
        studentName: 'Sample Learner Test',
        admissionNumber: 'GLCM/2026/001',
        classLevel: 'Grade 4 East',
        items: [
          { name: 'Hardware Line 1 Test', quantity: 1, unitPrice: 100, totalPrice: 100 },
          { name: 'ESC/POS Font & Code Page', quantity: 1, unitPrice: 250, totalPrice: 250 },
          { name: 'Thermal Cutter Command', quantity: 1, unitPrice: 0, totalPrice: 0 },
        ],
        subtotal: 350,
        total: 350,
        paymentMethod: 'CASH' as const,
        transactionReference: 'HARDWARE-SELF-TEST',
      };
      await printerService.printThermalReceipt(testData, school);
      showToast(`Test ${testType === 'sample_slip' ? 'receipt' : 'diagnostic'} dispatched to printer!`, 'success');
    } catch (e: any) {
      showToast('Print test error: ' + e.message, 'error');
    } finally {
      setTestingPrinter(false);
    }
  };

  // Consolidated form state
  const [formData, setFormData] = useState<School>({
    id: DEFAULT_SCHOOL_ID,
    name: DEFAULT_SCHOOL.name,
    code: DEFAULT_SCHOOL.code,
    motto: DEFAULT_SCHOOL.motto,
    logoUrl: DEFAULT_SCHOOL.logoUrl || '',
    bannerUrl: DEFAULT_SCHOOL.bannerUrl || '',
    address: DEFAULT_SCHOOL.address,
    county: DEFAULT_SCHOOL.county || 'Nairobi',
    phone: DEFAULT_SCHOOL.phone,
    email: DEFAULT_SCHOOL.email,
    website: DEFAULT_SCHOOL.website || 'https://kilimanielite.ac.ke',
    currency: DEFAULT_SCHOOL.currency,
    currencySymbol: DEFAULT_SCHOOL.currencySymbol,
    academicYear: DEFAULT_SCHOOL.academicYear,
    currentTerm: DEFAULT_SCHOOL.currentTerm,
    status: 'ACTIVE',
    levels: DEFAULT_SCHOOL.levels || DEFAULT_LEVELS,
    primaryColor: DEFAULT_SCHOOL.primaryColor || '#1e3a8a',
    accentColor: DEFAULT_SCHOOL.accentColor || '#059669',
    termDates: DEFAULT_SCHOOL.termDates || {
      term1Start: '2026-01-05',
      term1End: '2026-04-03',
      term2Start: '2026-04-27',
      term2End: '2026-07-31',
      term3Start: '2026-08-24',
      term3End: '2026-10-30',
    },
    paymentSettings: DEFAULT_SCHOOL.paymentSettings || {
      mpesaPaybill: '522123',
      mpesaAccountNumber: 'GLCM-STUDENT-ADM',
      mpesaTill: '982341',
      bankName: 'Equity Bank Kenya',
      bankAccountName: 'Gracia Learning Centre Mariru Collection A/C',
      bankAccountNumber: '0180293847192',
      bankBranch: 'Nyahururu Branch',
      invoiceDueDays: 14,
      taxRegistrationNumber: 'P051829304M',
    },
    cbcGradingSettings: DEFAULT_SCHOOL.cbcGradingSettings || {
      eeMinScore: 80,
      meMinScore: 50,
      aeMinScore: 30,
      beMinScore: 0,
      eeRemark: 'Exceeding Expectations - Outstanding Mastery & Innovation',
      meRemark: 'Meeting Expectations - Proficient in Key Competencies',
      aeRemark: 'Approaching Expectations - Developing Competence, Needs Practice',
      beRemark: 'Below Expectations - Requires Targeted Teacher Support',
    },
    systemPreferences: DEFAULT_SCHOOL.systemPreferences || {
      enableSmsAlerts: true,
      enableEmailAlerts: true,
      smsSenderId: 'KILIMANI-ACAD',
      autoFeeReminderDays: 7,
      allowOnlineAdmissions: true,
      enableDailyAttendanceSms: true,
      allowParentReportCardDownload: true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  useEffect(() => {
    if (school) {
      setFormData({
        ...DEFAULT_SCHOOL,
        ...school,
        termDates: {
          ...DEFAULT_SCHOOL.termDates,
          ...(school.termDates || {}),
        },
        paymentSettings: {
          ...DEFAULT_SCHOOL.paymentSettings,
          ...(school.paymentSettings || {}),
        },
        cbcGradingSettings: {
          ...DEFAULT_SCHOOL.cbcGradingSettings,
          ...(school.cbcGradingSettings || {}),
        },
        systemPreferences: {
          ...DEFAULT_SCHOOL.systemPreferences,
          ...(school.systemPreferences || {}),
        },
      });
      setHasUnsavedChanges(false);
    }
  }, [school]);

  const updateField = (key: keyof School, val: any) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
    setHasUnsavedChanges(true);
  };

  const updateTermDates = (key: keyof TermDatesConfig, val: string) => {
    setFormData((prev) => ({
      ...prev,
      termDates: {
        ...(prev.termDates || {}),
        [key]: val,
      },
    }));
    setHasUnsavedChanges(true);
  };

  const updatePaymentSettings = (key: keyof PaymentSettingsConfig, val: any) => {
    setFormData((prev) => ({
      ...prev,
      paymentSettings: {
        ...(prev.paymentSettings || {}),
        [key]: val,
      },
    }));
    setHasUnsavedChanges(true);
  };

  const updateGradingSettings = (key: keyof CBCGradingConfig, val: any) => {
    setFormData((prev) => ({
      ...prev,
      cbcGradingSettings: {
        ...(prev.cbcGradingSettings || {
          eeMinScore: 80,
          meMinScore: 50,
          aeMinScore: 30,
          beMinScore: 0,
        }),
        [key]: val,
      },
    }));
    setHasUnsavedChanges(true);
  };

  const updatePreferences = (key: keyof SystemPreferencesConfig, val: any) => {
    setFormData((prev) => ({
      ...prev,
      systemPreferences: {
        ...(prev.systemPreferences || {}),
        [key]: val,
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, SVG)', 'warning');
      return;
    }
    try {
      showToast('Optimizing school logo...', 'info');
      const compressed = await compressImage(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.85,
        mimeType: 'image/png',
      });
      updateField('logoUrl', compressed);
      showToast('School logo ready. Click "Save Settings" to apply.', 'success');
    } catch (err: any) {
      showToast('Could not process logo: ' + err.message, 'error');
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const schoolId = school?.id || formData.id || DEFAULT_SCHOOL_ID;
    setSaving(true);
    try {
      await schoolService.updateSchool(schoolId, formData);

      // Also sync logo to website CMS if present
      if (formData.logoUrl) {
        await operationsService.updateWebsiteContent(schoolId, { logoUrl: formData.logoUrl });
      }

      await reloadSchoolData();
      setHasUnsavedChanges(false);
      showToast('Institutional settings and configuration saved successfully!', 'success');
    } catch (e: any) {
      console.error('Error saving settings:', e);
      showToast('Error saving settings: ' + (e.message || 'Unknown error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReSeedData = async () => {
    if (!window.confirm('Are you sure you want to re-seed demo data? This will reset demo records with authentic Kenyan CBC school data.')) {
      return;
    }
    setIsResetting(true);
    try {
      showToast('Populating comprehensive CBC school data...', 'info');
      await seedDemoData();
      await reloadSchoolData();
      showToast('CBC sample data successfully loaded!', 'success');
    } catch (err: any) {
      showToast('Re-seeding failed: ' + err.message, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleExportBackup = () => {
    try {
      const exportObject = {
        exportedAt: new Date().toISOString(),
        version: '2.0-CBC',
        school: formData,
      };
      const jsonStr = JSON.stringify(exportObject, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formData.code || 'school'}_settings_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('School configuration exported successfully!', 'success');
    } catch (err: any) {
      showToast('Failed to export configuration: ' + err.message, 'error');
    }
  };

  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed.school) {
          setFormData(parsed.school);
          setHasUnsavedChanges(true);
          showToast('Backup configuration loaded into form. Click "Save Settings" to apply.', 'success');
        } else {
          showToast('Invalid backup file format.', 'error');
        }
      } catch (err: any) {
        showToast('Failed to parse backup JSON: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleClearCache = () => {
    const schoolId = school?.id || DEFAULT_SCHOOL_ID;
    try {
      localStorage.removeItem(`school_${schoolId}`);
      localStorage.removeItem(`fee_structures_${schoolId}`);
      showToast('Local cache cleared! Refreshing data...', 'info');
      reloadSchoolData();
    } catch (e: any) {
      showToast('Could not clear local cache: ' + e.message, 'error');
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'general', label: 'School Profile & Logo', icon: SchoolIcon },
    { id: 'terms', label: 'Academic Terms & Dates', icon: Calendar },
    { id: 'levels', label: 'CBC Grade Levels', icon: Layers },
    { id: 'financial', label: 'Finance & Tuition Accounts', icon: CreditCard },
    { id: 'cbc_grading', label: 'CBC Grading Rubric', icon: Award },
    { id: 'preferences', label: 'System Preferences', icon: Sliders },
    { id: 'hardware_printers', label: 'Printers & Hardware', icon: Printer },
    { id: 'data_management', label: 'Data & Backup', icon: Database },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-900/10 flex items-center justify-center text-blue-900">
              <Settings className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Institutional & System Settings</h1>
            <Badge variant="primary" size="sm">
              CBC Ready
            </Badge>
            {hasUnsavedChanges && (
              <Badge variant="warning" size="sm">
                Unsaved Changes
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Manage official institution nomenclature, crest, term schedules, M-Pesa billing channels, and grading metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => reloadSchoolData()}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Reload
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={saving}
            icon={<Save className="w-4 h-4" />}
            onClick={() => handleSave()}
          >
            Save All Settings
          </Button>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-semibold text-xs transition-all whitespace-nowrap border-b-2 cursor-pointer ${
                isActive
                  ? 'border-blue-900 text-blue-900 bg-white shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-900' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Settings Form Container */}
      <div className="space-y-6">
        {/* TAB 1: GENERAL & BRANDING */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            {/* School Crest / Logo */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <ImageIcon className="w-4 h-4 text-blue-900" />
                <h3 className="font-bold text-sm text-slate-900">Official School Logo & Insignia</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-3">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]);
                    }}
                  />

                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/60 hover:bg-blue-50/30 transition-all space-y-2"
                  >
                    <Upload className="w-6 h-6 text-blue-900 mx-auto" />
                    <span className="font-bold text-xs text-slate-900 block">
                      Click to Upload School Logo / Crest
                    </span>
                    <span className="text-[11px] text-slate-400">
                      PNG, JPG, SVG or WebP format (Auto-resized for report cards & receipts)
                    </span>
                  </div>

                  <div>
                    <label className="font-semibold text-xs text-slate-700">Or Direct Image URL</label>
                    <input
                      type="text"
                      placeholder="https://example.com/logo.png"
                      value={formData.logoUrl || ''}
                      onChange={(e) => updateField('logoUrl', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 items-center pt-1">
                    <span className="text-[11px] font-bold text-slate-500">Preset Crests:</span>
                    {PRESET_LOGOS.map((pl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => updateField('logoUrl', pl.url)}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg text-slate-700 font-medium cursor-pointer"
                      >
                        {pl.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Logo Preview */}
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-4">
                  <div className="w-24 h-24 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center p-2 overflow-hidden shrink-0">
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                    ) : (
                      <SchoolIcon className="w-10 h-10 text-blue-900" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-slate-900">{formData.name || 'School Name'}</div>
                    <div className="text-xs text-slate-500 italic">{formData.motto || 'School Motto'}</div>
                    <div className="text-[11px] text-emerald-800 font-semibold pt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Appears on Report Cards, Invoices, Receipts & Website
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* School Profile Details */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <SchoolIcon className="w-4 h-4 text-blue-900" />
                <h3 className="font-bold text-sm text-slate-900">Official Nomenclature & Tagline</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700">Official Institution Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">School Code / Acronym *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => updateField('code', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-mono uppercase"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700">Official Motto / Tagline</label>
                  <input
                    type="text"
                    value={formData.motto}
                    onChange={(e) => updateField('motto', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-slate-800"
                    placeholder="e.g. Nurturing Potential, Inspiring Excellence"
                  />
                </div>
              </div>
            </div>

            {/* Location & Contacts */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <MapPin className="w-4 h-4 text-emerald-800" />
                <h3 className="font-bold text-sm text-slate-900">Contact Channels & Physical Address</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700">Official Phone *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Official Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">County / Sub-County</label>
                  <input
                    type="text"
                    value={formData.county || ''}
                    onChange={(e) => updateField('county', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
                    placeholder="e.g. Nairobi County / Kasarani Sub-County"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700">Physical Address / Campus Location</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
                    placeholder="e.g. Mariru Park, Kasarani Mwiki, Nairobi, Kenya"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Official Website URL</label>
                  <input
                    type="text"
                    value={formData.website || ''}
                    onChange={(e) => updateField('website', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs"
                    placeholder="https://gracialearningcentre.ac.ke"
                  />
                </div>
              </div>
            </div>

            {/* Brand Colors */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Palette className="w-4 h-4 text-purple-800" />
                <h3 className="font-bold text-sm text-slate-900">Institution Brand Colors</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700">Primary Brand Color</label>
                  <div className="flex items-center gap-3 mt-1">
                    <input
                      type="color"
                      value={formData.primaryColor || '#1e3a8a'}
                      onChange={(e) => updateField('primaryColor', e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={formData.primaryColor || '#1e3a8a'}
                      onChange={(e) => updateField('primaryColor', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Secondary Accent Color</label>
                  <div className="flex items-center gap-3 mt-1">
                    <input
                      type="color"
                      value={formData.accentColor || '#059669'}
                      onChange={(e) => updateField('accentColor', e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={formData.accentColor || '#059669'}
                      onChange={(e) => updateField('accentColor', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACADEMIC TERMS & DATES */}
        {activeTab === 'terms' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Calendar className="w-4 h-4 text-blue-900" />
                <h3 className="font-bold text-sm text-slate-900">Academic Year & Active Working Term</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700">Active Academic Year</label>
                  <input
                    type="text"
                    value={formData.academicYear}
                    onChange={(e) => updateField('academicYear', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-900"
                    placeholder="e.g. 2026"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Current Active Term</label>
                  <select
                    value={formData.currentTerm}
                    onChange={(e) => updateField('currentTerm', e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold text-slate-800"
                  >
                    <option value="Term 1">Term 1 (January - April)</option>
                    <option value="Term 2">Term 2 (May - August)</option>
                    <option value="Term 3">Term 3 (September - November)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Term Start & End Dates */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Calendar className="w-4 h-4 text-emerald-800" />
                <h3 className="font-bold text-sm text-slate-900">Term Schedule & Holiday Calendar</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
                {/* Term 1 */}
                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">Term 1</span>
                    {formData.currentTerm === 'Term 1' && <Badge variant="primary" size="sm">Current</Badge>}
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Opening Date</label>
                    <input
                      type="date"
                      value={formData.termDates?.term1Start || '2026-01-05'}
                      onChange={(e) => updateTermDates('term1Start', e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Closing Date</label>
                    <input
                      type="date"
                      value={formData.termDates?.term1End || '2026-04-03'}
                      onChange={(e) => updateTermDates('term1End', e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Term 2 */}
                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">Term 2</span>
                    {formData.currentTerm === 'Term 2' && <Badge variant="primary" size="sm">Current</Badge>}
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Opening Date</label>
                    <input
                      type="date"
                      value={formData.termDates?.term2Start || '2026-04-27'}
                      onChange={(e) => updateTermDates('term2Start', e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Closing Date</label>
                    <input
                      type="date"
                      value={formData.termDates?.term2End || '2026-07-31'}
                      onChange={(e) => updateTermDates('term2End', e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Term 3 */}
                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">Term 3</span>
                    {formData.currentTerm === 'Term 3' && <Badge variant="primary" size="sm">Current</Badge>}
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Opening Date</label>
                    <input
                      type="date"
                      value={formData.termDates?.term3Start || '2026-08-24'}
                      onChange={(e) => updateTermDates('term3Start', e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Closing Date</label>
                    <input
                      type="date"
                      value={formData.termDates?.term3End || '2026-10-30'}
                      onChange={(e) => updateTermDates('term3End', e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CBC GRADE LEVELS */}
        {activeTab === 'levels' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-900" />
                  <h3 className="font-bold text-sm text-slate-900">Kenyan CBC Education Cycle & Levels</h3>
                </div>
                <Badge variant="primary" size="sm">
                  Playgroup to Grade 9 (12 Levels)
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                {(formData.levels || DEFAULT_LEVELS).map((lvl, index) => (
                  <div
                    key={lvl.id}
                    className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{lvl.name}</span>
                      <span className="text-[10px] font-mono bg-blue-900/10 text-blue-900 px-1.5 py-0.5 rounded">
                        #{lvl.order || index + 1}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">Category:</span> {lvl.category}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">Typical Age:</span> {lvl.ageRange}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FINANCIAL, BILLING & M-PESA */}
        {activeTab === 'financial' && (
          <div className="space-y-6">
            {/* Currency */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <DollarSign className="w-4 h-4 text-blue-900" />
                <h3 className="font-bold text-sm text-slate-900">Currency & Invoice Billing Settings</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700">Currency Code</label>
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => updateField('currency', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-bold"
                    placeholder="KES"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Currency Symbol</label>
                  <input
                    type="text"
                    value={formData.currencySymbol}
                    onChange={(e) => updateField('currencySymbol', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-bold"
                    placeholder="KSh"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Invoice Payment Window (Days)</label>
                  <input
                    type="number"
                    value={formData.paymentSettings?.invoiceDueDays || 14}
                    onChange={(e) => updatePaymentSettings('invoiceDueDays', Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* M-Pesa & Bank Details */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <CreditCard className="w-4 h-4 text-emerald-800" />
                <h3 className="font-bold text-sm text-slate-900">Lipa na M-Pesa & Bank Collection Accounts</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-100 space-y-3">
                  <div className="font-bold text-emerald-950 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    M-Pesa Paybill / Till Setup
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">M-PESA Business Paybill Number</label>
                    <input
                      type="text"
                      value={formData.paymentSettings?.mpesaPaybill || ''}
                      onChange={(e) => updatePaymentSettings('mpesaPaybill', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs"
                      placeholder="e.g. 522123"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Account Number Prefix / Instructions</label>
                    <input
                      type="text"
                      value={formData.paymentSettings?.mpesaAccountNumber || ''}
                      onChange={(e) => updatePaymentSettings('mpesaAccountNumber', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs"
                      placeholder="e.g. GLCM-[STUDENT-ADM]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Buy Goods / Till Number (Optional)</label>
                    <input
                      type="text"
                      value={formData.paymentSettings?.mpesaTill || ''}
                      onChange={(e) => updatePaymentSettings('mpesaTill', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs"
                      placeholder="e.g. 982341"
                    />
                  </div>
                </div>

                <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-100 space-y-3">
                  <div className="font-bold text-blue-950 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    Commercial Bank Collection Account
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Bank Name</label>
                    <input
                      type="text"
                      value={formData.paymentSettings?.bankName || ''}
                      onChange={(e) => updatePaymentSettings('bankName', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      placeholder="e.g. Equity Bank Kenya"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Account Name</label>
                    <input
                      type="text"
                      value={formData.paymentSettings?.bankAccountName || ''}
                      onChange={(e) => updatePaymentSettings('bankAccountName', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      placeholder="e.g. Gracia Learning Centre Collection A/C"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-semibold text-slate-700">Account Number</label>
                      <input
                        type="text"
                        value={formData.paymentSettings?.bankAccountNumber || ''}
                        onChange={(e) => updatePaymentSettings('bankAccountNumber', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs"
                        placeholder="0180293847192"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700">Branch Name</label>
                      <input
                        type="text"
                        value={formData.paymentSettings?.bankBranch || ''}
                        onChange={(e) => updatePaymentSettings('bankBranch', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                        placeholder="Nyahururu Branch"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CBC GRADING RUBRIC */}
        {activeTab === 'cbc_grading' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-700" />
                  <h3 className="font-bold text-sm text-slate-900">Kenyan CBC 4-Level Performance Scale</h3>
                </div>
                <Badge variant="primary" size="sm">
                  Competency Based Assessment
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* EE */}
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 text-sm">EE - Exceeding Expectations</span>
                    <Badge variant="success" size="sm">80 - 100%</Badge>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Minimum Percentage Cutoff</label>
                    <input
                      type="number"
                      value={formData.cbcGradingSettings?.eeMinScore ?? 80}
                      onChange={(e) => updateGradingSettings('eeMinScore', Number(e.target.value))}
                      className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Standard Report Card Remark</label>
                    <input
                      type="text"
                      value={formData.cbcGradingSettings?.eeRemark || ''}
                      onChange={(e) => updateGradingSettings('eeRemark', e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>

                {/* ME */}
                <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900 text-sm">ME - Meeting Expectations</span>
                    <Badge variant="primary" size="sm">50 - 79%</Badge>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Minimum Percentage Cutoff</label>
                    <input
                      type="number"
                      value={formData.cbcGradingSettings?.meMinScore ?? 50}
                      onChange={(e) => updateGradingSettings('meMinScore', Number(e.target.value))}
                      className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Standard Report Card Remark</label>
                    <input
                      type="text"
                      value={formData.cbcGradingSettings?.meRemark || ''}
                      onChange={(e) => updateGradingSettings('meRemark', e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>

                {/* AE */}
                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 text-sm">AE - Approaching Expectations</span>
                    <Badge variant="warning" size="sm">30 - 49%</Badge>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Minimum Percentage Cutoff</label>
                    <input
                      type="number"
                      value={formData.cbcGradingSettings?.aeMinScore ?? 30}
                      onChange={(e) => updateGradingSettings('aeMinScore', Number(e.target.value))}
                      className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Standard Report Card Remark</label>
                    <input
                      type="text"
                      value={formData.cbcGradingSettings?.aeRemark || ''}
                      onChange={(e) => updateGradingSettings('aeRemark', e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>

                {/* BE */}
                <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-900 text-sm">BE - Below Expectations</span>
                    <Badge variant="danger" size="sm">0 - 29%</Badge>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Minimum Percentage Cutoff</label>
                    <input
                      type="number"
                      value={formData.cbcGradingSettings?.beMinScore ?? 0}
                      onChange={(e) => updateGradingSettings('beMinScore', Number(e.target.value))}
                      className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Standard Report Card Remark</label>
                    <input
                      type="text"
                      value={formData.cbcGradingSettings?.beRemark || ''}
                      onChange={(e) => updateGradingSettings('beRemark', e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SYSTEM PREFERENCES & NOTIFICATIONS */}
        {activeTab === 'preferences' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Bell className="w-4 h-4 text-blue-900" />
                <h3 className="font-bold text-sm text-slate-900">Automated Communications & Alerts</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700">SMS Gateway Sender ID</label>
                  <input
                    type="text"
                    value={formData.systemPreferences?.smsSenderId || 'KILIMANI-ACAD'}
                    onChange={(e) => updatePreferences('smsSenderId', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-mono uppercase text-xs"
                    placeholder="e.g. KILIMANI-ACAD"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Max 11 alphanumeric characters recognized by Kenyan telcos
                  </span>
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Fee Reminder Trigger (Days before due)</label>
                  <input
                    type="number"
                    value={formData.systemPreferences?.autoFeeReminderDays || 7}
                    onChange={(e) => updatePreferences('autoFeeReminderDays', Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/60">
                  <input
                    type="checkbox"
                    checked={formData.systemPreferences?.enableSmsAlerts ?? true}
                    onChange={(e) => updatePreferences('enableSmsAlerts', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-900 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-semibold text-xs text-slate-900 block">Enable Automated SMS Notifications</span>
                    <span className="text-[11px] text-slate-500">Sends instant SMS for payments & announcements</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/60">
                  <input
                    type="checkbox"
                    checked={formData.systemPreferences?.enableEmailAlerts ?? true}
                    onChange={(e) => updatePreferences('enableEmailAlerts', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-900 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-semibold text-xs text-slate-900 block">Enable Email Invoices & Newsletters</span>
                    <span className="text-[11px] text-slate-500">Delivers digital fee statements and receipts</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/60">
                  <input
                    type="checkbox"
                    checked={formData.systemPreferences?.allowOnlineAdmissions ?? true}
                    onChange={(e) => updatePreferences('allowOnlineAdmissions', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-900 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-semibold text-xs text-slate-900 block">Allow Online Parent Applications</span>
                    <span className="text-[11px] text-slate-500">Enables admission intake form on public website</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/60">
                  <input
                    type="checkbox"
                    checked={formData.systemPreferences?.allowParentReportCardDownload ?? true}
                    onChange={(e) => updatePreferences('allowParentReportCardDownload', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-900 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-semibold text-xs text-slate-900 block">Allow Parent Portal PDF Downloads</span>
                    <span className="text-[11px] text-slate-500">Parents can export stamped CBC assessment cards</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Inactivity & Google Authentication Security Section */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">Session Security & Google Authentication</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 flex items-center justify-between">
                    <span>Inactivity Auto-Logout Duration (Minutes)</span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Minimum 5 Minutes
                    </span>
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={formData.systemPreferences?.inactivityTimeoutMinutes ?? 5}
                    onChange={(e) => {
                      const val = Math.max(5, Number(e.target.value) || 5);
                      updatePreferences('inactivityTimeoutMinutes', val);
                    }}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Automatically logs out idle users and redirects them to the <strong>Public Website</strong> after this duration.
                  </span>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Google Authentication (SSO)</label>
                  <label className="flex items-center gap-3 p-3 mt-1 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/60">
                    <input
                      type="checkbox"
                      checked={formData.systemPreferences?.enableGoogleAuth ?? true}
                      onChange={(e) => updatePreferences('enableGoogleAuth', e.target.checked)}
                      className="w-4 h-4 rounded text-blue-900 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-semibold text-xs text-slate-900 block">Allow Google Account Sign-In</span>
                      <span className="text-[11px] text-slate-500">Staff, teachers, and parents can use Gmail / Google Workspace</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: DATA MANAGEMENT & BACKUP */}
        {activeTab === 'data_management' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Database className="w-4 h-4 text-blue-900" />
                <h3 className="font-bold text-sm text-slate-900">Database Administration & Cloud Sync</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Seed Demo Data */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                    <RefreshCw className="w-4 h-4" />
                    <span>Re-seed Demo Data</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Populates complete Kenyan CBC learners, class streams, staff members, fees, and library books.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    loading={isResetting}
                    onClick={handleReSeedData}
                    className="w-full"
                  >
                    Reset & Populate CBC Data
                  </Button>
                </div>

                {/* Export JSON Backup */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <Download className="w-4 h-4" />
                    <span>Export School Backup</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Download complete snapshot of institution settings, CBC scale, and billing configurations in JSON.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportBackup}
                    icon={<FileJson className="w-4 h-4" />}
                    className="w-full"
                  >
                    Download JSON Backup
                  </Button>
                </div>

                {/* Clear Local Cache */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                    <RefreshCw className="w-4 h-4" />
                    <span>Clear Local Cache</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Clears client-side browser cache and re-fetches latest state from Firestore cloud storage.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearCache}
                    className="w-full"
                  >
                    Clear & Re-sync Cache
                  </Button>
                </div>
              </div>

              {/* Import Backup */}
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="font-bold text-xs text-blue-950 block">Restore Settings from Backup JSON</span>
                  <span className="text-[11px] text-blue-700">
                    Upload a previously exported settings JSON file to instantly apply configuration.
                  </span>
                </div>
                <div>
                  <input
                    ref={importFileRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleImportBackup(e.target.files[0]);
                    }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => importFileRef.current?.click()}
                    icon={<Upload className="w-3.5 h-3.5" />}
                  >
                    Choose JSON File
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: PRINTERS & HARDWARE INTEGRATION */}
        {activeTab === 'hardware_printers' && (
          <div className="space-y-6">
            {/* Connection Mode Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-blue-900" />
                  <h3 className="font-bold text-sm text-slate-900">Physical Printer Connection Mode</h3>
                </div>
                <Badge
                  variant={printerConfig.isConnected ? 'success' : 'neutral'}
                  size="sm"
                >
                  {printerConfig.isConnected ? `Connected via ${printerConfig.type}` : 'System Default Mode'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* System Print Driver */}
                <button
                  type="button"
                  onClick={() => handleUpdatePrinterConfig({ type: 'SYSTEM' })}
                  className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    printerConfig.type === 'SYSTEM'
                      ? 'border-blue-900 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Monitor className="w-5 h-5 text-blue-900" />
                    {printerConfig.type === 'SYSTEM' && <CheckCircle2 className="w-4 h-4 text-blue-900" />}
                  </div>
                  <div className="font-bold text-xs text-slate-900">System Print Driver</div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Standard browser printing. Works with all network, WiFi, USB, HP, Epson, Canon, and PDF printers.
                  </p>
                </button>

                {/* USB / Web Serial */}
                <div
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    printerConfig.type === 'SERIAL'
                      ? 'border-blue-900 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Usb className="w-5 h-5 text-indigo-700" />
                    {printerConfig.type === 'SERIAL' && printerConfig.isConnected && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    )}
                  </div>
                  <div className="font-bold text-xs text-slate-900">Direct USB / Serial (ESC/POS)</div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Fast direct byte streaming to thermal receipt printers with instant paper cut & cash drawer kick.
                  </p>

                  <div className="mt-3">
                    {printerConfig.type === 'SERIAL' && printerConfig.isConnected ? (
                      <button
                        type="button"
                        onClick={handleDisconnectPrinter}
                        className="w-full py-1.5 px-3 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Disconnect USB
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConnectSerial}
                        disabled={connectingPrinter}
                        className="w-full py-1.5 px-3 bg-indigo-900 text-white hover:bg-indigo-800 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {connectingPrinter ? 'Detecting Port...' : 'Connect USB Printer'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Bluetooth */}
                <div
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    printerConfig.type === 'BLUETOOTH'
                      ? 'border-blue-900 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Bluetooth className="w-5 h-5 text-blue-700" />
                    {printerConfig.type === 'BLUETOOTH' && printerConfig.isConnected && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    )}
                  </div>
                  <div className="font-bold text-xs text-slate-900">Bluetooth Wireless (ESC/POS)</div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Pair directly with mobile handheld thermal printers (e.g. PT-210, MPT-II, Rongta, GOOJPRT).
                  </p>

                  <div className="mt-3">
                    {printerConfig.type === 'BLUETOOTH' && printerConfig.isConnected ? (
                      <button
                        type="button"
                        onClick={handleDisconnectPrinter}
                        className="w-full py-1.5 px-3 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Disconnect Bluetooth
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConnectBluetooth}
                        disabled={connectingPrinter}
                        className="w-full py-1.5 px-3 bg-blue-900 text-white hover:bg-blue-800 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {connectingPrinter ? 'Pairing Device...' : 'Pair Bluetooth'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Thermal Paper & Hardware Controls */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Scissors className="w-4 h-4 text-blue-900" />
                <h3 className="font-bold text-sm text-slate-900">Thermal Roll & Hardware Configuration</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Paper Roll Width */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Thermal Paper Width</label>
                  <select
                    value={printerConfig.paperWidth}
                    onChange={(e) => handleUpdatePrinterConfig({ paperWidth: e.target.value as PaperWidth })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-blue-900"
                  >
                    <option value="80mm">80mm (Standard POS / 48 chars)</option>
                    <option value="58mm">58mm (Compact Mobile / 32 chars)</option>
                  </select>
                </div>

                {/* Baud Rate */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">USB Baud Rate</label>
                  <select
                    value={printerConfig.baudRate}
                    onChange={(e) => handleUpdatePrinterConfig({ baudRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-blue-900 font-mono"
                  >
                    <option value={9600}>9600 bps</option>
                    <option value={19200}>19200 bps</option>
                    <option value={38400}>38400 bps</option>
                    <option value={115200}>115200 bps (Recommended)</option>
                  </select>
                </div>

                {/* Auto Cut */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Automatic Paper Cut</label>
                  <button
                    type="button"
                    onClick={() => handleUpdatePrinterConfig({ autoCut: !printerConfig.autoCut })}
                    className={`w-full py-2 px-3 border rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                      printerConfig.autoCut
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <span>{printerConfig.autoCut ? 'Enabled (Auto Cut)' : 'Disabled'}</span>
                    <span className={`w-2 h-2 rounded-full ${printerConfig.autoCut ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  </button>
                </div>

                {/* Cash Drawer Kick */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Cash Drawer RJ11 Kick</label>
                  <button
                    type="button"
                    onClick={() => handleUpdatePrinterConfig({ openCashDrawer: !printerConfig.openCashDrawer })}
                    className={`w-full py-2 px-3 border rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                      printerConfig.openCashDrawer
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <span>{printerConfig.openCashDrawer ? 'Open on Checkout' : 'Disabled'}</span>
                    <span className={`w-2 h-2 rounded-full ${printerConfig.openCashDrawer ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Test Bench */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Zap className="w-4 h-4 text-blue-900" />
                <h3 className="font-bold text-sm text-slate-900">Physical Printer Test Bench</h3>
              </div>
              <p className="text-xs text-slate-500">
                Trigger instant hardware test transmissions to verify typography, character alignment, ESC/POS commands, and paper feeding on your physical device.
              </p>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  loading={testingPrinter}
                  icon={<Printer className="w-3.5 h-3.5" />}
                  onClick={() => handleRunPrinterTest('sample_slip')}
                >
                  Print Sample POS Slip
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  loading={testingPrinter}
                  icon={<Zap className="w-3.5 h-3.5 text-blue-900" />}
                  onClick={() => handleRunPrinterTest('diagnostic')}
                >
                  Run Full ESC/POS Diagnostics
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Global Bottom Sticky Action Bar */}
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Changes are persisted simultaneously to Firestore and local browser storage.</span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => reloadSchoolData()}
            >
              Reset to Saved
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={saving}
              icon={<Save className="w-4 h-4" />}
              onClick={() => handleSave()}
            >
              Save All Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
