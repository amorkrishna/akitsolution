import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package, Minus, Plus, Trash2, CheckCircle, ArrowRight } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";

interface StoreCartDrawerProps {
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  setCheckoutOpen: (open: boolean) => void;
  isDark: boolean;
  lang: "en" | "bn";
}

export function StoreCartDrawer({ cartOpen, setCartOpen, setCheckoutOpen, isDark, lang }: StoreCartDrawerProps) {
  const { items: cartItems, updateQuantity, removeItem, totalItems, totalPrice } = useCartStore();
  const dialogBg = isDark ? "bg-[#0A0515]/95 border-white/10" : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-white/60" : "text-gray-500";
  const textMuted = isDark ? "text-white/40" : "text-gray-400";
  const gradientPrice = "bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent";

  return (
    <Dialog open={cartOpen} onOpenChange={setCartOpen}>
      <DialogContent className={`max-w-md max-h-[90vh] overflow-y-auto ${dialogBg} p-0 gap-0`}>
        <DialogHeader className={`p-4 border-b ${isDark ? "border-white/10" : "border-gray-200"}`}>
          <DialogTitle className={`flex items-center gap-2 ${textPrimary}`}>
            <ShoppingCart className="h-5 w-5 text-violet-400" />
            {lang === "bn" ? "আপনার কার্ট" : "Your Cart"}
            {totalItems() > 0 && <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-violet-500/20 text-violet-300" : "bg-violet-100 text-violet-600"}`}>{totalItems()}</span>}
          </DialogTitle>
        </DialogHeader>
        {cartItems.length === 0 ? (
          <div className="p-8 text-center">
            <ShoppingCart className={`h-12 w-12 mx-auto mb-3 ${isDark ? "text-white/10" : "text-gray-200"}`} />
            <p className={`text-sm ${textSecondary}`}>{lang === "bn" ? "কার্ট খালি" : "Cart is empty"}</p>
          </div>
        ) : (
          <>
            <div className={`divide-y ${isDark ? "divide-white/5" : "divide-gray-100"} max-h-[50vh] overflow-y-auto`}>
              {cartItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3">
                  <div className={`h-12 w-12 rounded-lg overflow-hidden flex-shrink-0 ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center"><Package className={`h-5 w-5 ${textMuted}`} /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium line-clamp-2 ${textPrimary}`}>{item.name}</p>
                    <p className={`text-xs font-bold mt-0.5 ${gradientPrice}`}>৳{item.price.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className={`h-7 w-7 rounded-lg flex items-center justify-center ${isDark ? "bg-white/10 hover:bg-white/20" : "bg-gray-100 hover:bg-gray-200"}`}>
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className={`text-xs font-bold w-6 text-center ${textPrimary}`}>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className={`h-7 w-7 rounded-lg flex items-center justify-center ${isDark ? "bg-violet-500/20 hover:bg-violet-500/30 text-violet-400" : "bg-violet-50 hover:bg-violet-100 text-violet-600"}`}>
                      <Plus className="h-3 w-3" />
                    </button>
                    <button onClick={() => removeItem(item.id)} className="h-7 w-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-300 ml-1">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className={`p-4 border-t ${isDark ? "border-white/10" : "border-gray-200"} space-y-3`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${textPrimary}`}>{lang === "bn" ? "মোট" : "Total"}</span>
                <span className={`text-xl font-black ${gradientPrice}`}>৳{totalPrice().toLocaleString()}</span>
              </div>
              <Button
                onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}
                className="w-full gap-2 bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 border-0 shadow-lg shadow-violet-500/25 rounded-xl text-white h-11 text-sm font-semibold"
              >
                <CheckCircle className="h-4 w-4" /> {lang === "bn" ? "চেকআউট করুন" : "Checkout"} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
