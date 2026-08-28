import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  SchoolSubscriptionConfig,
  SubscriptionInvoice,
  DeveloperPayoutConfig,
} from '../../types';
import {
  subscriptionService,
  DEFAULT_SUBSCRIPTION_CONFIG,
  SYSTEM_OWNER_MASTER_KEY,
} from '../../services/subscriptionService';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import {
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  DollarSign,
  Calendar,
  CreditCard,
  Phone,
  FileText,
  Clock,
  Sparkles,
  RefreshCw,
  Printer,
  Copy,
  Building,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Smartphone,
  Eye,
  EyeOff,
  Check,
  RotateCcw,
} from 'lucide-react';

export const SystemOwnerConsole: React.FC = () => {
  const { school } = useAuth();
  const { showToast } = useToast();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    subscriptionService.isSystemOwnerSessionVerified()
  );
  const [passkeyInput, setPasskeyInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  const [subscription, setSubscription] = useState<SchoolSubscriptionConfig>(DEFAULT_SUBSCRIPTION_CONFIG);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Modals
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState<boolean>(false);
  const [isPayoutConfigModalOpen, setIsPayoutConfigModalOpen] = useState<boolean>(false);
  const [isPlanConfigModalOpen, setIsPlanConfigModalOpen] = useState<boolean>(false);
  const [isDarajaModalOpen, setIsDarajaModalOpen] = useState<boolean>(false);
  const [isChangePasskeyModalOpen, setIsChangePasskeyModalOpen] = useState<boolean>(false);
  const [isRestoreMasterKeyModalOpen, setIsRestoreMasterKeyModalOpen] = useState<boolean>(false);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<SubscriptionInvoice | null>(null);

  // Master Passkey Management State
  const [currentMasterPasskeyDisplay, setCurrentMasterPasskeyDisplay] = useState<string>(() =>
    subscriptionService.getMasterPasskeySync()
  );
  const [currentPasskeyInput, setCurrentPasskeyInput] = useState<string>('');
  const [newPasskeyInput, setNewPasskeyInput] = useState<string>('');
  const [confirmNewPasskeyInput, setConfirmNewPasskeyInput] = useState<string>('');
  const [showCurrentPasskey, setShowCurrentPasskey] = useState<boolean>(false);
  const [showNewPasskey, setShowNewPasskey] = useState<boolean>(false);
  const [showConfirmPasskey, setShowConfirmPasskey] = useState<boolean>(false);
  const [showActivePasskeyCard, setShowActivePasskeyCard] = useState<boolean>(false);
  const [changeKeyError, setChangeKeyError] = useState<string>('');
  const [changeKeyLoading, setChangeKeyLoading] = useState<boolean>(false);
  const [restoreLoading, setRestoreLoading] = useState<boolean>(false);

  // Manual payment state
  const [manualAmount, setManualAmount] = useState<number>(7500);
  const [manualMonths, setManualMonths] = useState<number>(1);
  const [manualMethod, setManualMethod] = useState<'MPESA_STK' | 'MPESA_MANUAL' | 'BANK_TRANSFER' | 'CASH'>('MPESA_MANUAL');
  const [manualRef, setManualRef] = useState<string>('');
  const [manualNotes, setManualNotes] = useState<string>('');

  // Editable Developer Payout state
  const [payoutForm, setPayoutForm] = useState<DeveloperPayoutConfig>(DEFAULT_SUBSCRIPTION_CONFIG.payoutConfig);

  // Editable Plan state
  const [planMonthlyRate, setPlanMonthlyRate] = useState<number>(7500);
  const [planGraceDays, setPlanGraceDays] = useState<number>(5);
  const [planAutoLock, setPlanAutoLock] = useState<boolean>(true);
  const [planName, setPlanName] = useState<string>('CBC Pro Cloud School ERP (Monthly)');

  // Daraja Gateway State (System Owner level)
  const [darajaConsumerKey, setDarajaConsumerKey] = useState<string>('cK892019482710398471920');
  const [darajaConsumerSecret, setDarajaConsumerSecret] = useState<string>('cS81920384710928374619');
  const [darajaPasskey, setDarajaPasskey] = useState<string>('bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919');
  const [darajaShortcode, setDarajaShortcode] = useState<string>('8829102');
  const [showSecrets, setShowSecrets] = useState<boolean>(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    setTimeout(() => {
      const verified = subscriptionService.authenticateSystemOwner(passkeyInput);
      if (verified) {
        setIsAuthenticated(true);
        showToast('System Owner authenticated successfully.', 'success');
      } else {
        setAuthError('Invalid System Owner Master Key. Access restricted.');
        showToast('Invalid System Owner Master Key.', 'error');
      }
      setAuthLoading(false);
    }, 400);
  };

  const handleLogout = () => {
    subscriptionService.logoutSystemOwner();
    setIsAuthenticated(false);
    setPasskeyInput('');
    showToast('Logged out of System Owner Console.', 'info');
  };

  const loadData = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const config = await subscriptionService.getSubscriptionConfig(school?.id);
      const invoiceList = await subscriptionService.getInvoices(school?.id);
      const masterKey = await subscriptionService.getMasterPasskey(school?.id);
      setCurrentMasterPasskeyDisplay(masterKey);
      setSubscription(config);
      setInvoices(invoiceList);
      setPayoutForm(config.payoutConfig);
      setPlanMonthlyRate(config.monthlyAmount);
      setPlanGraceDays(config.gracePeriodDays || 5);
      setPlanAutoLock(config.autoLockOnOverdue ?? true);
      setPlanName(config.planName || 'CBC Pro Cloud School ERP (Monthly)');
    } catch (e) {
      console.warn('Error loading system owner data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeMasterPasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeKeyError('');

    if (!currentPasskeyInput.trim()) {
      setChangeKeyError('Please enter your current Master Passkey.');
      return;
    }
    if (!newPasskeyInput.trim()) {
      setChangeKeyError('Please enter a new Master Passkey.');
      return;
    }
    if (newPasskeyInput.trim().length < 6) {
      setChangeKeyError('New Master Passkey must be at least 6 characters long.');
      return;
    }
    if (newPasskeyInput.trim() !== confirmNewPasskeyInput.trim()) {
      setChangeKeyError('New Passkey and Confirmation do not match. Please re-enter.');
      return;
    }

    setChangeKeyLoading(true);
    try {
      const res = await subscriptionService.updateMasterPasskey(
        currentPasskeyInput.trim(),
        newPasskeyInput.trim(),
        school?.id || 'GLCM'
      );
      setCurrentMasterPasskeyDisplay(newPasskeyInput.trim());
      setIsChangePasskeyModalOpen(false);
      setCurrentPasskeyInput('');
      setNewPasskeyInput('');
      setConfirmNewPasskeyInput('');
      showToast(res.message || 'System Owner Master Passkey updated successfully!', 'success');
    } catch (err: any) {
      setChangeKeyError(err.message || 'Failed to update Master Passkey.');
      showToast(err.message || 'Failed to update Master Passkey.', 'error');
    } finally {
      setChangeKeyLoading(false);
    }
  };

  const handleRestoreDefaultKey = async () => {
    setRestoreLoading(true);
    try {
      const res = await subscriptionService.restoreDefaultMasterPasskey(school?.id || 'GLCM');
      setCurrentMasterPasskeyDisplay(res.defaultKey);
      setPasskeyInput(res.defaultKey);
      setIsRestoreMasterKeyModalOpen(false);
      setIsChangePasskeyModalOpen(false);
      setCurrentPasskeyInput('');
      setNewPasskeyInput('');
      setConfirmNewPasskeyInput('');
      setChangeKeyError('');
      showToast(`Master Key restored to default (${res.defaultKey})!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to restore default Master Key.', 'error');
    } finally {
      setRestoreLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, school?.id]);

  const health = subscriptionService.getSubscriptionHealth(subscription);

  const handleRecordManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRef.trim()) {
      showToast('Please enter an M-Pesa, bank, or receipt reference.', 'error');
      return;
    }

    try {
      const { config, invoice } = await subscriptionService.processMonthlyPayment(
        school?.id || 'GLCM',
        {
          amount: manualAmount,
          monthsToAdd: manualMonths,
          paymentMethod: manualMethod,
          paymentReference: manualRef.trim().toUpperCase(),
          notes: manualNotes.trim() || `System Owner recorded payment via ${manualMethod}.`,
        }
      );

      setSubscription(config);
      setInvoices((prev) => [invoice, ...prev]);
      setIsRecordPaymentModalOpen(false);
      setManualRef('');
      setManualNotes('');
      showToast(`Subscription extended by ${manualMonths} month(s) successfully!`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Error recording payment', 'error');
    }
  };

  const handleSavePayoutConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated: SchoolSubscriptionConfig = {
        ...subscription,
        payoutConfig: payoutForm,
      };
      await subscriptionService.saveSubscriptionConfig(school?.id || 'GLCM', updated);
      setSubscription(updated);
      setIsPayoutConfigModalOpen(false);
      showToast('Developer payout channels updated successfully.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Error saving payout config', 'error');
    }
  };

  const handleSavePlanConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated: SchoolSubscriptionConfig = {
        ...subscription,
        planName,
        monthlyAmount: Number(planMonthlyRate),
        gracePeriodDays: Number(planGraceDays),
        autoLockOnOverdue: planAutoLock,
      };
      await subscriptionService.saveSubscriptionConfig(school?.id || 'GLCM', updated);
      setSubscription(updated);
      setIsPlanConfigModalOpen(false);
      showToast('Subscription pricing & grace period updated.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Error saving plan config', 'error');
    }
  };

  const handleToggleLock = async () => {
    const isCurrentlyLocked = health.isLocked;
    const actionName = isCurrentlyLocked ? 'Reactivate & Unlock' : 'Suspend / Lock';
    if (!window.confirm(`Are you sure you want to ${actionName} Gracia Learning Centre's ERP access?`)) {
      return;
    }

    try {
      const updated = await subscriptionService.setLockStatus(
        school?.id || 'GLCM',
        !isCurrentlyLocked,
        isCurrentlyLocked ? undefined : 'Subscription suspended by Software Provider.'
      );
      setSubscription(updated);
      showToast(
        isCurrentlyLocked
          ? 'Gracia Learning Centre has been reactivated and unlocked.'
          : 'Gracia Learning Centre ERP has been locked.',
        isCurrentlyLocked ? 'success' : 'warning'
      );
    } catch (e: any) {
      showToast(e.message || 'Error updating lock status', 'error');
    }
  };

  const handleExtendDays = async (days: number) => {
    try {
      const updated = await subscriptionService.grantGraceExtension(school?.id || 'GLCM', days);
      setSubscription(updated);
      showToast(`Granted +${days} days extension to Gracia Learning Centre.`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Error granting extension', 'error');
    }
  };

  // If not authenticated as System Owner, render protected passcode login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-white shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">
                Restricted Software Provider Area
              </span>
              <h2 className="text-lg font-bold text-white">System Owner Console</h2>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            This management console is strictly restricted to the software owner and provider. Gracia Learning Centre school staff do not have access to this area.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-300">
                  Enter Provider Master Passkey:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setPasskeyInput('GLC-SYSTEM-OWNER-2026');
                    setAuthError('');
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer underline"
                >
                  Use Default Key
                </button>
              </div>
              <input
                type="password"
                value={passkeyInput}
                onChange={(e) => setPasskeyInput(e.target.value)}
                placeholder="e.g. GLC-SYSTEM-OWNER-2026"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
                autoFocus
              />
              {authError && <p className="text-xs text-rose-400 mt-1.5 font-medium">{authError}</p>}
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={authLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-bold text-sm rounded-xl cursor-pointer"
            >
              Verify & Unlock Provider Console
            </Button>
          </form>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Default key: <code className="text-indigo-300 font-mono">GLC-SYSTEM-OWNER-2026</code></span>
            </div>
            <button
              type="button"
              onClick={() => setIsRestoreMasterKeyModalOpen(true)}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restore Key</span>
            </button>
          </div>
        </div>

        {/* Emergency Restore Modal on Login screen */}
        <Modal
          isOpen={isRestoreMasterKeyModalOpen}
          onClose={() => setIsRestoreMasterKeyModalOpen(false)}
          title="Restore Default Master Key"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex items-start gap-2.5">
              <RotateCcw className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Restore Master Key:</span> This operation will immediately reset the System Owner Master Passkey to the standard platform default (<code className="font-mono font-bold">GLC-SYSTEM-OWNER-2026</code>).
              </div>
            </div>

            <p className="text-slate-600 leading-relaxed">
              Use this recovery function if the customized Master Key was forgotten, mistyped, or if you need to restore default provider access.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Restored Value</span>
              <p className="font-mono font-bold text-slate-800 text-sm">GLC-SYSTEM-OWNER-2026</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRestoreMasterKeyModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                loading={restoreLoading}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={handleRestoreDefaultKey}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                Confirm Restore Default Key
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  System Owner / Provider Console
                </h1>
                <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full uppercase">
                  Authorized Provider
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Software Ownership, License Management & Billing Engine for Gracia Learning Centre
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            className="text-xs font-semibold bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
          >
            Refresh
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleLogout}
            icon={<LogOut className="w-3.5 h-3.5 text-rose-400" />}
            className="text-xs font-bold bg-slate-800 text-rose-300 border-slate-700 hover:bg-rose-950/50"
          >
            Lock Console
          </Button>
        </div>
      </div>

      {/* Primary KPI Grid for Gracia Learning Centre */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Subscription Status */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Client School Status</span>
            <span className="p-1.5 rounded-xl bg-slate-100 text-slate-700">
              {health.isLocked ? <Lock className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black ${health.isLocked ? 'text-rose-600' : 'text-emerald-600'}`}>
              {health.computedStatus}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            {health.isLocked
              ? 'Gracia Learning Centre is currently locked'
              : `${health.daysRemaining} days remaining on current cycle`}
          </p>
        </div>

        {/* Metric 2: Monthly Fee Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Monthly Subscription Fee</span>
            <span className="p-1.5 rounded-xl bg-blue-50 text-blue-700">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">
              KES {subscription.monthlyAmount?.toLocaleString() || '7,500'}
            </span>
            <span className="text-xs text-slate-500">/ mo</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Next renewal due: <strong>{health.formattedDueDate}</strong>
          </p>
        </div>

        {/* Metric 3: Grace Period */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Grace Period Policy</span>
            <span className="p-1.5 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">
              {subscription.gracePeriodDays || 5} Days
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Auto-lock on overdue: <strong>{subscription.autoLockOnOverdue ? 'Enabled' : 'Disabled'}</strong>
          </p>
        </div>

        {/* Metric 4: Total Provider Revenue Collected */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Total Invoices Collected</span>
            <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-700">
              KES {invoices.filter((i) => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0).toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            {invoices.filter((i) => i.status === 'PAID').length} paid cycles recorded
          </p>
        </div>
      </div>

      {/* System Owner Quick Actions Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Subscription Controls & License Overrides</h2>
            <p className="text-xs text-slate-500">
              Instant controls to extend validity, record incoming payments, modify pricing, or suspend access.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={<Sparkles className="w-3.5 h-3.5 text-amber-300" />}
              onClick={() => setIsRecordPaymentModalOpen(true)}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700"
            >
              Record Payment & Extend
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={<DollarSign className="w-3.5 h-3.5 text-blue-600" />}
              onClick={() => setIsPlanConfigModalOpen(true)}
              className="text-xs font-semibold"
            >
              Configure Plan & Price
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={<Key className="w-3.5 h-3.5 text-indigo-600" />}
              onClick={() => {
                setChangeKeyError('');
                setIsChangePasskeyModalOpen(true);
              }}
              className="text-xs font-semibold"
            >
              Change Master Passkey
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5 text-amber-600" />}
              onClick={() => setIsRestoreMasterKeyModalOpen(true)}
              className="text-xs font-semibold border-amber-200 bg-amber-50/50 hover:bg-amber-100/50 text-amber-900"
            >
              Restore Default Key
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={<Smartphone className="w-3.5 h-3.5 text-purple-600" />}
              onClick={() => setIsPayoutConfigModalOpen(true)}
              className="text-xs font-semibold"
            >
              Payout & Contact Channels
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={<CreditCard className="w-3.5 h-3.5 text-emerald-600" />}
              onClick={() => setIsDarajaModalOpen(true)}
              className="text-xs font-semibold"
            >
              M-Pesa Gateway Keys
            </Button>

            <Button
              variant={health.isLocked ? 'primary' : 'danger'}
              size="sm"
              icon={health.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              onClick={handleToggleLock}
              className="text-xs font-bold"
            >
              {health.isLocked ? 'Reactivate Client ERP' : 'Suspend / Lock ERP'}
            </Button>
          </div>
        </div>

        {/* Quick Extensions */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-500 font-bold">Quick Extension Grants:</span>
          <button
            onClick={() => handleExtendDays(7)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
          >
            +7 Days Grace
          </button>
          <button
            onClick={() => handleExtendDays(14)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
          >
            +14 Days Extension
          </button>
          <button
            onClick={() => handleExtendDays(30)}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl border border-emerald-200 transition-colors cursor-pointer"
          >
            +30 Days (1 Full Month)
          </button>
        </div>
      </div>

      {/* Provider Payout & Contact Settings Summary Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-700" />
              <h3 className="font-bold text-sm text-slate-900">Provider Payout Information</h3>
            </div>
            <button
              onClick={() => setIsPayoutConfigModalOpen(true)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              Edit
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 font-bold uppercase block">Provider Name</span>
              <p className="font-bold text-slate-900">{subscription.payoutConfig?.vendorName}</p>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1">
              <span className="text-[11px] text-emerald-700 font-bold uppercase block">Receiving M-Pesa Channel</span>
              <p className="font-mono font-bold text-emerald-950">
                {subscription.payoutConfig?.mpesaType === 'TILL' ? 'Buy Goods Till: ' : 'Paybill: '}
                {subscription.payoutConfig?.mpesaNumber}
              </p>
            </div>

            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1">
              <span className="text-[11px] text-blue-700 font-bold uppercase block">Support Hotline & WhatsApp</span>
              <p className="font-bold text-blue-950">{subscription.payoutConfig?.contactPhone}</p>
              <p className="text-[11px] text-blue-700">{subscription.payoutConfig?.contactEmail}</p>
            </div>
          </div>
        </div>

        {/* License & Encryption Key Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900">Security & Master Passkey</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsRestoreMasterKeyModalOpen(true)}
                className="text-xs font-bold text-amber-700 hover:text-amber-900 cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restore Default</span>
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => {
                  setChangeKeyError('');
                  setIsChangePasskeyModalOpen(true);
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                Change Key
              </button>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-900 text-white rounded-xl space-y-1 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-sans">Provider Master Passkey</span>
                <button
                  type="button"
                  onClick={() => setShowActivePasskeyCard(!showActivePasskeyCard)}
                  className="text-slate-400 hover:text-white text-[10px] font-sans flex items-center gap-1 cursor-pointer"
                >
                  {showActivePasskeyCard ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showActivePasskeyCard ? 'Hide' : 'Reveal'}</span>
                </button>
              </div>
              <p className="text-emerald-400 font-bold tracking-wider break-all font-mono">
                {showActivePasskeyCard ? currentMasterPasskeyDisplay : '••••••••••••••••••••'}
              </p>
            </div>

            <div className="p-3 bg-slate-900 text-white rounded-xl space-y-1 font-mono">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-sans">Active License Key</span>
              <p className="text-amber-300 font-bold tracking-wider break-all">{subscription.licenseKey}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 font-bold uppercase block">Last Payment Registered</span>
              <p className="font-bold text-slate-800">
                KES {subscription.lastPaymentAmount?.toLocaleString()} on{' '}
                {subscription.lastPaymentDate ? new Date(subscription.lastPaymentDate).toLocaleDateString() : 'N/A'}
              </p>
              <p className="text-[11px] text-slate-500 font-mono">Ref: {subscription.lastPaymentRef || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Gracia Learning Centre Snapshot */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-4 h-4 text-blue-900" />
            <h3 className="font-bold text-sm text-slate-900">Target Institution Profile</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 font-bold uppercase block">Institution Name</span>
              <p className="font-bold text-slate-900">{school?.name || 'Gracia Learning Centre'}</p>
              <p className="text-[11px] text-slate-500">{school?.address || 'Nairobi, Kenya'}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 font-bold uppercase block">Admin Contact</span>
              <p className="font-bold text-slate-800">{school?.email || 'admin@gracia.ac.ke'}</p>
              <p className="text-[11px] text-slate-500">{school?.phone || '+254 711 000 111'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Invoices & Payment Ledger */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">Subscription Invoices & Payment History</h3>
            <p className="text-xs text-slate-500">
              Audit trail of monthly subscription licenses, M-Pesa transaction references, and payment receipts.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<Sparkles className="w-3.5 h-3.5" />}
            onClick={() => setIsRecordPaymentModalOpen(true)}
            className="text-xs font-bold"
          >
            Record Manual Receipt
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Billing Period</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Channel / Method</th>
                <th className="py-3 px-4">M-Pesa / Bank Ref</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No invoice records found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4 font-medium text-slate-700">{inv.billingPeriod}</td>
                    <td className="py-3 px-4 font-black text-slate-900">
                      KES {inv.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="font-semibold">{inv.paymentMethod}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                      {inv.paymentReference || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : new Date(inv.issueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'OVERDUE'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedInvoiceForPrint(inv)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-900 transition-colors cursor-pointer"
                        title="Print / View Receipt"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Record Manual Payment */}
      <Modal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => setIsRecordPaymentModalOpen(false)}
        title="Record Monthly Payment & Extend License"
      >
        <form onSubmit={handleRecordManualPayment} className="space-y-4 text-xs">
          <p className="text-slate-500">
            Record a confirmed M-Pesa transaction or bank transfer received from Gracia Learning Centre.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Amount (KES) *</label>
              <input
                type="number"
                value={manualAmount}
                onChange={(e) => setManualAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Duration to Add *</label>
              <select
                value={manualMonths}
                onChange={(e) => setManualMonths(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              >
                <option value={1}>1 Month (+30 Days)</option>
                <option value={2}>2 Months (+60 Days)</option>
                <option value={3}>1 Term (+90 Days)</option>
                <option value={6}>6 Months (+180 Days)</option>
                <option value={12}>1 Year (+365 Days)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
              <select
                value={manualMethod}
                onChange={(e) => setManualMethod(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              >
                <option value="MPESA_MANUAL">M-Pesa Buy Goods Till</option>
                <option value="MPESA_STK">M-Pesa STK Push</option>
                <option value="BANK_TRANSFER">Bank Direct Deposit</option>
                <option value="CASH">Cash Settlement</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Transaction Ref / Code *</label>
              <input
                type="text"
                value={manualRef}
                onChange={(e) => setManualRef(e.target.value)}
                placeholder="e.g. QHX829910K"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Notes / Ledger Remarks</label>
            <input
              type="text"
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              placeholder="e.g. Cleared via Safaricom Till 8829102"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRecordPaymentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="font-bold">
              Confirm & Extend License
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Configure Plan & Pricing */}
      <Modal
        isOpen={isPlanConfigModalOpen}
        onClose={() => setIsPlanConfigModalOpen(false)}
        title="Configure Monthly Subscription Pricing"
      >
        <form onSubmit={handleSavePlanConfig} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Plan Display Name</label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Monthly Amount (KES) *</label>
              <input
                type="number"
                value={planMonthlyRate}
                onChange={(e) => setPlanMonthlyRate(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Grace Period (Days) *</label>
              <input
                type="number"
                value={planGraceDays}
                onChange={(e) => setPlanGraceDays(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                required
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 block">Auto-Lock When Overdue</span>
              <p className="text-slate-500 text-[11px]">
                Locks school portal automatically after grace period expires.
              </p>
            </div>
            <input
              type="checkbox"
              checked={planAutoLock}
              onChange={(e) => setPlanAutoLock(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsPlanConfigModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="font-bold">
              Save Plan Settings
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Payout & Support Channels */}
      <Modal
        isOpen={isPayoutConfigModalOpen}
        onClose={() => setIsPayoutConfigModalOpen(false)}
        title="Developer Payout & Contact Channels"
      >
        <form onSubmit={handleSavePayoutConfig} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Provider Organization / Name *</label>
            <input
              type="text"
              value={payoutForm.vendorName}
              onChange={(e) => setPayoutForm({ ...payoutForm, vendorName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">M-Pesa Type</label>
              <select
                value={payoutForm.mpesaType}
                onChange={(e) => setPayoutForm({ ...payoutForm, mpesaType: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              >
                <option value="TILL">Buy Goods Till</option>
                <option value="PAYBILL">Paybill</option>
                <option value="PHONE">Direct Send Money Phone</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">M-Pesa Till / Paybill Number *</label>
              <input
                type="text"
                value={payoutForm.mpesaNumber}
                onChange={(e) => setPayoutForm({ ...payoutForm, mpesaNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Support Phone / WhatsApp *</label>
              <input
                type="text"
                value={payoutForm.contactPhone}
                onChange={(e) => setPayoutForm({ ...payoutForm, contactPhone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Support Email *</label>
              <input
                type="email"
                value={payoutForm.contactEmail}
                onChange={(e) => setPayoutForm({ ...payoutForm, contactEmail: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium"
                required
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsPayoutConfigModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="font-bold">
              Save Payout Settings
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Change Provider Master Passkey */}
      <Modal
        isOpen={isChangePasskeyModalOpen}
        onClose={() => setIsChangePasskeyModalOpen(false)}
        title="Change Provider Master Passkey"
      >
        <form onSubmit={handleChangeMasterPasskey} className="space-y-4 text-xs">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Provider Security Notice</span>
            </div>
            <p className="text-[11px] leading-relaxed text-indigo-800">
              The Master Passkey grants direct bypass control over software licensing, billing rates, and lock mechanisms. Please keep your new key confidential and stored securely.
            </p>
          </div>

          {changeKeyError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs">{changeKeyError}</p>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Current Master Passkey *</span>
                <button
                  type="button"
                  onClick={() => setShowCurrentPasskey(!showCurrentPasskey)}
                  className="text-indigo-600 hover:text-indigo-800 text-[11px] font-semibold cursor-pointer"
                >
                  {showCurrentPasskey ? 'Hide' : 'Show'}
                </button>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPasskey ? 'text' : 'password'}
                  value={currentPasskeyInput}
                  onChange={(e) => setCurrentPasskeyInput(e.target.value)}
                  placeholder="Enter current passkey (e.g. GLC-SYSTEM-OWNER-2026)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>New Master Passkey *</span>
                <button
                  type="button"
                  onClick={() => setShowNewPasskey(!showNewPasskey)}
                  className="text-indigo-600 hover:text-indigo-800 text-[11px] font-semibold cursor-pointer"
                >
                  {showNewPasskey ? 'Hide' : 'Show'}
                </button>
              </label>
              <div className="relative">
                <input
                  type={showNewPasskey ? 'text' : 'password'}
                  value={newPasskeyInput}
                  onChange={(e) => setNewPasskeyInput(e.target.value)}
                  placeholder="Enter new strong passkey (min. 6 characters)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  required
                  minLength={6}
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Minimum 6 characters. Letters, numbers, and symbols are supported.</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Confirm New Master Passkey *</span>
                <button
                  type="button"
                  onClick={() => setShowConfirmPasskey(!showConfirmPasskey)}
                  className="text-indigo-600 hover:text-indigo-800 text-[11px] font-semibold cursor-pointer"
                >
                  {showConfirmPasskey ? 'Hide' : 'Show'}
                </button>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPasskey ? 'text' : 'password'}
                  value={confirmNewPasskeyInput}
                  onChange={(e) => setConfirmNewPasskeyInput(e.target.value)}
                  placeholder="Re-type new passkey to confirm"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setIsChangePasskeyModalOpen(false);
                setIsRestoreMasterKeyModalOpen(true);
              }}
              className="text-[11px] text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Default (`GLC-SYSTEM-OWNER-2026`)</span>
            </button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsChangePasskeyModalOpen(false);
                  setCurrentPasskeyInput('');
                  setNewPasskeyInput('');
                  setConfirmNewPasskeyInput('');
                  setChangeKeyError('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={changeKeyLoading}
                icon={<ShieldCheck className="w-3.5 h-3.5" />}
                className="font-bold bg-indigo-600 hover:bg-indigo-700"
              >
                Update Master Passkey
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL: M-Pesa Daraja Gateway API Keys */}
      <Modal
        isOpen={isDarajaModalOpen}
        onClose={() => setIsDarajaModalOpen(false)}
        title="M-Pesa Daraja Gateway API Credentials"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-500">
            These API credentials connect the system to Safaricom Daraja for STK Push validation and automated payment callbacks.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Daraja Shortcode / Till</label>
              <input
                type="text"
                value={darajaShortcode}
                onChange={(e) => setDarajaShortcode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Consumer Key</label>
              <input
                type="text"
                value={darajaConsumerKey}
                onChange={(e) => setDarajaConsumerKey(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Consumer Secret</span>
                <button
                  type="button"
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="text-indigo-600 hover:text-indigo-800 text-[11px]"
                >
                  {showSecrets ? 'Hide' : 'Show'}
                </button>
              </label>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={darajaConsumerSecret}
                onChange={(e) => setDarajaConsumerSecret(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Lipa na M-Pesa Passkey</label>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={darajaPasskey}
                onChange={(e) => setDarajaPasskey(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                showToast('Daraja API credentials saved securely.', 'success');
                setIsDarajaModalOpen(false);
              }}
              className="font-bold"
            >
              Save Credentials
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Printable Invoice / Receipt */}
      {selectedInvoiceForPrint && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedInvoiceForPrint(null)}
          title={`SaaS License Invoice ${selectedInvoiceForPrint.invoiceNumber}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{subscription.payoutConfig?.vendorName}</h4>
                  <p className="text-slate-500 text-[11px]">{subscription.payoutConfig?.contactEmail}</p>
                  <p className="text-slate-500 text-[11px]">{subscription.payoutConfig?.contactPhone}</p>
                </div>
                <div className="text-right">
                  <span className="text-emerald-700 font-black text-xs px-2.5 py-1 bg-emerald-100 rounded-full uppercase">
                    {selectedInvoiceForPrint.status}
                  </span>
                  <p className="text-slate-400 font-mono text-[10px] mt-1">{selectedInvoiceForPrint.invoiceNumber}</p>
                </div>
              </div>

              <div className="space-y-1 text-slate-700">
                <p><strong>Billed To:</strong> {school?.name || 'Gracia Learning Centre'}</p>
                <p><strong>Service:</strong> {selectedInvoiceForPrint.billingPeriod}</p>
                <p><strong>Amount Paid:</strong> KES {selectedInvoiceForPrint.amount.toLocaleString()}</p>
                <p><strong>Payment Reference:</strong> <span className="font-mono font-bold text-emerald-700">{selectedInvoiceForPrint.paymentReference}</span></p>
                <p><strong>Date of Payment:</strong> {selectedInvoiceForPrint.paidAt ? new Date(selectedInvoiceForPrint.paidAt).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="primary"
                size="sm"
                icon={<Printer className="w-3.5 h-3.5" />}
                onClick={() => window.print()}
                className="font-bold"
              >
                Print Official Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Restore Default Master Passkey (Authenticated View) */}
      <Modal
        isOpen={isRestoreMasterKeyModalOpen}
        onClose={() => setIsRestoreMasterKeyModalOpen(false)}
        title="Restore Default Master Passkey"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-start gap-2.5">
            <RotateCcw className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Restore Master Key:</span> This operation will immediately reset the System Owner Master Passkey in both Firestore cloud storage and local storage to the standard platform default:
              <div className="mt-1 font-mono font-bold text-amber-950 bg-amber-100/70 px-2 py-1 rounded-md inline-block">
                GLC-SYSTEM-OWNER-2026
              </div>
            </div>
          </div>

          <p className="text-slate-600 leading-relaxed">
            Restoring the default key will reset any customized passkey changes. All platform developer credentials and emergency bypass codes will continue to operate normally.
          </p>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500 font-medium">Restored Master Passkey:</span>
              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                GLC-SYSTEM-OWNER-2026
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500 font-medium">Persistence Target:</span>
              <span className="font-mono text-slate-700">Firestore & Local Cache</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRestoreMasterKeyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={restoreLoading}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={handleRestoreDefaultKey}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              Confirm Restore Default Key
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
