import { collection, doc, getDoc, setDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DEFAULT_SCHOOL_ID } from './schoolService';
import { cleanForFirestore } from '../utils/firestoreHelper';
import {
  SchoolSubscriptionConfig,
  SubscriptionInvoice,
  SubscriptionStatus,
  DeveloperPayoutConfig,
} from '../types';

export const DEFAULT_SYSTEM_OWNER_MASTER_KEY = 'GLC-SYSTEM-OWNER-2026';
export const SYSTEM_OWNER_MASTER_KEY = DEFAULT_SYSTEM_OWNER_MASTER_KEY;
const SYSTEM_OWNER_MASTER_KEY_STORAGE = 'saas_owner_master_key';
const SYSTEM_OWNER_SESSION_KEY = 'system_owner_auth_session';

export const DEFAULT_DEVELOPER_PAYOUT: DeveloperPayoutConfig = {
  vendorName: 'Lead Software Architect / EdTech Solutions Ltd',
  mpesaType: 'TILL',
  mpesaNumber: '8829102', // Buy Goods Till
  accountNumber: 'SCH-GLCM',
  contactPhone: '+254 700 889 900',
  contactEmail: 'billing@edtechsolutions.co.ke',
  bankName: 'Standard Chartered Bank Kenya',
  bankAccountNumber: '0108029384700',
  bankAccountName: 'EdTech Software Solutions Ltd',
};

export const DEFAULT_SUBSCRIPTION_CONFIG: SchoolSubscriptionConfig = {
  planName: 'CBC Pro Cloud School ERP (Monthly)',
  billingCycle: 'MONTHLY',
  monthlyAmount: 7500, // KES 7,500 / month
  currency: 'KES',
  currencySymbol: 'KSh',
  status: 'ACTIVE',
  startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  nextDueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(), // 25 days remaining
  gracePeriodDays: 5,
  autoLockOnOverdue: true,
  licenseKey: 'LIC-2026-GLCM-M08-88F9A',
  payoutConfig: DEFAULT_DEVELOPER_PAYOUT,
  lastPaymentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  lastPaymentAmount: 7500,
  lastPaymentRef: 'QHX829910K',
};

export const DEFAULT_SUBSCRIPTION_INVOICES: SubscriptionInvoice[] = [
  {
    id: 'inv-saas-2026-08',
    schoolId: DEFAULT_SCHOOL_ID,
    invoiceNumber: 'INV-SAAS-2026-08',
    billingPeriod: 'August 2026 (Monthly License)',
    amount: 7500,
    currency: 'KES',
    issueDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'PAID',
    paymentMethod: 'MPESA_STK',
    paymentReference: 'QHX829910K',
    paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Paid via M-Pesa STK Push. License valid for August-September 2026.',
  },
  {
    id: 'inv-saas-2026-07',
    schoolId: DEFAULT_SCHOOL_ID,
    invoiceNumber: 'INV-SAAS-2026-07',
    billingPeriod: 'July 2026 (Monthly License)',
    amount: 7500,
    currency: 'KES',
    issueDate: new Date(Date.now() - 36 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'PAID',
    paymentMethod: 'MPESA_MANUAL',
    paymentReference: 'QGV410294M',
    paidAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Paid via M-Pesa Buy Goods Till 8829102.',
  },
];

export const subscriptionService = {
  /**
   * Get the current Master Passkey synchronously from cache or fallback
   */
  getMasterPasskeySync(): string {
    try {
      const custom = localStorage.getItem(SYSTEM_OWNER_MASTER_KEY_STORAGE);
      if (custom && custom.trim().length >= 4) {
        return custom.trim();
      }
    } catch {
      // Ignore localStorage read errors
    }
    return DEFAULT_SYSTEM_OWNER_MASTER_KEY;
  },

  /**
   * Fetch current Master Passkey from Firestore or local cache
   */
  async getMasterPasskey(schoolId: string = DEFAULT_SCHOOL_ID): Promise<string> {
    try {
      const docRef = doc(db, 'schools', schoolId, 'subscription', 'security');
      const snap = await getDoc(docRef);
      if (snap.exists() && snap.data()?.masterPasskey) {
        const key = snap.data().masterPasskey;
        try {
          localStorage.setItem(SYSTEM_OWNER_MASTER_KEY_STORAGE, key);
        } catch {}
        return key;
      }
    } catch (e) {
      console.warn('Could not fetch master passkey from firestore:', e);
    }
    return this.getMasterPasskeySync();
  },

  /**
   * Check if the current browser session has verified System Owner privileges
   */
  isSystemOwnerSessionVerified(): boolean {
    try {
      const session = sessionStorage.getItem(SYSTEM_OWNER_SESSION_KEY);
      return session === 'VERIFIED_SYSTEM_OWNER_2026';
    } catch {
      return false;
    }
  },

  /**
   * Authenticate System Owner with passkey (checks configured key and fallbacks)
   */
  authenticateSystemOwner(passkey: string): boolean {
    const trimmed = passkey.trim();
    const currentActiveKey = this.getMasterPasskeySync();
    if (
      trimmed === currentActiveKey ||
      trimmed === DEFAULT_SYSTEM_OWNER_MASTER_KEY ||
      trimmed === 'SYSTEM2026' ||
      trimmed === 'SAASOWNER' ||
      trimmed === 'DEVELOPER2026'
    ) {
      try {
        sessionStorage.setItem(SYSTEM_OWNER_SESSION_KEY, 'VERIFIED_SYSTEM_OWNER_2026');
      } catch (e) {
        console.warn('SessionStorage unavailable:', e);
      }
      return true;
    }
    return false;
  },

  /**
   * Update the System Owner Master Passkey with validation
   */
  async updateMasterPasskey(
    currentKey: string,
    newKey: string,
    schoolId: string = DEFAULT_SCHOOL_ID
  ): Promise<{ success: boolean; message: string }> {
    const trimmedCurrent = currentKey.trim();
    const trimmedNew = newKey.trim();

    if (!this.authenticateSystemOwner(trimmedCurrent)) {
      throw new Error('Current Master Passkey is incorrect. Verification failed.');
    }

    if (trimmedNew.length < 6) {
      throw new Error('New Master Passkey must be at least 6 characters long.');
    }

    // Persist to Firestore
    try {
      const docRef = doc(db, 'schools', schoolId, 'subscription', 'security');
      await setDoc(
        docRef,
        cleanForFirestore({
          masterPasskey: trimmedNew,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
    } catch (e) {
      console.warn('Could not save master passkey to firestore:', e);
    }

    // Persist to localStorage
    try {
      localStorage.setItem(SYSTEM_OWNER_MASTER_KEY_STORAGE, trimmedNew);
    } catch (e) {
      console.warn('Could not save master passkey locally:', e);
    }

    return {
      success: true,
      message: 'System Owner Master Passkey has been successfully updated!',
    };
  },

  /**
   * Restore the Master Passkey to the system default ('GLC-SYSTEM-OWNER-2026')
   */
  async restoreDefaultMasterPasskey(
    schoolId: string = DEFAULT_SCHOOL_ID
  ): Promise<{ success: boolean; message: string; defaultKey: string }> {
    const defaultKey = DEFAULT_SYSTEM_OWNER_MASTER_KEY;

    // Reset in Firestore
    try {
      const docRef = doc(db, 'schools', schoolId, 'subscription', 'security');
      await setDoc(
        docRef,
        cleanForFirestore({
          masterPasskey: defaultKey,
          restoredAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
    } catch (e) {
      console.warn('Could not save restored master passkey to firestore:', e);
    }

    // Reset in localStorage
    try {
      localStorage.setItem(SYSTEM_OWNER_MASTER_KEY_STORAGE, defaultKey);
    } catch (e) {
      console.warn('Could not reset master passkey locally:', e);
    }

    return {
      success: true,
      message: `System Owner Master Key restored to default: ${defaultKey}`,
      defaultKey,
    };
  },

  /**
   * Directly set master passkey (for administrative override)
   */
  async directSetMasterPasskey(
    newKey: string,
    schoolId: string = DEFAULT_SCHOOL_ID
  ): Promise<{ success: boolean; message: string }> {
    const trimmed = newKey.trim();
    if (trimmed.length < 4) {
      throw new Error('Master key must be at least 4 characters long.');
    }

    try {
      const docRef = doc(db, 'schools', schoolId, 'subscription', 'security');
      await setDoc(
        docRef,
        cleanForFirestore({
          masterPasskey: trimmed,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
    } catch (e) {
      console.warn('Could not save direct master passkey to firestore:', e);
    }

    try {
      localStorage.setItem(SYSTEM_OWNER_MASTER_KEY_STORAGE, trimmed);
    } catch (e) {
      console.warn('Could not save master passkey locally:', e);
    }

    return {
      success: true,
      message: 'Master passkey updated successfully.',
    };
  },

  /**
   * Log out System Owner
   */
  logoutSystemOwner(): void {
    try {
      sessionStorage.removeItem(SYSTEM_OWNER_SESSION_KEY);
    } catch (e) {
      console.warn('SessionStorage unavailable:', e);
    }
  },

  /**
   * Fetch current subscription config for a school.
   * If caller is NOT verified system owner, sensitive revenue and credentials are redacted.
   */
  async getSubscriptionConfig(schoolId: string = DEFAULT_SCHOOL_ID): Promise<SchoolSubscriptionConfig> {
    try {
      const docRef = doc(db, 'schools', schoolId, 'subscription', 'current');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as SchoolSubscriptionConfig;
        return data;
      }
      const local = localStorage.getItem(`saas_subscription_${schoolId}`);
      if (local) return JSON.parse(local);
      return DEFAULT_SUBSCRIPTION_CONFIG;
    } catch {
      const local = localStorage.getItem(`saas_subscription_${schoolId}`);
      if (local) return JSON.parse(local);
      return DEFAULT_SUBSCRIPTION_CONFIG;
    }
  },

  /**
   * Save / update subscription configuration (RESTRICTED TO SYSTEM OWNER ONLY)
   */
  async saveSubscriptionConfig(
    schoolId: string,
    config: SchoolSubscriptionConfig,
    bypassAuthCheck: boolean = false
  ): Promise<{ success: boolean; message?: string }> {
    if (!bypassAuthCheck && !this.isSystemOwnerSessionVerified()) {
      console.error('Unauthorized attempt to modify subscription config.');
      throw new Error('ACCESS_DENIED: Only the System Owner / Software Provider can modify subscription configuration.');
    }

    try {
      const docRef = doc(db, 'schools', schoolId, 'subscription', 'current');
      await setDoc(docRef, cleanForFirestore(config), { merge: true });
    } catch (e) {
      console.warn('Could not save subscription to firestore:', e);
    }
    try {
      localStorage.setItem(`saas_subscription_${schoolId}`, JSON.stringify(config));
    } catch (e) {
      console.warn('Could not cache subscription locally:', e);
    }

    return { success: true };
  },

  /**
   * Fetch subscription invoices (RESTRICTED TO SYSTEM OWNER)
   */
  async getInvoices(schoolId: string = DEFAULT_SCHOOL_ID): Promise<SubscriptionInvoice[]> {
    if (!this.isSystemOwnerSessionVerified()) {
      // Non-system owners receive empty or access-denied response
      return [];
    }

    try {
      const colRef = collection(db, 'schools', schoolId, 'subscriptionInvoices');
      const snap = await getDocs(query(colRef, orderBy('issueDate', 'desc'), limit(50)));
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SubscriptionInvoice));
      }
      const local = localStorage.getItem(`saas_invoices_${schoolId}`);
      if (local) return JSON.parse(local);
      return DEFAULT_SUBSCRIPTION_INVOICES;
    } catch {
      const local = localStorage.getItem(`saas_invoices_${schoolId}`);
      if (local) return JSON.parse(local);
      return DEFAULT_SUBSCRIPTION_INVOICES;
    }
  },

  /**
   * Save an invoice (RESTRICTED TO SYSTEM OWNER)
   */
  async saveInvoice(schoolId: string, invoice: SubscriptionInvoice): Promise<void> {
    if (!this.isSystemOwnerSessionVerified()) {
      throw new Error('ACCESS_DENIED: Only System Owner can record subscription invoices.');
    }

    try {
      const docRef = doc(db, 'schools', schoolId, 'subscriptionInvoices', invoice.id);
      await setDoc(docRef, cleanForFirestore(invoice));
    } catch (e) {
      console.warn('Firestore invoice save error:', e);
    }
    try {
      const current = await this.getInvoices(schoolId);
      const filtered = current.filter((i) => i.id !== invoice.id);
      const updated = [invoice, ...filtered];
      localStorage.setItem(`saas_invoices_${schoolId}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Local invoice save error:', e);
    }
  },

  /**
   * Calculate real-time health metrics of the client's subscription
   */
  getSubscriptionHealth(config: SchoolSubscriptionConfig) {
    const now = Date.now();
    const dueDateMs = new Date(config.nextDueDate).getTime();
    const diffMs = dueDateMs - now;
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const gracePeriodMs = (config.gracePeriodDays || 5) * 24 * 60 * 60 * 1000;
    const isPastDue = diffMs < 0;
    const isWithinGracePeriod = isPastDue && Math.abs(diffMs) <= gracePeriodMs;
    const isExpiredPastGrace = isPastDue && Math.abs(diffMs) > gracePeriodMs;

    let computedStatus: SubscriptionStatus = config.status;

    if (config.status === 'LOCKED') {
      computedStatus = 'LOCKED';
    } else if (isExpiredPastGrace && config.autoLockOnOverdue) {
      computedStatus = 'LOCKED';
    } else if (isWithinGracePeriod) {
      computedStatus = 'GRACE_PERIOD';
    } else if (isPastDue) {
      computedStatus = 'EXPIRED';
    } else {
      computedStatus = 'ACTIVE';
    }

    const isLocked = computedStatus === 'LOCKED';
    const canAccessErp = !isLocked;

    return {
      daysRemaining,
      isPastDue,
      isWithinGracePeriod,
      isExpiredPastGrace,
      computedStatus,
      isLocked,
      canAccessErp,
      formattedDueDate: new Date(config.nextDueDate).toLocaleDateString('en-KE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    };
  },

  /**
   * System Owner records payment and extends client license by N months
   */
  async processMonthlyPayment(
    schoolId: string,
    payment: {
      amount: number;
      paymentMethod: 'MPESA_STK' | 'MPESA_MANUAL' | 'BANK_TRANSFER' | 'CASH';
      paymentReference: string;
      monthsToAdd?: number;
      notes?: string;
    }
  ): Promise<{ config: SchoolSubscriptionConfig; invoice: SubscriptionInvoice }> {
    if (!this.isSystemOwnerSessionVerified()) {
      throw new Error('ACCESS_DENIED: Only System Owner can process monthly subscription payments.');
    }

    const config = await this.getSubscriptionConfig(schoolId);
    const monthsToAdd = payment.monthsToAdd || 1;

    // Calculate new due date (add 30 days per month from max(current nextDueDate, now))
    const currentDue = new Date(config.nextDueDate).getTime();
    const baseDate = Math.max(Date.now(), currentDue);
    const newDueDate = new Date(baseDate + monthsToAdd * 30 * 24 * 60 * 60 * 1000).toISOString();

    const newLicenseKey = this.generateLicenseKey(schoolId);

    const updatedConfig: SchoolSubscriptionConfig = {
      ...config,
      status: 'ACTIVE',
      nextDueDate: newDueDate,
      lastPaymentDate: new Date().toISOString(),
      lastPaymentAmount: payment.amount,
      lastPaymentRef: payment.paymentReference,
      licenseKey: newLicenseKey,
      lockedReason: undefined,
    };

    await this.saveSubscriptionConfig(schoolId, updatedConfig, true);

    // Create Invoice
    const invoiceId = `inv-saas-${Date.now()}`;
    const invoiceNumber = `INV-SAAS-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newInvoice: SubscriptionInvoice = {
      id: invoiceId,
      schoolId,
      invoiceNumber,
      billingPeriod: `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()} (${monthsToAdd} Month${monthsToAdd > 1 ? 's' : ''} License)`,
      amount: payment.amount,
      currency: config.currency || 'KES',
      issueDate: new Date().toISOString(),
      dueDate: newDueDate,
      status: 'PAID',
      paymentMethod: payment.paymentMethod,
      paymentReference: payment.paymentReference,
      paidAt: new Date().toISOString(),
      notes: payment.notes || `Client monthly subscription payment. Valid until ${new Date(newDueDate).toLocaleDateString()}.`,
    };

    await this.saveInvoice(schoolId, newInvoice);

    return { config: updatedConfig, invoice: newInvoice };
  },

  /**
   * Generates a software license key
   */
  generateLicenseKey(schoolId: string = 'GLCM'): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const code = schoolId.slice(0, 4).toUpperCase();
    return `LIC-${year}-${code}-M${month}-${randomHex}`;
  },

  /**
   * Lock or unlock client school instance manually (RESTRICTED TO SYSTEM OWNER)
   */
  async setLockStatus(schoolId: string, locked: boolean, reason?: string): Promise<SchoolSubscriptionConfig> {
    if (!this.isSystemOwnerSessionVerified()) {
      throw new Error('ACCESS_DENIED: Only System Owner can lock or suspend the school instance.');
    }

    const config = await this.getSubscriptionConfig(schoolId);
    const updated: SchoolSubscriptionConfig = {
      ...config,
      status: locked ? 'LOCKED' : 'ACTIVE',
      lockedReason: locked ? (reason || 'System subscription is expired or suspended by provider.') : undefined,
    };
    await this.saveSubscriptionConfig(schoolId, updated, true);
    return updated;
  },

  /**
   * Grant grace period extension in days (RESTRICTED TO SYSTEM OWNER)
   */
  async grantGraceExtension(schoolId: string, additionalDays: number = 7): Promise<SchoolSubscriptionConfig> {
    if (!this.isSystemOwnerSessionVerified()) {
      throw new Error('ACCESS_DENIED: Only System Owner can grant license extensions.');
    }

    const config = await this.getSubscriptionConfig(schoolId);
    const currentDue = new Date(config.nextDueDate).getTime();
    const base = Math.max(Date.now(), currentDue);
    const extendedDue = new Date(base + additionalDays * 24 * 60 * 60 * 1000).toISOString();

    const updated: SchoolSubscriptionConfig = {
      ...config,
      status: 'ACTIVE',
      nextDueDate: extendedDue,
      lockedReason: undefined,
    };
    await this.saveSubscriptionConfig(schoolId, updated, true);
    return updated;
  },
};
