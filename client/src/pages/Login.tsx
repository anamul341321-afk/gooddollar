import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ShieldCheck, Loader2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

export default function Login() {
  const [guestId, setGuestId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const { login, isLoggingIn, isAuthenticated } = useAuth();
  const [_, setLocation] = useLocation();

  if (isAuthenticated) {
    setLocation("/dashboard");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestId.trim() || !displayName.trim()) return;
    login({ guestId, displayName });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-tr from-primary to-emerald-300 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-primary/20 rotate-3">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 mb-2">
            Secure Earn
          </h1>
          <p className="text-muted-foreground text-lg">
            আপনার নাম এবং ফোন নম্বর দিয়ে প্রবেশ করুন
          </p>
        </div>

        <div className="glass-card p-8 rounded-3xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2 ml-1">
                আপনার নাম
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="এখানে আপনার নাম লিখুন..."
                className="input-field text-lg py-4 mb-4"
                autoFocus
              />
              <label className="block text-sm font-medium text-muted-foreground mb-2 ml-1">
                ফোন নম্বর (UID)
              </label>
              <input
                type="tel"
                value={guestId}
                onChange={(e) => setGuestId(e.target.value)}
                placeholder="এখানে আপনার ফোন নম্বর লিখুন..."
                className="input-field text-lg py-4"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn || !guestId}
              className="btn-primary py-4 text-lg"
            >
              {isLoggingIn ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  এগিয়ে যান <ArrowRight className="w-6 h-6" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm text-muted-foreground/60">
            <p>By continuing you agree to our Terms of Service</p>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
