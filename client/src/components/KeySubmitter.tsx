import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Key, ShieldCheck, Loader2, ExternalLink, CheckCircle, Video, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ethers } from "ethers";

import { useAuth } from "@/hooks/use-auth";

export function KeySubmitter() {
  const { user } = useAuth();
  const [activeKey, setActiveKey] = useState<{ id: number; privateKey: string; verifyUrl: string } | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const { toast } = useToast();

  const { data: publicSettings } = useQuery<{ buyStatus: string }>({
    queryKey: ["/api/settings/public"],
  });

  const isOff = publicSettings?.buyStatus === "off";

  const fetchKeyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/earn/get-key");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "কোনো কি এখন খালি নেই");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setActiveKey(data);
      setIsVerified(false);
      toast({ title: "ভেরিফিকেশন লিঙ্ক পাওয়া গেছে" });
    },
    onError: (err: any) => {
      toast({ title: "ব্যর্থ হয়েছে", description: err.message, variant: "destructive" });
    }
  });

  const checkVerificationMutation = useMutation({
    mutationFn: async () => {
      if (!activeKey) return;
      const wallet = new ethers.Wallet(activeKey.privateKey);
      const res = await apiRequest("POST", "/api/earn/check-verification", {
        address: wallet.address,
        keyId: activeKey.id
      });
      const data = await res.json();
      if (!data.isVerified) {
        setActiveKey(null); // Key was deleted on server
      }
      return data;
    },
    onSuccess: (data) => {
      if (data.isVerified) {
        setIsVerified(true);
        toast({ title: "ভেরিফিকেশন সফল!", description: "এখন সাবমিট করুন" });
      } else {
        toast({ 
          title: "ভেরিফাই হয়নি", 
          description: "ভেরিফিকেশন না হওয়ায় লিঙ্কটি বাতিল করা হয়েছে। নতুন লিঙ্ক নিন।",
          variant: "destructive"
        });
      }
    }
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!activeKey || !isVerified) return;
      const res = await apiRequest("POST", api.earn.submitKey.path, {
        privateKey: activeKey.privateKey
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/earn/transactions"] });
      setActiveKey(null);
      setIsVerified(false);
      toast({ title: "সফলভাবে সাবমিট হয়েছে", description: data.message });
    }
  });

  const gdVerifyUrl = activeKey?.verifyUrl || "#";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 rounded-3xl relative overflow-hidden"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/20 rounded-lg">
          <ShieldCheck className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold">অটোমেটিক ভেরিফিকেশন</h2>
      </div>

      <AnimatePresence mode="wait">
        {!activeKey ? (
          <motion.div
            key="fetch"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 mb-6">
              <div className="flex-1 truncate">
                <p className="text-xs text-muted-foreground mb-1">আপনার অ্যাকাউন্ট আইডি (UID)</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm font-bold text-emerald-400">{user?.guestId}</p>
                </div>
              </div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
              <p className="text-sm text-emerald-400 font-bold mb-1">নির্দেশনা:</p>
              <ul className="text-xs text-emerald-100/80 space-y-2 list-disc pl-4 mb-4">
                <li>নিচের বাটনে ক্লিক করলে সিস্টেম থেকে একটি ভেরিফিকেশন লিঙ্ক দেওয়া হবে।</li>
                <li>লিঙ্কে গিয়ে ফেস ভেরিফিকেশন সম্পন্ন করুন।</li>
                <li>ভেরিফিকেশন শেষ হলে এই অ্যাপে ফিরে এসে স্ট্যাটাস চেক করুন।</li>
              </ul>
              
              <div className="pt-4 border-t border-emerald-500/20">
                <p className="text-xs text-emerald-400 font-bold mb-2">কিভাবে ভেরিফিকেশন করবেন ভিডিও দেখুন:</p>
                <a 
                  href="https://youtube.com/shorts/xPEM62ZUV_0?feature=share"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition-all"
                >
                  <Video className="w-4 h-4" /> ভিডিও দেখুন
                </a>
              </div>
            </div>

            {isOff ? (
              <div className="bg-destructive/10 border-2 border-destructive/20 rounded-2xl p-6 text-center mb-6">
                <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
                <p className="text-lg font-bold text-destructive mb-2">সাময়িক বিরতি</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  দুঃখিত, বর্তমানে অ্যাকাউন্ট কেনা-বেচা সাময়িকভাবে বন্ধ আছে। দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন।
                </p>
              </div>
            ) : null}

            <button
              onClick={() => fetchKeyMutation.mutate()}
              disabled={fetchKeyMutation.isPending || isOff}
              className={`btn-primary w-full py-4 flex items-center justify-center gap-2 ${isOff ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
            >
              {fetchKeyMutation.isPending ? <Loader2 className="animate-spin" /> : <><Key className="w-5 h-5" /> ফেস ভেরিফিকেশন শুরু করুন</>}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="verify"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-3">
              <a
                href={gdVerifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full py-4 bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-5 h-5" /> Verify Now (Face)
              </a>

              <button
                onClick={() => checkVerificationMutation.mutate()}
                disabled={checkVerificationMutation.isPending || isVerified}
                className="btn-primary w-full py-4 bg-emerald-600 hover:bg-emerald-700 border-0 flex items-center justify-center gap-2 text-white font-bold"
              >
                {checkVerificationMutation.isPending ? (
                  <Loader2 className="animate-spin w-5 h-5" />
                ) : isVerified ? (
                  <><CheckCircle className="w-5 h-5" /> ভেরিফিকেশন সফল</>
                ) : (
                  <><CheckCircle className="w-5 h-5" /> Verification সম্পুর্ন করুন</>
                )}
              </button>

              {isVerified && (
                <button
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                  className="btn-primary w-full py-4 bg-primary text-black font-black text-lg animate-pulse"
                >
                  {submitMutation.isPending ? <Loader2 className="animate-spin mx-auto" /> : "সাবমিট এবং ইনকাম করুন"}
                </button>
              )}

              <button
                onClick={() => setActiveKey(null)}
                className="text-xs text-muted-foreground hover:text-white transition-colors py-2"
              >
                আবার শুরু করুন
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 pt-6 border-t border-white/5">
        <p className="text-[10px] text-center text-muted-foreground">
          ভেরিফিকেশন সংক্রান্ত যেকোনো সমস্যার জন্য আমাদের টেলিগ্রাম গ্রুপে যোগাযোগ করুন।
        </p>
      </div>
    </motion.div>
  );
}
