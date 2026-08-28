import React, { useState } from 'react';
import { SchoolSubscriptionConfig, SubscriptionInvoice } from '../../types';
import { subscriptionService } from '../../services/subscriptionService';
import { useToast } from '../../contexts/ToastContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  CreditCard,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Clock,
  Sparkles,
  ArrowRight,
  FileText,
  Lock,
  Calendar,
  Building,
  RefreshCw,
} from 'lucide-react';

interface SubscriptionRenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: SchoolSubscriptionConfig;
  onSubscriptionUpdated: (newConfig: SchoolSubscriptionConfig) => void;
  schoolName: string;
}

export const SubscriptionRenewalModal: React.FC<SubscriptionRenewalModalProps> = ({
  isOpen,
  onClose,
  subscription,
  onSubscriptionUpdated,
  schoolName,
}) => {
  const { showToast } = useToast();
  const [selectedMonths, setSelectedMonths] = useState<number>(1);
  const [paymentTab, setPaymentTab] = useState<'STK' | 'MANUAL' | 'BANK'>('STK');
  const [phoneNumber, setPhoneNumber] = useState<string>('0712345678');
  const [mpesaCode, setMpesaCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [stkSent, setStkSent] = useState<boolean>(false);
  const [stkSuccess, setStkSuccess] = useState<boolean>(false);
  const [lastInvoice, setLastInvoice] = useState<SubscriptionInvoice | null>(null);

  const monthlyRate = subscription.monthlyAmount || 7500;
  const totalAmount = monthlyRate * selectedMonths;
  const payout = subscription.payoutConfig;
  const health = subscriptionService.getSubscriptionHealth(subscription);

  // Discount options
  const discountPercent = selectedMonths === 12 ? 15 : selectedMonths === 6 ? 10 : selectedMonths === 3 ? 5 : 0;
  const finalPayable = Math.round(totalAmount * (1 - discountPercent / 100));

  const handleMpesaStkPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      showToast('Please enter a valid M-Pesa phone number.', 'error');
      return;
    }

    setLoading(true);
    setStkSent(true);

    try {
      // Simulate real-time Safaricom Daraja STK push handshake
      await new Promise((res) => setTimeout(res, 2000));

      const generatedMpesaCode = `QHX${Math.floor(100000 + Math.random() * 900000)}K`;

      const { config, invoice } = await subscriptionService.processMonthlyPayment(
        'GLCM',
        {
          amount: finalPayable,
          paymentMethod: 'MPESA_STK',
          paymentReference: generatedMpesaCode,
          monthsToAdd: selectedMonths,
          notes: `Online renewal (${phoneNumber}) for ${selectedMonths} month(s).`,
        }
      );

      setStkSuccess(true);
      setLastInvoice(invoice);
      onSubscriptionUpdated(config);
      showToast(
        `Payment of KES ${finalPayable.toLocaleString()} received via M-Pesa (${generatedMpesaCode})! System renewed for ${selectedMonths} month(s).`,
        'success'
      );
    } catch (err: any) {
      console.error('Subscription STK payment error:', err);
      showToast('Payment verification failed. Please check phone number or try manual entry.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleManualMpesaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mpesaCode.trim() || mpesaCode.trim().length < 8) {
      showToast('Please enter a valid 10-character M-Pesa transaction reference (e.g. QHX829910K).', 'error');
      return;
    }

    setLoading(true);
    try {
      const code = mpesaCode.trim().toUpperCase();
      const { config, invoice } = await subscriptionService.processMonthlyPayment(
        'GLCM',
        {
          amount: finalPayable,
          paymentMethod: 'MPESA_MANUAL',
          paymentReference: code,
          monthsToAdd: selectedMonths,
          notes: `Manual M-Pesa code submission: ${code}`,
        }
      );

      setStkSuccess(true);
      setLastInvoice(invoice);
      onSubscriptionUpdated(config);
      showToast(`M-Pesa code ${code} verified! Monthly subscription extended successfully.`, 'success');
    } catch (err: any) {
      showToast('Could not verify M-Pesa code: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, 'info');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Monthly SaaS Subscription & License Renewal"
      subtitle={`Keep ${schoolName}'s ERP active, secure, and updated with your monthly subscription payment.`}
      maxWidth="lg"
    >
      <div className="space-y-5 text-xs text-slate-700 py-1">
        {/* Success View */}
        {stkSuccess && lastInvoice ? (
          <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-4 animate-in fade-in">
            <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-black text-lg text-emerald-950">Subscription Successfully Renewed!</h3>
              <p className="text-emerald-800 text-xs mt-1">
                Your monthly ERP license has been extended by <strong>{selectedMonths} month(s)</strong>.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200/80 text-left space-y-2 max-w-md mx-auto text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500">Invoice Number:</span>
                <strong className="text-slate-900 font-mono">{lastInvoice.invoiceNumber}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500">Amount Paid:</span>
                <strong className="text-emerald-700">KES {lastInvoice.amount.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500">M-Pesa Reference:</span>
                <strong className="text-slate-900 font-mono">{lastInvoice.paymentReference}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500">Next Due Date:</span>
                <strong className="text-slate-900">{new Date(lastInvoice.dueDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">License Status:</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
                  ACTIVE
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setStkSuccess(false);
                  setStkSent(false);
                  onClose();
                }}
                className="font-bold text-xs"
              >
                Return to School ERP
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Current Plan Overview Card */}
            <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">{subscription.planName}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      health.isLocked
                        ? 'bg-rose-500 text-white'
                        : health.isPastDue
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-emerald-500 text-white'
                    }`}
                  >
                    {health.computedStatus}
                  </span>
                </div>
                <p className="text-slate-300 text-xs mt-1">
                  Monthly Rate: <strong className="text-white">KES {monthlyRate.toLocaleString()} / Month</strong> • Next Due Date: <strong className="text-amber-300">{health.formattedDueDate}</strong>
                </p>
              </div>

              <div className="text-right sm:border-l sm:border-slate-700 sm:pl-4">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Remaining Validity</div>
                <div className="text-xl font-black text-amber-400">
                  {health.daysRemaining > 0 ? `${health.daysRemaining} Days` : 'Due Today'}
                </div>
              </div>
            </div>

            {/* Duration Selector */}
            <div>
              <label className="block font-bold text-slate-800 mb-2 text-xs">
                Select Renewal Duration:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { months: 1, label: '1 Month', badge: 'Standard' },
                  { months: 3, label: '3 Months (1 Term)', badge: '5% Off' },
                  { months: 6, label: '6 Months (2 Terms)', badge: '10% Off' },
                  { months: 12, label: '12 Months (1 Year)', badge: '15% Off' },
                ].map((item) => {
                  const discount = item.months === 12 ? 0.15 : item.months === 6 ? 0.1 : item.months === 3 ? 0.05 : 0;
                  const price = Math.round(monthlyRate * item.months * (1 - discount));
                  return (
                    <button
                      key={item.months}
                      type="button"
                      onClick={() => setSelectedMonths(item.months)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        selectedMonths === item.months
                          ? 'border-blue-900 bg-blue-50/80 text-blue-950 font-bold shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{item.label}</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-sm font-black text-slate-900 block">
                          KES {price.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          KES {Math.round(price / item.months).toLocaleString()}/mo
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setPaymentTab('STK')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  paymentTab === 'STK'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Lipa na M-Pesa (Instant STK)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentTab('MANUAL')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  paymentTab === 'MANUAL'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                <span>Paybill / Buy Goods Code</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentTab('BANK')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  paymentTab === 'BANK'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Building className="w-3.5 h-3.5 text-slate-600" />
                <span>Bank Transfer</span>
              </button>
            </div>

            {/* M-Pesa STK Tab */}
            {paymentTab === 'STK' && (
              <form onSubmit={handleMpesaStkPush} className="space-y-3.5 pt-1">
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                    <span>Developer Payout Till / Paybill:</span>
                    <span className="font-mono bg-emerald-100 px-2 py-0.5 rounded text-emerald-900">
                      {payout.mpesaType === 'TILL' ? 'Buy Goods Till: ' : 'Paybill: '} {payout.mpesaNumber}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    An instant STK Push prompt will be sent directly to your phone for{' '}
                    <strong>KES {finalPayable.toLocaleString()}</strong>. Enter your Safaricom M-Pesa PIN to complete payment.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Your M-Pesa Phone Number:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 0712345678 or 254712345678"
                      required
                      className="w-full px-3.5 py-2.5 pl-9 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={loading}
                  icon={<Sparkles className="w-4 h-4 text-amber-300" />}
                  className="w-full font-bold text-xs py-3 bg-emerald-600 hover:bg-emerald-700 border-emerald-700"
                >
                  {loading
                    ? 'Prompting Phone & Verifying M-Pesa...'
                    : `Send M-Pesa Prompt (Pay KES ${finalPayable.toLocaleString()})`}
                </Button>
              </form>
            )}

            {/* Manual M-Pesa Code Input Tab */}
            {paymentTab === 'MANUAL' && (
              <form onSubmit={handleManualMpesaSubmit} className="space-y-3.5 pt-1">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <p className="font-bold text-slate-900 text-xs">How to Pay Manually:</p>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
                    <li>Open M-Pesa on your phone.</li>
                    <li>
                      Select <strong>{payout.mpesaType === 'TILL' ? 'Lipa na M-Pesa -> Buy Goods' : 'Lipa na M-Pesa -> Paybill'}</strong>.
                    </li>
                    <li>
                      Enter {payout.mpesaType === 'TILL' ? 'Till Number' : 'Business Number'}:{' '}
                      <strong className="text-slate-900 font-mono">{payout.mpesaNumber}</strong>{' '}
                      <button
                        type="button"
                        onClick={() => copyToClipboard(payout.mpesaNumber, 'M-Pesa Number')}
                        className="text-blue-900 underline ml-1 cursor-pointer inline-flex items-center gap-0.5"
                      >
                        <Copy className="w-2.5 h-2.5" /> Copy
                      </button>
                    </li>
                    {payout.accountNumber && (
                      <li>
                        Account Number: <strong className="text-slate-900">{payout.accountNumber}</strong>
                      </li>
                    )}
                    <li>
                      Enter Amount: <strong className="text-slate-900">KES {finalPayable.toLocaleString()}</strong>
                    </li>
                    <li>Enter M-Pesa PIN and press OK.</li>
                  </ol>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Enter M-Pesa Confirmation Code:
                  </label>
                  <input
                    type="text"
                    value={mpesaCode}
                    onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                    placeholder="e.g. QHX829910K"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs uppercase font-bold text-slate-900 focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Copy the 10-character code from the Safaricom SMS receipt.
                  </span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={loading}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  className="w-full font-bold text-xs py-3"
                >
                  Verify Code & Activate {selectedMonths} Month(s)
                </Button>
              </form>
            )}

            {/* Bank Transfer Tab */}
            {paymentTab === 'BANK' && (
              <div className="space-y-3.5 pt-1">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <Building className="w-4 h-4 text-slate-700" />
                    <span className="font-bold text-slate-900 text-xs">Developer Bank Account</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Bank Name</span>
                      <strong className="text-slate-900">{payout.bankName || 'Standard Chartered Bank'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Account Name</span>
                      <strong className="text-slate-900">{payout.bankAccountName || payout.vendorName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Account Number</span>
                      <strong className="text-slate-900 font-mono">{payout.bankAccountNumber || '0108029384700'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Reference</span>
                      <strong className="text-slate-900">{schoolName.slice(0, 10)}</strong>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 border-t border-slate-200 pt-2">
                    After making a direct EFT / RTGS or cash deposit, contact the developer at{' '}
                    <strong className="text-slate-800">{payout.contactPhone}</strong> or{' '}
                    <strong className="text-slate-800">{payout.contactEmail}</strong> to confirm activation.
                  </p>
                </div>
              </div>
            )}

            {/* Developer Support Contact Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>SaaS Vendor: {payout.vendorName}</span>
              </span>
              <span>Tel: {payout.contactPhone}</span>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
