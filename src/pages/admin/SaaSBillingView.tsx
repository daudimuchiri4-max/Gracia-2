import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  SchoolSubscriptionConfig,
  SubscriptionInvoice,
  DeveloperPayoutConfig,
} from '../../types';
import { subscriptionService, DEFAULT_SUBSCRIPTION_CONFIG } from '../../services/subscriptionService';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SubscriptionRenewalModal } from '../../components/subscription/SubscriptionRenewalModal';
import {
  CreditCard,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Plus,
  FileText,
  Clock,
  Sparkles,
  RefreshCw,
  Printer,
  Copy,
  Building,
  DollarSign,
  Calendar,
  Key,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

export const SaaSBillingView: React.FC = () => {
  const { school, activeRole } = useAuth();
  const { showToast } = useToast();

  const [subscription, setSubscription] = useState<SchoolSubscriptionConfig>(DEFAULT_SUBSCRIPTION_CONFIG);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState<boolean>(false);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState<boolean>(false);
  const [isPayoutConfigModalOpen, setIsPayoutConfigModalOpen] = useState<boolean>(false);
  const [isPlanConfigModalOpen, setIsPlanConfigModalOpen] = useState<boolean>(false);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<SubscriptionInvoice | null>(null);

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

  const loadData = async () => {
    setLoading(true);
    try {
      const config = await subscriptionService.getSubscriptionConfig(school?.id);
      const invoiceList = await subscriptionService.getInvoices(school?.id);
      setSubscription(config);
      setInvoices(invoiceList);
      setPayoutForm(config.payoutConfig);
      setPlanMonthlyRate(config.monthlyAmount);
      setPlanGraceDays(config.gracePeriodDays || 5);
      setPlanAutoLock(config.autoLockOnOverdue ?? true);
      setPlanName(config.planName || 'CBC Pro Cloud School ERP (Monthly)');
    } catch (e) {
      console.warn('Error loading subscription data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [school?.id]);

  const health = subscriptionService.getSubscriptionHealth(subscription);
  const isSuperAdmin = activeRole === 'SUPER_ADMIN' || activeRole === 'SCHOOL_ADMIN';

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
          amount: Number(manualAmount),
          paymentMethod: manualMethod,
          paymentReference: manualRef.trim().toUpperCase(),
          monthsToAdd: Number(manualMonths),
          notes: manualNotes.trim() || `Recorded by administrator (${activeRole}).`,
        }
      );

      setSubscription(config);
      setInvoices([invoice, ...invoices]);
      setIsRecordPaymentModalOpen(false);
      setManualRef('');
      setManualNotes('');
      showToast(`Payment recorded! License extended by ${manualMonths} month(s).`, 'success');
    } catch (err: any) {
      showToast('Failed to record payment: ' + err.message, 'error');
    }
  };

  const handleSavePayoutConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedConfig: SchoolSubscriptionConfig = {
        ...subscription,
        payoutConfig: payoutForm,
      };
      await subscriptionService.saveSubscriptionConfig(school?.id || 'GLCM', updatedConfig);
      setSubscription(updatedConfig);
      setIsPayoutConfigModalOpen(false);
      showToast('Developer payout channel & M-Pesa details updated successfully!', 'success');
    } catch (err: any) {
      showToast('Failed to update payout configuration: ' + err.message, 'error');
    }
  };

  const handleSavePlanConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedConfig: SchoolSubscriptionConfig = {
        ...subscription,
        planName,
        monthlyAmount: Number(planMonthlyRate),
        gracePeriodDays: Number(planGraceDays),
        autoLockOnOverdue: planAutoLock,
      };
      await subscriptionService.saveSubscriptionConfig(school?.id || 'GLCM', updatedConfig);
      setSubscription(updatedConfig);
      setIsPlanConfigModalOpen(false);
      showToast('Monthly subscription rate and rules saved successfully!', 'success');
    } catch (err: any) {
      showToast('Failed to update plan configuration: ' + err.message, 'error');
    }
  };

  const handleToggleLock = async () => {
    const shouldLock = subscription.status !== 'LOCKED';
    try {
      const updated = await subscriptionService.setLockStatus(
        school?.id || 'GLCM',
        shouldLock,
        shouldLock ? 'Manual suspension by developer/system administrator.' : undefined
      );
      setSubscription(updated);
      showToast(shouldLock ? 'School ERP locked.' : 'School ERP unlocked and active.', 'info');
    } catch (err: any) {
      showToast('Lock toggle error: ' + err.message, 'error');
    }
  };

  const handleGrantGrace = async () => {
    try {
      const updated = await subscriptionService.grantGraceExtension(school?.id || 'GLCM', 7);
      setSubscription(updated);
      showToast('7-day emergency grace period extension granted!', 'success');
    } catch (err: any) {
      showToast('Grace extension error: ' + err.message, 'error');
    }
  };

  const handleRegenerateKey = async () => {
    const newKey = subscriptionService.generateLicenseKey(school?.code || 'GLCM');
    try {
      const updated: SchoolSubscriptionConfig = {
        ...subscription,
        licenseKey: newKey,
      };
      await subscriptionService.saveSubscriptionConfig(school?.id || 'GLCM', updated);
      setSubscription(updated);
      showToast(`New license key generated: ${newKey}`, 'success');
    } catch (err: any) {
      showToast('Key generation error: ' + err.message, 'error');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              SaaS Monthly Subscription & Client Billing
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                health.isLocked
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : health.isPastDue
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}
            >
              {health.computedStatus}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage the client's monthly software subscription fee, M-Pesa payout accounts, license keys, and automated invoices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            icon={<Sparkles className="w-4 h-4 text-amber-300" />}
            onClick={() => setIsRenewalModalOpen(true)}
            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 border-emerald-700"
          >
            Pay Monthly Subscription (M-Pesa)
          </Button>

          {isSuperAdmin && (
            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setManualAmount(subscription.monthlyAmount);
                setIsRecordPaymentModalOpen(true);
              }}
              className="text-xs font-bold text-slate-800"
            >
              Record Payment
            </Button>
          )}
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Monthly Fee Rate</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            KES {subscription.monthlyAmount.toLocaleString()}
            <span className="text-xs font-normal text-slate-500 ml-1">/ month</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Plan: <strong className="text-slate-800">{subscription.planName}</strong>
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Next Renewal Due</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {health.formattedDueDate}
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span className={health.daysRemaining <= 5 ? 'font-bold text-amber-700' : 'text-slate-600'}>
              {health.daysRemaining > 0 ? `${health.daysRemaining} days remaining` : 'Payment Due'}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Developer Payout Channel</span>
            <Phone className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-slate-900 font-mono">
            {subscription.payoutConfig.mpesaType === 'TILL' ? 'Till ' : 'Paybill '}
            {subscription.payoutConfig.mpesaNumber}
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            Vendor: <strong className="text-slate-800">{subscription.payoutConfig.vendorName}</strong>
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Software License Key</span>
            <Key className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xs font-black text-slate-900 font-mono truncate bg-slate-50 p-1.5 rounded-lg border border-slate-200 flex items-center justify-between">
            <span>{subscription.licenseKey || 'LIC-2026-GLCM'}</span>
            <button
              onClick={() => copyToClipboard(subscription.licenseKey, 'License Key')}
              className="text-blue-900 hover:text-blue-700 cursor-pointer ml-1"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Grace: {subscription.gracePeriodDays || 5} days</span>
            <span className="text-emerald-700 font-semibold">256-Bit SSL Protected</span>
          </div>
        </div>
      </div>

      {/* Developer & Vendor Management Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Developer Payout Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">Developer M-Pesa Payout Info</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setPayoutForm(subscription.payoutConfig);
                setIsPayoutConfigModalOpen(true);
              }}
              className="text-xs text-blue-900 font-bold hover:underline cursor-pointer"
            >
              Edit Details
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Software Vendor:</span>
              <strong className="text-slate-900">{subscription.payoutConfig.vendorName}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">M-Pesa Channel:</span>
              <strong className="text-emerald-700 font-mono">
                {subscription.payoutConfig.mpesaType === 'TILL' ? 'Buy Goods Till: ' : 'Paybill: '}
                {subscription.payoutConfig.mpesaNumber}
              </strong>
            </div>
            {subscription.payoutConfig.accountNumber && (
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Account Reference:</span>
                <strong className="text-slate-900">{subscription.payoutConfig.accountNumber}</strong>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Contact Phone:</span>
              <strong className="text-slate-900">{subscription.payoutConfig.contactPhone}</strong>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Contact Email:</span>
              <strong className="text-slate-900">{subscription.payoutConfig.contactEmail}</strong>
            </div>
          </div>
        </div>

        {/* Plan Configuration & Rules */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">Subscription Plan & Rules</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setPlanMonthlyRate(subscription.monthlyAmount);
                setPlanGraceDays(subscription.gracePeriodDays || 5);
                setPlanAutoLock(subscription.autoLockOnOverdue ?? true);
                setPlanName(subscription.planName);
                setIsPlanConfigModalOpen(true);
              }}
              className="text-xs text-blue-900 font-bold hover:underline cursor-pointer"
            >
              Configure Plan
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Billing Cycle:</span>
              <strong className="text-slate-900">{subscription.billingCycle}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Monthly Price:</span>
              <strong className="text-slate-900">KES {subscription.monthlyAmount.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Grace Period:</span>
              <strong className="text-slate-900">{subscription.gracePeriodDays || 5} Days</strong>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Auto-Lock on Overdue:</span>
              <strong className={subscription.autoLockOnOverdue ? 'text-emerald-700' : 'text-slate-500'}>
                {subscription.autoLockOnOverdue ? 'Enabled (Auto-Protect)' : 'Disabled'}
              </strong>
            </div>
          </div>
        </div>

        {/* Developer Emergency & License Actions */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-sm text-slate-900">Developer Actions</h3>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGrantGrace}
              className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl font-bold text-xs flex items-center justify-between cursor-pointer transition-colors"
            >
              <span>Grant +7 Days Grace Extension</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </button>

            <button
              type="button"
              onClick={handleToggleLock}
              className={`w-full py-2 px-3 border rounded-xl font-bold text-xs flex items-center justify-between cursor-pointer transition-colors ${
                subscription.status === 'LOCKED'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <span>{subscription.status === 'LOCKED' ? 'Unlock Client ERP Access' : 'Lock / Suspend Client ERP'}</span>
              {subscription.status === 'LOCKED' ? (
                <Unlock className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-rose-600" />
              )}
            </button>

            <button
              type="button"
              onClick={handleRegenerateKey}
              className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl font-bold text-xs flex items-center justify-between cursor-pointer transition-colors"
            >
              <span>Regenerate License Key</span>
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Invoices & Payment History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-900" />
            <h3 className="font-bold text-sm text-slate-900">Monthly Invoices & SaaS Payment Ledger</h3>
          </div>
          <span className="text-xs text-slate-500">{invoices.length} Invoices Recorded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Invoice No.</th>
                <th className="px-5 py-3">Billing Period</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Payment Method</th>
                <th className="px-5 py-3">M-Pesa / Slip Ref</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Paid Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-900">{inv.billingPeriod}</td>
                  <td className="px-5 py-3.5 font-bold text-slate-900">
                    KES {inv.amount.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                      {inv.paymentMethod?.replace('_', ' ') || 'MPESA'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-slate-700 font-semibold">
                    {inv.paymentReference || '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">
                    {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setSelectedInvoiceForPrint(inv)}
                      className="p-1.5 hover:bg-slate-100 text-blue-900 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 font-bold text-[11px]"
                      title="Print Official SaaS Tax Invoice"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    No monthly subscription invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Manual Payment Modal */}
      <Modal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => setIsRecordPaymentModalOpen(false)}
        title="Record Client Monthly Payment"
        subtitle="Manually record M-Pesa, bank transfer, or cash received from client to extend license."
        maxWidth="md"
      >
        <form onSubmit={handleRecordManualPayment} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Months to Extend License:</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 12].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setManualMonths(m);
                    setManualAmount(subscription.monthlyAmount * m);
                  }}
                  className={`py-2 px-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    manualMonths === m
                      ? 'border-blue-900 bg-blue-50 text-blue-950 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  +{m} Month{m > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Payment Amount (KES):</label>
            <input
              type="number"
              value={manualAmount}
              onChange={(e) => setManualAmount(Number(e.target.value))}
              required
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Payment Method:</label>
            <select
              value={manualMethod}
              onChange={(e: any) => setManualMethod(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold text-slate-900"
            >
              <option value="MPESA_MANUAL">Lipa na M-Pesa (Buy Goods / Till)</option>
              <option value="MPESA_STK">M-Pesa STK Push</option>
              <option value="BANK_TRANSFER">Direct Bank Wire / EFT</option>
              <option value="CASH">Cash Deposit</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Transaction / Receipt Code:</label>
            <input
              type="text"
              value={manualRef}
              onChange={(e) => setManualRef(e.target.value.toUpperCase())}
              placeholder="e.g. QHX829910K or BANK-REF-0982"
              required
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 uppercase"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Admin Notes:</label>
            <textarea
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes or receipt remarks..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRecordPaymentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="font-bold text-xs">
              Confirm & Extend License
            </Button>
          </div>
        </form>
      </Modal>

      {/* Developer Payout Config Modal */}
      <Modal
        isOpen={isPayoutConfigModalOpen}
        onClose={() => setIsPayoutConfigModalOpen(false)}
        title="Developer / Vendor Payout Details"
        subtitle="Specify your M-Pesa Till or Paybill where the client will send monthly subscription fees."
        maxWidth="md"
      >
        <form onSubmit={handleSavePayoutConfig} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Vendor / Developer Name:</label>
            <input
              type="text"
              value={payoutForm.vendorName}
              onChange={(e) => setPayoutForm({ ...payoutForm, vendorName: e.target.value })}
              required
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">M-Pesa Type:</label>
              <select
                value={payoutForm.mpesaType}
                onChange={(e: any) => setPayoutForm({ ...payoutForm, mpesaType: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold"
              >
                <option value="TILL">Buy Goods Till</option>
                <option value="PAYBILL">Paybill</option>
                <option value="PHONE">Phone Number</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">M-Pesa Number:</label>
              <input
                type="text"
                value={payoutForm.mpesaNumber}
                onChange={(e) => setPayoutForm({ ...payoutForm, mpesaNumber: e.target.value })}
                placeholder="e.g. 8829102"
                required
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono font-bold"
              />
            </div>
          </div>

          {payoutForm.mpesaType === 'PAYBILL' && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Account Reference:</label>
              <input
                type="text"
                value={payoutForm.accountNumber || ''}
                onChange={(e) => setPayoutForm({ ...payoutForm, accountNumber: e.target.value })}
                placeholder="e.g. SCH-GLCM or SCHOOL CODE"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Support Phone:</label>
              <input
                type="text"
                value={payoutForm.contactPhone}
                onChange={(e) => setPayoutForm({ ...payoutForm, contactPhone: e.target.value })}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Support Email:</label>
              <input
                type="email"
                value={payoutForm.contactEmail}
                onChange={(e) => setPayoutForm({ ...payoutForm, contactEmail: e.target.value })}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPayoutConfigModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="font-bold text-xs">
              Save Payout Info
            </Button>
          </div>
        </form>
      </Modal>

      {/* Plan & Pricing Config Modal */}
      <Modal
        isOpen={isPlanConfigModalOpen}
        onClose={() => setIsPlanConfigModalOpen(false)}
        title="Configure Monthly Subscription Plan"
        subtitle="Set the client's monthly rate, grace period, and auto-suspension behavior."
        maxWidth="md"
      >
        <form onSubmit={handleSavePlanConfig} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Plan Display Name:</label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              required
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Monthly Fee (KES):</label>
              <input
                type="number"
                value={planMonthlyRate}
                onChange={(e) => setPlanMonthlyRate(Number(e.target.value))}
                min={1000}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Grace Period (Days):</label>
              <input
                type="number"
                value={planGraceDays}
                onChange={(e) => setPlanGraceDays(Number(e.target.value))}
                min={0}
                max={30}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-slate-900"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={planAutoLock}
                onChange={(e) => setPlanAutoLock(e.target.checked)}
                className="w-4 h-4 rounded text-blue-900"
              />
              <div>
                <span className="font-bold text-slate-900 block">Auto-Lock When Overdue</span>
                <span className="text-[11px] text-slate-500">
                  Automatically show the lock screen if client fails to pay after the grace period.
                </span>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPlanConfigModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="font-bold text-xs">
              Save Plan Settings
            </Button>
          </div>
        </form>
      </Modal>

      {/* Subscription Renewal Modal (Client Self-Service) */}
      <SubscriptionRenewalModal
        isOpen={isRenewalModalOpen}
        onClose={() => setIsRenewalModalOpen(false)}
        subscription={subscription}
        onSubscriptionUpdated={(newConfig) => {
          setSubscription(newConfig);
          loadData();
        }}
        schoolName={school?.name || 'School'}
      />

      {/* Invoice Printable View Modal */}
      {selectedInvoiceForPrint && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedInvoiceForPrint(null)}
          title={`SaaS Tax Invoice: ${selectedInvoiceForPrint.invoiceNumber}`}
          maxWidth="md"
        >
          <div className="p-5 bg-white rounded-xl space-y-4 text-xs font-sans">
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <h2 className="font-black text-base text-slate-900">{subscription.payoutConfig.vendorName}</h2>
                <p className="text-slate-500 text-[11px]">{subscription.payoutConfig.contactEmail}</p>
                <p className="text-slate-500 text-[11px]">{subscription.payoutConfig.contactPhone}</p>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[11px]">
                  {selectedInvoiceForPrint.status}
                </span>
                <p className="font-mono font-bold text-slate-800 text-xs mt-1">
                  {selectedInvoiceForPrint.invoiceNumber}
                </p>
                <p className="text-[10px] text-slate-400">
                  Issued: {new Date(selectedInvoiceForPrint.issueDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Billed To (Client Institution):</p>
              <h4 className="font-bold text-slate-900 text-sm">{school?.name}</h4>
              <p className="text-slate-500 text-xs">{school?.address}</p>
              <p className="text-slate-500 text-xs">{school?.phone}</p>
            </div>

            <table className="w-full text-left border-t border-b border-slate-200 py-2">
              <thead>
                <tr className="text-slate-500 text-[10px] uppercase">
                  <th className="py-2">Description</th>
                  <th className="py-2 text-right">Amount (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr>
                  <td className="py-2.5">
                    {selectedInvoiceForPrint.billingPeriod}
                    <div className="text-[10px] text-slate-400">Software as a Service (Cloud ERP Hosting & Support)</div>
                  </td>
                  <td className="py-2.5 text-right font-bold text-slate-900">
                    KES {selectedInvoiceForPrint.amount.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
              <div>
                <span className="text-slate-500 text-[10px] block">Payment Reference</span>
                <strong className="font-mono text-slate-900 text-xs">{selectedInvoiceForPrint.paymentReference}</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-[10px] block">Total Amount Paid</span>
                <strong className="text-emerald-700 text-sm font-black">
                  KES {selectedInvoiceForPrint.amount.toLocaleString()}
                </strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="primary"
                size="sm"
                icon={<Printer className="w-4 h-4" />}
                onClick={() => window.print()}
                className="font-bold text-xs"
              >
                Print / Save PDF
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
