import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Package, Plus, Minus, Trash2, Camera, Laptop, Router,
  HardDrive, Monitor, Cable, Cpu, Printer, Keyboard, Server, Sparkles, ArrowRight,
  Search, CheckCircle, Smartphone, CreditCard, Building2, Shield, Home, Building, Store, Zap
} from "lucide-react";
import { toast } from "sonner";
import { useCompanySettings } from "@/hooks/useCompanySettings";

const categoryIcons: Record<string, any> = {
  CCTV: Camera, Laptop, Networking: Router, "DVR/NVR": HardDrive,
  Monitor, Accessories: Cable, Computer: Cpu, Printer, "Keyboard/Mouse": Keyboard, Server,
};

interface PackageBuilderProps {
  isDark: boolean;
  lang: "bn" | "en";
  onAddToCart: (name: string, price: number, imageUrl?: string | null, productId?: string) => void;
  cartAddMultiple: (items: { id: string; name: string; price: number; image_url?: string | null; product_id?: string; type: string }[]) => void;
}

interface PackageTemplate {
  id: string;
  icon: any;
  name: { bn: string; en: string };
  desc: { bn: string; en: string };
  items: { category: string; count: number }[];
  color: string;
}

const packageTemplates: PackageTemplate[] = [
  {
    id: "home-4cam",
    icon: Home,
    name: { bn: "🏠 হোম সিকিউরিটি কিট", en: "🏠 Home Security Kit" },
    desc: { bn: "৪ ক্যামেরা + ১ DVR + ১ মনিটর", en: "4 Cameras + 1 DVR + 1 Monitor" },
    items: [{ category: "CCTV", count: 4 }, { category: "DVR/NVR", count: 1 }, { category: "Monitor", count: 1 }],
    color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30",
  },
  {
    id: "office-8cam",
    icon: Building,
    name: { bn: "🏢 অফিস সিকিউরিটি", en: "🏢 Office Security" },
    desc: { bn: "৮ ক্যামেরা + ১ DVR + নেটওয়ার্কিং", en: "8 Cameras + 1 DVR + Networking" },
    items: [{ category: "CCTV", count: 8 }, { category: "DVR/NVR", count: 1 }, { category: "Networking", count: 1 }],
    color: "from-blue-500/20 to-indigo-500/10 border-blue-500/30",
  },
  {
    id: "shop-security",
    icon: Store,
    name: { bn: "🏪 শপ সিকিউরিটি", en: "🏪 Shop Security" },
    desc: { bn: "২ ক্যামেরা + ১ DVR + আনুষাঙ্গিক", en: "2 Cameras + 1 DVR + Accessories" },
    items: [{ category: "CCTV", count: 2 }, { category: "DVR/NVR", count: 1 }, { category: "Accessories", count: 1 }],
    color: "from-amber-500/20 to-orange-500/10 border-amber-500/30",
  },
  {
    id: "enterprise",
    icon: Shield,
    name: { bn: "🏗️ এন্টারপ্রাইজ সিকিউরিটি", en: "🏗️ Enterprise Security" },
    desc: { bn: "১৬ ক্যামেরা + DVR + সার্ভার + নেটওয়ার্কিং", en: "16 Cameras + DVR + Server + Networking" },
    items: [{ category: "CCTV", count: 16 }, { category: "DVR/NVR", count: 1 }, { category: "Server", count: 1 }, { category: "Networking", count: 2 }],
    color: "from-purple-500/20 to-pink-500/10 border-purple-500/30",
  },
];

export function PackageBuilder({ isDark, lang }: PackageBuilderProps) {
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderForm, setOrderForm] = useState({ name: "", phone: "", payment_method: "cash_on_delivery" });
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const { settings } = useCompanySettings();

  // Fetch ALL products (not just show_in_store) so all categories appear
  const { data: products } = useQuery({
    queryKey: ["builder-all-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("category").order("name");
      return data || [];
    },
  });

  // Define all standard categories - always show them even if no products yet
  const allCategories = [
    "CCTV", "Laptop", "Networking", "DVR/NVR", "Monitor",
    "Accessories", "Computer", "Printer", "Keyboard/Mouse", "Server"
  ];

  const t = {
    title: lang === "bn" ? "🛠️ নিজের প্যাকেজ তৈরি করুন" : "🛠️ Build Your Own Package",
    subtitle: lang === "bn" ? "আপনার প্রয়োজন অনুযায়ী পণ্য বাছাই করুন — দাম স্বয়ংক্রিয়ভাবে হিসাব হবে" : "Select products based on your needs — price is calculated automatically",
    selectCategory: lang === "bn" ? "ক্যাটাগরি থেকে বাছাই করুন" : "Select from categories",
    yourPackage: lang === "bn" ? "আপনার প্যাকেজ" : "Your Package",
    totalPrice: lang === "bn" ? "মোট মূল্য" : "Total Price",
    emptyPackage: lang === "bn" ? "কোনো পণ্য বাছাই করা হয়নি" : "No products selected yet",
    emptyDesc: lang === "bn" ? "উপরের ক্যাটাগরি থেকে পণ্য যোগ করুন" : "Add products from the categories above",
    items: lang === "bn" ? "টি আইটেম" : "items",
    startBuilding: lang === "bn" ? "প্যাকেজ তৈরি শুরু করুন" : "Start building your package",
    searchProducts: lang === "bn" ? "পণ্য খুঁজুন..." : "Search products...",
    placeOrder: lang === "bn" ? "অর্ডার করুন" : "Place Order",
    checkout: lang === "bn" ? "চেকআউট" : "Checkout",
    yourName: lang === "bn" ? "আপনার নাম *" : "Your Name *",
    namePlaceholder: lang === "bn" ? "আপনার নাম লিখুন" : "Enter your name",
    phone: lang === "bn" ? "ফোন নম্বর *" : "Phone Number *",
    paymentMethod: lang === "bn" ? "পেমেন্ট পদ্ধতি *" : "Payment Method *",
    confirmOrder: lang === "bn" ? "অর্ডার নিশ্চিত করুন" : "Confirm Order",
    orderSuccess: lang === "bn" ? "✅ অর্ডার সফল হয়েছে!" : "✅ Order placed successfully!",
    orderSuccessDesc: lang === "bn" ? "আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।" : "We will contact you shortly.",
    orderError: lang === "bn" ? "অর্ডার দিতে সমস্যা হয়েছে" : "Failed to place order",
  };

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    products?.forEach((p: any) => {
      const cat = p.category || "Other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });
    return map;
  }, [products]);

  // Merge predefined categories with any from DB
  const categories = useMemo(() => {
    const dbCats = Object.keys(grouped);
    const merged = [...new Set([...allCategories, ...dbCats])];
    return merged;
  }, [grouped]);

  const filteredCategoryProducts = useMemo(() => {
    if (!expandedCat || !grouped[expandedCat]) return [];
    if (!searchQuery.trim()) return grouped[expandedCat];
    const q = searchQuery.toLowerCase();
    return grouped[expandedCat].filter((p: any) =>
      p.name.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q)
    );
  }, [expandedCat, grouped, searchQuery]);

  const selectedProducts = useMemo(() => {
    const items: { product: any; qty: number }[] = [];
    Object.entries(selections).forEach(([id, qty]) => {
      if (qty > 0) {
        const p = products?.find((pr: any) => pr.id === id);
        if (p) items.push({ product: p, qty });
      }
    });
    return items;
  }, [selections, products]);

  const totalPrice = selectedProducts.reduce((sum, { product, qty }) => {
    const price = product.cash_discount_price ? Number(product.cash_discount_price) : Number(product.price);
    return sum + price * qty;
  }, 0);

  const totalItems = selectedProducts.reduce((sum, { qty }) => sum + qty, 0);

  const updateQty = (id: string, delta: number) => {
    setSelections(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  const removeItem = (id: string) => {
    setSelections(prev => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };
  const applyTemplate = (template: PackageTemplate) => {
    if (!products || products.length === 0) return;
    const newSelections: Record<string, number> = {};
    template.items.forEach(({ category, count }) => {
      const catProducts = grouped[category] || [];
      const inStock = catProducts.filter((p: any) => p.stock_quantity > 0);
      const toUse = inStock.length > 0 ? inStock : catProducts;
      for (let i = 0; i < Math.min(count, toUse.length); i++) {
        newSelections[toUse[i].id] = (newSelections[toUse[i].id] || 0) + 1;
      }
      // If we need more than available unique products, add qty to last one
      if (count > toUse.length && toUse.length > 0) {
        const lastId = toUse[toUse.length - 1].id;
        newSelections[lastId] = (newSelections[lastId] || 0) + (count - toUse.length);
      }
    });
    setSelections(newSelections);
    setActiveTemplate(template.id);
    setExpandedCat(template.items[0]?.category || null);
    toast.success(lang === "bn" ? `✅ ${template.name.bn} টেমপ্লেট প্রয়োগ করা হয়েছে` : `✅ ${template.name.en} template applied`, {
      description: lang === "bn" ? "আপনি পণ্য পরিবর্তন করতে পারেন" : "You can customize the products",
    });
  };
  const placeOrder = useMutation({
    mutationFn: async () => {
      const orderItems = selectedProducts.map(({ product, qty }) => {
        const price = product.cash_discount_price ? Number(product.cash_discount_price) : Number(product.price);
        return { product, qty, price };
      });
      const inserts = orderItems.map(({ product, qty, price }) => ({
        customer_name: orderForm.name,
        customer_phone: orderForm.phone,
        item_name: `[Package] ${product.name}`,
        item_price: price,
        quantity: qty,
        product_id: product.id,
        message: `Payment: ${orderForm.payment_method}`,
        status: "pending",
      }));
      const { error } = await supabase.from("store_orders").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t.orderSuccess, { description: t.orderSuccessDesc });
      // Send WhatsApp notification to shop owner
      const ownerPhone = settings.phone?.split(",")[0]?.trim() || "01919060590";
      const phone = ownerPhone.replace(/[^0-9]/g, "");
      const whatsappNumber = phone.startsWith("0") ? `88${phone}` : phone;
      const itemsList = selectedProducts.map(({ product, qty }) => {
        const price = product.cash_discount_price ? Number(product.cash_discount_price) : Number(product.price);
        return `• ${product.name} ×${qty} = ৳${(price * qty).toLocaleString()}`;
      }).join("\n");
      const message = `🛒 *নতুন প্যাকেজ অর্ডার!*\n\n👤 *কাস্টমার:* ${orderForm.name}\n📞 *ফোন:* ${orderForm.phone}\n\n📦 *প্যাকেজ আইটেম:*\n${itemsList}\n\n💰 *মোট:* ৳${totalPrice.toLocaleString()}\n💳 *পেমেন্ট:* ${orderForm.payment_method}\n⏰ *সময়:* ${new Date().toLocaleString("bn-BD")}`;
      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank");
      setSelections({});
      setCheckoutOpen(false);
      setOrderForm({ name: "", phone: "", payment_method: "cash_on_delivery" });
    },
    onError: () => toast.error(t.orderError),
  });

  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-white/60" : "text-gray-600";
  const textMuted = isDark ? "text-white/40" : "text-gray-400";
  const cardBorder = isDark ? "border-white/10" : "border-gray-200";
  const summaryBg = isDark ? "bg-gradient-to-br from-blue-600/10 to-cyan-600/5 border-blue-500/20" : "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200";
  const catBg = isDark ? "bg-white/[0.03] hover:bg-white/[0.06]" : "bg-gray-50 hover:bg-gray-100";
  const catActiveBg = isDark ? "bg-blue-600/10 border-blue-500/30" : "bg-blue-50 border-blue-300";
  const productRowBg = isDark ? "hover:bg-white/[0.03]" : "hover:bg-gray-50";
  const gradientPrice = isDark ? "bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent" : "text-blue-600";
  const cardBg = isDark ? "bg-white/[0.04]" : "bg-white";
  const inputBg = isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/30" : "bg-white border-gray-200";
  const dialogBg = isDark ? "bg-[#0f1525] border-white/10 text-white" : "bg-white";
  const infoBg = isDark ? "bg-white/5" : "bg-gray-50";
  const labelColor = isDark ? "text-white/70" : "text-gray-700";

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-16">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-3 sm:mb-4 ${isDark ? "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 text-blue-300" : "bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 text-blue-600"}`}>
          <Sparkles className="h-3.5 w-3.5" /> {t.title}
        </div>
        <p className={`text-xs sm:text-sm ${textSecondary} max-w-lg mx-auto`}>{t.subtitle}</p>
      </div>

      {/* Quick Start Templates */}
      {totalItems === 0 && (
        <div className="mb-6">
          <h3 className={`text-xs sm:text-sm font-semibold mb-3 flex items-center gap-2 ${textPrimary}`}>
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            {lang === "bn" ? "দ্রুত শুরু করুন — একটি টেমপ্লেট বেছে নিন" : "Quick Start — Choose a Template"}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {packageTemplates.map(tmpl => {
              const Icon = tmpl.icon;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => applyTemplate(tmpl)}
                  className={`group relative flex flex-col items-start gap-1.5 p-3 sm:p-4 rounded-xl border transition-all text-left active:scale-[0.97] ${isDark ? `bg-gradient-to-br ${tmpl.color} hover:shadow-lg hover:shadow-blue-500/5` : `bg-gradient-to-br ${tmpl.color.replace(/\/20/g, '/10').replace(/\/10/g, '/5').replace(/\/30/g, '/20')} hover:shadow-md`}`}
                >
                  <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${isDark ? "text-white/70" : "text-gray-600"} group-hover:scale-110 transition-transform`} />
                  <span className={`text-[11px] sm:text-xs font-bold leading-tight ${textPrimary}`}>{tmpl.name[lang]}</span>
                  <span className={`text-[9px] sm:text-[10px] leading-tight ${textMuted}`}>{tmpl.desc[lang]}</span>
                  <div className={`mt-1 inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-semibold px-2 py-0.5 rounded-full ${isDark ? "bg-white/10 text-blue-300" : "bg-blue-100 text-blue-600"}`}>
                    <ArrowRight className="h-2.5 w-2.5" /> {lang === "bn" ? "প্রয়োগ করুন" : "Apply"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}


      {totalItems > 0 && (
        <div className="lg:hidden mb-4">
          <div className={`rounded-xl border ${summaryBg} p-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-400" />
                <span className={`text-sm font-bold ${textPrimary}`}>{t.yourPackage}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-600"}`}>
                  {totalItems} {t.items}
                </span>
              </div>
              <span className={`text-lg font-black ${gradientPrice}`}>৳{totalPrice.toLocaleString()}</span>
            </div>
            {/* Compact items list */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedProducts.map(({ product, qty }) => (
                <div key={product.id} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] ${isDark ? "bg-white/[0.05]" : "bg-white/80"}`}>
                  <span className={`font-medium truncate max-w-[120px] ${textPrimary}`}>{product.name}</span>
                  <span className={textMuted}>×{qty}</span>
                  <button onClick={() => removeItem(product.id)} className="text-red-400 hover:text-red-300 ml-0.5">
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
            <Button
              onClick={() => setCheckoutOpen(true)}
              className="w-full mt-3 gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border-0 shadow-lg shadow-blue-500/25 rounded-xl text-white h-10 text-xs font-semibold"
            >
              <CheckCircle className="h-4 w-4" /> {t.placeOrder} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left: Category Selector */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className={`text-xs sm:text-sm font-semibold mb-2 sm:mb-3 ${textPrimary}`}>{t.selectCategory}</h3>
          
          {/* Category Grid - responsive columns */}
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-5 gap-2 sm:gap-2.5 mb-4 sm:mb-5">
            {categories.map(cat => {
              const Icon = categoryIcons[cat] || Package;
              const isActive = expandedCat === cat;
              const catCount = Object.entries(selections).filter(([id, qty]) => qty > 0 && grouped[cat]?.some((p: any) => p.id === id)).length;
              const productCount = grouped[cat]?.length || 0;
              return (
                <button
                  key={cat}
                  onClick={() => { setExpandedCat(isActive ? null : cat); setSearchQuery(""); }}
                  className={`flex flex-col items-center gap-0.5 p-2.5 sm:p-3 rounded-xl border transition-all text-center relative ${isActive ? `${catActiveBg} shadow-md shadow-blue-500/10` : `${catBg} ${cardBorder}`} ${productCount === 0 ? "opacity-40 pointer-events-none" : "cursor-pointer active:scale-95"}`}
                >
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${isActive ? "text-blue-400" : isDark ? "text-white/50" : "text-gray-500"}`} />
                  <span className={`text-[9px] sm:text-[11px] font-semibold leading-tight ${isActive ? (isDark ? "text-blue-300" : "text-blue-600") : textSecondary}`}>{cat}</span>
                  {productCount > 0 && (
                    <span className={`text-[7px] font-medium ${isActive ? "text-blue-400/70" : textMuted}`}>({productCount})</span>
                  )}
                  {catCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4.5 w-4.5 min-w-[18px] rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-[9px] font-bold text-white flex items-center justify-center shadow-sm">{catCount}</span>
                  )}
                </button>
              );
            })}
          </div>

          {expandedCat && (
            grouped[expandedCat] && grouped[expandedCat].length > 0 ? (
              <div className={`rounded-xl border ${cardBorder} overflow-hidden`}>
                <div className={`px-3 py-2 sm:py-2.5 border-b ${cardBorder} ${isDark ? "bg-white/[0.03]" : "bg-gray-50"} flex items-center gap-2`}>
                  <h4 className={`text-[11px] sm:text-xs font-semibold ${textPrimary} flex-shrink-0`}>{expandedCat}</h4>
                  <div className="relative flex-1">
                    <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 ${textMuted}`} />
                    <input
                      type="text"
                      placeholder={t.searchProducts}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className={`w-full pl-7 pr-3 py-1.5 rounded-lg text-xs border ${inputBg} focus:outline-none focus:ring-1 focus:ring-blue-500/50`}
                    />
                  </div>
                  <span className={`text-[10px] ${textMuted} flex-shrink-0`}>({filteredCategoryProducts.length})</span>
                </div>
                <div className={`divide-y ${isDark ? "divide-white/5" : "divide-gray-100"} max-h-[50vh] overflow-y-auto`}>
                  {filteredCategoryProducts.map((product: any) => {
                    const price = product.cash_discount_price ? Number(product.cash_discount_price) : Number(product.price);
                    const qty = selections[product.id] || 0;
                    const inStock = product.stock_quantity > 0;
                    return (
                      <div key={product.id} className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 transition-colors ${productRowBg}`}>
                        <div className={`h-10 w-10 sm:h-14 sm:w-14 rounded-lg overflow-hidden flex-shrink-0 ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Package className={`h-4 w-4 sm:h-5 sm:w-5 ${textMuted}`} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[10px] sm:text-sm font-medium leading-tight line-clamp-2 ${textPrimary}`}>{product.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[10px] sm:text-sm font-bold ${gradientPrice}`}>৳{price.toLocaleString()}</span>
                            {product.cash_discount_price && (
                              <span className={`text-[8px] sm:text-[10px] line-through ${textMuted}`}>৳{Number(product.price).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                          {qty > 0 ? (
                            <>
                              <button onClick={() => updateQty(product.id, -1)} className={`h-6 w-6 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center transition-all ${isDark ? "bg-white/10 hover:bg-white/20" : "bg-gray-100 hover:bg-gray-200"}`}>
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className={`text-xs sm:text-sm font-bold w-5 sm:w-6 text-center ${textPrimary}`}>{qty}</span>
                              <button onClick={() => updateQty(product.id, 1)} className={`h-6 w-6 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center transition-all ${isDark ? "bg-blue-500/20 hover:bg-blue-500/30 text-blue-400" : "bg-blue-50 hover:bg-blue-100 text-blue-600"}`}>
                                <Plus className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              disabled={!inStock}
                              onClick={() => updateQty(product.id, 1)}
                              className="h-7 sm:h-8 px-2 sm:px-3 text-[9px] sm:text-xs gap-0.5 sm:gap-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border-0 rounded-lg text-white"
                            >
                              <Plus className="h-3 w-3" /> {lang === "bn" ? "যোগ" : "Add"}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {filteredCategoryProducts.length === 0 && (
                    <div className={`text-center py-6 ${textMuted} text-xs`}>
                      {lang === "bn" ? "কোনো পণ্য পাওয়া যায়নি" : "No products found"}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={`text-center py-8 rounded-xl border ${cardBorder} ${cardBg}`}>
                <Package className={`h-8 w-8 mx-auto mb-2 ${isDark ? "text-white/10" : "text-gray-200"}`} />
                <p className={`text-xs ${textMuted}`}>{lang === "bn" ? "এই ক্যাটাগরিতে কোনো পণ্য নেই" : "No products in this category yet"}</p>
              </div>
            )
          )}

          {!expandedCat && (
            <div className={`text-center py-8 sm:py-12 rounded-xl border ${cardBorder} ${cardBg}`}>
              <Package className={`h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 ${isDark ? "text-white/10" : "text-gray-200"}`} />
              <p className={`text-xs sm:text-sm font-medium ${textSecondary}`}>{t.startBuilding}</p>
              <p className={`text-[10px] sm:text-xs mt-1 ${textMuted}`}>{t.emptyDesc}</p>
            </div>
          )}
        </div>

        {/* Right: Package Summary (desktop only - mobile shown above) */}
        <div className="hidden lg:block lg:col-span-1">
          <div className={`rounded-xl border sticky top-24 ${summaryBg} overflow-hidden`}>
            <div className="px-4 py-3 border-b border-blue-500/10">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${textPrimary}`}>
                <Package className="h-4 w-4 text-blue-400" /> {t.yourPackage}
                {totalItems > 0 && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-600"}`}>
                    {totalItems} {t.items}
                  </span>
                )}
              </h3>
            </div>

            {selectedProducts.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Package className={`h-10 w-10 mx-auto mb-2 ${isDark ? "text-white/10" : "text-gray-200"}`} />
                <p className={`text-xs ${textMuted}`}>{t.emptyPackage}</p>
              </div>
            ) : (
              <div className="px-3 py-3 space-y-2 max-h-[300px] overflow-y-auto">
                {selectedProducts.map(({ product, qty }) => {
                  const price = product.cash_discount_price ? Number(product.cash_discount_price) : Number(product.price);
                  return (
                    <div key={product.id} className={`flex items-center gap-2 p-2 rounded-lg ${isDark ? "bg-white/[0.03]" : "bg-white/80"}`}>
                      <div className={`h-9 w-9 rounded-md overflow-hidden flex-shrink-0 ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center"><Package className={`h-4 w-4 ${textMuted}`} /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium leading-tight line-clamp-1 ${textPrimary}`}>{product.name}</p>
                        <p className={`text-[10px] ${textMuted}`}>
                          {qty} × ৳{price.toLocaleString()} = <span className="font-semibold text-blue-400">৳{(price * qty).toLocaleString()}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button onClick={() => updateQty(product.id, -1)} className={`h-6 w-6 rounded flex items-center justify-center ${isDark ? "hover:bg-white/10" : "hover:bg-gray-200"}`}>
                          <Minus className="h-2.5 w-2.5" />
                        </button>
                        <button onClick={() => updateQty(product.id, 1)} className={`h-6 w-6 rounded flex items-center justify-center ${isDark ? "hover:bg-white/10" : "hover:bg-gray-200"}`}>
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                        <button onClick={() => removeItem(product.id)} className="h-6 w-6 rounded flex items-center justify-center text-red-400 hover:bg-red-500/10">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Total & Order Button */}
            {selectedProducts.length > 0 && (
              <div className={`px-4 py-3 border-t ${isDark ? "border-blue-500/10" : "border-blue-200"}`}>
                <div className="flex justify-between items-center mb-3">
                  <span className={`text-xs font-semibold ${textSecondary}`}>{t.totalPrice}</span>
                  <span className={`text-2xl font-black ${gradientPrice}`}>৳{totalPrice.toLocaleString()}</span>
                </div>
                <Button
                  onClick={() => setCheckoutOpen(true)}
                  className="w-full gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border-0 shadow-lg shadow-blue-500/25 rounded-xl text-white h-11 text-sm font-semibold"
                >
                  <CheckCircle className="h-4 w-4" /> {t.placeOrder} <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className={`max-w-sm max-h-[90vh] overflow-y-auto ${dialogBg}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${textPrimary}`}>
              <CheckCircle className="h-5 w-5 text-blue-400" /> {t.checkout}
            </DialogTitle>
          </DialogHeader>
          <div className={`${infoBg} rounded-xl p-3 mb-2`}>
            <p className={`text-xs ${textSecondary} mb-1`}>{totalItems} {t.items}</p>
            <p className="text-blue-400 font-bold text-lg">৳{totalPrice.toLocaleString()}</p>
            <div className="mt-2 space-y-1">
              {selectedProducts.map(({ product, qty }) => {
                const price = product.cash_discount_price ? Number(product.cash_discount_price) : Number(product.price);
                return (
                  <p key={product.id} className={`text-[10px] ${textMuted}`}>
                    {product.name} × {qty} = ৳{(price * qty).toLocaleString()}
                  </p>
                );
              })}
            </div>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); placeOrder.mutate(); }} className="space-y-3">
            <div className="space-y-1.5">
              <Label className={`text-xs ${labelColor}`}>{t.yourName}</Label>
              <Input value={orderForm.name} onChange={(e) => setOrderForm({ ...orderForm, name: e.target.value })} required placeholder={t.namePlaceholder} className={inputBg} />
            </div>
            <div className="space-y-1.5">
              <Label className={`text-xs ${labelColor}`}>{t.phone}</Label>
              <Input value={orderForm.phone} onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })} required placeholder="01XXXXXXXXX" className={inputBg} />
            </div>
            <div className="space-y-1.5">
              <Label className={`text-xs ${labelColor}`}>{t.paymentMethod}</Label>
              <Select value={orderForm.payment_method} onValueChange={(v) => setOrderForm({ ...orderForm, payment_method: v })}>
                <SelectTrigger className={inputBg}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash_on_delivery">
                    <span className="flex items-center gap-2"><Package className="h-3.5 w-3.5" /> {lang === "bn" ? "ক্যাশ অন ডেলিভারি" : "Cash on Delivery"}</span>
                  </SelectItem>
                  <SelectItem value="bkash">
                    <span className="flex items-center gap-2"><Smartphone className="h-3.5 w-3.5" /> bKash</span>
                  </SelectItem>
                  <SelectItem value="nagad">
                    <span className="flex items-center gap-2"><Smartphone className="h-3.5 w-3.5" /> Nagad</span>
                  </SelectItem>
                  <SelectItem value="rocket">
                    <span className="flex items-center gap-2"><Smartphone className="h-3.5 w-3.5" /> Rocket</span>
                  </SelectItem>
                  <SelectItem value="card">
                    <span className="flex items-center gap-2"><CreditCard className="h-3.5 w-3.5" /> {lang === "bn" ? "কার্ড পেমেন্ট" : "Card Payment"}</span>
                  </SelectItem>
                  <SelectItem value="bank_transfer">
                    <span className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> {lang === "bn" ? "ব্যাংক ট্রান্সফার" : "Bank Transfer"}</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(orderForm.payment_method === "bkash" || orderForm.payment_method === "nagad" || orderForm.payment_method === "rocket") && (
              <div className={`rounded-xl p-3 border text-xs space-y-1.5 ${isDark ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"}`}>
                <div className="flex items-center gap-2 font-semibold">
                  <Smartphone className="h-4 w-4 text-emerald-400" />
                  <span className={textPrimary}>
                    {orderForm.payment_method === "bkash" ? "bKash" : orderForm.payment_method === "nagad" ? "Nagad" : "Rocket"} {lang === "bn" ? "নম্বর" : "Number"}
                  </span>
                </div>
                <p className={`font-mono text-sm font-bold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                  {settings.phone?.split(",")[0]?.trim() || "01919-060590"}
                </p>
                <p className={`${isDark ? "text-emerald-300/60" : "text-emerald-600/70"}`}>
                  {lang === "bn"
                    ? `উপরের নম্বরে ৳${totalPrice.toLocaleString()} Send Money করুন এবং অর্ডার নিশ্চিত করুন।`
                    : `Send ৳${totalPrice.toLocaleString()} to the above number and confirm your order.`}
                </p>
              </div>
            )}

            {orderForm.payment_method === "bank_transfer" && (
              <div className={`rounded-xl p-3 border text-xs space-y-1.5 ${isDark ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50 border-blue-200"}`}>
                <div className="flex items-center gap-2 font-semibold">
                  <Building2 className="h-4 w-4 text-blue-400" />
                  <span className={textPrimary}>{lang === "bn" ? "ব্যাংক তথ্য" : "Bank Details"}</span>
                </div>
                {settings.bank_name && <p className={isDark ? "text-blue-300" : "text-blue-700"}>{settings.bank_name}</p>}
                {settings.bank_account_name && <p className={textMuted}>{settings.bank_account_name}</p>}
                {settings.bank_account_number && <p className={`font-mono font-bold ${isDark ? "text-blue-300" : "text-blue-700"}`}>{settings.bank_account_number}</p>}
                {settings.bank_branch && <p className={textMuted}>{settings.bank_branch}</p>}
              </div>
            )}

            <Button type="submit" disabled={placeOrder.isPending} className="w-full gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border-0 shadow-lg shadow-blue-500/25 rounded-xl text-white h-11">
              <CheckCircle className="h-4 w-4" /> {placeOrder.isPending ? "..." : t.confirmOrder}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
