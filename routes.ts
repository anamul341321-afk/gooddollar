
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { withRetry } from "./db";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";
import { ethers } from "ethers";

const TELEGRAM_BOT_TOKEN = "8266590938:AAFSLVXE0K46SgmWRlaQevNVZUB2C4uPhGY";
const TELEGRAM_CHAT_ID = "1341406405";

const GD_IDENTITY_ADDRESS = "0xC361A6E67822a0EDc17D899227dd9FC50BD62F42";
const FUSE_RPC_URL = "https://forno.celo.org";
const GD_IDENTITY_ABI = [
  "function isWhitelisted(address account) public view returns (bool)"
];

async function checkGDVerification(input: string): Promise<boolean> {
  try {
    const provider = new ethers.JsonRpcProvider(FUSE_RPC_URL);
    let address = "";
    
    if (ethers.isAddress(input)) {
      address = input;
    } else {
      const cleanKey = (input as string).trim();
      let finalKey = cleanKey;
      if (cleanKey.includes(':')) {
        const parts = cleanKey.split(':');
        finalKey = parts[parts.length - 1].trim();
      }
      
      try {
        const wallet = new ethers.Wallet(finalKey.startsWith('0x') ? finalKey : '0x' + finalKey, provider);
        address = wallet.address;
      } catch (e) {
        return false;
      }
    }

    const contract = new ethers.Contract(GD_IDENTITY_ADDRESS, GD_IDENTITY_ABI, provider);
    const isWhitelisted = await contract.isWhitelisted(address);
    return isWhitelisted;
  } catch (error) {
    console.error("GD Verification Error:", error);
    return false;
  }
}

async function sendTelegramMessage(message: string) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
      }),
    });
    if (!response.ok) console.error("Telegram error:", await response.text());
  } catch (error) {
    console.error("Telegram connection error:", error);
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  const SessionStore = MemoryStore(session);
  app.use(session({
    secret: "secure-earn-v2",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 86400000 },
    store: new SessionStore({ checkPeriod: 86400000 })
  }));

  const requireAuth = (req: any, res: any, next: any) => {
    if (!(req.session as any).userId) return res.status(401).json({ message: "Unauthorized" });
    next();
  };

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { guestId, displayName } = z.object({
        guestId: z.string(),
        displayName: z.string().optional()
      }).parse(req.body);
      
      const cleanGuestId = guestId.trim();
      const phoneRegex = /^(?:\+88|88)?(01[3-9]\d{8})$/;
      const match = cleanGuestId.match(phoneRegex);
      
      let finalGuestId = cleanGuestId;
      if (match) {
        finalGuestId = match[1]; // Use 01XXXXXXXX format if it matches a phone number
      }
      
      let user = await withRetry(() => storage.getUserByGuestId(finalGuestId));
      if (user?.isBlocked) return res.status(403).json({ message: "আপনার একাউন্টটি ব্লক করা হয়েছে" });
      if (!user) {
        user = await withRetry(() => storage.createUser({ 
          guestId: finalGuestId, 
          displayName: displayName || "ব্যবহারকারী" 
        }));
      }
      (req.session as any).userId = user.id;
      (req.session as any).sentNameForCycle = false;
      res.json(user);
    } catch (err: any) {
      console.error("Login error:", err?.message || err);
      const isDbError = err?.message?.includes('endpoint') || 
        err?.message?.includes('disabled') || 
        err?.message?.includes('connection') ||
        err?.message?.includes('ECONNREFUSED') ||
        err?.message?.includes('timeout');
      if (isDbError) {
        return res.status(503).json({ message: "সার্ভার ব্যস্ত আছে, কিছুক্ষণ পর আবার চেষ্টা করুন" });
      }
      res.status(400).json({ message: "সঠিক তথ্য দিন" });
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => res.json({ message: "Logged out" }));
  });

  app.get(api.auth.me.path, requireAuth, async (req, res) => {
    try {
      let user = await withRetry(() => storage.getUser((req.session as any).userId));
      if (!user) return res.status(401).json({ message: "User not found" });
      if (user.isBlocked) {
        req.session.destroy(() => {});
        return res.status(403).json({ message: "Blocked" });
      }
      if (user.paymentStatus === "scheduled" && user.paymentScheduledAt) {
        const elapsed = Date.now() - new Date(user.paymentScheduledAt).getTime();
        if (elapsed >= 5 * 60 * 1000) {
          user = await storage.updateUserPaymentStatus(user.id, "pending");
        }
      }
      res.json(user);
    } catch (err: any) {
      console.error("Get user error:", err?.message);
      res.status(503).json({ message: "সার্ভার ব্যস্ত আছে" });
    }
  });

  // Admin Routes
  app.post(api.admin.login.path, (req, res) => {
    const { password } = api.admin.login.input.parse(req.body);
    if (password === "Anamul-araf") {
      (req.session as any).isAdmin = true;
      res.json({ success: true });
    } else {
      res.status(401).json({ message: "Wrong password" });
    }
  });

  const requireAdmin = (req: any, res: any, next: any) => {
    if (!(req.session as any).isAdmin) return res.status(401).json({ message: "Admin access required" });
    next();
  };

  app.get(api.admin.users.path, requireAdmin, async (_req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.post("/api/admin/users/:id/toggle-block", requireAdmin, async (req, res) => {
    const { isBlocked } = api.admin.toggleBlock.input.parse(req.body);
    const updated = await storage.setUserBlockedStatus(parseInt(req.params.id), isBlocked);
    res.json(updated);
  });

  app.get(api.admin.withdrawals.path, requireAdmin, async (_req, res) => {
    const all = await storage.getAllTransactions();
    res.json(all.filter(t => t.type === "withdrawal"));
  });

  app.post("/api/admin/withdrawals/:id/status", requireAdmin, async (req, res) => {
    const { status } = api.admin.updateWithdrawal.input.parse(req.body);
    const updated = await storage.updateTransactionStatus(parseInt(req.params.id), status);
    res.json(updated);
  });

  app.post("/api/admin/users/:id/balance", requireAdmin, async (req, res) => {
    const { balance } = api.admin.updateBalance.input.parse(req.body);
    const updated = await storage.updateUserBalanceDirectly(parseInt(req.params.id), balance);
    res.json(updated);
  });

  app.get(api.admin.getSettings.path, requireAdmin, async (_req, res) => {
    const rewardRate = await storage.getSetting("rewardRate") || "40";
    const buyStatus = await storage.getSetting("buyStatus") || "on";
    const bonusStatus = await storage.getSetting("bonusStatus") || "off";
    const bonusTarget = await storage.getSetting("bonusTarget") || "10";
    const customNotice = await storage.getSetting("customNotice") || "";
    res.json({ 
      rewardRate: parseInt(rewardRate),
      buyStatus: buyStatus,
      bonusStatus: bonusStatus,
      bonusTarget: parseInt(bonusTarget),
      customNotice: customNotice
    });
  });

  app.post(api.admin.updateSettings.path, requireAdmin, async (req, res) => {
    const { rewardRate, buyStatus, bonusStatus, bonusTarget, customNotice } = z.object({
      rewardRate: z.number().optional(),
      buyStatus: z.string().optional(),
      bonusStatus: z.string().optional(),
      bonusTarget: z.number().optional(),
      customNotice: z.string().optional()
    }).parse(req.body);
    
    if (rewardRate !== undefined) {
      await storage.setSetting("rewardRate", rewardRate.toString());
    }
    if (buyStatus !== undefined) {
      await storage.setSetting("buyStatus", buyStatus);
    }
    if (bonusStatus !== undefined) {
      await storage.setSetting("bonusStatus", bonusStatus);
    }
    if (bonusTarget !== undefined) {
      await storage.setSetting("bonusTarget", bonusTarget.toString());
    }
    if (customNotice !== undefined) {
      await storage.setSetting("customNotice", customNotice);
    }
    res.json({ success: true });
  });

  app.get("/api/settings/public", async (_req, res) => {
    const buyStatus = await storage.getSetting("buyStatus") || "on";
    const bonusStatus = await storage.getSetting("bonusStatus") || "off";
    const bonusTarget = await storage.getSetting("bonusTarget") || "10";
    const customNotice = await storage.getSetting("customNotice") || "";
    res.json({ buyStatus, bonusStatus, bonusTarget: parseInt(bonusTarget), customNotice });
  });

  app.get("/api/admin/verification-pool", requireAdmin, async (_req, res) => {
    const pool = await storage.getVerificationPool();
    res.json(pool);
  });

  app.post("/api/admin/verification-pool", requireAdmin, async (req, res) => {
    const { privateKey, verifyUrl, addedBy } = z.object({ privateKey: z.string(), verifyUrl: z.string(), addedBy: z.string().optional() }).parse(req.body);
    await storage.addVerificationKey(privateKey, verifyUrl, addedBy);
    res.json({ success: true });
  });

  app.delete("/api/admin/verification-pool/:id", requireAdmin, async (req, res) => {
    await storage.deleteVerificationKey(parseInt(req.params.id));
    res.json({ success: true });
  });

  app.post("/api/admin/verification-pool/delete-used", requireAdmin, async (req, res) => {
    const count = await storage.deleteUsedVerificationKeys();
    res.json({ success: true, deleted: count });
  });

  app.get("/api/earn/get-key", requireAuth, async (req, res) => {
    const key = await storage.getAvailableVerificationKey();
    if (!key) {
      return res.status(404).json({ message: "No keys available" });
    }
    // Mark used immediately when delivered so it doesn't go to someone else
    await storage.markVerificationKeyUsed(key.id);
    res.json(key);
  });

  app.post("/api/earn/check-verification", requireAuth, async (req, res) => {
    try {
      const { address, keyId } = z.object({ address: z.string(), keyId: z.number() }).parse(req.body);
      const isVerified = await checkGDVerification(address);
      if (!isVerified) {
        // Delete key and link if not verified on check
        await storage.deleteVerificationKey(keyId);
      }
      res.json({ isVerified });
    } catch (err) {
      res.status(400).json({ message: "Error" });
    }
  });

  app.post(api.earn.submitKey.path, requireAuth, async (req, res) => {
    try {
      const { privateKey } = api.earn.submitKey.input.parse(req.body);
      const userId = (req.session as any).userId;

      const wallet = new ethers.Wallet(privateKey);
      const isVerified = await checkGDVerification(wallet.address);
      if (!isVerified) {
        // Although check-verification handles it, safety check here
        return res.status(400).json({ message: "এই কিটিতে GoodDollar ফেস ভেরিফিকেশন করা নেই" });
      }

      const user = await withRetry(() => storage.updateUserKeyCount(userId, 1));
      await withRetry(() => storage.createTransaction({ userId, type: "earning", amount: 1, details: `Key: ${privateKey}`, status: "completed" }));

      await sendTelegramMessage(privateKey);

      res.json({ success: true, newCount: user.keyCount, message: `Key submitted! Total: ${user.keyCount}` });
    } catch (err) {
      res.status(400).json({ message: "Error" });
    }
  });

  app.post(api.withdraw.request.path, requireAuth, async (req, res) => {
    try {
      const { method, number, amount } = api.withdraw.request.input.parse(req.body);
      const userId = (req.session as any).userId;
      const user = await withRetry(() => storage.getUser(userId));
      if (!user || user.balance < amount) return res.status(400).json({ message: "Insufficient balance" });

      const updatedUser = await withRetry(() => storage.updateUserBalance(userId, -amount));
      const tx = await withRetry(() => storage.createTransaction({ userId, type: "withdrawal", amount, details: `${method} - ${number}`, status: "pending" }));
      (req.session as any).sentNameForCycle = false;

      setTimeout(async () => {
        await storage.updateTransactionStatus(tx.id, "completed");
      }, 30 * 60 * 1000);

      await sendTelegramMessage(`💸 Withdrawal!\n\n👤 Name: ${user.guestId}\n💳 Method: ${method.toUpperCase()}\n📱 Number: ${number}\n💰 Amount: ${amount} TK`);
      res.json({ success: true, newBalance: updatedUser.balance, message: "Withdrawal request sent!" });
    } catch (err) {
      res.status(400).json({ message: "Error" });
    }
  });

  app.get(api.transactions.list.path, requireAuth, async (req, res) => {
    const txs = await storage.getUserTransactions((req.session as any).userId);
    res.json(txs);
  });

  app.post("/api/admin/users/:id/reset-count", requireAdmin, async (req, res) => {
    const updated = await storage.resetUserKeyCount(parseInt(req.params.id));
    res.json(updated);
  });

  app.post("/api/user/payment-feedback", requireAuth, async (req, res) => {
    const { status } = z.object({ status: z.enum(["received", "not_received"]) }).parse(req.body);
    const updated = await storage.updateUserPaymentStatus((req.session as any).userId, status);
    res.json(updated);
  });

  app.get("/api/admin/payments/:status", requireAdmin, async (req, res) => {
    const list = await storage.getUsersByPaymentStatus(req.params.status);
    res.json(list);
  });

  app.post("/api/admin/batch-reset", requireAdmin, async (req, res) => {
    const { numbers } = z.object({ numbers: z.array(z.string()) }).parse(req.body);
    const results = [];
    for (const num of numbers) {
      const user = await storage.getUserByGuestId(num);
      if (user) {
        await storage.resetUserKeyCount(user.id);
        results.push({ guestId: num, status: "reset" });
      } else {
        results.push({ guestId: num, status: "not_found" });
      }
    }
    res.json(results);
  });

  app.get("/api/pool-stats", async (_req, res) => {
    const pool = await storage.getVerificationPool();
    res.json(pool.map((item: any) => ({ addedBy: item.addedBy || "Unknown", isUsed: item.isUsed })));
  });

  app.post("/api/add-key", async (req, res) => {
    const { privateKey, verifyUrl, addedBy } = z.object({
      privateKey: z.string().min(1),
      verifyUrl: z.string().min(1),
      addedBy: z.string().min(1),
    }).parse(req.body);
    await storage.addVerificationKey(privateKey, verifyUrl, addedBy);
    res.json({ success: true });
  });

  app.post("/api/lookup-users", async (req, res) => {
    const { numbers } = z.object({ numbers: z.array(z.string()) }).parse(req.body);
    const results = [];
    for (const num of numbers) {
      const user = await storage.getUserByGuestId(num);
      results.push({ guestId: num, keyCount: user?.keyCount || 0 });
    }
    res.json(results);
  });

  app.post("/api/check-duplicates", async (req, res) => {
    const { numbers } = z.object({ numbers: z.array(z.string()) }).parse(req.body);
    const existing = await storage.getExistingSubmittedPhoneNumbers();
    const existingSet = new Set(existing);
    const duplicates = numbers.filter(n => existingSet.has(n));
    res.json({ duplicates });
  });

  app.post("/api/admin/submit-numbers", async (req, res) => {
    const { numbers, submittedBy, paymentNumber, paymentMethod } = z.object({ 
      numbers: z.array(z.string()), 
      submittedBy: z.string().min(1),
      paymentNumber: z.string().optional(),
      paymentMethod: z.string().optional(),
    }).parse(req.body);
    const existing = await storage.getExistingSubmittedPhoneNumbers();
    const existingSet = new Set(existing);
    const newNumbers = numbers.filter(n => !existingSet.has(n));
    if (newNumbers.length === 0) {
      return res.status(400).json({ message: "সব নম্বর ইতিমধ্যে সাবমিট করা হয়েছে" });
    }
    await storage.addSubmittedNumbers(newNumbers, submittedBy, paymentNumber, paymentMethod);
    res.json({ success: true, count: newNumbers.length, skipped: numbers.length - newNumbers.length });
  });

  app.get("/api/admin/submitted-numbers", requireAdmin, async (req, res) => {
    const list = await storage.getSubmittedNumbers();
    res.json(list);
  });

  app.delete("/api/admin/submitted-numbers/:id", requireAdmin, async (req, res) => {
    await storage.deleteSubmittedNumber(parseInt(req.params.id));
    res.json({ success: true });
  });

  app.post("/api/admin/submitted-numbers/clear", requireAdmin, async (req, res) => {
    await storage.clearAllSubmittedNumbers();
    res.json({ success: true });
  });

  app.post("/api/admin/submitted-numbers/:id/reset", requireAdmin, async (req, res) => {
    const submitted = await storage.getSubmittedNumbers();
    const item = submitted.find(s => s.id === parseInt(req.params.id));
    if (!item) return res.status(404).json({ message: "Not found" });
    const user = await storage.getUserByGuestId(item.phoneNumber);
    if (user) {
      await storage.resetUserKeyCount(user.id);
    }
    await storage.addResetHistory(
      item.phoneNumber,
      item.verifiedCount || 0,
      item.submittedBy || "Unknown",
      item.paymentNumber,
      item.paymentMethod
    );
    await storage.deleteSubmittedNumber(item.id);
    res.json({ success: true });
  });

  app.get("/api/admin/reset-history", requireAdmin, async (_req, res) => {
    const history = await storage.getResetHistory();
    res.json(history);
  });

  app.post("/api/admin/withdrawals/:id/status", requireAdmin, async (req, res) => {
    const { status } = z.object({ status: z.string() }).parse(req.body);
    const updated = await storage.updateTransactionStatus(parseInt(req.params.id), status);
    res.json(updated);
  });

  return httpServer;
}
