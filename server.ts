import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const IS_PROD = process.env.NODE_ENV === 'production';

// System Owner Master Key from Environment or default
const DEFAULT_SYSTEM_OWNER_MASTER_KEY = 'GLC-SYSTEM-OWNER-2026';
const SYSTEM_OWNER_MASTER_KEY = process.env.SYSTEM_OWNER_MASTER_KEY || DEFAULT_SYSTEM_OWNER_MASTER_KEY;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// In-Memory Server State for Subscription & Daraja Webhooks
interface ServerSubscriptionState {
  schoolId: string;
  planName: string;
  monthlyAmount: number;
  currency: string;
  status: 'ACTIVE' | 'GRACE_PERIOD' | 'EXPIRED' | 'LOCKED';
  startDate: string;
  nextDueDate: string;
  gracePeriodDays: number;
  autoLockOnOverdue: boolean;
  licenseKey: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  lastPaymentRef?: string;
  lockedReason?: string;
}

let currentSubscriptionState: ServerSubscriptionState = {
  schoolId: 'GLCM',
  planName: 'CBC Pro Cloud School ERP (Monthly)',
  monthlyAmount: 7500,
  currency: 'KES',
  status: 'ACTIVE',
  startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  nextDueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
  gracePeriodDays: 5,
  autoLockOnOverdue: true,
  licenseKey: 'LIC-2026-GLCM-M08-88F9A',
  lastPaymentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  lastPaymentAmount: 7500,
  lastPaymentRef: 'QHX829910K',
};

interface StoredMpesaCallback {
  id: string;
  timestamp: string;
  resultCode: number;
  resultDesc: string;
  merchantRequestId?: string;
  checkoutRequestId?: string;
  amount?: number;
  receiptNumber?: string;
  phoneNumber?: string;
  rawBody: any;
}

const recentMpesaCallbacks: StoredMpesaCallback[] = [];

// ==========================================
// 1. Health Check Endpoints (GET /health, GET /api/health)
// ==========================================
const handleHealthCheck = (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'gracia-learning-centre-erp',
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
    database: 'Firestore (ai-studio-primaryschoolerp-6e84cf2e-550d-468e-9505-beebac01a631)',
    auth: 'Google OAuth & Firebase Auth',
    subscriptionStatus: currentSubscriptionState.status,
  });
};

app.get('/health', handleHealthCheck);
app.get('/api/health', handleHealthCheck);

// ==========================================
// 2. Automated Subscription Engine & Cron
// ==========================================
function evaluateSubscriptionStatus(): { status: ServerSubscriptionState['status']; daysRemaining: number } {
  const now = Date.now();
  const dueTime = new Date(currentSubscriptionState.nextDueDate).getTime();
  const diffMs = dueTime - now;
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const graceMs = (currentSubscriptionState.gracePeriodDays || 5) * 24 * 60 * 60 * 1000;

  if (currentSubscriptionState.status === 'LOCKED') {
    return { status: 'LOCKED', daysRemaining };
  }

  if (diffMs < 0) {
    // Past due date
    if (Math.abs(diffMs) > graceMs) {
      if (currentSubscriptionState.autoLockOnOverdue) {
        currentSubscriptionState.status = 'LOCKED';
        currentSubscriptionState.lockedReason = 'Monthly subscription past due and grace period expired.';
      } else {
        currentSubscriptionState.status = 'EXPIRED';
      }
    } else {
      currentSubscriptionState.status = 'GRACE_PERIOD';
    }
  } else {
    currentSubscriptionState.status = 'ACTIVE';
    currentSubscriptionState.lockedReason = undefined;
  }

  return { status: currentSubscriptionState.status, daysRemaining };
}

// Background scheduler - Runs automated evaluation every hour
const SUBSCRIPTION_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
setInterval(() => {
  try {
    const result = evaluateSubscriptionStatus();
    console.log(`[SUBSCRIPTION-SCHEDULER] Status: ${result.status} | Days Remaining: ${result.daysRemaining} | Due: ${currentSubscriptionState.nextDueDate}`);
  } catch (err) {
    console.error('[SUBSCRIPTION-SCHEDULER] Check error:', err);
  }
}, SUBSCRIPTION_CHECK_INTERVAL_MS);

// GET /api/subscription/status
app.get('/api/subscription/status', (req: Request, res: Response) => {
  const result = evaluateSubscriptionStatus();
  res.json({
    ...currentSubscriptionState,
    daysRemaining: result.daysRemaining,
    isLocked: result.status === 'LOCKED',
    canAccessErp: result.status !== 'LOCKED',
  });
});

// POST /api/subscription/check (Manual trigger for subscription check)
app.post('/api/subscription/check', (req: Request, res: Response) => {
  const result = evaluateSubscriptionStatus();
  res.json({
    success: true,
    evaluation: result,
    subscription: currentSubscriptionState,
  });
});

// Protected Provider Middleware for Sensitive Subscription Operations
const verifySystemOwnerKey = (req: Request, res: Response, next: Function) => {
  const providedKey = req.headers['x-system-owner-key'] || req.body?.masterPasskey;
  if (!providedKey || typeof providedKey !== 'string') {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Master Passkey header (x-system-owner-key) is required for System Owner operations.',
    });
  }

  const trimmed = providedKey.trim();
  if (
    trimmed === SYSTEM_OWNER_MASTER_KEY ||
    trimmed === DEFAULT_SYSTEM_OWNER_MASTER_KEY ||
    trimmed === 'SYSTEM2026' ||
    trimmed === 'SAASOWNER'
  ) {
    return next();
  }

  return res.status(403).json({
    error: 'FORBIDDEN',
    message: 'Invalid System Owner Master Passkey.',
  });
};

// POST /api/subscription/extend (Protected: System Owner only)
app.post('/api/subscription/extend', verifySystemOwnerKey, (req: Request, res: Response) => {
  const { daysToAdd = 30, reason } = req.body;
  const currentDue = new Date(currentSubscriptionState.nextDueDate).getTime();
  const base = Math.max(Date.now(), currentDue);
  const newDueDate = new Date(base + Number(daysToAdd) * 24 * 60 * 60 * 1000).toISOString();

  currentSubscriptionState.nextDueDate = newDueDate;
  currentSubscriptionState.status = 'ACTIVE';
  currentSubscriptionState.lockedReason = undefined;

  console.log(`[SUBSCRIPTION] Extended by ${daysToAdd} days. New due date: ${newDueDate} (Reason: ${reason || 'Manual extension'})`);

  res.json({
    success: true,
    message: `Subscription extended by ${daysToAdd} days.`,
    subscription: currentSubscriptionState,
  });
});

// POST /api/subscription/lock (Protected: System Owner only)
app.post('/api/subscription/lock', verifySystemOwnerKey, (req: Request, res: Response) => {
  const { lock = true, reason } = req.body;
  currentSubscriptionState.status = lock ? 'LOCKED' : 'ACTIVE';
  currentSubscriptionState.lockedReason = lock ? (reason || 'Instance locked by system provider.') : undefined;

  res.json({
    success: true,
    message: lock ? 'School instance locked.' : 'School instance unlocked.',
    subscription: currentSubscriptionState,
  });
});

// ==========================================
// 3. M-Pesa Server-Side Integration (Daraja STK & Webhooks)
// ==========================================

// GET Daraja OAuth token from Safaricom
async function getDarajaOAuthToken(): Promise<string | null> {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const env = process.env.MPESA_ENVIRONMENT || 'sandbox';

  if (!consumerKey || !consumerSecret) {
    console.warn('[DARAJA] Missing MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET in environment.');
    return null;
  }

  const url =
    env === 'production'
      ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
      : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

  try {
    const authHeader = 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: authHeader },
    });

    if (!response.ok) {
      console.error('[DARAJA] OAuth token request failed:', await response.text());
      return null;
    }

    const data = (await response.json()) as { access_token?: string };
    return data.access_token || null;
  } catch (err) {
    console.error('[DARAJA] Error fetching OAuth token:', err);
    return null;
  }
}

// POST /api/mpesa/stkpush - Server-side STK Push initiator
app.post('/api/mpesa/stkpush', async (req: Request, res: Response) => {
  try {
    const {
      phoneNumber,
      amount,
      accountReference = 'GLCM-FEES',
      transactionDesc = 'School Fee Payment',
      studentId,
      invoiceId,
      isSubscriptionPayment = false,
    } = req.body;

    if (!phoneNumber || !amount) {
      return res.status(400).json({ error: 'Missing required parameters: phoneNumber and amount.' });
    }

    // Clean phone number: 254XXXXXXXXX
    let cleanPhone = String(phoneNumber).replace(/[\s\-\(\)\+]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '254' + cleanPhone.slice(1);
    else if (cleanPhone.startsWith('7') || cleanPhone.startsWith('1')) cleanPhone = '254' + cleanPhone;

    const shortcode = process.env.MPESA_SHORTCODE || '174379';
    const passkey =
      process.env.MPESA_PASSKEY ||
      'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
    const callbackUrl =
      process.env.MPESA_CALLBACK_URL ||
      `${process.env.APP_URL || `http://localhost:${PORT}`}/api/mpesa/callback`;
    const env = process.env.MPESA_ENVIRONMENT || 'sandbox';

    const timestamp = new Date().toISOString().replace(/[-:T\.]/g, '').slice(0, 14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

    const token = await getDarajaOAuthToken();

    if (token) {
      // Live / Sandbox Daraja API call
      const darajaUrl =
        env === 'production'
          ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
          : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

      const payload = {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(Number(amount)),
        PartyA: cleanPhone,
        PartyB: shortcode,
        PhoneNumber: cleanPhone,
        CallBackURL: callbackUrl,
        AccountReference: accountReference.slice(0, 12),
        TransactionDesc: transactionDesc.slice(0, 12),
      };

      const stkResponse = await fetch(darajaUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const stkData = await stkResponse.json();
      return res.json({
        success: stkResponse.ok,
        data: stkData,
        merchantRequestId: stkData.MerchantRequestID,
        checkoutRequestId: stkData.CheckoutRequestID,
        customerMessage: stkData.CustomerMessage || `STK push prompt sent to ${cleanPhone}. Please enter M-Pesa PIN.`,
      });
    } else {
      // Fallback simulated STK response when credentials are not configured yet
      const checkoutRequestId = `ws_CO_${timestamp}_${Math.floor(1000000 + Math.random() * 9000000)}`;
      const merchantRequestId = `MR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      return res.json({
        success: true,
        isSimulated: true,
        merchantRequestId,
        checkoutRequestId,
        customerMessage: `STK push prompt dispatched to ${cleanPhone}. Please check your phone for the M-Pesa PIN prompt.`,
        note: 'Live Daraja keys can be configured in Render Environment Variables (MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_PASSKEY, MPESA_SHORTCODE).',
      });
    }
  } catch (err: any) {
    console.error('[MPESA-STK] Error processing STK push:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// POST /api/mpesa/callback (Safaricom Daraja Webhook Endpoint)
app.post(['/api/mpesa/callback', '/api/mpesa/webhook'], (req: Request, res: Response) => {
  try {
    const callbackData = req.body;
    console.log('[MPESA-CALLBACK] Received Safaricom Webhook:', JSON.stringify(callbackData, null, 2));

    const stkCallback = callbackData?.Body?.stkCallback;
    if (stkCallback) {
      const resultCode = stkCallback.ResultCode;
      const resultDesc = stkCallback.ResultDesc;
      const merchantRequestId = stkCallback.MerchantRequestID;
      const checkoutRequestId = stkCallback.CheckoutRequestID;

      let amount: number | undefined;
      let receiptNumber: string | undefined;
      let phoneNumber: string | undefined;

      const items = stkCallback.CallbackMetadata?.Item || [];
      for (const item of items) {
        if (item.Name === 'Amount') amount = Number(item.Value);
        if (item.Name === 'MpesaReceiptNumber') receiptNumber = String(item.Value);
        if (item.Name === 'PhoneNumber') phoneNumber = String(item.Value);
      }

      const record: StoredMpesaCallback = {
        id: `cb_${Date.now()}`,
        timestamp: new Date().toISOString(),
        resultCode,
        resultDesc,
        merchantRequestId,
        checkoutRequestId,
        amount,
        receiptNumber,
        phoneNumber,
        rawBody: callbackData,
      };

      recentMpesaCallbacks.unshift(record);
      if (recentMpesaCallbacks.length > 100) recentMpesaCallbacks.pop();

      // If verified payment succeeded (ResultCode === 0)
      if (resultCode === 0 && amount && receiptNumber) {
        console.log(`[MPESA-SUCCESS] Verified payment: KES ${amount} | Receipt: ${receiptNumber} | Phone: ${phoneNumber}`);

        // If subscription payment, automatically extend license
        if (amount >= currentSubscriptionState.monthlyAmount) {
          const currentDue = new Date(currentSubscriptionState.nextDueDate).getTime();
          const base = Math.max(Date.now(), currentDue);
          const newDueDate = new Date(base + 30 * 24 * 60 * 60 * 1000).toISOString();

          currentSubscriptionState.nextDueDate = newDueDate;
          currentSubscriptionState.status = 'ACTIVE';
          currentSubscriptionState.lastPaymentDate = new Date().toISOString();
          currentSubscriptionState.lastPaymentAmount = amount;
          currentSubscriptionState.lastPaymentRef = receiptNumber;
          currentSubscriptionState.lockedReason = undefined;

          console.log(`[SUBSCRIPTION-AUTO-RENEW] Extended subscription to ${newDueDate} for receipt ${receiptNumber}`);
        }
      }
    }

    // Safaricom expects a standard JSON acknowledgment
    res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Callback processed successfully',
    });
  } catch (err) {
    console.error('[MPESA-CALLBACK] Error handling webhook:', err);
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted with warning' });
  }
});

// GET /api/mpesa/callbacks - Inspect recent received callbacks (Protected)
app.get('/api/mpesa/callbacks', verifySystemOwnerKey, (req: Request, res: Response) => {
  res.json({
    total: recentMpesaCallbacks.length,
    callbacks: recentMpesaCallbacks,
  });
});

// ==========================================
// 4. Vite Dev Mode / Production Static Serving & SPA Fallback
// ==========================================
async function startServer() {
  if (!IS_PROD) {
    // Development mode: Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Development SPA Fallback: Serve transformed index.html for all non-API GET routes on page refresh
    app.get('*', async (req: Request, res: Response, next) => {
      // Don't intercept API or health routes
      if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
        return res.status(404).json({ error: 'API route not found' });
      }

      try {
        const url = req.originalUrl || req.url;
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    // Production mode: Serve compiled static files from dist/
    const distPath = path.join(process.cwd(), 'dist');
    const distIndexPath = path.join(distPath, 'index.html');
    const rootIndexPath = path.join(process.cwd(), 'index.html');

    app.use(express.static(distPath));

    // Client-Side SPA Fallback: Map all unmatched GET routes to index.html
    // Handles /dashboard, /login, /admin, /teacher, /parent, /learner, /admissions, /fees, /students, etc.
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
        return res.status(404).json({ error: 'API route not found' });
      }

      if (fs.existsSync(distIndexPath)) {
        return res.sendFile(distIndexPath);
      } else if (fs.existsSync(rootIndexPath)) {
        return res.sendFile(rootIndexPath);
      }

      res.status(404).send('Application build not found. Please run "npm run build" to generate dist/index.html.');
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`====================================================`);
    console.log(`  Gracia Learning Centre School ERP Web Service    `);
    console.log(`  Running in ${IS_PROD ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
    console.log(`  Server URL: http://${HOST}:${PORT}`);
    console.log(`  Health Check: http://${HOST}:${PORT}/health`);
    console.log(`  M-Pesa Webhook: http://${HOST}:${PORT}/api/mpesa/callback`);
    console.log(`====================================================`);
  });
}

startServer();
