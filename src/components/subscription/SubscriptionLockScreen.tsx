import React, { useState } from 'react';
import { SchoolSubscriptionConfig } from '../../types';
import { subscriptionService } from '../../services/subscriptionService';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import {
  Lock,
  Phone,
  Mail,
  MessageSquare,
  Globe,
  Key,
  ShieldCheck,
  Building,
  CheckCircle2,
} from 'lucide-react';

interface SubscriptionLockScreenProps {
  subscription: SchoolSubscriptionConfig;
  schoolName: string;
  onSubscriptionUpdated: (config: SchoolSubscriptionConfig) => void;
  onOpenPublicSite: () => void;
  onOpenSystemOwnerConsole?: () => void;
}

export const SubscriptionLockScreen: React.FC<SubscriptionLockScreenProps> = ({
  subscription,
  schoolName,
  onSubscriptionUpdated,
  onOpenPublicSite,
  onOpenSystemOwnerConsole,
}) => {
  const { showToast } = useToast();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isOwnerLoginOpen, setIsOwnerLoginOpen] = useState(false);
  const [ownerKey, setOwnerKey] = useState('');
  const [loadingOwnerAuth, setLoadingOwnerAuth] = useState(false);
  const [ownerAuthError, setOwnerAuthError] = useState('');

  const payout = subscription.payoutConfig;

  const handleSystemOwnerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingOwnerAuth(true);
    setOwnerAuthError('');

    setTimeout(async () => {
      const verified = subscriptionService.authenticateSystemOwner(ownerKey);
      if (verified) {
        // Unlock subscription with 14-day emergency grace period or route to console
        try {
          const updated = await subscriptionService.grantGraceExtension(
            schoolName || 'GLCM',
            14
          );
          onSubscriptionUpdated(updated);
          showToast('System Owner authenticated. System access unlocked.', 'success');
          if (onOpenSystemOwnerConsole) {
            onOpenSystemOwnerConsole();
          }
        } catch (e: any) {
          showToast(e.message || 'Access granted.', 'info');
        }
        setIsOwnerLoginOpen(false);
      } else {
        setOwnerAuthError('Invalid System Owner Master Key.');
        showToast('Invalid System Owner Master Key.', 'error');
      }
      setLoadingOwnerAuth(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-white relative font-sans select-none">
      {/* Main Lock Card */}
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center relative overflow-hidden">
        {/* Lock Icon Badge */}
        <div className={`w-16 h-16 rounded-3xl ${subscription.status === 'SUSPENDED' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'} border flex items-center justify-center mx-auto shadow-inner`}>
          <Lock className="w-8 h-8" />
        </div>

        {/* Institution Title */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
              {schoolName || 'Gracia Learning Centre'}
            </span>
            {subscription.status === 'SUSPENDED' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Suspended
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white leading-snug">
            {subscription.status === 'SUSPENDED'
              ? 'Your system subscription has been suspended. Please contact your system provider.'
              : 'Your system subscription has expired. Please contact your system provider.'}
          </h1>
          {subscription.lockedReason && (
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-300 text-left">
              <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Provider Notice:</span>
              <p>{subscription.lockedReason}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => setIsContactModalOpen(true)}
            className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 border border-indigo-400/30"
          >
            <Phone className="w-4 h-4" />
            <span>CONTACT SYSTEM PROVIDER</span>
          </button>

          <button
            onClick={onOpenPublicSite}
            className="w-full py-3 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 border border-slate-700"
          >
            <Globe className="w-4 h-4 text-blue-400" />
            <span>Open Public Website</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between text-[11px] text-slate-500">
          <span>Software Protection Engine</span>
          <button
            type="button"
            onClick={() => setIsOwnerLoginOpen(true)}
            className="text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer underline flex items-center gap-1"
          >
            <Key className="w-3 h-3" />
            <span>System Owner Login</span>
          </button>
        </div>
      </div>

      {/* MODAL: Contact System Provider */}
      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title="Contact System Provider"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Please reach out to the system owner or support team to renew or reactivate the system subscription for <strong>{schoolName || 'Gracia Learning Centre'}</strong>.
          </p>

          <div className="space-y-3">
            {/* Provider Name */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">System Provider</span>
              <p className="font-bold text-slate-900 text-sm">{payout.vendorName || 'Lead Software Architect / EdTech Solutions Ltd'}</p>
            </div>

            {/* Direct Telephone */}
            <a
              href={`tel:${payout.contactPhone || '+254700889900'}`}
              className="p-3.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl flex items-center justify-between transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-blue-700 uppercase block">Call Support Hotline</span>
                  <p className="font-bold text-blue-950 font-mono text-sm">{payout.contactPhone || '+254 700 889 900'}</p>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-600 group-hover:underline">Call Now</span>
            </a>

            {/* Support Email */}
            <a
              href={`mailto:${payout.contactEmail || 'billing@edtechsolutions.co.ke'}?subject=Subscription Renewal for ${schoolName || 'Gracia Learning Centre'}`}
              className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-700 text-white flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Email Provider Support</span>
                  <p className="font-bold text-slate-900 font-mono text-xs">{payout.contactEmail || 'billing@edtechsolutions.co.ke'}</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-600 group-hover:underline">Send Email</span>
            </a>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsContactModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: System Owner Login */}
      <Modal
        isOpen={isOwnerLoginOpen}
        onClose={() => setIsOwnerLoginOpen(false)}
        title="System Owner / Provider Access"
      >
        <form onSubmit={handleSystemOwnerLogin} className="space-y-4 text-xs">
          <p className="text-slate-500">
            Enter the provider master authorization key to unlock and manage the Gracia Learning Centre instance.
          </p>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-700">
                Provider Master Key:
              </label>
              <button
                type="button"
                onClick={() => {
                  setOwnerKey('GLC-SYSTEM-OWNER-2026');
                  setOwnerAuthError('');
                }}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline"
              >
                Use Default Key
              </button>
            </div>
            <input
              type="password"
              value={ownerKey}
              onChange={(e) => setOwnerKey(e.target.value)}
              placeholder="e.g. GLC-SYSTEM-OWNER-2026"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-sm"
              required
              autoFocus
            />
            {ownerAuthError && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{ownerAuthError}</p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await subscriptionService.restoreDefaultMasterPasskey(schoolName || 'GLCM');
                  setOwnerKey(res.defaultKey);
                  showToast('Master Passkey restored to default.', 'success');
                } catch (e: any) {
                  showToast(e.message || 'Failed to restore default key', 'error');
                }
              }}
              className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold underline cursor-pointer"
            >
              Restore Default Key
            </button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOwnerLoginOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={loadingOwnerAuth}
                className="font-bold"
              >
                Authenticate & Unlock
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
