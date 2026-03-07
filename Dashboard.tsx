import { useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { KeySubmitter } from "@/components/KeySubmitter";
import { WithdrawForm } from "@/components/WithdrawForm";
import { TransactionList } from "@/components/TransactionList";
import { LogOut, User, Wallet, History, Shield, Copy, Check, Bell, MessageSquare, Send, Loader2, XCircle } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Dashboard() {
  const { user, logout, isLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showTelegramAdmin, setShowTelegramAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [batchNumbers, setBatchNumbers] = useState("");
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [isNameSet, setIsNameSet] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("bkash");
  const [paymentNumber, setPaymentNumber] = useState("");
  const [serverDuplicates, setServerDuplicates] = useState<string[]>([]);

  const lookupTimerRef = useRef<any>(null);
  const dupCheckTimerRef = useRef<any>(null);

  const checkServerDuplicates = async (nums: string[]) => {
    try {
      const res = await apiRequest("POST", "/api/check-duplicates", { numbers: nums });
      const data = await res.json();
      setServerDuplicates(data.duplicates || []);
    } catch { setServerDuplicates([]); }
  };

  const handleBatchNumbersChange = (val: string) => {
    setBatchNumbers(val);
    const lines = val.split("\n").map(l => l.trim()).filter(Boolean);
    const seen = new Set();
    const dups = new Set<string>();
    lines.forEach(num => {
      if (seen.has(num)) dups.add(num);
      seen.add(num);
    });
    setDuplicates(Array.from(dups));
    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    if (dupCheckTimerRef.current) clearTimeout(dupCheckTimerRef.current);
    if (lines.length > 0) {
      lookupTimerRef.current = setTimeout(() => lookupNumbers(lines), 500);
      dupCheckTimerRef.current = setTimeout(() => checkServerDuplicates(lines), 500);
    } else {
      setLookupResults([]);
      setServerDuplicates([]);
    }
  };

  const removeDuplicate = (num: string) => {
    const lines = batchNumbers.split("\n").map(l => l.trim()).filter(Boolean);
    const firstIndex = lines.indexOf(num);
    const filtered = lines.filter((l, idx) => l !== num || idx === firstIndex);
    setBatchNumbers(filtered.join("\n"));
    const newDups = duplicates.filter(d => d !== num);
    setDuplicates(newDups);
  };

  const { data: publicSettings } = useQuery<{ 
    buyStatus: string; 
    bonusStatus: string; 
    bonusTarget: number;
    customNotice: string;
  }>({
    queryKey: ["/api/settings/public"],
  });

  const [lookupResults, setLookupResults] = useState<any[]>([]);

  const submitNumbersMutation = useMutation({
    mutationFn: async (numbers: string[]) => {
      const res = await apiRequest("POST", "/api/admin/submit-numbers", { 
        numbers, 
        submittedBy: adminName,
        paymentNumber: paymentNumber || undefined,
        paymentMethod: paymentNumber ? paymentMethod : undefined,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setBatchNumbers("");
      setPaymentNumber("");
      setServerDuplicates([]);
      const msg = data.skipped > 0 
        ? `${data.count}টি সাবমিট হয়েছে, ${data.skipped}টি ডুপ্লিকেট বাদ দেওয়া হয়েছে` 
        : "সফলভাবে সাবমিট করা হয়েছে";
      toast({ title: msg });
    },
    onError: () => {
      toast({ title: "সব নম্বর ইতিমধ্যে সাবমিট করা হয়েছে", variant: "destructive" });
    }
  });

  const paymentMutation = useMutation({
    mutationFn: async (status: "received" | "not_received") => {
      await apiRequest("POST", "/api/user/payment-feedback", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "আপনার ফিডব্যাক জমা হয়েছে" });
    }
  });

  const bonusEnabled = publicSettings?.bonusStatus === "on";
  const targetAmount = publicSettings?.bonusTarget || 10;
  const customNoticeText = publicSettings?.customNotice;

  const lookupNumbers = async (nums: string[]) => {
    try {
      const res = await apiRequest("POST", "/api/lookup-users", { numbers: nums });
      const data = await res.json();
      setLookupResults(data);
    } catch {}
  };

  const getBatchInfo = () => {
    const lines = batchNumbers.split("\n").map(l => l.trim()).filter(Boolean);
    let totalVerified = 0;
    const details = lines.map(num => {
      const u = lookupResults?.find((u: any) => u.guestId === num);
      totalVerified += u?.keyCount || 0;
      return { num, count: u?.keyCount || 0 };
    });
    return { totalVerified, details };
  };

  const copyId = () => {
    if (user?.guestId) {
      navigator.clipboard.writeText(user.guestId);
      setCopied(true);
      toast({ title: "ID কপি করা হয়েছে" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  const currentProgress = (user.keyCount || 0) % targetAmount;
  const isEligible = user.keyCount > 0 && user.keyCount % targetAmount === 0;

  return (
    <div className="min-h-screen bg-background pb-24 relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
      </div>

      <AnimatePresence>
        {user.paymentStatus === "pending" && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-card p-8 rounded-3xl w-full max-w-sm text-center space-y-6 border-2 border-primary/30 shadow-2xl shadow-primary/20"
            >
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                <Wallet className="w-10 h-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">পেমেন্ট পেয়েছেন?</h2>
                <p className="text-muted-foreground">আপনার পূর্বের কাজের পেমেন্ট কি আপনি বুঝে পেয়েছেন?</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => paymentMutation.mutate("received")}
                  className="btn-primary bg-emerald-600 hover:bg-emerald-700 h-14 text-lg font-black"
                  disabled={paymentMutation.isPending}
                  data-testid="button-payment-received"
                >
                  হ্যাঁ
                </button>
                <button
                  onClick={() => paymentMutation.mutate("not_received")}
                  className="btn-primary bg-destructive hover:bg-destructive/90 h-14 text-lg font-black"
                  disabled={paymentMutation.isPending}
                  data-testid="button-payment-not-received"
                >
                  না
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-50 glass-card border-b-0 rounded-none bg-background/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center border border-white/10">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">স্বাগতম,</p>
              <div className="flex flex-col">
                <p className="font-bold text-sm truncate max-w-[120px]">{user.displayName || user.guestId}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground font-mono">ID: {user.guestId}</p>
                  <button
                    onClick={copyId}
                    className="p-1 hover:bg-white/5 rounded transition-colors"
                    data-testid="button-copy-id"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="p-2 hover:bg-white/5 rounded-full text-muted-foreground hover:text-destructive transition-colors"
            data-testid="button-logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6 space-y-6 relative z-10">
        <section className="glass-card p-6 rounded-3xl border-2 border-primary/30">
          <button 
            onClick={() => setShowTelegramAdmin(!showTelegramAdmin)}
            className="flex items-center justify-between w-full"
            data-testid="button-telegram-admin"
          >
            <div className="flex items-center gap-3 text-primary">
              <Send className="w-6 h-6" />
              <h2 className="text-xl font-bold">Payment Request Only Telegram Admin</h2>
            </div>
          </button>
          
          <AnimatePresence>
            {showTelegramAdmin && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-6 space-y-4"
              >
                {!isPasswordVerified ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">পাসওয়ার্ড দিন:</p>
                    <input
                      type="password"
                      placeholder="পাসওয়ার্ড..."
                      className="input-field"
                      value={adminPassword}
                      onChange={(e) => {
                        setAdminPassword(e.target.value);
                        if (e.target.value === "anamul984516") setIsPasswordVerified(true);
                      }}
                      data-testid="input-telegram-password"
                    />
                  </div>
                ) : !isNameSet ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">আপনার নাম লিখুন:</p>
                    <input
                      type="text"
                      placeholder="আপনার নাম..."
                      className="input-field"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      data-testid="input-admin-name"
                    />
                    <button
                      onClick={() => { if (adminName.trim()) setIsNameSet(true); }}
                      className="btn-primary w-full py-3 font-black"
                      disabled={!adminName.trim()}
                      data-testid="button-set-admin-name"
                    >
                      এগিয়ে যান
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                      <p className="text-sm font-bold mb-2">Total Verified: <span className="text-primary">{getBatchInfo().totalVerified}</span></p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {getBatchInfo().details.map((d, i) => (
                          <p key={i} className="text-xs flex justify-between">
                            <span>{d.num}</span>
                            <span className="text-primary font-bold">{d.count} টা</span>
                          </p>
                        ))}
                      </div>
                    </div>
                    <textarea
                      placeholder="ইউজার নম্বরগুলো দিন (প্রতি লাইনে একটি)..."
                      className={`input-field min-h-[120px] font-mono text-sm ${duplicates.length > 0 ? 'border-destructive' : ''}`}
                      value={batchNumbers}
                      onChange={(e) => handleBatchNumbersChange(e.target.value)}
                      data-testid="textarea-batch-numbers"
                    />
                    {duplicates.length > 0 && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 space-y-2">
                        <p className="text-xs text-destructive font-bold flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> ডুপ্লিকেট নম্বর পাওয়া গেছে (একই লিস্টে):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {duplicates.map(num => (
                            <div key={num} className="bg-destructive/20 text-destructive text-[10px] px-2 py-1 rounded-md flex items-center gap-1">
                              {num}
                              <button onClick={() => removeDuplicate(num)} className="hover:text-white">
                                <XCircle className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {serverDuplicates.length > 0 && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-2">
                        <p className="text-xs text-amber-500 font-bold flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> এই নম্বরগুলো আগেই সাবমিট করা হয়েছে:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {serverDuplicates.map(num => (
                            <div key={num} className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-1 rounded-md font-mono font-bold">
                              {num}
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-amber-400/70">এগুলো সরিয়ে দিন, তারপর সাবমিট করুন</p>
                      </div>
                    )}
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
                      <p className="text-sm font-bold text-muted-foreground">পেমেন্ট নম্বর (bKash/Nagad)</p>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                          <button
                            onClick={() => setPaymentMethod("bkash")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${paymentMethod === 'bkash' ? 'bg-pink-500 text-white shadow-lg' : 'text-muted-foreground'}`}
                          >
                            bKash
                          </button>
                          <button
                            onClick={() => setPaymentMethod("nagad")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${paymentMethod === 'nagad' ? 'bg-orange-500 text-white shadow-lg' : 'text-muted-foreground'}`}
                          >
                            Nagad
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="01XXXXXXXXX"
                          value={paymentNumber}
                          onChange={(e) => setPaymentNumber(e.target.value)}
                          className="input-field flex-1"
                          data-testid="input-payment-number"
                        />
                      </div>
                    </div>
                    {(duplicates.length > 0 || serverDuplicates.length > 0) ? (
                      <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-center">
                        <p className="text-sm text-destructive font-bold">ডুপ্লিকেট নম্বর সরান, তারপর সাবমিট করুন</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => submitNumbersMutation.mutate(batchNumbers.split("\n").map(l => l.trim()).filter(Boolean))}
                        className="btn-primary w-full py-4 font-black flex items-center justify-center gap-2"
                        disabled={submitNumbersMutation.isPending || !batchNumbers.trim()}
                        data-testid="button-submit-numbers"
                      >
                        {submitNumbersMutation.isPending ? <Loader2 className="animate-spin" /> : <><Send className="w-5 h-5" /> Submit Request</>}
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <AnimatePresence>
          {customNoticeText && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-primary/20 border-2 border-primary/40 rounded-2xl p-6 flex items-start gap-4 shadow-xl shadow-primary/10 mb-6"
            >
              <Bell className="w-10 h-10 text-primary shrink-0" />
              <p className="text-xl font-black text-white leading-tight whitespace-pre-wrap">
                {customNoticeText}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {bonusEnabled && (
          <div className="space-y-4 mb-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-2 border-yellow-500/50 rounded-2xl p-6 text-center shadow-lg shadow-yellow-500/10"
            >
              <p className="text-xl font-black text-yellow-500 mb-2">🔥 ধামাকা বোনাস অফার! 🔥</p>
              <p className="text-sm font-bold text-white leading-relaxed">
                ১ দিনে {targetAmount}টি অ্যাকাউন্ট ভেরিফাই করতে পারলে বর্তমান দামের সাথে আরও <span className="text-yellow-500 text-lg">২০% বোনাস</span> দেওয়া হবে প্রত্যেক অ্যাকাউন্টে!
              </p>
            </motion.div>

            <div className="glass-card p-5 rounded-3xl border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm font-bold">আজকের টার্গেট (Bonus)</p>
                <p className="text-xs font-mono bg-primary/20 text-primary px-2 py-1 rounded-lg">
                  {user.keyCount}/{targetAmount}
                </p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: targetAmount }, (_, i) => {
                  const done = i < user.keyCount;
                  return (
                    <motion.div
                      key={i}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className={`aspect-square rounded-xl flex items-center justify-center border-2 transition-all ${
                        done 
                          ? 'bg-primary/20 border-primary shadow-lg shadow-primary/20' 
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      {done ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", delay: i * 0.05 }}
                        >
                          <Check className="w-5 h-5 text-primary" />
                        </motion.div>
                      ) : (
                        <span className="text-xs text-muted-foreground font-bold">{i + 1}</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
              {user.keyCount >= targetAmount ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center"
                >
                  <p className="text-emerald-400 font-bold text-sm">🎉 আপনি বোনাসের জন্য এলিজিবল হয়েছেন!</p>
                  <p className="text-[10px] text-emerald-200/70">নির্ধারিত এডমিনের কাছ থেকে বোনাসের টাকা গ্রহণ করুন।</p>
                </motion.div>
              ) : (
                <p className="text-[10px] text-muted-foreground mt-3 text-center">{targetAmount}টি টার্গেট পূর্ণ হলে বোনাস আনলক হবে</p>
              )}
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary to-emerald-600 rounded-3xl p-8 shadow-2xl shadow-primary/20 text-white relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10" />

          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-white/80 font-medium mb-1">মোট ভেরিফাইড কি</p>
              <h1 className="text-5xl font-bold tracking-tight" data-testid="text-key-count">
                {user.keyCount || 0}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 text-white/60 text-sm relative z-10">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            লাইভ আপডেট সক্রিয়
          </div>
        </motion.div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 text-yellow-500">
          <p className="text-sm font-bold mb-1">গুরুত্বপূর্ণ নোটিশ:</p>
          <div className="space-y-2 text-xs leading-relaxed">
            <p>
              সবাইকে জানানো যাচ্ছে যে, একটি প্রাইভেট কি শুধুমাত্র একবারই সাবমিট করা যাবে। একই কি বারবার সাবমিট করলে আপনার অ্যাকাউন্টটি ব্লক করে দেওয়া হতে পারে।
            </p>
            <p className="font-bold border-t border-yellow-500/20 pt-2">
              Account verified করে স্থানীয় অ্যাডমিনের কাছ থেকে নির্ধারিত পরিমাণ টাকা বুঝে নিন।
            </p>
          </div>
        </div>

        <KeySubmitter />

        <div className="pt-4">
          <h3 className="text-lg font-bold mb-4 px-2">Recent History</h3>
          <TransactionList />
        </div>
      </main>
    </div>
  );
}
