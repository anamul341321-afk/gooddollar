import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, UserX, UserCheck, CheckCircle, XCircle, Loader2, Coins, Edit3, Key, Search, RefreshCcw, Copy, Users, ChevronDown, ChevronUp, Trash2, Bell, Send, History } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminPanel() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [newPrivateKey, setNewPrivateKey] = useState("");
  const [newVerifyUrl, setNewVerifyUrl] = useState("");
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [newBalance, setNewBalance] = useState("");
  const [rewardRate, setRewardRate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showActiveUsers, setShowActiveUsers] = useState(false);
  const [showReadyKeys, setShowReadyKeys] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [showBatchReset, setShowBatchReset] = useState(false);
  const [showPaymentLists, setShowPaymentLists] = useState(false);
  const [showSubmittedNumbers, setShowSubmittedNumbers] = useState(false);
  const [showResetHistory, setShowResetHistory] = useState(false);
  const [resetHistorySearch, setResetHistorySearch] = useState("");
  const [poolPassword, setPoolPassword] = useState("");
  const [batchPassword, setBatchPassword] = useState("");
  const [batchNumbers, setBatchNumbers] = useState("");
  const [buyStatus, setBuyStatus] = useState("on");
  const [bonusStatus, setBonusStatus] = useState("off");
  const [bonusTarget, setBonusTarget] = useState("10");
  const [customNotice, setCustomNotice] = useState("");
  const { toast } = useToast();

  const POOL_SECRET = "Anamul-984516";
  const [showPoolList, setShowPoolList] = useState(false);
  const BATCH_SECRET = "anamul341321";

  const { data: pool } = useQuery<any[]>({
    queryKey: ["/api/admin/verification-pool"],
    enabled: isLoggedIn,
  });


  const deletePoolMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/verification-pool/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verification-pool"] });
      toast({ title: "কি ডিলিট করা হয়েছে" });
    },
  });

  const deleteUsedKeysMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/verification-pool/delete-used");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verification-pool"] });
      toast({ title: "সব Used Key ডিলিট করা হয়েছে" });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", api.admin.login.path, { password });
      if (!res.ok) throw new Error("ভুল পাসওয়ার্ড");
      return res.json();
    },
    onSuccess: () => {
      setIsLoggedIn(true);
      toast({ title: "সফলভাবে লগইন করা হয়েছে" });
    },
    onError: (err: any) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const { data: users } = useQuery<any[]>({
    queryKey: [api.admin.users.path],
    enabled: isLoggedIn,
  });

  const { data: withdrawals } = useQuery<any[]>({
    queryKey: [api.admin.withdrawals.path],
    enabled: isLoggedIn,
  });

  const { data: settingsData } = useQuery<any>({
    queryKey: [api.admin.getSettings.path],
    enabled: isLoggedIn,
  });

  const { data: submittedNumbers } = useQuery<any[]>({
    queryKey: ["/api/admin/submitted-numbers"],
    enabled: isLoggedIn,
  });

  const { data: resetHistoryData } = useQuery<any[]>({
    queryKey: ["/api/admin/reset-history"],
    enabled: isLoggedIn && showResetHistory,
  });

  const resetCountMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/users/${id}/reset-count`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
      toast({ title: "কাউন্ট রিসেট করা হয়েছে" });
    },
  });

  useEffect(() => {
    if (settingsData?.rewardRate) setRewardRate(settingsData.rewardRate.toString());
    if (settingsData?.buyStatus) setBuyStatus(settingsData.buyStatus);
    if (settingsData?.bonusStatus) setBonusStatus(settingsData.bonusStatus);
    if (settingsData?.bonusTarget) setBonusTarget(settingsData.bonusTarget.toString());
    if (settingsData?.customNotice !== undefined) setCustomNotice(settingsData.customNotice);
  }, [settingsData]);

  const blockMutation = useMutation({
    mutationFn: async ({ id, isBlocked }: { id: number; isBlocked: boolean }) => {
      await apiRequest("POST", buildUrl(api.admin.toggleBlock.path, { id }), { isBlocked });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
      toast({ title: "সফলভাবে আপডেট করা হয়েছে" });
    },
  });

  const balanceMutation = useMutation({
    mutationFn: async ({ id, balance }: { id: number; balance: number }) => {
      await apiRequest("POST", buildUrl(api.admin.updateBalance.path, { id }), { balance });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
      setEditingUserId(null);
      setNewBalance("");
      toast({ title: "ব্যালেন্স আপডেট করা হয়েছে" });
    },
  });

  const rateMutation = useMutation({
    mutationFn: async (data: { rate?: number; status?: string; bonusStatus?: string; bonusTarget?: number; customNotice?: string }) => {
      await apiRequest("POST", api.admin.updateSettings.path, { 
        rewardRate: data.rate,
        buyStatus: data.status,
        bonusStatus: data.bonusStatus,
        bonusTarget: data.bonusTarget,
        customNotice: data.customNotice
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.getSettings.path] });
      toast({ title: "সেটিংস আপডেট করা হয়েছে" });
    },
  });

  const batchResetMutation = useMutation({
    mutationFn: async (numbers: string[]) => {
      await apiRequest("POST", "/api/admin/batch-reset", { numbers });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
      setBatchNumbers("");
      toast({ title: "সব নম্বর রিসেট করা হয়েছে" });
    }
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("POST", `/api/admin/withdrawals/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.withdrawals.path] });
      toast({ title: "স্ট্যাটাস আপডেট করা হয়েছে" });
    },
  });

  const clearSubmittedMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/submitted-numbers/clear");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/submitted-numbers"] });
      toast({ title: "সব নম্বর ক্লিয়ার করা হয়েছে" });
    },
  });

  const resetSubmittedMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/submitted-numbers/${id}/reset`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/submitted-numbers"] });
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reset-history"] });
      toast({ title: "রিসেট করা হয়েছে" });
    },
  });

  const deleteSubmittedMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/submitted-numbers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/submitted-numbers"] });
      toast({ title: "ডিলিট করা হয়েছে" });
    },
  });

  const { data: receivedList } = useQuery<any[]>({
    queryKey: ["/api/admin/payments/received"],
    enabled: isLoggedIn && showPaymentLists
  });

  const { data: notReceivedList } = useQuery<any[]>({
    queryKey: ["/api/admin/payments/not_received"],
    enabled: isLoggedIn && showPaymentLists
  });

  const getBatchInfo = () => {
    const lines = batchNumbers.split("\n").map(l => l.trim()).filter(Boolean);
    let totalVerified = 0;
    const details = lines.map(num => {
      const u = users?.find(u => u.guestId === num);
      totalVerified += u?.keyCount || 0;
      return { num, count: u?.keyCount || 0 };
    });
    return { totalVerified, details };
  };

  const filteredUsers = users?.filter((u: any) =>
    searchQuery ? u.guestId.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass-card p-8 rounded-3xl w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Admin Access</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') loginMutation.mutate(); }}
            placeholder="Password..."
            className="input-field mb-4"
            data-testid="input-admin-password"
          />
          <button
            onClick={() => loginMutation.mutate()}
            className="btn-primary w-full"
            disabled={loginMutation.isPending}
            data-testid="button-admin-login"
          >
            {loginMutation.isPending ? <Loader2 className="animate-spin" /> : "Login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8 pb-24">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ShieldCheck className="w-10 h-10 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Admin Panel</h1>
              <p className="text-sm text-muted-foreground">মোট ইউজার: <span className="text-primary font-bold">{users?.length || 0}</span> জন</p>
            </div>
          </div>
        </header>

        {/* Custom Notice Setting */}
        <div className="glass-card p-6 rounded-3xl">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            নোটিশ এবং বোনাস সেটিংস
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">নোটিশ (সবার উপরে বড় করে দেখাবে)</label>
              <textarea
                value={customNotice}
                onChange={(e) => setCustomNotice(e.target.value)}
                className="input-field w-full h-24 py-2"
                placeholder="এখানে আপনার নোটিশ লিখুন..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">বোনাস অফার স্ট্যাটাস (On/Off)</label>
                <select 
                  value={bonusStatus}
                  onChange={(e) => setBonusStatus(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="on">On</option>
                  <option value="off">Off</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">বোনাস টার্গেট (কয়টি কি সাবমিট করলে বোনাস পাবে)</label>
                <input
                  type="number"
                  value={bonusTarget}
                  onChange={(e) => setBonusTarget(e.target.value)}
                  className="input-field w-full"
                />
              </div>
            </div>
            <button
              onClick={() => rateMutation.mutate({ customNotice, bonusStatus, bonusTarget: parseInt(bonusTarget) })}
              disabled={rateMutation.isPending}
              className="btn-primary w-full py-3 mt-2"
            >
              {rateMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "সেটিংস সেভ করুন"}
            </button>
          </div>
        </div>

        {/* Submitted Numbers Section */}
        <section className="glass-card p-6 rounded-2xl border-2 border-purple-500/30">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowSubmittedNumbers(!showSubmittedNumbers)}
          >
            <div className="flex items-center gap-3">
              <Send className="w-6 h-6 text-purple-500" />
              <div>
                <h2 className="text-xl font-bold">সাবমিটেড নম্বর লিস্ট</h2>
                <p className="text-sm text-muted-foreground">মোট: <span className="text-purple-400 font-bold">{submittedNumbers?.length || 0}</span> টি নম্বর</p>
              </div>
            </div>
            {showSubmittedNumbers ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
          {showSubmittedNumbers && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-purple-400">
                  মোট ভেরিফাইড: <span className="text-2xl">{submittedNumbers?.reduce((sum, s) => sum + (s.verifiedCount || 0), 0) || 0}</span>
                </p>
                <button
                  onClick={() => clearSubmittedMutation.mutate()}
                  disabled={clearSubmittedMutation.isPending || !submittedNumbers?.length}
                  className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-white font-bold rounded-xl text-sm flex items-center gap-2 transition-all"
                  data-testid="button-reset-all-submitted"
                >
                  {clearSubmittedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCcw className="w-4 h-4" /> Reset All</>}
                </button>
              </div>

              {(() => {
                const grouped: Record<string, any[]> = {};
                submittedNumbers?.forEach(item => {
                  const name = item.submittedBy || "Unknown";
                  if (!grouped[name]) grouped[name] = [];
                  grouped[name].push(item);
                });
                const adminNames = Object.keys(grouped);

                if (adminNames.length === 0) {
                  return <p className="text-center text-muted-foreground py-6">কোনো সাবমিটেড নম্বর নেই</p>;
                }

                return adminNames.map(name => {
                  const firstItem = grouped[name][0];
                  const pMethod = firstItem?.paymentMethod;
                  const pNumber = firstItem?.paymentNumber;
                  return (
                  <div key={name} className="bg-white/5 rounded-2xl border border-purple-500/20 overflow-hidden">
                    <div className="p-4 bg-purple-500/10 border-b border-purple-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-purple-400" />
                          <span className="font-bold text-purple-300">{name}</span>
                        </div>
                        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-lg font-bold">
                          {grouped[name].length} টি নম্বর
                        </span>
                      </div>
                      {pNumber && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${pMethod === 'bkash' ? 'bg-pink-500/20 text-pink-400' : 'bg-orange-500/20 text-orange-400'}`}>
                            {pMethod === 'bkash' ? 'bKash' : 'Nagad'}
                          </span>
                          <span className="text-sm font-mono font-bold text-white">{pNumber}</span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(pNumber); toast({ title: "নম্বর কপি করা হয়েছে" }); }}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                          >
                            <Copy className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
                      {grouped[name].map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                          <div className="flex-1">
                            <p className="font-mono text-sm font-bold">{item.phoneNumber}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-primary font-bold text-sm bg-primary/10 px-2 py-1 rounded-lg">
                              {item.verifiedCount} টা
                            </span>
                            <button
                              onClick={() => resetSubmittedMutation.mutate(item.id)}
                              className="p-1.5 hover:bg-amber-500/20 rounded-lg text-amber-500 transition-colors"
                              title="Reset & Remove"
                            >
                              <RefreshCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteSubmittedMutation.mutate(item.id)}
                              className="p-1.5 hover:bg-destructive/20 rounded-lg text-destructive transition-colors"
                              title="Delete"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );});
              })()}
            </div>
          )}
        </section>

        {/* Reset History Section */}
        <section className="glass-card p-6 rounded-2xl border-2 border-cyan-500/30">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowResetHistory(!showResetHistory)}
          >
            <div className="flex items-center gap-3">
              <History className="w-6 h-6 text-cyan-500" />
              <div>
                <h2 className="text-xl font-bold">রিসেট হিস্ট্রি</h2>
                <p className="text-sm text-muted-foreground">কোন নম্বর কখন রিসেট হয়েছে</p>
              </div>
            </div>
            {showResetHistory ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
          {showResetHistory && (
            <div className="mt-6 space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="নম্বর দিয়ে সার্চ করুন..."
                  value={resetHistorySearch}
                  onChange={(e) => setResetHistorySearch(e.target.value)}
                  className="input-field pl-10 w-full"
                  data-testid="input-reset-history-search"
                />
              </div>
              {(() => {
                const filtered = (resetHistoryData || []).filter(item =>
                  !resetHistorySearch || item.phoneNumber.includes(resetHistorySearch)
                );
                if (filtered.length === 0) {
                  return <p className="text-center text-muted-foreground py-6">কোনো হিস্ট্রি নেই</p>;
                }
                return (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {filtered.map((item: any) => (
                      <div key={item.id} className="bg-white/5 border border-cyan-500/10 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-sm font-bold text-white">{item.phoneNumber}</span>
                          <span className="text-primary font-bold text-sm bg-primary/10 px-2 py-1 rounded-lg">
                            {item.verifiedCount} টা
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span>অ্যাডমিন: <span className="text-purple-400 font-bold">{item.submittedBy}</span></span>
                            {item.paymentNumber && (
                              <span className={`font-bold px-1.5 py-0.5 rounded ${item.paymentMethod === 'bkash' ? 'bg-pink-500/20 text-pink-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                {item.paymentMethod === 'bkash' ? 'bKash' : 'Nagad'}: {item.paymentNumber}
                              </span>
                            )}
                          </div>
                          <span className="text-cyan-400">{new Date(item.resetAt).toLocaleString('bn-BD')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </section>

        {/* User Search Box */}
        <div className="relative">
          <Search className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search User by ID (Phone Number)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-12 h-14 text-lg w-full bg-white/5 border-primary/20 focus:border-primary shadow-xl"
            data-testid="input-search-user"
          />
        </div>

        {/* Payment Confirmation Lists */}
        <section className="glass-card p-6 rounded-2xl border-2 border-emerald-500/30">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowPaymentLists(!showPaymentLists)}
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
              <h2 className="text-xl font-bold">পেমেন্ট কনফার্মেশন লিস্ট</h2>
            </div>
            {showPaymentLists ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
          {showPaymentLists && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-bold text-emerald-500 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> হ্যাঁ (পেমেন্ট পেয়েছে)
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {receivedList?.map(u => (
                    <div key={u.id} className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-xs">
                      {u.guestId} ({u.displayName})
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-bold text-destructive flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> না (পেমেন্ট পায়নি)
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {notReceivedList?.map(u => (
                    <div key={u.id} className="p-3 bg-destructive/10 rounded-xl border border-destructive/20 text-xs">
                      {u.guestId} ({u.displayName})
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-3">
              <Key className="w-8 h-8 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">Ready Keys</p>
                <p className="text-3xl font-black text-emerald-500">{pool?.filter((p: any) => !p.isUsed).length || 0}</p>
              </div>
            </div>
          </div>
          <div 
            className="glass-card p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30 cursor-pointer hover:bg-blue-500/20 transition-all"
            onClick={() => setShowActiveUsers(!showActiveUsers)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Active Users</p>
                  <p className="text-3xl font-black text-blue-500">{users?.filter((u: any) => u.keyCount >= 1).length || 0}</p>
                </div>
              </div>
              {showActiveUsers ? <ChevronUp className="w-5 h-5 text-blue-500" /> : <ChevronDown className="w-5 h-5 text-blue-500" />}
            </div>
          </div>
        </div>

        {showActiveUsers && (
          <section className="glass-card p-6 rounded-2xl border-2 border-blue-500/30">
            <h3 className="text-lg font-bold mb-4 text-blue-400">Active Users (১+ Account করেছে)</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {users?.filter((u: any) => u.keyCount >= 1).map((u: any) => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <span className="font-medium text-sm truncate max-w-[200px]">{u.guestId}</span>
                  <span className="text-primary font-bold text-sm">{u.keyCount} টা</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* System Settings */}
        <section className="glass-card p-6 rounded-2xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Coins className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold">সিস্টেম সেটিংস</h2>
            </div>
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => rateMutation.mutate({ status: "on" })}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${buyStatus === 'on' ? 'bg-emerald-500 text-white shadow-lg' : 'text-muted-foreground hover:text-white'}`}
              >
                Buy ON
              </button>
              <button
                onClick={() => rateMutation.mutate({ status: "off" })}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${buyStatus === 'off' ? 'bg-destructive text-white shadow-lg' : 'text-muted-foreground hover:text-white'}`}
              >
                Buy OFF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Reward Rate (TK per Key)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={rewardRate}
                  onChange={(e) => setRewardRate(e.target.value)}
                  className="input-field"
                />
                <button
                  onClick={() => rateMutation.mutate({ rate: parseInt(rewardRate) })}
                  className="btn-primary"
                  disabled={rateMutation.isPending}
                >
                  Update
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Bonus Target (Account Count)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={bonusTarget}
                  onChange={(e) => setBonusTarget(e.target.value)}
                  className="input-field"
                />
                <button
                  onClick={() => rateMutation.mutate({ bonusTarget: parseInt(bonusTarget) })}
                  className="btn-primary"
                  disabled={rateMutation.isPending}
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Add to Pool Link */}
        <section className="glass-card p-6 rounded-2xl">
          <a
            href="/add-keys"
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-3">
              <Key className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-xl font-bold">পুলে কি যোগ করুন</h2>
                <p className="text-xs text-muted-foreground">আলাদা পেজে গিয়ে কি যোগ করুন</p>
              </div>
            </div>
            <ChevronDown className="w-5 h-5 -rotate-90" />
          </a>
        </section>

        {/* Pool List (Password Protected) */}
        <section className="glass-card rounded-2xl overflow-hidden border-2 border-emerald-500/30">
          <button
            onClick={() => setShowPoolList(!showPoolList)}
            className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-500" />
              পুল কি লিস্ট ({pool?.length || 0})
            </h3>
            {showPoolList ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showPoolList && (
            <div className="p-6 border-t border-white/10">
              {poolPassword !== POOL_SECRET ? (
                <div className="space-y-4 text-center">
                  <p className="text-muted-foreground">পাসওয়ার্ড দিন:</p>
                  <div className="flex gap-2 max-w-sm mx-auto">
                    <input
                      type="password"
                      placeholder="পাসওয়ার্ড..."
                      className="input-field"
                      onChange={(e) => setPoolPassword(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      const allKeys = pool?.map(item => item.privateKey).join('\n') || '';
                      navigator.clipboard.writeText(allKeys);
                      toast({ title: "সব Private Key কপি করা হয়েছে" });
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" /> সব Private Key কপি করুন ({pool?.length || 0})
                  </button>
                  {pool?.some(p => p.isUsed) && (
                    <button
                      onClick={() => deleteUsedKeysMutation.mutate()}
                      disabled={deleteUsedKeysMutation.isPending}
                      className="w-full py-2 bg-destructive hover:bg-destructive/90 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                      data-testid="button-delete-all-used"
                    >
                      {deleteUsedKeysMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /> সব Used Key ডিলিট করুন ({pool?.filter(p => p.isUsed).length})</>}
                    </button>
                  )}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {pool?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex-1 truncate mr-4">
                          <p className="text-xs font-mono truncate">{item.privateKey}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] text-muted-foreground truncate">{item.verifyUrl}</p>
                            {item.addedBy && item.addedBy !== "Unknown" && (
                              <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold shrink-0">{item.addedBy}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.isUsed ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>
                            {item.isUsed ? 'USED' : 'READY'}
                          </span>
                          <button
                            onClick={() => deletePoolMutation.mutate(item.id)}
                            className="text-destructive hover:bg-destructive/10 p-1 rounded"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* User List */}
        <section className="space-y-4">
          <div 
            className="flex items-center justify-between cursor-pointer group"
            onClick={() => setShowUserList(!showUserList)}
          >
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold group-hover:text-primary transition-colors">ব্যবহারকারী তালিকা (Users)</h2>
              {showUserList ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search User ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="input-field pl-9 h-9 text-sm w-48"
              />
            </div>
          </div>
          
          {showUserList && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="grid gap-4 overflow-hidden"
            >
              {filteredUsers?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">কোনো ইউজার পাওয়া যায়নি</div>
              ) : (
                filteredUsers?.map((u) => (
                  <div key={u.id} className="glass-card p-4 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-bold text-sm truncate max-w-[200px]">{u.guestId}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-primary font-bold">Verified: {u.keyCount || 0}</p>
                        <button 
                          onClick={() => resetCountMutation.mutate(u.id)}
                          className="p-1 hover:bg-white/5 rounded text-muted-foreground hover:text-primary transition-colors"
                          title="Reset Count"
                        >
                          <RefreshCcw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => blockMutation.mutate({ id: u.id, isBlocked: !u.isBlocked })}
                      className={`p-2 rounded-lg transition-colors ${u.isBlocked ? 'bg-emerald-500/20 text-emerald-500' : 'bg-destructive/20 text-destructive'}`}
                    >
                      {u.isBlocked ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
                    </button>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </section>

        {/* Withdrawals */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold">পেন্ডিং উইথড্র (Withdrawals)</h2>
          <div className="grid gap-4">
            {withdrawals?.filter(w => w.status === 'pending').map((w) => (
              <div key={w.id} className="glass-card p-4 rounded-xl space-y-3">
                <div className="flex justify-between">
                  <p className="font-bold text-lg">৳{w.amount}</p>
                  <p className="text-sm text-muted-foreground">{w.details}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => statusMutation.mutate({ id: w.id, status: 'completed' })}
                    className="flex-1 btn-primary py-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => statusMutation.mutate({ id: w.id, status: 'rejected' })}
                    className="flex-1 btn-primary py-2 bg-destructive hover:bg-destructive/90"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
