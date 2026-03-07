import { useState } from "react";
import { Key, Users, Loader2, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

export default function AddKeys() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [isNameSet, setIsNameSet] = useState(false);
  const [newPrivateKey, setNewPrivateKey] = useState("");
  const [newVerifyUrl, setNewVerifyUrl] = useState("");

  const { data: pool } = useQuery<any[]>({
    queryKey: ["/api/pool-stats"],
  });

  const addPoolMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/add-key", {
        privateKey: newPrivateKey,
        verifyUrl: newVerifyUrl,
        addedBy: name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pool-stats"] });
      setNewPrivateKey("");
      setNewVerifyUrl("");
      toast({ title: "কি পুলে যোগ করা হয়েছে" });
    },
  });

  const readyKeys = pool?.filter((item: any) => !item.isUsed) || [];
  const grouped: Record<string, number> = {};
  readyKeys.forEach((item: any) => {
    const n = item.addedBy || "Unknown";
    if (n !== "Unknown") {
      grouped[n] = (grouped[n] || 0) + 1;
    }
  });
  const names = Object.keys(grouped);

  return (
    <div className="min-h-screen bg-background p-4 max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 py-6"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Key className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-black text-white">পুলে কি যোগ করুন</h1>
          <p className="text-sm text-muted-foreground mt-1">নাম দিয়ে ঢুকে Private Key ও Link যোগ করুন</p>
        </div>

        <section className="glass-card p-4 rounded-2xl border border-white/10">
          <p className="text-xs text-muted-foreground font-bold mb-3">কে কতটি কি যোগ করেছে:</p>
          {names.length > 0 ? (
            <div className="space-y-2">
              {names.map(n => (
                <div key={n} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-bold text-white">{n}</span>
                  </div>
                  <span className="text-sm font-black bg-primary/20 text-primary px-3 py-1 rounded-lg">{grouped[n]}টি কি</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">এখনো কেউ নাম দিয়ে কি যোগ করেনি</p>
          )}
          <p className="text-[10px] text-muted-foreground text-center mt-3">মোট রেডি কি আছে: {readyKeys.length}টি</p>
        </section>

        <AnimatePresence mode="wait">
          {!isNameSet ? (
            <motion.section
              key="name-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass-card p-6 rounded-2xl border border-white/10"
            >
              <p className="text-sm text-muted-foreground text-center mb-4">কি যোগ করতে আপনার নাম দিন</p>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="আপনার নাম লিখুন..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field w-full text-lg"
                  data-testid="input-addkey-name"
                />
                <button
                  onClick={() => name.trim() && setIsNameSet(true)}
                  className="btn-primary w-full py-4 font-black"
                  disabled={!name.trim()}
                  data-testid="button-addkey-enter"
                >
                  এগিয়ে যান →
                </button>
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="add-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card p-6 rounded-2xl border border-white/10"
            >
              <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-xl p-3 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-primary">{name}</span>
                </div>
                <button
                  onClick={() => setIsNameSet(false)}
                  className="text-xs text-muted-foreground hover:text-white transition-colors"
                >
                  পরিবর্তন করুন
                </button>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Private Key..."
                  value={newPrivateKey}
                  onChange={(e) => setNewPrivateKey(e.target.value)}
                  className="input-field w-full"
                  data-testid="input-addkey-private"
                />
                <input
                  type="text"
                  placeholder="Verification Link (GoodID URL)..."
                  value={newVerifyUrl}
                  onChange={(e) => setNewVerifyUrl(e.target.value)}
                  className="input-field w-full"
                  data-testid="input-addkey-url"
                />
                <button
                  onClick={() => addPoolMutation.mutate()}
                  className="btn-primary w-full py-4 font-black flex items-center justify-center gap-2"
                  disabled={addPoolMutation.isPending || !newPrivateKey.trim() || !newVerifyUrl.trim()}
                  data-testid="button-addkey-submit"
                >
                  {addPoolMutation.isPending ? <Loader2 className="animate-spin" /> : <><Key className="w-5 h-5" /> Add to Pool</>}
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <button
          onClick={() => setLocation("/")}
          className="w-full py-3 text-sm text-muted-foreground hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> হোম পেজে ফিরে যান
        </button>
      </motion.div>
    </div>
  );
}
