import React from 'react';
import { SchoolSubscriptionConfig } from '../../types';
import { subscriptionService } from '../../services/subscriptionService';
import { CreditCard, AlertTriangle, CheckCircle2, Lock, Clock, Sparkles } from 'lucide-react';

interface SubscriptionStatusBadgeProps {
  subscription: SchoolSubscriptionConfig;
  onOpenRenewal: () => void;
  isSuperAdmin?: boolean;
}

export const SubscriptionStatusBadge: React.FC<SubscriptionStatusBadgeProps> = ({
  subscription,
  onOpenRenewal,
  isSuperAdmin = false,
}) => {
  const health = subscriptionService.getSubscriptionHealth(subscription);

  // Status colors and icons
  if (health.isLocked) {
    return (
      <button
        onClick={onOpenRenewal}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] font-black shadow-xs transition-all animate-pulse cursor-pointer"
        title="Subscription Locked - Click to Renew"
      >
        <Lock className="w-3.5 h-3.5" />
        <span>Monthly Sub Locked</span>
      </button>
    );
  }

  if (health.isPastDue) {
    return (
      <button
        onClick={onOpenRenewal}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-[11px] font-black shadow-xs transition-all cursor-pointer animate-bounce"
        title="Monthly Payment Due - Click to Pay"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Monthly Due ({health.daysRemaining}d grace)</span>
      </button>
    );
  }

  if (health.daysRemaining <= 7) {
    return (
      <button
        onClick={onOpenRenewal}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-[11px] font-bold shadow-xs transition-all cursor-pointer"
        title={`Renews in ${health.daysRemaining} days`}
      >
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        <span>Renews in {health.daysRemaining}d</span>
      </button>
    );
  }

  return (
    <button
      onClick={onOpenRenewal}
      className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-900 rounded-xl text-[11px] font-semibold shadow-xs transition-all cursor-pointer"
      title={`Monthly Plan Active: KES ${subscription.monthlyAmount.toLocaleString()}/mo • Due ${health.formattedDueDate}`}
    >
      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
      <span>
        Monthly Plan: <strong className="text-slate-900">{health.daysRemaining}d left</strong>
      </span>
    </button>
  );
};
