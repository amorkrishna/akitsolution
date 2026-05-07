import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Package, Clock, CheckCircle, Truck, Phone, ArrowRight, Loader2 } from "lucide-react";

interface OrderTrackingProps {
  isDark: boolean;
  lang: "bn" | "en";
}

const statusConfig: Record<string, { icon: any; color: string; label: Record<string, string> }> = {
  pending: { icon: Clock, color: "text-amber-400 bg-amber-500/10 border-amber-500/20", label: { bn: "অপেক্ষমান", en: "Pending" } },
  confirmed: { icon: CheckCircle, color: "text-blue-400 bg-blue-500/10 border-blue-500/20", label: { bn: "নিশ্চিত", en: "Confirmed" } },
  processing: { icon: Package, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", label: { bn: "প্রক্রিয়াধীন", en: "Processing" } },
  shipped: { icon: Truck, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", label: { bn: "শিপিং হয়েছে", en: "Shipped" } },
  delivered: { icon: CheckCircle, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", label: { bn: "ডেলিভারি সম্পন্ন", en: "Delivered" } },
  cancelled: { icon: Clock, color: "text-red-400 bg-red-500/10 border-red-500/20", label: { bn: "বাতিল", en: "Cancelled" } },
};

export function OrderTracking({ isDark, lang }: OrderTrackingProps) {
  const [phone, setPhone] = useState("");
  const [searchPhone, setSearchPhone] = useState("");

  const { data: orders, isLoading, isFetched } = useQuery({
    queryKey: ["track-orders", searchPhone],
    queryFn: async () => {
      if (!searchPhone) return [];
      const { data, error } = await supabase
        .from("store_orders")
        .select("*")
        .eq("customer_phone", searchPhone)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!searchPhone,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim()) setSearchPhone(phone.trim());
  };

  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-white/60" : "text-gray-600";
  const textMuted = isDark ? "text-white/40" : "text-gray-400";
  const cardBg = isDark ? "bg-white/[0.04] border-white/10" : "bg-white border-gray-200";
  const inputBg = isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/30" : "bg-white border-gray-200";

  // Group orders by date
  const groupedOrders = (orders || []).reduce<Record<string, typeof orders>>((acc, order) => {
    const date = new Date(order.created_at).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
    if (!acc[date]) acc[date] = [];
    acc[date]!.push(order);
    return acc;
  }, {});

  return (
    <section className="max-w-2xl mx-auto px-3 sm:px-6 pb-16">
      <div className="text-center mb-6">
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-3 ${isDark ? "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 text-blue-300" : "bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 text-blue-600"}`}>
          <Truck className="h-3.5 w-3.5" />
          {lang === "bn" ? "📦 অর্ডার ট্র্যাকিং" : "📦 Track Your Order"}
        </div>
        <p className={`text-xs sm:text-sm ${textSecondary}`}>
          {lang === "bn" ? "আপনার ফোন নম্বর দিয়ে অর্ডারের অবস্থা দেখুন" : "Enter your phone number to check order status"}
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${textMuted}`} />
          <Input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder={lang === "bn" ? "ফোন নম্বর লিখুন (01XXXXXXXXX)" : "Enter phone number (01XXXXXXXXX)"}
            className={`pl-10 h-11 rounded-xl ${inputBg}`}
          />
        </div>
        <Button
          type="submit"
          disabled={!phone.trim() || isLoading}
          className="h-11 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border-0 text-white gap-2"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {lang === "bn" ? "খুঁজুন" : "Search"}
        </Button>
      </form>

      {/* Results */}
      {isLoading && (
        <div className="text-center py-12">
          <Loader2 className={`h-8 w-8 mx-auto mb-3 animate-spin ${textMuted}`} />
          <p className={`text-sm ${textMuted}`}>{lang === "bn" ? "খোঁজা হচ্ছে..." : "Searching..."}</p>
        </div>
      )}

      {isFetched && !isLoading && orders?.length === 0 && (
        <div className={`text-center py-12 rounded-2xl border ${cardBg}`}>
          <Package className={`h-12 w-12 mx-auto mb-3 ${isDark ? "text-white/10" : "text-gray-200"}`} />
          <p className={`text-sm font-medium ${textSecondary}`}>
            {lang === "bn" ? "কোনো অর্ডার পাওয়া যায়নি" : "No orders found"}
          </p>
          <p className={`text-xs mt-1 ${textMuted}`}>
            {lang === "bn" ? "এই ফোন নম্বরে কোনো অর্ডার নেই" : "No orders found for this phone number"}
          </p>
        </div>
      )}

      {Object.entries(groupedOrders).map(([date, dateOrders]) => (
        <div key={date} className="mb-6">
          <h3 className={`text-xs font-semibold mb-2 flex items-center gap-2 ${textSecondary}`}>
            <Clock className="h-3 w-3" /> {date}
          </h3>
          <div className="space-y-2.5">
            {dateOrders!.map(order => {
              const config = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              const time = new Date(order.created_at).toLocaleTimeString(lang === "bn" ? "bn-BD" : "en-US", {
                hour: "2-digit", minute: "2-digit",
              });
              return (
                <div key={order.id} className={`rounded-xl border p-3 sm:p-4 transition-all ${cardBg}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold leading-tight line-clamp-2 ${textPrimary}`}>{order.item_name}</p>
                      <p className={`text-[10px] mt-0.5 ${textMuted}`}>
                        {time} • {lang === "bn" ? "পরিমাণ" : "Qty"}: {order.quantity}
                      </p>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-semibold flex-shrink-0 ${config.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {config.label[lang]}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isDark ? "bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent" : "text-blue-600"}`}>
                      ৳{(Number(order.item_price) * order.quantity).toLocaleString()}
                    </span>
                    {order.message && (
                      <span className={`text-[9px] ${textMuted}`}>
                        {order.message.replace("Payment: ", "")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
