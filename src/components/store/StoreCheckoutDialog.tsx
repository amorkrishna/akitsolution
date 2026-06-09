import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle, Smartphone, Building2 } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";

interface StoreCheckoutDialogProps {
  checkoutOpen: boolean;
  setCheckoutOpen: (open: boolean) => void;
  checkoutForm: { name: string; phone: string; email: string; payment_method: string };
  setCheckoutForm: React.Dispatch<React.SetStateAction<{ name: string; phone: string; email: string; payment_method: string }>>;
  checkoutMutation: any;
  isDark: boolean;
  lang: "en" | "bn";
  settings: any;
}

export function StoreCheckoutDialog({
  checkoutOpen,
  setCheckoutOpen,
  checkoutForm,
  setCheckoutForm,
  checkoutMutation,
  isDark,
  lang,
  settings,
}: StoreCheckoutDialogProps) {
  const { items: cartItems, totalPrice } = useCartStore();
  const dialogBg = isDark ? "bg-[#0A0515]/95 border-white/10" : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-white/60" : "text-gray-500";
  const labelColor = isDark ? "text-white/70" : "text-gray-700";
  const inputBg = isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/30" : "bg-gray-50 border-gray-200 text-gray-900";
  const gradientPrice = "bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent";

  const paymentMethods = [
    { value: "cash_on_delivery", label: lang === "bn" ? "ক্যাশ অন ডেলিভারি" : "Cash on Delivery", icon: "💵" },
    { value: "bkash", label: "bKash", icon: "📱" },
    { value: "nagad", label: "Nagad", icon: "📱" },
    { value: "rocket", label: "Rocket", icon: "📱" },
    { value: "bank_transfer", label: lang === "bn" ? "ব্যাংক ট্রান্সফার" : "Bank Transfer", icon: "🏦" },
    { value: "card", label: lang === "bn" ? "কার্ড পেমেন্ট" : "Card Payment", icon: "💳" },
  ];

  return (
    <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
      <DialogContent className={`max-w-md max-h-[90vh] overflow-y-auto ${dialogBg}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${textPrimary}`}>
            <CheckCircle className="h-5 w-5 text-violet-400" /> {lang === "bn" ? "চেকআউট" : "Checkout"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); checkoutMutation.mutate(); }} className="space-y-3">
          {/* Order Summary */}
          <div className={`rounded-xl p-3 border ${isDark ? "bg-white/[0.03] border-white/10" : "bg-gray-50 border-gray-200"}`}>
            <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${textSecondary}`}>{lang === "bn" ? "অর্ডার সারসংক্ষেপ" : "Order Summary"}</p>
            {cartItems.map(item => (
              <div key={item.id} className={`flex items-center justify-between py-1 text-xs ${textPrimary}`}>
                <span className="truncate max-w-[200px]">{item.name} ×{item.quantity}</span>
                <span className="font-bold">৳{(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div className={`flex items-center justify-between pt-2 mt-2 border-t text-sm font-bold ${isDark ? "border-white/10" : "border-gray-200"} ${textPrimary}`}>
              <span>{lang === "bn" ? "মোট" : "Total"}</span>
              <span className={gradientPrice}>৳{totalPrice().toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className={`text-xs ${labelColor}`}>{lang === "bn" ? "আপনার নাম *" : "Your Name *"}</Label>
            <Input value={checkoutForm.name} onChange={e => setCheckoutForm({ ...checkoutForm, name: e.target.value })} required placeholder={lang === "bn" ? "আপনার নাম" : "Your name"} className={inputBg} />
          </div>
          <div className="space-y-1.5">
            <Label className={`text-xs ${labelColor}`}>{lang === "bn" ? "ফোন নম্বর *" : "Phone Number *"}</Label>
            <Input value={checkoutForm.phone} onChange={e => setCheckoutForm({ ...checkoutForm, phone: e.target.value })} required placeholder="01XXXXXXXXX" className={inputBg} />
          </div>
          <div className="space-y-1.5">
            <Label className={`text-xs ${labelColor}`}>{lang === "bn" ? "ইমেইল (ঐচ্ছিক)" : "Email (optional)"}</Label>
            <Input type="email" value={checkoutForm.email} onChange={e => setCheckoutForm({ ...checkoutForm, email: e.target.value })} placeholder="email@example.com" className={inputBg} />
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label className={`text-xs ${labelColor}`}>{lang === "bn" ? "পেমেন্ট পদ্ধতি *" : "Payment Method *"}</Label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map(pm => (
                <button
                  type="button"
                  key={pm.value}
                  onClick={() => setCheckoutForm({ ...checkoutForm, payment_method: pm.value })}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all text-left ${checkoutForm.payment_method === pm.value
                    ? isDark ? "border-violet-500/50 bg-violet-500/10 text-violet-300" : "border-violet-400 bg-violet-50 text-violet-600"
                    : isDark ? "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  <span>{pm.icon}</span>
                  <span>{pm.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Instructions */}
          {["bkash", "nagad", "rocket"].includes(checkoutForm.payment_method) && (
            <div className={`rounded-xl p-3 border text-xs space-y-1 ${isDark ? "bg-orange-500/5 border-orange-500/20 text-orange-300" : "bg-orange-50 border-orange-200 text-orange-700"}`}>
              <p className="font-semibold flex items-center gap-1"><Smartphone className="h-3.5 w-3.5" /> {lang === "bn" ? "পেমেন্ট নির্দেশনা:" : "Payment Instructions:"}</p>
              <p>{lang === "bn" ? `${checkoutForm.payment_method === "bkash" ? "bKash" : checkoutForm.payment_method === "nagad" ? "Nagad" : "Rocket"} এ Send Money করুন:` : `Send Money via ${checkoutForm.payment_method === "bkash" ? "bKash" : checkoutForm.payment_method === "nagad" ? "Nagad" : "Rocket"}:`}</p>
              <p className="font-bold text-sm">{settings.phone?.split(",")[0]?.trim() || "01919-060590"}</p>
              <p>{lang === "bn" ? `পরিমাণ: ৳${totalPrice().toLocaleString()}` : `Amount: ৳${totalPrice().toLocaleString()}`}</p>
            </div>
          )}

          {checkoutForm.payment_method === "bank_transfer" && settings.bank_name && (
            <div className={`rounded-xl p-3 border text-xs space-y-1 ${isDark ? "bg-violet-500/5 border-violet-500/20 text-violet-300" : "bg-violet-50 border-blue-200 text-blue-700"}`}>
              <p className="font-semibold flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {lang === "bn" ? "ব্যাংক তথ্য:" : "Bank Details:"}</p>
              <p>{settings.bank_name} — {settings.bank_branch}</p>
              <p className="font-bold">{settings.bank_account_name}</p>
              <p>A/C: {settings.bank_account_number}</p>
            </div>
          )}

          <Button type="submit" disabled={checkoutMutation.isPending} className="w-full gap-2 bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 border-0 shadow-lg shadow-violet-500/25 rounded-xl text-white h-11 text-sm font-semibold">
            {checkoutMutation.isPending ? (lang === "bn" ? "প্রক্রিয়াকরণ..." : "Processing...") : (
              <><CheckCircle className="h-4 w-4" /> {lang === "bn" ? "অর্ডার নিশ্চিত করুন" : "Confirm Order"}</>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
