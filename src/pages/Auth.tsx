import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock, UserPlus, LogIn, Phone, ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import akLogo from "@/assets/ak-logo.png";
import { useToast } from "@/hooks/use-toast";

type AuthMode = "login" | "signup" | "forgot";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAndRedirect = async (userId: string) => {
      const { data } = await supabase
        .from("user_roles")
        .select("role, is_approved")
        .eq("user_id", userId)
        .single();

      if (data && !data.is_approved) {
        await supabase.auth.signOut();
        toast({
          title: "Account Pending Approval",
          description: "Your account is waiting for admin approval. Please contact the administrator.",
          variant: "destructive",
        });
        return;
      }
      navigate("/dashboard");
    };

    supabase.auth.onAuthStateChange((_, session) => {
      if (session) checkAndRedirect(session.user.id);
    });
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: "Reset link sent!", description: "Check your email for the password reset link." });
        setMode("login");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { phone } } });
        if (error) throw error;
        toast({
          title: "Account created!",
          description: "Your account is pending admin approval. You'll be able to sign in once approved.",
        });
      } else {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        if (signInData.user) {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("is_approved")
            .eq("user_id", signInData.user.id)
            .single();

          if (roleData && !roleData.is_approved) {
            await supabase.auth.signOut();
            toast({
              title: "Account Pending Approval",
              description: "Your account is waiting for admin approval. Please contact the administrator.",
              variant: "destructive",
            });
            return;
          }
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const title = mode === "forgot" ? "Reset Password" : mode === "signup" ? "Create Account" : "Welcome Back";
  const subtitle = mode === "forgot"
    ? "Enter your email to receive a reset link"
    : mode === "signup"
    ? "Sign up to access your employee dashboard"
    : "Sign in to your admin dashboard";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Branding */}
      <div className="relative lg:w-[55%] bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0a1628] flex flex-col items-center justify-center p-8 lg:p-16 overflow-hidden">
        {/* Animated background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-cyan-500/6 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "2s" }} />
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        <div className="relative z-10 text-center max-w-lg">
          {/* Logo */}
          <div className="relative inline-block mb-8">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20 rounded-3xl blur-xl animate-pulse" />
            <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
              <img src={akLogo} alt="AK IT Solution" className="w-20 h-20 lg:w-24 lg:h-24 object-contain mx-auto" />
            </div>
          </div>

          <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight font-display mb-3">
            AK IT Solution
          </h1>
          <p className="text-blue-300/70 text-sm lg:text-base font-medium tracking-wide mb-10">
            CCTV | Attendance Devices | IT Services
          </p>

          {/* Feature badges */}
          <div className="hidden lg:grid grid-cols-2 gap-3 max-w-sm mx-auto">
            {[
              { icon: ShieldCheck, label: "Trusted Security", desc: "500+ installations" },
              { icon: Sparkles, label: "Expert Support", desc: "24/7 available" },
            ].map((f, i) => (
              <div key={i} className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-xl p-4 text-left group hover:bg-white/[0.06] transition-all duration-300">
                <f.icon className="h-5 w-5 text-blue-400 mb-2" />
                <p className="text-white/90 text-sm font-semibold">{f.label}</p>
                <p className="text-white/40 text-xs mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Back to store link */}
          <a
            href="/"
            className="inline-flex items-center gap-2 mt-10 text-blue-400/60 hover:text-blue-400 text-sm font-medium transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Online Store
          </a>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-16 bg-gradient-to-br from-background via-background to-primary/3">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo (hidden on desktop) */}
          <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
            <img src={akLogo} alt="AK IT Solution" className="w-10 h-10 rounded-xl object-contain" />
            <div>
              <h2 className="text-lg font-bold tracking-tight">AK IT Solution</h2>
              <p className="text-xs text-muted-foreground">Admin Portal</p>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight">{title}</h2>
            <p className="text-muted-foreground text-sm mt-2">{subtitle}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  className="pl-11 h-12 text-sm bg-muted/30 border-border/50 focus:bg-background transition-colors"
                />
              </div>
            </div>

            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold">Phone Number</Label>
                <div className="relative group">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01919-060590"
                    className="pl-11 h-12 text-sm bg-muted/30 border-border/50 focus:bg-background transition-colors"
                  />
                </div>
              </div>
            )}

            {mode !== "forgot" && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    minLength={6}
                    className="pl-11 pr-11 h-12 text-sm bg-muted/30 border-border/50 focus:bg-background transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === "login" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-xs text-primary/80 hover:text-primary font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 font-semibold text-sm bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-500/25 border-0"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Please wait...
                </div>
              ) : mode === "forgot" ? (
                <div className="flex items-center gap-2"><Mail className="h-4 w-4" />Send Reset Link</div>
              ) : mode === "signup" ? (
                <div className="flex items-center gap-2"><UserPlus className="h-4 w-4" />Create Account</div>
              ) : (
                <div className="flex items-center gap-2"><LogIn className="h-4 w-4" />Sign In</div>
              )}
            </Button>
          </form>

          {/* Switch mode */}
          <div className="mt-8 pt-6 border-t border-border/50">
            <p className="text-center text-sm text-muted-foreground">
              {mode === "forgot" ? (
                <button onClick={() => setMode("login")} className="text-primary font-semibold hover:underline inline-flex items-center gap-1">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
                </button>
              ) : (
                <>
                  {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
                  <button
                    onClick={() => setMode(mode === "signup" ? "login" : "signup")}
                    className="text-primary font-semibold hover:underline"
                  >
                    {mode === "signup" ? "Sign in" : "Create one"}
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-[11px] text-muted-foreground/60 mt-8">
            © {new Date().getFullYear()} AK IT Solution. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
