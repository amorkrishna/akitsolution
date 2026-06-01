import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search, Package, Phone, Mail, MapPin, ShieldCheck, Headphones,
  Truck, Wrench, CheckCircle, MessageCircle,
  Zap, Monitor, Wifi, Server, ArrowRight, Clock, Award, Sun, Moon, Globe, Boxes, CheckCheck,
  X, Camera, Laptop, Router, HardDrive, Cable, Keyboard, Printer, Cpu,
  Sparkles, ShoppingCart, Plus, Minus, Trash2, Smartphone, CreditCard, Building2, Heart, LayoutDashboard,
  ArrowRightLeft
} from "lucide-react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { toast } from "sonner";
import { ProductDetailDialog } from "@/components/store/ProductDetailDialog";
import akLogoDefault from "@/assets/ak-logo.png";
import { PackageBuilder } from "@/components/store/PackageBuilder";
import { OrderTracking } from "@/components/store/OrderTracking";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import { StoreCarousel } from "@/components/store/StoreCarousel";
import { SEOHead, ProductListJsonLd, LocalBusinessJsonLd, ServiceListJsonLd } from "@/components/SEOHead";
import { AIChatWidget } from "@/components/store/AIChatWidget";
import { ParticleGlobe } from "@/components/store/ParticleGlobe";
import { HeroBannerCarousel } from "@/components/store/HeroBannerCarousel";
import { TopBar } from "@/components/store/TopBar";
import { CompareDrawer } from "@/components/store/CompareDrawer";
import { CompareModal } from "@/components/store/CompareModal";

import { openWhatsApp } from "@/lib/whatsapp";
import { WhatsAppButton } from "@/components/WhatsAppButton";

// WhatsApp notification helper - sends order details to shop owner
function sendWhatsAppNotification(
  ownerPhone: string,
  customerName: string,
  customerPhone: string,
  items: { name: string; price: number; quantity: number }[],
  paymentMethod: string,
  total: number
) {
  const phone = ownerPhone.replace(/[^0-9]/g, "");
  const whatsappNumber = phone.startsWith("0") ? `88${phone}` : phone;
  const itemsList = items.map(i => `• ${i.name} ×${i.quantity} = ৳${(i.price * i.quantity).toLocaleString()}`).join("\n");
  const message = `🛒 *নতুন অর্ডার এসেছে!*\n\n👤 *কাস্টমার:* ${customerName}\n📞 *ফোন:* ${customerPhone}\n\n📦 *অর্ডার আইটেম:*\n${itemsList}\n\n💰 *মোট:* ৳${total.toLocaleString()}\n💳 *পেমেন্ট:* ${paymentMethod}\n⏰ *সময়:* ${new Date().toLocaleString("bn-BD")}`;
  const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

const categoryNav = [
  { key: "all", icon: Package, bn: "সকল", en: "All" },
  { key: "CCTV", icon: Camera, bn: "সিসিটিভি", en: "CCTV" },
  { key: "DVR/NVR", icon: HardDrive, bn: "DVR/NVR", en: "DVR/NVR" },
  { key: "Monitor", icon: Monitor, bn: "মনিটর", en: "Monitor" },
  { key: "Laptop", icon: Laptop, bn: "ল্যাপটপ", en: "Laptop" },
  { key: "Computer", icon: Cpu, bn: "কম্পিউটার", en: "Computer" },
  { key: "Networking", icon: Router, bn: "নেটওয়ার্কিং", en: "Networking" },
  { key: "Accessories", icon: Cable, bn: "এক্সেসরিজ", en: "Accessories" },
  { key: "Printer", icon: Printer, bn: "প্রিন্টার", en: "Printer" },
  { key: "Keyboard/Mouse", icon: Keyboard, bn: "কীবোর্ড/মাউস", en: "Keyboard/Mouse" },
  { key: "Server", icon: Server, bn: "সার্ভার", en: "Server" },
  { key: "Attendance Device", icon: CheckCheck, bn: "অ্যাটেনডেন্স", en: "Attendance" },
  { key: "Smart Home", icon: Zap, bn: "স্মার্ট হোম", en: "Smart Home" },
  { key: "Audio/Video", icon: Headphones, bn: "অডিও/ভিডিও", en: "Audio/Video" },
  { key: "Storage", icon: HardDrive, bn: "স্টোরেজ", en: "Storage" },
  { key: "Software", icon: Globe, bn: "সফটওয়্যার", en: "Software" },
];

const translations = {
  bn: {
    tagline: "বাংলাদেশের বিশ্বস্ত IT সলিউশন কোম্পানি",
    heroTitle1: "আপনার নিরাপত্তা",
    heroTitle2: "আমাদের দায়িত্ব",
    heroDesc: "সিসিটিভি ক্যামেরা, অ্যাটেনডেন্স ডিভাইস, নেটওয়ার্কিং ইকুইপমেন্ট — পেশাদার ইনস্টলেশন ও আফটার সেলস সার্ভিস সহ",
    warranty: "ওয়ারেন্টি সাপোর্ট",
    service247: "24/7 সার্ভিস",
    installation: "প্রফেশনাল ইনস্টলেশন",
    trusted: "বিশ্বস্ত ব্র্যান্ড",
    products: "পণ্যসমূহ",
    services: "সেবাসমূহ",
    packages: "প্যাকেজসমূহ",
    searchProducts: "পণ্য খুঁজুন...",
    productsFound: (n: number) => `${n} টি পণ্য পাওয়া গেছে`,
    noProducts: "কোনো পণ্য পাওয়া যায়নি",
    noServices: "কোনো সেবা পাওয়া যায়নি",
    noPackages: "কোনো প্যাকেজ পাওয়া যায়নি",
    order: "এখনই কিনুন",
    orderService: "অর্ডার করুন",
    inStock: "টি স্টকে আছে",
    outOfStock: "স্টক নেই",
    priceFrom: "মূল্য শুরু",
    budget: "বাজেট",
    includes: "এই প্যাকেজে আছে",
    whyChoose: "কেন আমাদের বেছে নেবেন?",
    whyChooseDesc: "আমরা সবচেয়ে ভালো মানের পণ্য ও সেবা প্রদান করি",
    guaranteeTitle: "গ্যারান্টি ও ওয়ারেন্টি",
    guaranteeDesc: "সকল পণ্যে অফিসিয়াল ওয়ারেন্টি",
    supportTitle: "24/7 কাস্টমার সার্ভিস",
    supportDesc: "যেকোনো সময় কল করুন, আমরা আছি",
    deliveryTitle: "দ্রুত ডেলিভারি",
    deliveryDesc: "ঢাকাসহ সারাদেশে ডেলিভারি",
    teamTitle: "অভিজ্ঞ টিম",
    teamDesc: "১০+ বছরের অভিজ্ঞ টেকনিশিয়ান",
    ctaTitle: "কাস্টম IT সলিউশন দরকার?",
    ctaDesc: "CCTV ইনস্টলেশন, নেটওয়ার্ক সেটআপ, সার্ভার কনফিগারেশন — আমরা সব ধরনের IT সেবা প্রদান করি",
    callUs: "কল করুন",
    contact: "যোগাযোগ",
    address: "ঠিকানা",
    footerDesc: "বাংলাদেশের অন্যতম বিশ্বস্ত IT সলিউশন প্রোভাইডার",
    pending: "চলমান",
    in_progress: "কাজ চলছে",
    completed: "সম্পন্ন",
    headline: "🔥 সকল CCTV ক্যামেরায় বিশেষ ছাড় চলছে! সীমিত সময়ের জন্য অফার — এখনই অর্ডার করুন! 🔥",
    allCategories: "সকল ক্যাটাগরি",
    buildPackage: "প্যাকেজ তৈরি করুন",
    viewDetails: "বিস্তারিত দেখুন",
  },
  en: {
    tagline: "Bangladesh's Trusted IT Solution Company",
    heroTitle1: "Your Security",
    heroTitle2: "Our Responsibility",
    heroDesc: "CCTV cameras, attendance devices, networking equipment — delivered with professional installation & after-sales support.",
    warranty: "Warranty Support",
    service247: "24/7 Service",
    installation: "Professional Installation",
    trusted: "Trusted Brand",
    products: "Products",
    services: "Services",
    packages: "Packages",
    searchProducts: "Search products...",
    productsFound: (n: number) => `${n} product${n !== 1 ? "s" : ""} found`,
    noProducts: "No products found",
    noServices: "No services found",
    noPackages: "No packages available",
    order: "Buy Now",
    orderService: "Order Now",
    inStock: "in stock",
    outOfStock: "Out of Stock",
    priceFrom: "Starting from",
    budget: "Budget",
    includes: "Package Includes",
    whyChoose: "Why Choose Us?",
    whyChooseDesc: "We provide the best quality products and services",
    guaranteeTitle: "Guarantee & Warranty",
    guaranteeDesc: "Official warranty on all products",
    supportTitle: "24/7 Customer Service",
    supportDesc: "Call us anytime, we're here",
    deliveryTitle: "Fast Delivery",
    deliveryDesc: "Delivery across Dhaka & nationwide",
    teamTitle: "Expert Team",
    teamDesc: "10+ years experienced technicians",
    ctaTitle: "Need a Custom IT Solution?",
    ctaDesc: "CCTV installation, network setup, server configuration — we provide all types of IT services",
    callUs: "Call Us",
    contact: "Contact",
    address: "Address",
    footerDesc: "One of Bangladesh's most trusted IT solution providers",
    pending: "Upcoming",
    in_progress: "In Progress",
    completed: "Completed",
    headline: "🔥 Special Discount on All CCTV Cameras! Limited Time Offer — Order Now! 🔥",
    allCategories: "All Categories",
    buildPackage: "Build Package",
    viewDetails: "View Details",
  },
};


const sectionCards = [
  { key: "products" as const, icon: Package, bnLabel: "পণ্যসমূহ", enLabel: "Products", gradient: "from-violet-600 to-indigo-500", bnDesc: "সিসিটিভি, ল্যাপটপ, নেটওয়ার্কিং", enDesc: "CCTV, Laptop, Networking" },
  { key: "services" as const, icon: Wrench, bnLabel: "সেবা প্যাকেজ", enLabel: "Service Package", gradient: "from-emerald-600 to-teal-600", bnDesc: "ইনস্টলেশন ও সাপোর্ট সেবা", enDesc: "Installation & Support" },
  { key: "packages" as const, icon: Boxes, bnLabel: "প্যাকেজসমূহ", enLabel: "Packages", gradient: "from-purple-600 to-pink-600", bnDesc: "রেডি সিকিউরিটি বান্ডল", enDesc: "Ready Security Bundles" },
  { key: "builder" as const, icon: Sparkles, bnLabel: "প্যাকেজ তৈরি", enLabel: "Build Package", gradient: "from-amber-600 to-orange-600", bnDesc: "নিজের প্যাকেজ কাস্টম করুন", enDesc: "Customize Your Own" },
];

const serviceSubcategories = [
  { key: "all", icon: Wrench, bn: "সকল", en: "All" },
  { key: "CCTV", icon: Camera, bn: "সিসিটিভি", en: "CCTV" },
  { key: "Attendance Device", icon: CheckCheck, bn: "অ্যাটেনডেন্স", en: "Attendance" },
  { key: "Networking", icon: Router, bn: "নেটওয়ার্কিং", en: "Networking" },
  { key: "IT Support", icon: Headphones, bn: "আইটি সাপোর্ট", en: "IT Support" },
  { key: "Installation", icon: Wrench, bn: "ইনস্টলেশন", en: "Installation" },
  { key: "Server", icon: Server, bn: "সার্ভার", en: "Server" },
  { key: "Maintenance", icon: Monitor, bn: "রক্ষণাবেক্ষণ", en: "Maintenance" },
];

function AutoSlidingTabs({
  activeTab,
  setActiveTab,
  lang,
  isDark,
  categoryFilter,
  setCategoryFilter,
  serviceCatFilter,
  setServiceCatFilter,
}: {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  lang: "bn" | "en";
  isDark: boolean;
  categoryFilter: string;
  setCategoryFilter: (cat: string) => void;
  serviceCatFilter: string;
  setServiceCatFilter: (cat: string) => void;
}) {
  const handleClick = useCallback((key: string, idx: number) => {
    setActiveTab(key);
  }, [setActiveTab]);

  return (
    <div id="products-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Section Card Slider - using StoreCarousel for swipeable sliding */}
      <StoreCarousel isDark={isDark} slideClass="basis-[46%] sm:basis-[32%] lg:basis-[24%]" noAutoplay>
        {sectionCards.map((card, idx) => {
          const Icon = card.icon;
          const isActive = activeTab === card.key;
          return (
            <button
              key={card.key}
              onClick={() => handleClick(card.key, idx)}
              className={`relative w-full rounded-xl sm:rounded-2xl p-3 sm:p-5 transition-all duration-300 border overflow-hidden group text-left
                ${isActive
                  ? `bg-gradient-to-br ${card.gradient} text-white border-transparent shadow-xl shadow-violet-500/20 scale-[1.02]`
                  : isDark
                    ? "bg-white/[0.04] border-white/10 text-white/60 hover:bg-white/[0.08] hover:border-white/20"
                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 shadow-sm"
                }`}
            >
              <div className={`h-9 w-9 sm:h-11 sm:w-11 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-3 transition-all ${isActive ? "bg-white/20" : isDark ? "bg-white/5" : "bg-gray-100"
                }`}>
                <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${isActive ? "text-white" : isDark ? "text-white/50" : "text-gray-400"}`} />
              </div>
              <p className={`text-[11px] sm:text-sm font-bold leading-tight ${isActive ? "text-white" : ""}`}>
                {lang === "bn" ? card.bnLabel : card.enLabel}
              </p>
              <p className={`text-[8px] sm:text-[10px] mt-0.5 leading-tight ${isActive ? "text-white/80" : isDark ? "text-white/30" : "text-gray-400"}`}>
                {lang === "bn" ? card.bnDesc : card.enDesc}
              </p>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/40" />
              )}
            </button>
          );
        })}
      </StoreCarousel>

      {/* Slide progress dots */}
      <div className="flex justify-center gap-1.5 mt-3 mb-2">
        {sectionCards.map((card, idx) => (
          <div
            key={card.key}
            className={`h-1.5 rounded-full transition-all duration-500 ${activeTab === card.key
              ? `w-6 bg-gradient-to-r ${card.gradient}`
              : `w-1.5 ${isDark ? "bg-white/15" : "bg-gray-300"}`
              }`}
          />
        ))}
      </div>

      {/* Subcategory chips - show when Products is active */}
      {activeTab === "products" && (
        <div className={`flex flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain snap-x py-2 scrollbar-hide mt-1 rounded-xl px-1 ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
          {categoryNav.map(cat => {
            const Icon = cat.icon;
            const isActive = categoryFilter === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setCategoryFilter(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 snap-start ${isActive
                  ? "bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-md"
                  : isDark
                    ? "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80"
                    : "bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700 border border-gray-200"
                  }`}
              >
                <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                {lang === "bn" ? cat.bn : cat.en}
              </button>
            );
          })}
        </div>
      )}

      {/* Subcategory chips - show when Services is active */}
      {activeTab === "services" && (
        <div className={`flex flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain snap-x py-2 scrollbar-hide mt-1 rounded-xl px-1 ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
          {serviceSubcategories.map(cat => {
            const Icon = cat.icon;
            const isActive = serviceCatFilter === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setServiceCatFilter(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 snap-start ${isActive
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md"
                  : isDark
                    ? "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80"
                    : "bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700 border border-gray-200"
                  }`}
              >
                <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                {lang === "bn" ? cat.bn : cat.en}
              </button>
            );
          })}
        </div>
      )}

      {/* Tracking tab link */}
      <div className="flex justify-end mt-2">
        <button
          onClick={() => { setActiveTab("tracking"); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${activeTab === "tracking"
            ? "bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-md"
            : isDark ? "text-white/40 hover:text-white/60" : "text-gray-400 hover:text-gray-600"
            }`}
        >
          <Truck className="h-3 w-3" />
          {lang === "bn" ? "অর্ডার ট্র্যাক" : "Track Order"}
        </button>
      </div>
    </div>
  );
}

function PortfolioGallery({ isDark, lang, textPrimary, textMuted, textSecondary }: { isDark: boolean; lang: string; textPrimary: string; textMuted: string; textSecondary: string }) {
  const { data: projects = [] } = useQuery({
    queryKey: ["portfolio_store"],
    queryFn: async () => {
      const { data, error } = await supabase.from("portfolio_projects").select("*").order("is_featured", { ascending: false }).order("completed_date", { ascending: false }).limit(12);
      if (error) throw error;
      return data;
    },
  });

  if (projects.length === 0) return null;

  const cardBg = isDark ? "bg-white/[0.04] border-white/10" : "bg-white border-gray-200 shadow-sm";
  const featuredBorder = isDark ? "border-primary/40 ring-1 ring-primary/20" : "border-primary/30 ring-1 ring-primary/10";

  const renderCard = (p: any) => (
    <div key={p.id} className={`rounded-xl border overflow-hidden group transition-all hover:-translate-y-0.5 hover:shadow-lg ${cardBg} ${p.is_featured ? featuredBorder : ""}`}>
      <div className="relative h-36 sm:h-44 overflow-hidden">
        {p.image_url ? (
          <img src={p.image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${isDark ? "bg-white/5" : "bg-muted"}`}>
            <Package className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}
        <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold ${isDark ? "bg-black/60 text-white/80" : "bg-white/90 text-foreground shadow-sm"}`}>
          {p.category}
        </span>
        {p.is_featured && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-primary text-white">
            ★ {lang === "bn" ? "ফিচার্ড" : "Featured"}
          </span>
        )}
      </div>
      <div className="p-3 sm:p-4">
        <h4 className={`font-bold text-xs sm:text-sm mb-1 line-clamp-1 ${textPrimary}`}>{p.title}</h4>
        {p.description && <p className={`text-[10px] sm:text-xs ${textMuted} line-clamp-2 mb-2`}>{p.description}</p>}
        <div className="flex items-center justify-between">
          {p.location && <span className={`text-[9px] sm:text-[10px] ${textSecondary} flex items-center gap-1`}><MapPin className="h-2.5 w-2.5" />{p.location}</span>}
          {p.completed_date && <span className={`text-[9px] sm:text-[10px] ${textMuted}`}>{new Date(p.completed_date).toLocaleDateString()}</span>}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile: carousel */}
      <div className="md:hidden">
        <StoreCarousel isDark={isDark} slideClass="basis-[75%] sm:basis-1/2" noAutoplay>
          {projects.map(p => <div key={p.id} className="px-1">{renderCard(p)}</div>)}
        </StoreCarousel>
      </div>
      {/* Desktop: grid */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(renderCard)}
      </div>
    </>
  );
}


function UnifiedRequestForm({ isDark, lang, textPrimary, textMuted, inlineInputCls, selectBg }: { isDark: boolean; lang: string; textPrimary: string; textMuted: string; inlineInputCls: string; selectBg: string }) {
  const [mode, setMode] = useState<"quote" | "service">("quote");
  const [submitting, setSubmitting] = useState(false);
  const isQuote = mode === "quote";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string)?.trim();
    const phone = (fd.get("phone") as string)?.trim() || null;
    const email = (fd.get("email") as string)?.trim() || null;
    const category = (fd.get("category") as string) || "Other";
    const message = (fd.get("message") as string)?.trim() || "";

    try {
      if (isQuote) {
        const { error } = await supabase.from("leads").insert({
          name,
          phone,
          email,
          service_type: category,
          message: message || null,
          source: "website",
        });
        if (error) throw error;
        toast.success(lang === "bn" ? "✅ কোটেশন রিকোয়েস্ট পাঠানো হয়েছে!" : "✅ Quote request submitted!");
      } else {
        if (!phone) {
          toast.error(lang === "bn" ? "ফোন নম্বর দিন" : "Phone number required");
          setSubmitting(false);
          return;
        }
        if (!message) {
          toast.error(lang === "bn" ? "সমস্যার বিবরণ লিখুন" : "Please describe the issue");
          setSubmitting(false);
          return;
        }
        const urgency = (fd.get("urgency") as string) || "normal";
        const { error } = await supabase.from("service_requests").insert({
          customer_name: name,
          phone,
          email,
          category,
          description: message,
          urgency,
        });
        if (error) throw error;
        toast.success(lang === "bn" ? "✅ সার্ভিস রিকোয়েস্ট পাঠানো হয়েছে!" : "✅ Service request submitted!");
      }
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      console.error(err);
      toast.error(lang === "bn" ? "সমস্যা হয়েছে, আবার চেষ্টা করুন" : "Something went wrong, please try again");
    } finally {
      setSubmitting(false);
    }
  };

  const categories = isQuote
    ? ["CCTV", "Networking", "Attendance Device", "Computer", "Server", "Servicing", "Other"]
    : ["CCTV", "Networking", "Attendance Device", "Computer", "Printer", "Server", "Other"];

  return (
    <div className={`rounded-2xl p-6 sm:p-8 border ${isDark ? "bg-white/[0.02] border-white/10" : "bg-primary/[0.02] border-primary/15"}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isQuote ? (isDark ? "bg-violet-500/20" : "bg-primary/10") : (isDark ? "bg-emerald-500/20" : "bg-emerald-500/10")}`}>
          {isQuote ? <Mail className="h-4 w-4 text-primary" /> : <Wrench className="h-4 w-4 text-emerald-600" />}
        </div>
        <h3 className={`text-base sm:text-lg font-bold ${textPrimary}`}>
          {isQuote
            ? (lang === "bn" ? "ফ্রি কোটেশন / সার্ভিস রিকোয়েস্ট" : "Free Quote / Service Request")
            : (lang === "bn" ? "ফ্রি কোটেশন / সার্ভিস রিকোয়েস্ট" : "Free Quote / Service Request")}
        </h3>
      </div>
      <p className={`text-xs sm:text-sm ${textMuted} mb-4`}>
        {lang === "bn"
          ? "প্রোডাক্ট কোটেশন বা সার্ভিসিং — যেকোনো একটি সিলেক্ট করে রিকোয়েস্ট পাঠান"
          : "Pick what you need — a product quote or a servicing request — and submit one form."}
      </p>

      {/* Mode toggle */}
      <div className={`grid grid-cols-2 gap-1 p-1 rounded-xl mb-4 border ${isDark ? "bg-white/[0.03] border-white/10" : "bg-muted border-border"}`}>
        <button
          type="button"
          onClick={() => setMode("quote")}
          className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${isQuote
            ? "bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-md"
            : `${textMuted} hover:${textPrimary}`
            }`}
        >
          📩 {lang === "bn" ? "ফ্রি কোটেশন" : "Free Quote"}
        </button>
        <button
          type="button"
          onClick={() => setMode("service")}
          className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${!isQuote
            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md"
            : `${textMuted} hover:${textPrimary}`
            }`}
        >
          🔧 {lang === "bn" ? "সার্ভিসিং" : "Servicing"}
        </button>
      </div>

      <form key={mode} onSubmit={handleSubmit} className="space-y-3">
        <input name="name" required placeholder={lang === "bn" ? "আপনার নাম *" : "Your Name *"} className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inlineInputCls} focus:outline-none focus:ring-2 focus:ring-primary/30`} />
        <div className="grid grid-cols-2 gap-3">
          <input name="phone" required={!isQuote} placeholder={lang === "bn" ? (isQuote ? "ফোন নম্বর" : "ফোন নম্বর *") : (isQuote ? "Phone" : "Phone *")} className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inlineInputCls} focus:outline-none focus:ring-2 focus:ring-primary/30`} />
          <input name="email" type="email" placeholder={lang === "bn" ? "ইমেইল" : "Email"} className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inlineInputCls} focus:outline-none focus:ring-2 focus:ring-primary/30`} />
        </div>
        <div className={`grid ${isQuote ? "grid-cols-1" : "grid-cols-2"} gap-3`}>
          <select name="category" className={`w-full px-3 py-2.5 rounded-xl border text-sm ${selectBg} focus:outline-none focus:ring-2 focus:ring-primary/30`}>
            {categories.map(c => <option key={c} value={c} className={isDark ? "bg-[#150d25] text-white" : ""}>{c}</option>)}
          </select>
          {!isQuote && (
            <select name="urgency" className={`w-full px-3 py-2.5 rounded-xl border text-sm ${selectBg} focus:outline-none focus:ring-2 focus:ring-primary/30`}>
              <option value="normal" className={isDark ? "bg-[#150d25] text-white" : ""}>{lang === "bn" ? "সাধারণ" : "Normal"}</option>
              <option value="urgent" className={isDark ? "bg-[#150d25] text-white" : ""}>{lang === "bn" ? "জরুরি" : "Urgent"}</option>
              <option value="emergency" className={isDark ? "bg-[#150d25] text-white" : ""}>{lang === "bn" ? "অতি জরুরি" : "Emergency"}</option>
            </select>
          )}
        </div>
        <textarea
          name="message"
          required={!isQuote}
          rows={3}
          placeholder={
            isQuote
              ? (lang === "bn" ? "আপনার প্রয়োজন বিস্তারিত লিখুন..." : "Describe your needs...")
              : (lang === "bn" ? "সমস্যার বিবরণ লিখুন *" : "Describe the issue *")
          }
          className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inlineInputCls} focus:outline-none focus:ring-2 focus:ring-primary/30`}
        />
        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed ${isQuote
            ? "bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 shadow-violet-500/25"
            : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/25"
            }`}
        >
          {submitting
            ? (lang === "bn" ? "পাঠানো হচ্ছে..." : "Submitting...")
            : isQuote
              ? (lang === "bn" ? "📩 ফ্রি কোটেশন রিকোয়েস্ট করুন" : "📩 Request Free Quote")
              : (lang === "bn" ? "🔧 সার্ভিসিং রিকোয়েস্ট দিন" : "🔧 Submit Service Request")}
        </button>
      </form>
    </div>
  );
}


export default function Store() {
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [msgDialog, setMsgDialog] = useState(false);
  const [msgForm, setMsgForm] = useState({ name: "", phone: "", message: "" });
  const [activeTab, setActiveTab] = useState<"products" | "services" | "packages" | "builder" | "tracking">("products");
  const [lang, setLang] = useState<"bn" | "en">("en");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light";
    return saved || "dark";
  });
  const [detailProduct, setDetailProduct] = useState<any>(null);
  const [serviceCatFilter, setServiceCatFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("store-recent-searches") || "[]"); } catch { return []; }
  });
  const [searchScope, setSearchScope] = useState<"all" | "products" | "services" | "packages">("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const saveRecentSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const next = [trimmed, ...prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
      try { localStorage.setItem("store-recent-searches", JSON.stringify(next)); } catch { }
      return next;
    });
  }, []);
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try { localStorage.removeItem("store-recent-searches"); } catch { }
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape" && searchOpen) setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({ name: "", phone: "", email: "", payment_method: "cash_on_delivery" });
  const [visibleProducts, setVisibleProducts] = useState(8);
  const { settings } = useCompanySettings();

  // Comparison state
  const [compareItems, setCompareItems] = useState<any[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  const toggleCompare = (product: any) => {
    setCompareItems(prev => {
      const isAlreadyAdded = prev.some(item => item.id === product.id);
      if (isAlreadyAdded) {
        return prev.filter(item => item.id !== product.id);
      }
      if (prev.length >= 4) {
        toast.error(lang === "bn" ? "সর্বোচ্চ ৪টি পণ্য তুলনা করা যাবে" : "Max 4 products can be compared");
        return prev;
      }
      return [...prev, product];
    });
  };

  const removeCompareItem = (id: string) => {
    setCompareItems(prev => prev.filter(item => item.id !== id));
  };

  const clearCompare = () => setCompareItems([]);
  const { items: cartItems, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice } = useCartStore();
  const { items: wishlistItems, toggleItem: toggleWishlist, isInWishlist } = useWishlistStore();
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);
  const logoSrc = settings.logo_url || akLogoDefault;
  const t = translations[lang];
  const isDark = theme === "dark";
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [isDark, theme]);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("user_roles")
        .select("role, is_approved")
        .eq("user_id", session.user.id)
        .single();
      if (data?.is_approved && ["admin", "ceo", "manager"].includes(data.role)) {
        setIsAdmin(true);
      }
    };
    checkAdmin();
  }, []);

  const { data: products, isLoading } = useQuery({
    queryKey: ["store-products"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("products").select("*").eq("show_in_store", true).order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message?.includes('AbortError')) throw new Error("Supabase Lock Aborted");
        throw err;
      }
    },
  });

  const { data: services } = useQuery({
    queryKey: ["store-services"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("services").select("*").eq("status", "active").order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message?.includes('AbortError')) throw new Error("Supabase Lock Aborted");
        throw err;
      }
    },
  });

  const { data: packages } = useQuery({
    queryKey: ["store-packages"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("projects").select("*, clients(name)").eq("show_in_store", true).order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message?.includes('AbortError')) throw new Error("Supabase Lock Aborted");
        throw err;
      }
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["store-reviews"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("customer_reviews").select("*").eq("is_published", true).order("sort_order", { ascending: true });
        if (error) throw error;
        return data || [];
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message?.includes('AbortError')) throw new Error("Supabase Lock Aborted");
        throw err;
      }
    },
  });

  const { data: storeConfig } = useQuery({
    queryKey: ["store-settings-public"],
    queryFn: async () => {
      const { data } = await (supabase.from("store_settings" as any) as any).select("*").limit(1).maybeSingle();
      return data as any;
    },
  });

  const { data: categoryTiles = [] } = useQuery({
    queryKey: ["category_tiles_public"],
    queryFn: async () => {
      const { data } = await (supabase.from("category_tiles" as any) as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return (data as any[]) || [];
    },
  });

  const announcementText = storeConfig?.announcement_active && storeConfig?.announcement_text
    ? storeConfig.announcement_text
    : null;
  const heroTitle = storeConfig?.hero_title || null;
  const heroSubtitle = storeConfig?.hero_subtitle || null;
  const themeColor = storeConfig?.theme_primary_color || null;
  const bannerImages: string[] = Array.isArray(storeConfig?.banner_images) ? storeConfig.banner_images : [];
  const customFooterText = storeConfig?.footer_text || null;
  const customCSS = storeConfig?.custom_css || null;
  const gaTrackingId = storeConfig?.ga_tracking_id || null;
  const metaTitle = storeConfig?.meta_title || null;
  const metaDescription = storeConfig?.meta_description || null;
  const socialLinks = {
    facebook: storeConfig?.facebook_url || null,
    instagram: storeConfig?.instagram_url || null,
    youtube: storeConfig?.youtube_url || null,
    tiktok: storeConfig?.tiktok_url || null,
  };
  const faviconUrl = storeConfig?.favicon_url || null;
  const fbPixelId = storeConfig?.fb_pixel_id || null;

  // Inject Facebook Pixel
  useEffect(() => {
    if (!fbPixelId) return;
    const existing = document.getElementById("fb-pixel-script");
    if (existing) return;
    const script = document.createElement("script");
    script.id = "fb-pixel-script";
    script.textContent = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${fbPixelId}');fbq('track','PageView');`;
    document.head.appendChild(script);
    const noscript = document.createElement("noscript");
    noscript.id = "fb-pixel-noscript";
    noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${fbPixelId}&ev=PageView&noscript=1"/>`;
    document.body.appendChild(noscript);
    return () => { document.getElementById("fb-pixel-script")?.remove(); document.getElementById("fb-pixel-noscript")?.remove(); };
  }, [fbPixelId]);
  useEffect(() => {
    if (!faviconUrl) return;
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    const originalHref = link?.href;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
    return () => { if (link && originalHref) link.href = originalHref; };
  }, [faviconUrl]);

  // Inject custom CSS
  useEffect(() => {
    if (!customCSS) return;
    const style = document.createElement("style");
    style.id = "store-custom-css";
    style.textContent = customCSS;
    document.head.appendChild(style);
    return () => { document.getElementById("store-custom-css")?.remove(); };
  }, [customCSS]);

  // Inject Google Analytics
  useEffect(() => {
    if (!gaTrackingId) return;
    const existing = document.getElementById("ga-script");
    if (existing) return;
    const script = document.createElement("script");
    script.id = "ga-script";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaTrackingId}`;
    document.head.appendChild(script);
    const inline = document.createElement("script");
    inline.id = "ga-inline";
    inline.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaTrackingId}');`;
    document.head.appendChild(inline);
    return () => { document.getElementById("ga-script")?.remove(); document.getElementById("ga-inline")?.remove(); };
  }, [gaTrackingId]);

  const allBrands = [...new Set(products?.map((p: any) => p.brand || "Other").filter(Boolean) || [])];

  // Reset visible count when filters change
  useEffect(() => { setVisibleProducts(8); }, [search, brandFilter, categoryFilter]);

  const priorityCategories = ["CCTV", "Camera", "DVR/NVR"];

  const filtered = products?.filter((p: any) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
    const matchesBrand = brandFilter === "all" || (p.brand || "Other") === brandFilter;
    const matchesCategory = categoryFilter === "all" || (p.category || "Other") === categoryFilter;
    const matchesWishlist = !showWishlistOnly || wishlistItems.includes(p.id);
    return matchesSearch && matchesBrand && matchesCategory && matchesWishlist;
  }).sort((a: any, b: any) => {
    const aPrio = priorityCategories.includes(a.category) ? 1 : 0;
    const bPrio = priorityCategories.includes(b.category) ? 1 : 0;
    if (aPrio > bPrio) return -1;
    if (aPrio < bPrio) return 1;
    return 0; // maintain original created_at order for the rest
  }) || [];

  const sendMessage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("store_messages").insert({
        customer_name: msgForm.name, customer_phone: msgForm.phone, message: msgForm.message,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(lang === "bn" ? "✅ মেসেজ পাঠানো হয়েছে!" : "✅ Message sent!", { description: lang === "bn" ? "আমরা শীঘ্রই যোগাযোগ করব" : "We'll contact you soon" });
      setMsgDialog(false);
      setMsgForm({ name: "", phone: "", message: "" });
    },
    onError: () => toast.error(lang === "bn" ? "মেসেজ পাঠাতে সমস্যা" : "Failed to send message"),
  });

  // Quick lead capture (landing page form)
  const [leadForm, setLeadForm] = useState({ name: "", phone: "", service_type: "CCTV Installation" });
  const submitLead = useMutation({
    mutationFn: async () => {
      const name = leadForm.name.trim();
      const phone = leadForm.phone.trim();
      if (name.length < 2 || name.length > 100) throw new Error("invalid_name");
      if (!/^[0-9+\-\s]{6,20}$/.test(phone)) throw new Error("invalid_phone");
      const { error } = await supabase.from("leads").insert({
        name,
        phone,
        service_type: leadForm.service_type,
        source: "storefront_lead_form",
        status: "new",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(lang === "bn" ? "✅ ধন্যবাদ! আমরা শীঘ্রই কল করব" : "✅ Thanks! We'll call you shortly");
      setLeadForm({ name: "", phone: "", service_type: "CCTV Installation" });
    },
    onError: (err: any) => {
      if (err?.message === "invalid_name") toast.error(lang === "bn" ? "সঠিক নাম দিন" : "Enter a valid name");
      else if (err?.message === "invalid_phone") toast.error(lang === "bn" ? "সঠিক ফোন নম্বর দিন" : "Enter a valid phone");
      else toast.error(lang === "bn" ? "জমা দিতে সমস্যা হয়েছে" : "Failed to submit");
    },
  });

  const handleAddToCart = (product: any) => {
    const price = product.cash_discount_price ? Number(product.cash_discount_price) : Number(product.price);
    addItem({ id: product.id, name: product.name, price, image_url: product.image_url, product_id: product.id, type: "product" });
    toast.success(lang === "bn" ? "✅ কার্টে যোগ হয়েছে!" : "✅ Added to cart!", { description: product.name });
  };

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const inserts = cartItems.map(item => ({
        customer_name: checkoutForm.name,
        customer_phone: checkoutForm.phone,
        customer_email: checkoutForm.email || null,
        item_name: item.name,
        item_price: item.price,
        quantity: item.quantity,
        product_id: item.product_id || null,
        service_id: item.service_id || null,
        message: `Payment: ${checkoutForm.payment_method}`,
        status: "pending",
      }));
      const { error } = await supabase.from("store_orders").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(lang === "bn" ? "✅ অর্ডার সফল হয়েছে!" : "✅ Order placed!", { description: lang === "bn" ? "আমরা শীঘ্রই যোগাযোগ করব" : "We'll contact you soon" });
      // Send WhatsApp notification to shop owner
      const ownerPhone = settings.phone?.split(",")[0]?.trim() || "01919060590";
      sendWhatsAppNotification(
        ownerPhone,
        checkoutForm.name,
        checkoutForm.phone,
        cartItems.map(item => ({ name: item.name, price: item.price, quantity: item.quantity })),
        checkoutForm.payment_method,
        totalPrice()
      );
      clearCart();
      setCheckoutOpen(false);
      setCartOpen(false);
      setCheckoutForm({ name: "", phone: "", email: "", payment_method: "cash_on_delivery" });
    },
    onError: () => toast.error(lang === "bn" ? "অর্ডার দিতে সমস্যা" : "Failed to place order"),
  });

  const paymentMethods = [
    { value: "cash_on_delivery", label: lang === "bn" ? "ক্যাশ অন ডেলিভারি" : "Cash on Delivery", icon: "💵" },
    { value: "bkash", label: "bKash", icon: "📱" },
    { value: "nagad", label: "Nagad", icon: "📱" },
    { value: "rocket", label: "Rocket", icon: "📱" },
    { value: "bank_transfer", label: lang === "bn" ? "ব্যাংক ট্রান্সফার" : "Bank Transfer", icon: "🏦" },
    { value: "card", label: lang === "bn" ? "কার্ড পেমেন্ট" : "Card Payment", icon: "💳" },
  ];

  const serviceIcons: Record<string, any> = { "CCTV": Monitor, "Networking": Wifi, "Server": Server, "IT Support": Headphones };
  const statusLabel: Record<string, string> = { pending: t.pending, in_progress: t.in_progress, completed: t.completed };

  // Theme classes
  const bg = isDark ? "bg-[#080510]" : "bg-gray-50";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-white/50" : "text-gray-500";
  const textMuted = isDark ? "text-white/30" : "text-gray-400";
  const textAccent = isDark ? "text-violet-300/70" : "text-violet-600/70";
  const cardBg = isDark ? "bg-gradient-to-b from-white/[0.07] to-white/[0.02]" : "bg-white";
  const cardBorder = isDark ? "border-white/10" : "border-gray-200";
  const cardHoverBorder = isDark ? "hover:border-violet-500/40" : "hover:border-violet-400";
  const inputBg = isDark ? "bg-white/10 border-white/15 text-white placeholder:text-white/40" : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400";
  const selectBg = isDark ? "bg-[#150d25] border-white/15 text-white" : "bg-white border-gray-200 text-gray-900";
  const inlineInputCls = isDark ? "bg-white/10 border-white/15 text-white placeholder:text-white/40" : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400";
  const headerBg = isDark ? "bg-[#080510]/95 border-white/10" : "bg-white/95 border-gray-200";
  const footerBg = isDark ? "bg-[#05020d] border-white/10" : "bg-gray-100 border-gray-200";
  const sectionBg = isDark ? "bg-gradient-to-b from-violet-600/5 to-transparent border-white/10" : "bg-violet-50/50 border-gray-200";
  const featureCardBg = isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-gray-200";
  const iconBg = isDark ? "bg-violet-500/10" : "bg-violet-50";
  const iconBgLg = isDark ? "bg-gradient-to-br from-violet-500/15 to-indigo-500/15" : "bg-gradient-to-br from-violet-50 to-indigo-50";
  const gradientPrice = isDark ? "bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent" : "text-violet-600 font-bold";
  const labelColor = isDark ? "text-white/60" : "text-gray-600";
  const dialogBg = isDark ? "bg-[#0d0818] border-white/10 text-white" : "bg-white border-gray-200 text-gray-900";
  const tabInactive = isDark ? "text-white/50 hover:text-white/80" : "text-gray-500 hover:text-gray-800";

  return (
    <div className={`min-h-screen ${bg} ${textPrimary} transition-colors duration-300 overflow-x-hidden`}>
      <SEOHead
        title={metaTitle || "AK IT Solution - Online Store | CCTV, Networking & IT Solutions"}
        description={metaDescription || "Shop CCTV cameras, networking equipment, attendance devices & IT solutions from AK IT Solution. Professional installation & after-sales support in Bangladesh."}
        url="https://akitsolution.store/"
        type="website"
      />
      {products && <ProductListJsonLd products={products} />}
      {services && <ServiceListJsonLd services={services} />}
      <LocalBusinessJsonLd settings={settings} />

      {/* Navigation */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-xl ${headerBg}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Mobile Layout */}
          <div className="flex sm:hidden items-center justify-between h-14">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500 to-indigo-400 rounded-xl opacity-50 blur-sm" />
                <img src={logoSrc} alt={settings.company_name} className="relative h-9 w-9 rounded-xl object-contain bg-white/10 p-0.5 ring-1.5 ring-violet-500/30" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className={`text-[13px] font-bold tracking-tight truncate leading-tight ${textPrimary}`}>{settings.company_name}</h1>
                <p className={`text-[8px] ${textAccent} font-medium truncate leading-tight mt-0.5`}>{settings.company_tagline}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Language Selector */}
              <div className={`flex items-center rounded-full p-0.5 border ${
                isDark ? "bg-white/5 border-white/10" : "bg-gray-200/50 border-gray-300"
              }`}>
                <button
                  onClick={() => setLang("bn")}
                  className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-all ${
                    lang === "bn" 
                    ? "bg-primary text-white shadow-sm" 
                    : isDark ? "text-white/40 hover:text-white/60" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  BN
                </button>
                <button
                  onClick={() => setLang("en")}
                  className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-all ${
                    lang === "en" 
                    ? "bg-primary text-white shadow-sm" 
                    : isDark ? "text-white/40 hover:text-white/60" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  EN
                </button>
              </div>

              {/* Theme Selector */}
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 rounded-full ${
                  isDark ? "text-white/60 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-900 hover:bg-gray-200"
                }`}
                onClick={() => setTheme(isDark ? "light" : "dark")}
              >
                {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </Button>

              <button
                onClick={() => { setActiveTab("products"); setSearchOpen(true); }}
                className={`h-7 w-7 rounded-md flex items-center justify-center transition-all ${isDark ? "bg-white/5 hover:bg-white/10 text-white/70" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
              >
                <Search className="h-3 w-3" />
              </button>
              <button
                onClick={() => setCartOpen(true)}
                className={`h-7 w-7 rounded-md flex items-center justify-center relative transition-all ${isDark ? "bg-white/5 hover:bg-white/10 text-white/70" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
              >
                <ShoppingCart className="h-3 w-3" />
                {totalItems() > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center">{totalItems()}</span>
                )}
              </button>
              <button
                onClick={() => { setMsgDialog(true); setMsgForm({ name: "", phone: "", message: "" }); }}
                className="h-7 w-7 rounded-md flex items-center justify-center bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-500/20 transition-all"
              >
                <MessageCircle className="h-3 w-3" />
              </button>
              <a href="/auth" className={`text-[8px] px-1 py-0.5 ${isDark ? "text-white/20 hover:text-white/40" : "text-gray-300 hover:text-gray-400"} transition-colors`}>•</a>
            </div>
          </div>
          {/* Desktop Layout */}
          <div className="hidden sm:flex items-center justify-between h-20">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-violet-500 to-indigo-400 rounded-2xl opacity-60 blur-md" />
                <img src={logoSrc} alt={settings.company_name} className="relative h-14 w-14 rounded-2xl object-contain bg-white/10 p-0.5 ring-2 ring-violet-500/30" />
              </div>
              <div className="min-w-0">
                <h1 className={`text-lg md:text-xl font-extrabold tracking-wide truncate ${textPrimary}`}>{settings.company_name}</h1>
                <p className={`text-xs ${textAccent} font-medium truncate`}>{settings.company_tagline}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Language Toggle */}
              <div className={`flex items-center rounded-full p-0.5 border ${
                isDark ? "bg-white/5 border-white/10" : "bg-gray-200/50 border-gray-300"
              }`}>
                <button
                  onClick={() => setLang("bn")}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                    lang === "bn" 
                    ? "bg-primary text-white shadow-sm" 
                    : isDark ? "text-white/40 hover:text-white/60" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  BN
                </button>
                <button
                  onClick={() => setLang("en")}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                    lang === "en" 
                    ? "bg-primary text-white shadow-sm" 
                    : isDark ? "text-white/40 hover:text-white/60" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  EN
                </button>
              </div>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className={`h-9 w-9 rounded-full ${
                  isDark ? "text-white/60 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-900 hover:bg-gray-200"
                }`}
                onClick={() => setTheme(isDark ? "light" : "dark")}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <button
                onClick={() => { setActiveTab("products"); setSearchOpen(true); }}
                className={`h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-all ${isDark ? "bg-white/5 hover:bg-white/10 text-white/70" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
              >
                <Search className="h-3.5 w-3.5" />
                {lang === "bn" ? "খুঁজুন" : "Search"}
                <kbd className={`ml-1 hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold ${isDark ? "bg-white/10 border border-white/10" : "bg-white/80 border border-gray-200"}`}>⌘K</kbd>
              </button>
              <button
                onClick={() => setCartOpen(true)}
                className={`h-9 w-9 rounded-lg flex items-center justify-center relative transition-all ${isDark ? "bg-white/5 hover:bg-white/10 text-white/70" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
              >
                <ShoppingCart className="h-4 w-4" />
                {totalItems() > 0 && (
                  <span className="absolute -top-1 -right-1 h-4.5 w-4.5 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center min-w-[18px] h-[18px]">{totalItems()}</span>
                )}
              </button>

              <a href={`https://wa.me/8801919060590?text=${encodeURIComponent(lang === "bn" ? "হ্যালো, আমি আপনার প্রোডাক্ট সম্পর্কে জানতে চাই।" : "Hello, I want to know about your products.")}`} target="_blank" rel="noopener noreferrer" className={`h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium bg-[#25D366] text-white hover:bg-[#128C7E] shadow-lg shadow-[#25D366]/25 ml-1 transition-all`}>
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Headline Banner */}
      {(announcementText || !storeConfig) && (
        <div
          className={`overflow-hidden text-white ${!themeColor ? (isDark ? "bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600" : "bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500") : ""}`}
          style={themeColor ? { background: `linear-gradient(90deg, ${themeColor}, ${themeColor}dd, ${themeColor})` } : undefined}
        >
          <div className="animate-marquee whitespace-nowrap py-2.5 text-xs sm:text-sm font-semibold tracking-wide">
            {[0, 1, 2].map(i => <span key={i} className="mx-8">{announcementText || t.headline}</span>)}
          </div>
        </div>
      )}

      {/* BANNER CAROUSEL — if banner images exist */}
      {bannerImages.length > 0 && (
        <section className="relative">
          <HeroBannerCarousel images={bannerImages} isDark={isDark} />
        </section>
      )}

      {/* HERO SECTION — World-class animated hero */}
      <section className="relative overflow-hidden py-12 sm:py-20 md:py-28">
        {/* Background mesh gradient + grid */}
        <div className={`absolute inset-0 ${isDark ? "mesh-gradient grid-pattern" : "grid-pattern-light"}`} />
        {/* Animated particle network */}
        <ParticleGlobe isDark={isDark} />
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute top-10 left-[15%] w-72 h-72 sm:w-[500px] sm:h-[500px] rounded-full blur-[120px] sm:blur-[160px] animate-pulse-soft ${isDark ? "bg-violet-600/15" : "bg-violet-400/10"}`} />
          <div className={`absolute bottom-10 right-[15%] w-60 h-60 sm:w-[400px] sm:h-[400px] rounded-full blur-[100px] sm:blur-[140px] animate-pulse-soft [animation-delay:1.5s] ${isDark ? "bg-indigo-500/12" : "bg-indigo-400/8"}`} />
          <div className={`absolute top-1/3 right-[10%] w-32 h-32 sm:w-48 sm:h-48 rounded-full blur-[80px] animate-float ${isDark ? "bg-purple-500/10" : "bg-purple-400/8"}`} />
        </div>

        {/* Floating tech icons */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block">
          <div className={`absolute top-[15%] left-[8%] animate-float ${isDark ? "text-violet-500/10" : "text-violet-400/10"}`}>
            <Camera className="h-12 w-12 md:h-16 md:w-16" />
          </div>
          <div className={`absolute top-[60%] left-[5%] animate-float-delayed ${isDark ? "text-cyan-500/10" : "text-cyan-400/10"}`}>
            <Monitor className="h-10 w-10 md:h-14 md:w-14" />
          </div>
          <div className={`absolute top-[20%] right-[8%] animate-float-delayed ${isDark ? "text-purple-500/10" : "text-purple-400/10"}`}>
            <Server className="h-10 w-10 md:h-14 md:w-14" />
          </div>
          <div className={`absolute top-[55%] right-[6%] animate-float ${isDark ? "text-emerald-500/10" : "text-emerald-400/10"}`}>
            <Wifi className="h-8 w-8 md:h-12 md:w-12" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto space-y-5 sm:space-y-7">
            {/* Badge */}
            <div className="animate-fade-in">
              <span className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] sm:text-xs font-bold tracking-wider uppercase backdrop-blur-lg ${isDark ? "bg-violet-500/10 border border-violet-500/20 text-violet-300 shadow-lg shadow-violet-500/10" : "bg-primary/8 border border-primary/20 text-primary shadow-md"
                }`}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                {t.tagline}
              </span>
            </div>

            {/* Main heading */}
            <h2 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.05] font-display animate-slide-up">
              {heroTitle ? (
                <span className="text-gradient relative">{heroTitle}</span>
              ) : (
                <>
                  <span className={isDark ? "text-white" : "text-foreground"}>
                    {t.heroTitle1}
                  </span>{" "}
                  <span className="text-gradient relative">
                    {t.heroTitle2}
                    <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none">
                      <path d="M1 5.5C47 2 153 2 199 5.5" stroke="url(#hero-underline)" strokeWidth="3" strokeLinecap="round" />
                      <defs><linearGradient id="hero-underline" x1="0" y1="0" x2="200" y2="0"><stop stopColor="hsl(262,83%,58%)" /><stop offset="1" stopColor="hsl(240,60%,60%)" /></linearGradient></defs>
                    </svg>
                  </span>
                </>
              )}
            </h2>

            {/* Subtitle */}
            <p className={`${textSecondary} text-sm sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed animate-slide-up [animation-delay:150ms]`}>
              {heroSubtitle || t.heroDesc}
            </p>

            {/* Dual CTA buttons — replaces search bar */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2 animate-slide-up [animation-delay:250ms]">
              <button
                onClick={() => { setActiveTab("products"); document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" }); }}
                className={`group relative w-full sm:w-auto h-14 sm:h-16 px-7 sm:px-9 rounded-2xl font-bold text-sm sm:text-base inline-flex items-center justify-center gap-2.5 overflow-hidden transition-all hover:-translate-y-0.5 ${isDark
                  ? "bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-2xl shadow-violet-600/40 hover:shadow-violet-500/60"
                  : "bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-xl shadow-violet-400/40 hover:shadow-violet-500/60"
                  }`}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <ShoppingCart className="h-5 w-5 relative" />
                <span className="relative">{lang === "bn" ? "পণ্য দেখুন" : "Browse Products"}</span>
                <ArrowRight className="h-4 w-4 relative transition-transform group-hover:translate-x-1" />
              </button>

              <button
                onClick={() => openWhatsApp(settings?.whatsapp_number || settings?.phone || "", lang === "bn" ? "আসসালামু আলাইকুম, আমি একজন এক্সপার্টের সাথে কথা বলতে চাই।" : "Hello, I'd like to talk to an expert about your products and services.")}
                className={`group w-full sm:w-auto h-14 sm:h-16 px-7 sm:px-9 rounded-2xl font-bold text-sm sm:text-base inline-flex items-center justify-center gap-2.5 border-2 backdrop-blur-xl transition-all hover:-translate-y-0.5 ${isDark
                  ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/15 hover:border-emerald-400/50"
                  : "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400 shadow-md"
                  }`}
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <MessageCircle className="h-5 w-5" />
                <span>{lang === "bn" ? "এক্সপার্টের সাথে কথা বলুন" : "Talk to an Expert"}</span>
              </button>
            </div>

            {/* Trust strip */}
            <div className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-3 text-[11px] sm:text-xs font-semibold animate-slide-up [animation-delay:350ms] ${textMuted}`}>
              <span className="hidden sm:inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />{lang === "bn" ? "অথরাইজড ডিলার" : "Authorized Dealer"}</span>
              <span className={`hidden sm:inline ${isDark ? "text-white/20" : "text-gray-300"}`}>•</span>
              <span className="inline-flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-violet-500" />{lang === "bn" ? "ফ্রি ডেলিভারি" : "Free Delivery"}</span>
              <span className={isDark ? "text-white/20" : "text-gray-300"}>•</span>
              <span className="inline-flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5 text-amber-500" />{lang === "bn" ? "ফ্রি ইনস্টলেশন" : "Free Installation"}</span>
              <span className={isDark ? "text-white/20" : "text-gray-300"}>•</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-indigo-500" />{lang === "bn" ? "২৪/৭ সাপোর্ট" : "24/7 Support"}</span>
            </div>

          </div>
        </div>
      </section>

      {/* LIVE STATS COUNTER BAR — desktop only */}
      <section className={`hidden sm:block border-t border-b ${isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-gray-100 bg-white"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x ${isDark ? 'divide-white/[0.06]' : 'divide-gray-100'}">
            {[
              { value: "500+", label: lang === "bn" ? "সফল প্রজেক্ট" : "Projects Completed", icon: CheckCircle, color: "text-emerald-500" },
              { value: "10+", label: lang === "bn" ? "বছরের অভিজ্ঞতা" : "Years Experience", icon: Award, color: "text-violet-500" },
              { value: "24/7", label: lang === "bn" ? "কাস্টমার সার্ভিস" : "Customer Support", icon: Headphones, color: "text-purple-500" },
              { value: "4.8★", label: lang === "bn" ? "কাস্টমার রেটিং" : "Customer Rating", icon: Sparkles, color: "text-amber-500" },
            ].map(({ value, label, icon: Icon, color }) => (
              <div key={label} className={`flex items-center gap-3 sm:gap-4 py-5 sm:py-7 px-4 sm:px-8 group`}>
                <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${isDark ? "bg-white/[0.04]" : "bg-gray-50"}`}>
                  <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${color}`} />
                </div>
                <div>
                  <p className={`text-lg sm:text-2xl font-black font-display ${textPrimary}`}>{value}</p>
                  <p className={`text-[9px] sm:text-xs ${textMuted}`}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUICK CATEGORY GRID — CCTV / Attendance / Servicing */}
      <section className={`border-t ${isDark ? "border-white/[0.06]" : "border-gray-100"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="text-center mb-6 sm:mb-8">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? "bg-violet-500/10 text-violet-300 border border-violet-500/20" : "bg-violet-50 text-violet-700 border border-violet-200"}`}>
              <Sparkles className="h-3 w-3" />
              {lang === "bn" ? "দ্রুত শপিং" : "Quick Access"}
            </span>
            <h3 className={`text-2xl sm:text-3xl md:text-4xl font-black font-display ${textPrimary}`}>
              {lang === "bn" ? "আপনার " : "What are you "}
              <span className="text-gradient">{lang === "bn" ? "প্রয়োজন কী?" : "looking for?"}</span>
            </h3>
            <p className={`mt-2 text-xs sm:text-sm ${textMuted}`}>
              {lang === "bn" ? "এক ক্লিকে পৌঁছে যান আপনার পছন্দের ক্যাটাগরিতে" : "Jump straight to what you need — one click away"}
            </p>
          </div>

          <div className="flex gap-4 sm:gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 pb-2">
            {(() => {
              const baseCats = [
                {
                  key: "CCTV",
                  slug: "cctv",
                  icon: Camera,
                  bn: "সিসিটিভি ক্যামেরা",
                  en: "CCTV Cameras",
                  descBn: "HD, 4K, IP, ডোম, বুলেট ক্যামেরা",
                  descEn: "HD · 4K · IP · Dome · Bullet",
                  gradient: "from-violet-600 via-purple-600 to-indigo-600",
                  glow: "shadow-violet-500/30",
                  accent: isDark ? "bg-violet-500/10 text-violet-300" : "bg-violet-50 text-violet-700",
                  action: () => { setCategoryFilter("CCTV"); setActiveTab("products"); document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" }); },
                },
                {
                  key: "Attendance Device",
                  slug: "attendance",
                  icon: CheckCheck,
                  bn: "অ্যাটেনডেন্স ডিভাইস",
                  en: "Attendance Devices",
                  descBn: "ফেস, ফিঙ্গারপ্রিন্ট, কার্ড সিস্টেম",
                  descEn: "Face · Fingerprint · RFID Card",
                  gradient: "from-emerald-600 via-teal-600 to-cyan-600",
                  glow: "shadow-emerald-500/30",
                  accent: isDark ? "bg-emerald-500/10 text-emerald-300" : "bg-emerald-50 text-emerald-700",
                  action: () => { setCategoryFilter("Attendance Device"); setActiveTab("products"); document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" }); },
                },
                {
                  key: "Servicing",
                  slug: "servicing",
                  icon: Wrench,
                  bn: "সার্ভিসিং ও মেরামত",
                  en: "Servicing & Repair",
                  descBn: "ইনস্টলেশন, মেইনটেন্যান্স, সাপোর্ট",
                  descEn: "Installation · Maintenance · Support",
                  gradient: "from-amber-500 via-orange-600 to-rose-600",
                  glow: "shadow-amber-500/30",
                  accent: isDark ? "bg-amber-500/10 text-amber-300" : "bg-amber-50 text-amber-700",
                  action: () => { setActiveTab("services"); document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" }); },
                },
              ];
              // Merge DB tile data (admin-editable: title, subtitle, image_url) onto base catalog
              const tileMap: Record<string, any> = {};
              (categoryTiles as any[]).forEach((t) => { tileMap[t.slug] = t; });
              return baseCats.map((cat) => {
                const dbTile = tileMap[cat.slug];
                const overrideTitle = dbTile?.title;
                const overrideSubtitle = dbTile?.subtitle;
                const tileImage: string | null = dbTile?.image_url || null;
                return { ...cat, dbTile, overrideTitle, overrideSubtitle, tileImage };
              }).filter((cat) => !cat.dbTile || cat.dbTile.is_active !== false);
            })().map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.key}
                  onClick={cat.action}
                  className={`group relative text-left rounded-2xl overflow-hidden border transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl snap-start flex-shrink-0 w-[78%] xs:w-[65%] sm:w-[340px] lg:w-[380px] ${cat.glow} ${isDark ? "bg-white/[0.03] border-white/10 hover:border-white/20" : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
                    }`}
                >
                  {/* Admin-uploaded background image overlay */}
                  {cat.tileImage && (
                    <>
                      <img
                        src={cat.tileImage}
                        alt={cat.en}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover opacity-30 group-hover:opacity-50 group-hover:scale-105 transition-all duration-700"
                      />
                      <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? "from-[#080510] via-[#080510]/85 to-[#080510]/40" : "from-white via-white/85 to-white/30"}`} />
                    </>
                  )}
                  {/* Gradient backdrop */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500`} />
                  {/* Decorative blur orb */}
                  <div className={`absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-to-br ${cat.gradient} opacity-20 blur-3xl group-hover:opacity-40 transition-opacity duration-500`} />

                  <div className="relative p-5 sm:p-6">
                    {/* Icon badge */}
                    <div className={`inline-flex h-14 w-14 sm:h-16 sm:w-16 rounded-2xl items-center justify-center mb-4 bg-gradient-to-br ${cat.gradient} shadow-lg ${cat.glow} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                      <Icon className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                    </div>

                    <h4 className={`text-lg sm:text-xl font-black font-display mb-1 ${textPrimary}`}>
                      {cat.overrideTitle || (lang === "bn" ? cat.bn : cat.en)}
                    </h4>
                    <p className={`text-xs sm:text-sm mb-4 ${textMuted}`}>
                      {cat.overrideSubtitle || (lang === "bn" ? cat.descBn : cat.descEn)}
                    </p>

                    <div className={`inline-flex items-center gap-1.5 text-xs font-bold ${cat.accent} px-3 py-1.5 rounded-lg group-hover:gap-2.5 transition-all`}>
                      {lang === "bn" ? "এক্সপ্লোর করুন" : "Explore"}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured / Popular Products Banner */}
      {(() => {
        const discounted = products?.filter((p: any) => Number(p.discount_percentage) > 0) || [];
        const featured = discounted.length > 0 ? discounted : (products?.slice(0, 6) || []);
        if (featured.length === 0) return null;
        return (
          <section className={`border-t border-b ${isDark ? "border-white/10 bg-gradient-to-r from-amber-600/5 via-orange-500/5 to-amber-600/5" : "border-gray-200 bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-amber-50/80"}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-5">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <div className={`h-6 w-6 sm:h-7 sm:w-7 rounded-lg flex items-center justify-center ${isDark ? "bg-amber-500/15" : "bg-amber-100"}`}>
                  <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500" />
                </div>
                <h3 className={`text-sm sm:text-lg font-bold ${textPrimary}`}>
                  {lang === "bn" ? "🔥 জনপ্রিয় ও ডিসকাউন্ট পণ্য" : "🔥 Featured & Discounted"}
                </h3>
              </div>
              <StoreCarousel isDark={isDark} slideClass="basis-[40%] sm:basis-1/3 lg:basis-1/5" autoplayDelay={2500}>
                {featured.map((product: any) => (
                  <div
                    key={product.id}
                    onClick={() => setDetailProduct(product)}
                    className={`group rounded-xl overflow-hidden cursor-pointer border transition-all hover:-translate-y-1 hover:shadow-xl ${cardBg} ${cardBorder} ${cardHoverBorder}`}
                  >
                    <div className={`h-20 sm:h-28 lg:h-32 relative overflow-hidden ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                      ) : (
                        <div className={`h-full w-full flex items-center justify-center ${isDark ? "bg-gradient-to-br from-violet-500/5 to-indigo-500/5" : "bg-gradient-to-br from-violet-50 to-indigo-50"}`}>
                          <Package className={`h-8 w-8 ${isDark ? "text-white/10" : "text-gray-200"}`} />
                        </div>
                      )}
                      {Number(product.discount_percentage) > 0 && (
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-red-500/90 text-[8px] sm:text-[9px] font-bold text-white">-{product.discount_percentage}%</span>
                      )}
                    </div>
                    <div className="p-2 sm:p-3">
                      <p className={`text-[10px] sm:text-xs font-semibold line-clamp-1 ${textPrimary}`}>{product.name}</p>
                      <p className={`text-xs sm:text-sm font-black mt-0.5 ${gradientPrice}`}>৳{Number(product.cash_discount_price || product.price).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </StoreCarousel>
            </div>
          </section>
        );
      })()}

      {/* Shop by Category Showcase */}
      <section className={`border-t ${isDark ? "border-white/10" : "border-gray-200"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center ${isDark ? "bg-purple-500/15" : "bg-purple-100"}`}>
              <Boxes className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500" />
            </div>
            <h3 className={`text-sm sm:text-lg font-bold ${textPrimary}`}>
              {lang === "bn" ? "🛒 ক্যাটাগরি অনুযায়ী কেনাকাটা করুন" : "🛒 Shop by Category"}
            </h3>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
            {categoryNav.filter(c => c.key !== "all").map((cat) => {
              const Icon = cat.icon;
              const count = products?.filter((p: any) => p.category === cat.key).length || 0;
              if (count === 0) return null;
              return (
                <button
                  key={cat.key}
                  onClick={() => { setCategoryFilter(cat.key); setActiveTab("products"); document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" }); }}
                  className={`group rounded-xl sm:rounded-2xl p-3 sm:p-4 border text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${isDark
                    ? "bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-purple-500/30"
                    : "bg-white border-gray-200 hover:bg-purple-50/50 hover:border-purple-300 shadow-sm"
                    }`}
                >
                  <div className={`h-10 w-10 sm:h-12 sm:w-12 mx-auto rounded-xl flex items-center justify-center mb-2 transition-all group-hover:scale-110 ${isDark ? "bg-gradient-to-br from-purple-500/10 to-pink-500/10" : "bg-gradient-to-br from-purple-50 to-pink-50"
                    }`}>
                    <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
                  </div>
                  <p className={`text-[10px] sm:text-xs font-bold leading-tight ${textPrimary}`}>
                    {lang === "bn" ? cat.bn : cat.en}
                  </p>
                  <p className={`text-[8px] sm:text-[10px] mt-0.5 ${textMuted}`}>
                    {count} {lang === "bn" ? "টি পণ্য" : count === 1 ? "item" : "items"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Auto-sliding Tab Navigation */}
      <AutoSlidingTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lang={lang}
        isDark={isDark}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        serviceCatFilter={serviceCatFilter}
        setServiceCatFilter={setServiceCatFilter}
      />

      {/* Products Tab */}
      {activeTab === "products" && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={`rounded-2xl animate-pulse h-[280px] sm:h-[340px] border ${isDark ? "bg-white/5 border-white/5" : "bg-gray-100 border-gray-200"}`} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <div className={`h-20 w-20 mx-auto rounded-2xl ${isDark ? "bg-white/5" : "bg-gray-100"} flex items-center justify-center mb-4`}>
                <Package className={`h-10 w-10 ${isDark ? "text-white/15" : "text-gray-300"}`} />
              </div>
              <p className={`${textSecondary} font-medium`}>{t.noProducts}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {filtered.slice(0, visibleProducts).map((product: any) => (
                  <div key={product.id} className={`group rounded-xl ${cardBg} border ${cardBorder} ${cardHoverBorder} transition-all duration-300 overflow-hidden flex flex-col hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1 cursor-pointer`} onClick={() => setDetailProduct(product)}>
                    <div className={`h-28 sm:h-36 lg:h-44 relative overflow-hidden ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                      ) : (
                        <div className={`h-full w-full flex items-center justify-center ${isDark ? "bg-gradient-to-br from-violet-500/5 to-indigo-500/5" : "bg-gradient-to-br from-violet-50 to-indigo-50"}`}>
                          <Package className={`h-10 w-10 ${isDark ? "text-white/10" : "text-gray-200"}`} />
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCompare(product);
                        }}
                        className={`absolute top-2 left-2 h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-md ${compareItems.some(i => i.id === product.id)
                          ? "bg-primary text-white shadow-lg shadow-primary/40 scale-110"
                          : isDark
                            ? "bg-black/50 text-white/60 hover:bg-black/70 hover:text-white"
                            : "bg-white/90 text-gray-400 hover:bg-white hover:text-primary shadow-md"
                          }`}
                        title={lang === "bn" ? "তুলনা করুন" : "Compare"}
                      >
                        <ArrowRightLeft className={`h-3.5 w-3.5 ${compareItems.some(i => i.id === product.id) ? "rotate-180" : ""}`} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(product.id);
                          toast(isInWishlist(product.id) ? (lang === "bn" ? "পছন্দ থেকে সরানো হয়েছে" : "Removed from wishlist") : (lang === "bn" ? "পছন্দে যোগ হয়েছে ❤️" : "Added to wishlist ❤️"));
                        }}
                        className={`absolute top-2 right-2 h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 ${isInWishlist(product.id)
                          ? "bg-rose-500 text-white shadow-lg shadow-rose-500/40 scale-110"
                          : isDark
                            ? "bg-black/50 text-white/60 hover:bg-black/70 hover:text-white backdrop-blur-md"
                            : "bg-white/90 text-gray-400 hover:bg-white hover:text-rose-500 backdrop-blur-md shadow-md"
                          }`}
                      >
                        <Heart className={`h-3.5 w-3.5 ${isInWishlist(product.id) ? "fill-white" : ""}`} />
                      </button>
                      {Number(product.discount_percentage) > 0 && !product.call_for_price && (
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-[8px] sm:text-[10px] font-bold text-white shadow-lg shadow-emerald-500/30">-{product.discount_percentage}%</span>
                      )}
                      {product.stock_quantity === 0 && (
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-red-600/90 text-[8px] sm:text-[10px] font-semibold text-white backdrop-blur-sm">{t.outOfStock}</span>
                      )}
                    </div>
                    <div className="p-3 sm:p-4 flex flex-col flex-1">
                      <h3 className={`font-semibold text-[11px] sm:text-sm leading-snug line-clamp-2 group-hover:text-violet-400 transition-colors ${textPrimary}`}>{product.name}</h3>
                      {product.brand && (
                        <p className={`text-[8px] sm:text-[10px] mt-0.5 ${textMuted}`}>{product.brand}</p>
                      )}
                      <div className="mt-auto pt-2 sm:pt-3 flex items-end justify-between gap-1">
                        <div>
                          {product.call_for_price ? (
                            <p className="text-xs sm:text-sm font-extrabold text-amber-500">{lang === "bn" ? "মূল্য জানতে কল করুন" : "Call for Price"}</p>
                          ) : product.cash_discount_price ? (
                            <>
                              <p className={`text-[9px] sm:text-[11px] ${textMuted} line-through`}>৳{Number(product.price).toLocaleString()}</p>
                              <p className={`text-sm sm:text-lg font-black ${gradientPrice}`}>৳{Number(product.cash_discount_price).toLocaleString()}</p>
                            </>
                          ) : (
                            <p className={`text-sm sm:text-lg font-black ${gradientPrice}`}>৳{Number(product.price).toLocaleString()}</p>
                          )}
                        </div>
                        {product.call_for_price ? (
                          <Button size="sm" className="text-[9px] sm:text-[11px] gap-1 h-8 sm:h-9 px-2.5 sm:px-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 border-0 shadow-lg shadow-amber-500/20 rounded-lg flex-shrink-0 font-semibold text-white" onClick={(e) => { e.stopPropagation(); window.open("tel:+8801919060590"); }}>
                            <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </Button>
                        ) : (
                          <Button size="sm" className="text-[9px] sm:text-[11px] gap-1 h-8 sm:h-9 px-2.5 sm:px-3.5 bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 border-0 shadow-lg shadow-violet-500/20 rounded-lg disabled:opacity-40 flex-shrink-0 font-semibold" disabled={product.stock_quantity === 0} onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}>
                            <ShoppingCart className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {filtered.length > visibleProducts && (
                <div className="flex justify-center mt-6 sm:mt-8">
                  <Button
                    onClick={() => setVisibleProducts(prev => prev + 8)}
                    className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${isDark ? "bg-white/[0.06] hover:bg-white/10 text-white/70 border border-white/10" : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"}`}
                    variant="ghost"
                  >
                    {lang === "bn" ? `আরও দেখুন (${filtered.length - visibleProducts} টি বাকি)` : `Load More (${filtered.length - visibleProducts} remaining)`}
                  </Button>
                </div>
              )}
              {filtered.length > 8 && visibleProducts >= filtered.length && (
                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => { setVisibleProducts(8); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`text-[10px] sm:text-xs font-medium transition-colors ${isDark ? "text-white/30 hover:text-white/50" : "text-gray-400 hover:text-gray-600"}`}
                  >
                    {lang === "bn" ? "↑ উপরে যান" : "↑ Back to top"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Services Tab */}
      {activeTab === "services" && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          {services && services.length > 0 ? (
            <StoreCarousel isDark={isDark} slideClass="basis-1/2 sm:basis-1/2 lg:basis-1/3" noAutoplay>
              {services.filter((s: any) => serviceCatFilter === "all" || s.category === serviceCatFilter).map((service: any) => {
                const IconComp = serviceIcons[service.category] || Wrench;
                return (
                  <div key={service.id} className={`group rounded-xl sm:rounded-2xl ${cardBg} border ${cardBorder} ${cardHoverBorder} overflow-hidden transition-all duration-500 flex flex-col hover:shadow-2xl hover:shadow-violet-500/10 h-full`}>
                    <div className={`h-32 sm:h-40 lg:h-48 relative overflow-hidden ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
                      {service.image_url ? (
                        <img src={service.image_url} alt={service.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                      ) : (
                        <div className={`h-full w-full flex items-center justify-center ${isDark ? "bg-gradient-to-br from-violet-600/10 via-cyan-600/5 to-transparent" : "bg-gradient-to-br from-violet-50 to-indigo-50"}`}>
                          <IconComp className={`h-12 w-12 sm:h-16 sm:w-16 ${isDark ? "text-white/10" : "text-gray-200"}`} />
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[8px] sm:text-[10px] font-medium backdrop-blur-sm ${isDark ? "bg-black/40 text-white/80 border border-white/10" : "bg-white/80 text-gray-700 border border-gray-200 shadow-sm"}`}>{service.category}</span>
                      </div>
                    </div>
                    <div className="p-2.5 sm:p-4 flex flex-col flex-1">
                      <h4 className={`font-semibold text-[11px] sm:text-sm leading-snug line-clamp-2 group-hover:text-violet-400 transition-colors ${textPrimary}`}>{service.name}</h4>
                      {service.description && <p className={`text-[9px] sm:text-[11px] ${textMuted} mt-1 line-clamp-2 leading-relaxed`}>{service.description}</p>}
                      <div className="mt-auto pt-2.5 sm:pt-4 space-y-2">
                        <div>
                          <p className={`text-[9px] sm:text-[10px] ${textMuted} mb-0.5`}>{t.priceFrom}</p>
                          <p className={`text-base sm:text-xl lg:text-2xl font-black ${gradientPrice}`}>৳{Number(service.price).toLocaleString()}</p>
                        </div>
                        <Button size="sm" className="text-[9px] sm:text-xs gap-1 h-8 sm:h-9 bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 border-0 shadow-lg shadow-violet-500/20 rounded-lg sm:rounded-xl w-full" onClick={() => { setMsgDialog(true); setMsgForm({ name: "", phone: "", message: `${lang === "bn" ? "আমি এই সেবা নিতে চাই" : "I want to order"}: ${service.name}` }); }}>
                          <MessageCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {t.orderService}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}</StoreCarousel>
          ) : (
            <div className="text-center py-24">
              <div className={`h-20 w-20 mx-auto rounded-2xl ${isDark ? "bg-white/5" : "bg-gray-100"} flex items-center justify-center mb-4`}>
                <Wrench className={`h-10 w-10 ${isDark ? "text-white/15" : "text-gray-300"}`} />
              </div>
              <p className={`${textSecondary} font-medium`}>{t.noServices}</p>
            </div>
          )}
        </section>
      )}

      {/* Packages Tab */}
      {activeTab === "packages" && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          {packages && packages.length > 0 ? (
            <StoreCarousel isDark={isDark} slideClass="basis-full sm:basis-1/2 lg:basis-1/3" noAutoplay>
              {packages.map((pkg: any) => {
                const statusColors: Record<string, string> = {
                  pending: isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-600 border-amber-200",
                  in_progress: isDark ? "bg-violet-500/10 text-violet-400 border-violet-500/20" : "bg-violet-50 text-violet-600 border-blue-200",
                  completed: isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border-emerald-200",
                  cancelled: isDark ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-red-50 text-red-600 border-red-200",
                };
                const items: string[] = Array.isArray(pkg.included_items) ? pkg.included_items : [];
                return (
                  <div key={pkg.id} className={`group rounded-xl sm:rounded-2xl ${cardBg} border ${cardBorder} ${cardHoverBorder} overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-violet-500/10 h-full flex flex-col`}>
                    <div className={`h-40 sm:h-52 relative overflow-hidden ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
                      {pkg.image_url ? (
                        <img src={pkg.image_url} alt={pkg.title} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                      ) : (
                        <div className={`h-full w-full flex items-center justify-center ${isDark ? "bg-gradient-to-br from-violet-600/10 via-cyan-600/5 to-transparent" : "bg-gradient-to-br from-violet-50 to-indigo-50/50"}`}>
                          <Boxes className={`h-16 w-16 ${isDark ? "text-white/10" : "text-gray-200"}`} />
                        </div>
                      )}
                      <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-medium border ${statusColors[pkg.status] || ""}`}>
                          {statusLabel[pkg.status] || pkg.status}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 sm:p-5 flex flex-col flex-1">
                      <h4 className={`font-bold text-sm sm:text-base group-hover:text-violet-400 transition-colors ${textPrimary} line-clamp-2`}>{pkg.title}</h4>
                      {pkg.description && (
                        <p className={`text-[11px] sm:text-xs ${textMuted} leading-relaxed line-clamp-2 mt-2`}>{pkg.description}</p>
                      )}
                      {items.length > 0 && (
                        <div className="mt-3">
                          <p className={`text-[9px] sm:text-[10px] font-semibold ${textSecondary} mb-1.5 uppercase tracking-wider`}>{t.includes}</p>
                          <ul className="space-y-1">
                            {items.map((item, i) => (
                              <li key={i} className={`text-[10px] sm:text-[11px] flex items-start gap-1.5 ${isDark ? "text-white/60" : "text-gray-600"}`}>
                                <CheckCheck className="h-3 w-3 mt-0.5 text-emerald-400 flex-shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="mt-auto pt-4 flex items-end justify-between gap-2">
                        <div>
                          {pkg.budget && (
                            <>
                              <p className={`text-[9px] sm:text-[10px] ${textMuted} mb-0.5`}>{t.budget}</p>
                              <p className={`text-xl sm:text-2xl font-black ${gradientPrice}`}>৳{Number(pkg.budget).toLocaleString()}</p>
                            </>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="text-[10px] sm:text-xs gap-1 h-8 sm:h-9 bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 border-0 shadow-lg shadow-violet-500/20 rounded-lg sm:rounded-xl"
                          onClick={() => { setMsgDialog(true); setMsgForm({ name: "", phone: "", message: `${lang === "bn" ? "আমি এই প্যাকেজ নিতে চাই" : "I want to order"}: ${pkg.title}` }); }}
                        >
                          <MessageCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {t.orderService}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}</StoreCarousel>
          ) : (
            <div className="text-center py-24">
              <div className={`h-20 w-20 mx-auto rounded-2xl ${isDark ? "bg-white/5" : "bg-gray-100"} flex items-center justify-center mb-4`}>
                <Boxes className={`h-10 w-10 ${isDark ? "text-white/15" : "text-gray-300"}`} />
              </div>
              <p className={`${textSecondary} font-medium`}>{t.noPackages}</p>
            </div>
          )}
        </section>
      )}

      {/* Build Package Tab */}
      {activeTab === "builder" && (
        <PackageBuilder
          isDark={isDark}
          lang={lang}
          onAddToCart={() => { }}
          cartAddMultiple={() => { }}
        />
      )}

      {/* Order Tracking Tab */}
      {activeTab === "tracking" && (
        <OrderTracking isDark={isDark} lang={lang} />
      )}

      {/* Customer Reviews / Testimonials */}
      <section className={`border-t ${isDark ? "border-white/10" : "border-gray-200"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="text-center mb-8 sm:mb-12">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-3 ${isDark ? "bg-amber-500/10 border border-amber-500/20 text-amber-300" : "bg-amber-50 border border-amber-200 text-amber-600"}`}>
              ⭐ {lang === "bn" ? "কাস্টমার রিভিউ" : "Customer Reviews"}
            </div>
            <h3 className={`text-xl sm:text-2xl md:text-3xl font-bold ${textPrimary}`}>
              {lang === "bn" ? "আমাদের কাস্টমারদের মতামত" : "What Our Customers Say"}
            </h3>
            <p className={`${textSecondary} mt-2 text-xs sm:text-sm`}>
              {lang === "bn" ? "আমাদের সেবা ও পণ্য সম্পর্কে কাস্টমারদের অভিজ্ঞতা" : "Real experiences from our valued customers"}
            </p>
          </div>
          {reviews && reviews.length > 0 ? (
            <StoreCarousel isDark={isDark} slideClass="basis-[85%] sm:basis-1/2 lg:basis-1/3" noAutoplay>
              {reviews.map((review: any) => (
                <div key={review.id} className={`rounded-xl sm:rounded-2xl ${cardBg} border ${cardBorder} p-4 sm:p-6 flex flex-col h-full transition-all hover:shadow-lg ${isDark ? "hover:border-amber-500/20" : "hover:border-amber-300"}`}>
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: 5 }).map((_, si) => (
                      <svg key={si} className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${si < review.rating ? "text-amber-400" : isDark ? "text-white/10" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className={`text-[11px] sm:text-xs leading-relaxed flex-1 ${isDark ? "text-white/70" : "text-gray-600"}`}>"{review.review_text}"</p>
                  <div className={`mt-4 pt-3 border-t flex items-center gap-3 ${isDark ? "border-white/10" : "border-gray-100"}`}>
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold ${isDark ? "bg-gradient-to-br from-violet-500/20 to-indigo-500/20 text-violet-300" : "bg-gradient-to-br from-violet-50 to-indigo-50 text-violet-600"}`}>
                      {review.reviewer_name.charAt(0)}
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${textPrimary}`}>{review.reviewer_name}</p>
                      <p className={`text-[9px] sm:text-[10px] ${textMuted}`}>{review.reviewer_role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </StoreCarousel>
          ) : (
            <p className={`text-center ${textMuted} text-sm`}>{lang === "bn" ? "কোনো রিভিউ নেই" : "No reviews yet"}</p>
          )}
          {/* Trust stats removed - now shown in stats counter bar above */}
        </div>
      </section>



      {/* WHY CHOOSE US — Premium card design */}
      <section className={`border-t ${sectionBg} relative overflow-hidden`}>
        <div className={`absolute inset-0 ${isDark ? "mesh-gradient" : ""}`} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 relative">
          <div className="text-center mb-10 sm:mb-14">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-semibold mb-4 ${isDark ? "bg-primary/10 border border-primary/20 text-violet-300" : "bg-primary/5 border border-primary/15 text-primary"}`}>
              <Award className="h-3 w-3" /> {lang === "bn" ? "কেন আমরা সেরা" : "Why We're Different"}
            </div>
            <h3 className={`text-xl sm:text-3xl md:text-4xl font-black font-display ${textPrimary}`}>{t.whyChoose}</h3>
            <p className={`${textSecondary} mt-3 text-xs sm:text-sm max-w-lg mx-auto`}>{t.whyChooseDesc}</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { icon: ShieldCheck, title: t.guaranteeTitle, desc: t.guaranteeDesc, gradient: "from-emerald-500 to-teal-500", iconBg: isDark ? "bg-emerald-500/10" : "bg-emerald-50" },
              { icon: Headphones, title: t.supportTitle, desc: t.supportDesc, gradient: "from-blue-500 to-indigo-500", iconBg: isDark ? "bg-violet-500/10" : "bg-violet-50" },
              { icon: Truck, title: t.deliveryTitle, desc: t.deliveryDesc, gradient: "from-amber-500 to-orange-500", iconBg: isDark ? "bg-amber-500/10" : "bg-amber-50" },
              { icon: Award, title: t.teamTitle, desc: t.teamDesc, gradient: "from-purple-500 to-pink-500", iconBg: isDark ? "bg-purple-500/10" : "bg-purple-50" },
            ].map(({ icon: Icon, title, desc, gradient, iconBg }, idx) => (
              <div key={title} className={`group rounded-2xl ${featureCardBg} p-5 sm:p-7 text-center hover:border-primary/30 transition-all border hover:-translate-y-2 hover:shadow-2xl relative overflow-hidden`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />
                <div className={`h-14 w-14 sm:h-16 sm:w-16 mx-auto rounded-2xl ${iconBg} flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-110 transition-transform relative`}>
                  <Icon className={`h-6 w-6 sm:h-7 sm:w-7 bg-gradient-to-r ${gradient} bg-clip-text`} style={{ color: 'transparent', backgroundImage: `linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to))` }} />
                  <Icon className={`h-6 w-6 sm:h-7 sm:w-7 text-primary absolute inset-0 m-auto`} />
                </div>
                <h4 className={`font-bold text-xs sm:text-sm mb-1.5 sm:mb-2 font-display ${textPrimary}`}>{title}</h4>
                <p className={`text-[9px] sm:text-xs ${textMuted} leading-relaxed`}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — Process steps */}
      <section className={`border-t ${isDark ? "border-white/[0.06]" : "border-gray-100"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="text-center mb-10 sm:mb-14">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-semibold mb-4 ${isDark ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-300" : "bg-cyan-50 border border-cyan-200 text-cyan-600"}`}>
              <Zap className="h-3 w-3" /> {lang === "bn" ? "কিভাবে কাজ করে" : "How It Works"}
            </div>
            <h3 className={`text-xl sm:text-3xl md:text-4xl font-black font-display ${textPrimary}`}>
              {lang === "bn" ? "সহজ ৪টি ধাপে সেবা নিন" : "Get Started in 4 Simple Steps"}
            </h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative">
            {/* Connecting line - desktop only */}
            <div className={`hidden lg:block absolute top-14 left-[12%] right-[12%] h-0.5 ${isDark ? "bg-gradient-to-r from-violet-500/20 via-cyan-500/30 to-blue-500/20" : "bg-gradient-to-r from-blue-200 via-cyan-200 to-blue-200"}`} />
            {[
              { step: "01", icon: Search, title: lang === "bn" ? "পণ্য বাছাই" : "Browse Products", desc: lang === "bn" ? "আমাদের বিশাল কালেকশন থেকে পণ্য বাছাই করুন" : "Explore our wide collection of IT products" },
              { step: "02", icon: ShoppingCart, title: lang === "bn" ? "অর্ডার করুন" : "Place Order", desc: lang === "bn" ? "কার্টে যোগ করে সহজে অর্ডার দিন" : "Add to cart and checkout easily" },
              { step: "03", icon: Truck, title: lang === "bn" ? "দ্রুত ডেলিভারি" : "Fast Delivery", desc: lang === "bn" ? "সারাদেশে দ্রুত ও নিরাপদ ডেলিভারি" : "Quick & safe delivery nationwide" },
              { step: "04", icon: Wrench, title: lang === "bn" ? "ইনস্টলেশন" : "Installation", desc: lang === "bn" ? "পেশাদার ইনস্টলেশন ও সেটআপ সেবা" : "Professional installation & setup" },
            ].map(({ step, icon: Icon, title, desc }, idx) => (
              <div key={step} className={`text-center relative`}>
                <div className={`h-16 w-16 sm:h-20 sm:w-20 mx-auto rounded-2xl flex items-center justify-center mb-4 relative z-10 transition-all group ${isDark
                  ? "bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-blue-500/30 hover:shadow-lg hover:shadow-violet-500/10"
                  : "bg-white border border-gray-200 shadow-md hover:shadow-xl hover:border-blue-300"
                  }`}>
                  <Icon className={`h-7 w-7 sm:h-8 sm:w-8 ${isDark ? "text-violet-400" : "text-primary"}`} />
                  <span className={`absolute -top-2 -right-2 h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black ${isDark ? "bg-gradient-to-r from-violet-600 to-indigo-500 text-white" : "bg-primary text-white"} shadow-lg`}>{step}</span>
                </div>
                <h4 className={`font-bold text-xs sm:text-sm mb-1 font-display ${textPrimary}`}>{title}</h4>
                <p className={`text-[9px] sm:text-xs ${textMuted} leading-relaxed px-2`}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio / Our Projects Section */}
      {(() => {
        const portfolioLabel = lang === "bn" ? "আমাদের প্রকল্প" : "Our Projects";
        const portfolioBadge = lang === "bn" ? "পোর্টফোলিও" : "Portfolio";
        const portfolioDesc = lang === "bn" ? "আমাদের সম্পন্ন করা CCTV, নেটওয়ার্কিং এবং IT প্রকল্পসমূহ দেখুন" : "Explore our completed CCTV, networking and IT installations";
        return (
          <section className={`border-t ${isDark ? "border-white/10" : "border-border"}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
              <div className="text-center mb-6 sm:mb-10">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold mb-3 ${isDark ? "bg-white/5 text-white/60" : "bg-primary/5 text-primary"}`}>
                  <Sparkles className="h-3 w-3" /> {portfolioBadge}
                </span>
                <h3 className={`text-lg sm:text-2xl md:text-3xl font-black font-display ${textPrimary}`}>{portfolioLabel}</h3>
                <p className={`${textMuted} text-xs sm:text-sm mt-1.5 max-w-lg mx-auto`}>{portfolioDesc}</p>
              </div>
              <PortfolioGallery isDark={isDark} lang={lang} textPrimary={textPrimary} textMuted={textMuted} textSecondary={textSecondary} />
            </div>
          </section>
        );
      })()}

      {/* Lead Generation + Service Request Section */}
      <section className={`border-t ${isDark ? "border-white/10" : "border-border"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <div className="max-w-2xl mx-auto">
            <UnifiedRequestForm
              isDark={isDark}
              lang={lang}
              textPrimary={textPrimary}
              textMuted={textMuted}
              inlineInputCls={inlineInputCls}
              selectBg={selectBg}
            />
          </div>
        </div>
      </section>

      {/* CTA Section — Premium gradient with glassmorphism */}
      <section className={`border-t ${isDark ? "border-white/[0.06]" : "border-gray-100"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className={`rounded-3xl relative overflow-hidden ${isDark ? "border border-white/[0.08]" : "border border-gray-200 shadow-2xl"}`}>
            <div className={`absolute inset-0 ${isDark ? "bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-cyan-600/20 mesh-gradient" : "bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-indigo-500/10"}`} />
            {isDark && <>
              <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600/15 rounded-full blur-[120px] animate-pulse-soft" />
              <div className="absolute bottom-0 left-0 w-60 h-60 bg-cyan-600/15 rounded-full blur-[100px] animate-pulse-soft [animation-delay:1s]" />
            </>}
            <div className="relative p-8 sm:p-12 md:p-16 text-center">
              <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-[10px] sm:text-xs font-bold tracking-wider uppercase mb-5 ${isDark ? "bg-white/[0.06] border border-white/[0.08] text-white/70" : "bg-white/80 border border-gray-200 text-primary shadow-sm"}`}>
                <Phone className="h-3 w-3" /> {lang === "bn" ? "যোগাযোগ করুন" : "Get In Touch"}
              </div>
              <h3 className={`text-xl sm:text-3xl md:text-4xl font-black mb-3 sm:mb-4 font-display ${textPrimary}`}>{t.ctaTitle}</h3>
              <p className={`${textSecondary} max-w-lg mx-auto text-xs sm:text-sm mb-6 sm:mb-8`}>{t.ctaDesc}</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {settings.phone && (
                  <Button size="lg" className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 border-0 shadow-xl shadow-violet-500/25 rounded-xl text-xs sm:text-sm text-white h-11 sm:h-13 px-6 sm:px-10 font-bold" asChild>
                    <a href={`tel:${settings.phone.split(",")[0].trim()}`}><Phone className="h-4 w-4" /> {t.callUs} <ArrowRight className="h-4 w-4" /></a>
                  </Button>
                )}
                <Button size="lg" variant="outline" className={`gap-2 rounded-xl text-xs sm:text-sm h-11 sm:h-13 px-6 sm:px-10 font-bold ${isDark ? "border-white/15 hover:bg-white/5 text-white/80" : "border-gray-300 hover:bg-gray-50 text-gray-700"}`} onClick={() => setMsgDialog(true)}>
                  <MessageCircle className="h-4 w-4" /> {lang === "bn" ? "মেসেজ করুন" : "Send Message"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER — Premium with gradient top border */}
      <footer id="contact-section" className={`relative ${isDark ? "bg-[#050810]" : "bg-gray-50"}`}>
        <div className="h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-indigo-400 rounded-xl opacity-40 blur-sm" />
                  <img src={logoSrc} alt={settings.company_name} className="relative h-11 w-11 rounded-xl object-contain ring-1 ring-white/10" />
                </div>
                <div>
                  <h3 className={`font-bold text-sm ${textPrimary}`}>{settings.company_name}</h3>
                  <p className={`text-[10px] ${textMuted}`}>{settings.company_tagline}</p>
                </div>
              </div>
              <p className={`text-xs ${textMuted} leading-relaxed mb-4`}>{customFooterText || t.footerDesc}</p>
              <div className="flex items-center gap-2">
                {socialLinks.facebook && (
                  <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all ${isDark ? "bg-white/[0.04] hover:bg-blue-500/20 text-white/40 hover:text-blue-400" : "bg-gray-100 hover:bg-blue-50 text-gray-400 hover:text-blue-600"}`}>
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                  </a>
                )}
                {socialLinks.instagram && (
                  <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all ${isDark ? "bg-white/[0.04] hover:bg-pink-500/20 text-white/40 hover:text-pink-400" : "bg-gray-100 hover:bg-pink-50 text-gray-400 hover:text-pink-600"}`}>
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                  </a>
                )}
                {socialLinks.youtube && (
                  <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all ${isDark ? "bg-white/[0.04] hover:bg-red-500/20 text-white/40 hover:text-red-400" : "bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-600"}`}>
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                  </a>
                )}
                {socialLinks.tiktok && (
                  <a href={socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all ${isDark ? "bg-white/[0.04] hover:bg-cyan-500/20 text-white/40 hover:text-cyan-400" : "bg-gray-100 hover:bg-cyan-50 text-gray-400 hover:text-cyan-600"}`}>
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.43v-7.15a8.16 8.16 0 005.58 2.17v-3.44a4.85 4.85 0 01-2-.52z" /></svg>
                  </a>
                )}
                {/* Fallback: WhatsApp & Phone if no social links */}
                {!socialLinks.facebook && !socialLinks.instagram && !socialLinks.youtube && !socialLinks.tiktok && (
                  <>
                    {settings.phone && (
                      <a href={`https://wa.me/${(settings.phone.split(",")[0]?.trim() || "").replace(/[^0-9]/g, "").replace(/^0/, "88")}`} target="_blank" rel="noopener noreferrer" className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all ${isDark ? "bg-white/[0.04] hover:bg-emerald-500/20 text-white/40 hover:text-emerald-400" : "bg-gray-100 hover:bg-emerald-50 text-gray-400 hover:text-emerald-600"}`}>
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    )}
                    {settings.phone && (
                      <a href={`tel:${settings.phone.split(",")[0]?.trim()}`} className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all ${isDark ? "bg-white/[0.04] hover:bg-violet-500/20 text-white/40 hover:text-violet-400" : "bg-gray-100 hover:bg-violet-50 text-gray-400 hover:text-violet-600"}`}>
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                    {settings.email && (
                      <a href={`mailto:${settings.email}`} className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all ${isDark ? "bg-white/[0.04] hover:bg-purple-500/20 text-white/40 hover:text-purple-400" : "bg-gray-100 hover:bg-purple-50 text-gray-400 hover:text-purple-600"}`}>
                        <Mail className="h-4 w-4" />
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-white/40" : "text-gray-500"}`}>{t.allCategories}</h4>
              <div className="grid grid-cols-2 gap-1.5">
                {categoryNav.filter(c => c.key !== "all").slice(0, 12).map(cat => (
                  <button key={cat.key} onClick={() => { setCategoryFilter(cat.key); setActiveTab("products"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className={`text-[10px] sm:text-xs text-left transition-all hover:translate-x-1 ${isDark ? "text-white/40 hover:text-violet-400" : "text-gray-500 hover:text-primary"}`}>
                    {lang === "bn" ? cat.bn : cat.en}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-white/40" : "text-gray-500"}`}>{lang === "bn" ? "দ্রুত লিংক" : "Quick Links"}</h4>
              <div className="space-y-2">
                {[
                  { label: lang === "bn" ? "সকল পণ্য" : "All Products", action: () => { setActiveTab("products"); setCategoryFilter("all"); window.scrollTo({ top: 0, behavior: "smooth" }); } },
                  { label: lang === "bn" ? "সেবাসমূহ" : "Services", action: () => { setActiveTab("services"); document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" }); } },
                  { label: lang === "bn" ? "প্যাকেজ" : "Packages", action: () => { setActiveTab("packages"); document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" }); } },
                  { label: lang === "bn" ? "অর্ডার ট্র্যাক" : "Track Order", action: () => { setActiveTab("tracking"); document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" }); } },
                ].map(link => (
                  <button key={link.label} onClick={link.action} className={`block text-[10px] sm:text-xs transition-all hover:translate-x-1 ${isDark ? "text-white/40 hover:text-violet-400" : "text-gray-500 hover:text-primary"}`}>
                    {link.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-white/40" : "text-gray-500"}`}>{t.contact}</h4>
              <div className="space-y-3">
                {settings.phone && <a href={`tel:${settings.phone.split(",")[0].trim()}`} className={`text-xs flex items-center gap-2.5 transition-colors ${isDark ? "text-white/50 hover:text-violet-400" : "text-gray-600 hover:text-primary"}`}><Phone className="h-3.5 w-3.5 flex-shrink-0" />{settings.phone}</a>}
                {settings.email && <a href={`mailto:${settings.email}`} className={`text-xs flex items-center gap-2.5 transition-colors ${isDark ? "text-white/50 hover:text-violet-400" : "text-gray-600 hover:text-primary"}`}><Mail className="h-3.5 w-3.5 flex-shrink-0" />{settings.email}</a>}
                {settings.address && <p className={`text-xs flex items-start gap-2.5 ${isDark ? "text-white/50" : "text-gray-600"}`}><MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />{settings.address}</p>}
              </div>
            </div>
          </div>
          <div className={`mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${isDark ? "border-white/[0.06]" : "border-gray-200"}`}>
            <p className={`text-[10px] sm:text-[11px] ${isDark ? "text-white/20" : "text-gray-400"}`}>© {new Date().getFullYear()} {settings.company_name}. {lang === "bn" ? "সর্বস্বত্ব সংরক্ষিত।" : "All rights reserved."}</p>
            <div className={`flex items-center gap-4 text-[10px] ${isDark ? "text-white/20" : "text-gray-400"}`}>
              <span>{lang === "bn" ? "প্রাইভেসি পলিসি" : "Privacy Policy"}</span>
              <span>•</span>
              <span>{lang === "bn" ? "শর্তাবলী" : "Terms of Service"}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Search Overlay Dialog */}
      <Dialog open={searchOpen} onOpenChange={(o) => { setSearchOpen(o); if (!o) { setSearch(""); setSearchScope("all"); setActiveIndex(0); } }}>
        <DialogContent className={`max-w-2xl p-0 gap-0 overflow-hidden ${dialogBg}`}>
          <DialogHeader className="sr-only">
            <DialogTitle>{lang === "bn" ? "পণ্য খুঁজুন" : "Search Products"}</DialogTitle>
          </DialogHeader>
          {/* Header with input */}
          <div className={`relative px-4 pt-4 pb-3 border-b border-border ${isDark ? "bg-gradient-to-b from-violet-500/[0.04] to-transparent" : "bg-gradient-to-b from-violet-50/40 to-transparent"}`}>
            <div className="relative">
              <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${textMuted}`} />
              <Input
                autoFocus
                placeholder={lang === "bn" ? "পণ্য, সেবা, ব্র্যান্ড অথবা ক্যাটাগরি খুঁজুন..." : "Search products, services, brands or categories..."}
                className={`pl-10 pr-16 h-12 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-violet-500/40 ${inputBg}`}
                value={search}
                onChange={e => { setSearch(e.target.value); setActiveIndex(0); }}
              />
              <kbd className={`hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono font-semibold ${isDark ? "bg-white/10 text-white/60 border border-white/10" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                ESC
              </kbd>
            </div>
            {/* Scope filter chips */}
            <div className="flex items-center gap-1.5 mt-3 overflow-x-auto scrollbar-hide">
              {([
                { k: "all", bn: "সব", en: "All", Icon: Sparkles },
                { k: "products", bn: "পণ্য", en: "Products", Icon: Package },
                { k: "services", bn: "সেবা", en: "Services", Icon: Wrench },
                { k: "packages", bn: "প্যাকেজ", en: "Packages", Icon: Boxes },
              ] as const).map(({ k, bn, en, Icon }) => {
                const active = searchScope === k;
                return (
                  <button
                    key={k}
                    onClick={() => { setSearchScope(k); setActiveIndex(0); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap ${active
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm shadow-violet-500/30"
                      : isDark
                        ? "bg-white/5 hover:bg-white/10 text-white/70 border border-white/10"
                        : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
                      }`}
                  >
                    <Icon className="h-3 w-3" />
                    {lang === "bn" ? bn : en}
                  </button>
                );
              })}
            </div>
          </div>
          <div
            className="max-h-[60vh] overflow-y-auto"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
                const items = document.querySelectorAll<HTMLButtonElement>("[data-search-result]");
                if (!items.length) return;
                if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, items.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
                if (e.key === "Enter") { e.preventDefault(); items[activeIndex]?.click(); }
              }
            }}
          >
            {search.length >= 1 ? (() => {
              const q = search.toLowerCase();
              const allProducts = (products || []).filter((p: any) =>
                p.name.toLowerCase().includes(q) ||
                p.category?.toLowerCase().includes(q) ||
                p.brand?.toLowerCase().includes(q)
              );
              const allServices = (services || []).filter((s: any) =>
                s.name.toLowerCase().includes(q) ||
                s.category?.toLowerCase().includes(q) ||
                s.description?.toLowerCase().includes(q)
              );
              const allPackages = (packages || []).filter((pk: any) =>
                pk.title.toLowerCase().includes(q) ||
                pk.description?.toLowerCase().includes(q)
              );
              const matchedProducts = (searchScope === "all" || searchScope === "products") ? allProducts : [];
              const matchedServices = (searchScope === "all" || searchScope === "services") ? allServices : [];
              const matchedPackages = (searchScope === "all" || searchScope === "packages") ? allPackages : [];
              const totalMatches = matchedProducts.length + matchedServices.length + matchedPackages.length;
              if (totalMatches === 0) {
                return (
                  <div className="px-6 py-14 text-center">
                    <div className={`mx-auto h-14 w-14 rounded-2xl flex items-center justify-center mb-3 ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
                      <Search className={`h-6 w-6 ${textMuted}`} />
                    </div>
                    <p className={`text-sm font-semibold ${textPrimary}`}>{lang === "bn" ? "কোনো ফলাফল পাওয়া যায়নি" : "No results found"}</p>
                    <p className={`text-xs mt-1 ${textMuted}`}>{lang === "bn" ? `"${search}" এর জন্য কিছু খুঁজে পাইনি` : `We couldn't find anything for "${search}"`}</p>
                    <button
                      onClick={() => { setSearchOpen(false); setSearch(""); openWhatsApp(settings.whatsapp_number || settings.phone || "", lang === "bn" ? `আসসালামু আলাইকুম, আমি "${search}" খুঁজছি। দয়া করে সাহায্য করুন।` : `Hello, I'm looking for "${search}". Please help.`); }}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 transition-opacity"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      {lang === "bn" ? "WhatsApp এ জিজ্ঞাসা করুন" : "Ask on WhatsApp"}
                    </button>
                  </div>
                );
              }
              const groupHeader = (icon: any, label: string, count: number) => {
                const Icon = icon;
                return (
                  <div className={`sticky top-0 z-10 flex items-center gap-2 px-5 py-2 backdrop-blur-md ${isDark ? "bg-[#0a0613]/80" : "bg-white/80"}`}>
                    <Icon className={`h-3.5 w-3.5 ${isDark ? "text-violet-300" : "text-violet-600"}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-[0.12em] ${textMuted}`}>{label}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isDark ? "bg-violet-500/15 text-violet-300" : "bg-violet-100 text-violet-700"}`}>{count}</span>
                    <div className={`flex-1 h-px ml-1 ${isDark ? "bg-white/5" : "bg-gray-100"}`} />
                  </div>
                );
              };
              let cursor = -1;
              const renderRow = (active: boolean) => active ? (isDark ? "bg-violet-500/10 ring-1 ring-violet-500/20" : "bg-violet-50 ring-1 ring-violet-200") : (isDark ? "hover:bg-white/5" : "hover:bg-gray-50");
              return (
                <div className="py-1">
                  {matchedProducts.length > 0 && (
                    <>
                      {groupHeader(Package, lang === "bn" ? "পণ্যসমূহ" : "Products", matchedProducts.length)}
                      {matchedProducts.slice(0, 8).map((p: any) => {
                        cursor++;
                        const idx = cursor;
                        const inStock = (p.stock_quantity ?? 0) > 0;
                        return (
                          <button
                            key={`p-${p.id}`}
                            data-search-result
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={`w-full flex items-center gap-3 px-3 mx-2 py-2.5 rounded-lg text-left transition-all ${renderRow(activeIndex === idx)}`}
                            onClick={() => { saveRecentSearch(p.name); setSearchOpen(false); setSearch(""); setDetailProduct(p); }}
                          >
                            <div className={`h-11 w-11 rounded-lg overflow-hidden flex-shrink-0 ring-1 ${isDark ? "bg-white/5 ring-white/5" : "bg-gray-100 ring-gray-200/60"}`}>
                              {p.image_url ? (
                                <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center"><Package className={`h-4 w-4 ${textMuted}`} /></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-semibold truncate ${textPrimary}`}>{p.name}</p>
                                {p.discount_percentage > 0 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-rose-500 to-orange-500 text-white">-{p.discount_percentage}%</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[11px] font-medium ${isDark ? "text-violet-300" : "text-violet-600"}`}>৳{p.price.toLocaleString()}</span>
                                <span className={`text-[10px] ${textMuted}`}>· {p.brand || p.category}</span>
                                <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${inStock ? (isDark ? "text-emerald-400" : "text-emerald-600") : "text-rose-500"}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${inStock ? "bg-emerald-500" : "bg-rose-500"}`} />
                                  {inStock ? (lang === "bn" ? "স্টকে আছে" : "In stock") : (lang === "bn" ? "স্টক নেই" : "Out")}
                                </span>
                              </div>
                            </div>
                            <ArrowRight className={`h-4 w-4 flex-shrink-0 transition-transform ${activeIndex === idx ? "translate-x-0.5 text-violet-500" : textMuted}`} />
                          </button>
                        );
                      })}
                    </>
                  )}
                  {matchedServices.length > 0 && (
                    <>
                      {groupHeader(Wrench, lang === "bn" ? "সেবাসমূহ" : "Services", matchedServices.length)}
                      {matchedServices.slice(0, 6).map((s: any) => {
                        cursor++;
                        const idx = cursor;
                        return (
                          <button
                            key={`s-${s.id}`}
                            data-search-result
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={`w-full flex items-center gap-3 px-3 mx-2 py-2.5 rounded-lg text-left transition-all ${renderRow(activeIndex === idx)}`}
                            onClick={() => {
                              saveRecentSearch(s.name);
                              setSearchOpen(false);
                              setSearch("");
                              setActiveTab("services");
                              setTimeout(() => document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" }), 80);
                            }}
                          >
                            <div className={`h-11 w-11 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center ring-1 ${isDark ? "bg-violet-500/10 ring-violet-500/20" : "bg-violet-50 ring-violet-200/60"}`}>
                              {s.image_url ? (
                                <img src={s.image_url} alt={s.name} className="h-full w-full object-cover" />
                              ) : (
                                <Wrench className={`h-4 w-4 ${isDark ? "text-violet-300" : "text-violet-600"}`} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${textPrimary}`}>{s.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[11px] font-medium ${isDark ? "text-violet-300" : "text-violet-600"}`}>৳{Number(s.price).toLocaleString()}</span>
                                <span className={`text-[10px] ${textMuted}`}>· {s.category}</span>
                              </div>
                            </div>
                            <ArrowRight className={`h-4 w-4 flex-shrink-0 ${activeIndex === idx ? "text-violet-500" : textMuted}`} />
                          </button>
                        );
                      })}
                    </>
                  )}
                  {matchedPackages.length > 0 && (
                    <>
                      {groupHeader(Boxes, lang === "bn" ? "প্যাকেজসমূহ" : "Packages", matchedPackages.length)}
                      {matchedPackages.slice(0, 6).map((pk: any) => {
                        cursor++;
                        const idx = cursor;
                        return (
                          <button
                            key={`pk-${pk.id}`}
                            data-search-result
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={`w-full flex items-center gap-3 px-3 mx-2 py-2.5 rounded-lg text-left transition-all ${renderRow(activeIndex === idx)}`}
                            onClick={() => {
                              saveRecentSearch(pk.title);
                              setSearchOpen(false);
                              setSearch("");
                              setActiveTab("packages");
                              setTimeout(() => document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" }), 80);
                            }}
                          >
                            <div className={`h-11 w-11 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center ring-1 ${isDark ? "bg-indigo-500/10 ring-indigo-500/20" : "bg-indigo-50 ring-indigo-200/60"}`}>
                              {pk.image_url ? (
                                <img src={pk.image_url} alt={pk.title} className="h-full w-full object-cover" />
                              ) : (
                                <Boxes className={`h-4 w-4 ${isDark ? "text-indigo-300" : "text-indigo-600"}`} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${textPrimary}`}>{pk.title}</p>
                              <p className={`text-[11px] mt-0.5 ${textMuted}`}>{pk.budget ? <><span className={`font-medium ${isDark ? "text-indigo-300" : "text-indigo-600"}`}>৳{Number(pk.budget).toLocaleString()}</span> · {lang === "bn" ? "সম্পূর্ণ প্যাকেজ" : "Complete package"}</> : (lang === "bn" ? "প্যাকেজ" : "Package")}</p>
                            </div>
                            <ArrowRight className={`h-4 w-4 flex-shrink-0 ${activeIndex === idx ? "text-violet-500" : textMuted}`} />
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              );
            })() : (
              <div className="py-3">
                {recentSearches.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between px-5 py-2">
                      <div className="flex items-center gap-2">
                        <Clock className={`h-3.5 w-3.5 ${textMuted}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-[0.12em] ${textMuted}`}>
                          {lang === "bn" ? "সাম্প্রতিক সার্চ" : "Recent Searches"}
                        </span>
                      </div>
                      <button
                        onClick={clearRecentSearches}
                        className={`text-[10px] font-semibold ${textMuted} hover:text-rose-500 transition-colors`}
                      >
                        {lang === "bn" ? "সব মুছুন" : "Clear all"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 px-5 pb-3">
                      {recentSearches.map((term) => (
                        <button
                          key={term}
                          onClick={() => setSearch(term)}
                          className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isDark ? "bg-white/5 hover:bg-violet-500/15 text-white/80 border border-white/10 hover:border-violet-500/30" : "bg-gray-50 hover:bg-violet-50 text-gray-700 border border-gray-200 hover:border-violet-300"}`}
                        >
                          <Clock className="h-3 w-3 opacity-50" />
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Quick category chips */}
                <div className="px-5 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <LayoutDashboard className={`h-3.5 w-3.5 ${textMuted}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-[0.12em] ${textMuted}`}>
                      {lang === "bn" ? "ক্যাটাগরি ব্রাউজ করুন" : "Browse Categories"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {categoryNav.slice(1, 9).map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.key}
                          onClick={() => {
                            setCategoryFilter(cat.key);
                            setActiveTab("products");
                            setSearchOpen(false);
                            setTimeout(() => document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" }), 80);
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${isDark ? "bg-white/5 hover:bg-violet-500/15 text-white/80 border border-white/10 hover:border-violet-500/30" : "bg-white hover:bg-violet-50 text-gray-700 border border-gray-200 hover:border-violet-300"}`}
                        >
                          <Icon className="h-3 w-3" />
                          {lang === "bn" ? cat.bn : cat.en}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {(() => {
                  const trending = (products || [])
                    .filter((p: any) => p.show_in_store !== false)
                    .slice(0, 6);
                  if (trending.length === 0) {
                    return (
                      <div className={`px-6 py-12 text-center text-sm ${textMuted}`}>
                        {lang === "bn" ? "পণ্যের নাম, ব্র্যান্ড বা ক্যাটাগরি লিখুন..." : "Type a product name, brand, or category..."}
                      </div>
                    );
                  }
                  return (
                    <>
                      <div className="flex items-center gap-2 px-5 py-2">
                        <Sparkles className={`h-3.5 w-3.5 ${isDark ? "text-amber-300" : "text-amber-500"}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-[0.12em] ${textMuted}`}>
                          {lang === "bn" ? "জনপ্রিয় পণ্য" : "Trending Products"}
                        </span>
                        <div className={`flex-1 h-px ml-1 ${isDark ? "bg-white/5" : "bg-gray-100"}`} />
                      </div>
                      {trending.map((p: any, idx: number) => (
                        <button
                          key={p.id}
                          data-search-result
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={`w-full flex items-center gap-3 px-3 mx-2 py-2.5 rounded-lg text-left transition-all ${activeIndex === idx ? (isDark ? "bg-violet-500/10 ring-1 ring-violet-500/20" : "bg-violet-50 ring-1 ring-violet-200") : (isDark ? "hover:bg-white/5" : "hover:bg-gray-50")}`}
                          onClick={() => { saveRecentSearch(p.name); setSearchOpen(false); setSearch(""); setDetailProduct(p); }}
                        >
                          <div className={`relative h-11 w-11 rounded-lg overflow-hidden flex-shrink-0 ring-1 ${isDark ? "bg-white/5 ring-white/5" : "bg-gray-100 ring-gray-200/60"}`}>
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center"><Package className={`h-4 w-4 ${textMuted}`} /></div>
                            )}
                            <span className="absolute -top-1 -left-1 h-4 w-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-[9px] font-bold flex items-center justify-center shadow">{idx + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${textPrimary}`}>{p.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[11px] font-medium ${isDark ? "text-violet-300" : "text-violet-600"}`}>৳{p.price.toLocaleString()}</span>
                              <span className={`text-[10px] ${textMuted}`}>· {p.brand || p.category}</span>
                            </div>
                          </div>
                          <ArrowRight className={`h-4 w-4 flex-shrink-0 ${activeIndex === idx ? "text-violet-500" : textMuted}`} />
                        </button>
                      ))}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
          {/* Footer with shortcut hints */}
          <div className={`px-4 py-2.5 border-t border-border flex items-center justify-between gap-3 text-[10px] ${textMuted} ${isDark ? "bg-white/[0.02]" : "bg-gray-50/60"}`}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <kbd className={`px-1.5 py-0.5 rounded font-mono font-semibold ${isDark ? "bg-white/10 border border-white/10 text-white/70" : "bg-white border border-gray-200 text-gray-600 shadow-sm"}`}>↑↓</kbd>
                <span>{lang === "bn" ? "নেভিগেট" : "Navigate"}</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className={`px-1.5 py-0.5 rounded font-mono font-semibold ${isDark ? "bg-white/10 border border-white/10 text-white/70" : "bg-white border border-gray-200 text-gray-600 shadow-sm"}`}>↵</kbd>
                <span>{lang === "bn" ? "নির্বাচন" : "Select"}</span>
              </span>
              <span className="hidden sm:flex items-center gap-1">
                <kbd className={`px-1.5 py-0.5 rounded font-mono font-semibold ${isDark ? "bg-white/10 border border-white/10 text-white/70" : "bg-white border border-gray-200 text-gray-600 shadow-sm"}`}>⌘K</kbd>
                <span>{lang === "bn" ? "যেকোনো জায়গা থেকে" : "anywhere"}</span>
              </span>
            </div>
            <span className="flex items-center gap-1.5 font-medium whitespace-nowrap">
              <ShieldCheck className={`h-3 w-3 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
              <span>{(products || []).length}+ {lang === "bn" ? "পণ্য" : "products"}</span>
            </span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={msgDialog} onOpenChange={setMsgDialog}>
        <DialogContent className={`max-w-sm ${dialogBg}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${textPrimary}`}>
              <MessageCircle className="h-5 w-5 text-violet-400" /> {lang === "bn" ? "মেসেজ পাঠান" : "Send Message"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); sendMessage.mutate(); }} className="space-y-3">
            <div className="space-y-1.5">
              <Label className={`text-xs ${labelColor}`}>{lang === "bn" ? "আপনার নাম *" : "Your Name *"}</Label>
              <Input value={msgForm.name} onChange={(e) => setMsgForm({ ...msgForm, name: e.target.value })} required placeholder={lang === "bn" ? "আপনার নাম লিখুন" : "Enter your name"} className={inputBg} />
            </div>
            <div className="space-y-1.5">
              <Label className={`text-xs ${labelColor}`}>{lang === "bn" ? "ফোন নম্বর *" : "Phone Number *"}</Label>
              <Input value={msgForm.phone} onChange={(e) => setMsgForm({ ...msgForm, phone: e.target.value })} required placeholder="01XXXXXXXXX" className={inputBg} />
            </div>
            <div className="space-y-1.5">
              <Label className={`text-xs ${labelColor}`}>{lang === "bn" ? "আপনার মেসেজ *" : "Your Message *"}</Label>
              <textarea
                value={msgForm.message}
                onChange={(e) => setMsgForm({ ...msgForm, message: e.target.value })}
                required
                placeholder={lang === "bn" ? "আপনার মেসেজ লিখুন..." : "Write your message..."}
                className={`w-full min-h-[80px] rounded-md border px-3 py-2 text-sm ${inputBg}`}
              />
            </div>
            <Button type="submit" className="w-full gap-2 bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 border-0 shadow-lg shadow-violet-500/25 rounded-xl text-white" disabled={sendMessage.isPending}>
              <MessageCircle className="h-4 w-4" /> {lang === "bn" ? "মেসেজ পাঠান" : "Send Message"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product Detail Dialog */}
      <ProductDetailDialog
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onOrder={(name, price, productId, variantId, variantLabel) => {
          const product = products?.find((p: any) => p.id === productId) || detailProduct;
          const cartId = variantId ? `${productId}-${variantId}` : productId;
          addItem({ id: cartId, name, price, image_url: product?.image_url, product_id: productId, variant_id: variantId, variant_label: variantLabel, type: "product" });
          toast.success(lang === "bn" ? "কার্টে যোগ হয়েছে" : "Added to cart");
        }}
        isDark={isDark}
        lang={lang}
      />

      {/* Cart Drawer */}
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

      {/* Checkout Dialog */}
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

      {/* Mobile Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 sm:hidden border-t backdrop-blur-2xl ${isDark ? "bg-[#080510]/90 border-white/10" : "bg-white/90 border-gray-200"} shadow-[0_-8px_30px_rgba(0,0,0,0.2)]`}>
        <div className="flex items-center justify-around h-16 px-2">
          {[
            { key: "products", icon: Package, label: t.products },
            { key: "services", icon: Wrench, label: t.services },
            { key: "packages", icon: Boxes, label: t.packages },
            { key: "builder", icon: Sparkles, label: lang === "bn" ? "তৈরি" : "Build" },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key as any); document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" }); }}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-300 ${activeTab === key ? isDark ? "text-violet-400 bg-violet-500/10" : "text-violet-600 bg-violet-50" : isDark ? "text-white/40 hover:text-white/60" : "text-gray-400 hover:text-gray-600"}`}
            >
              <Icon className={`h-5 w-5 transition-all ${activeTab === key ? "scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" : ""}`} />
              <span className="text-[9px] font-semibold">{label}</span>
            </button>
          ))}
          <button
            onClick={() => { document.getElementById("contact-section")?.scrollIntoView({ behavior: "smooth" }); }}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${isDark ? "text-white/40 hover:text-white/60" : "text-gray-400 hover:text-gray-600"}`}
          >
            <Phone className="h-5 w-5" />
            <span className="text-[9px] font-semibold">{t.contact}</span>
          </button>
        </div>
      </nav>

      {/* Spacer for mobile bottom nav */}
      <div className="h-16 sm:hidden" />

      {/* Inline styles for animations */}
      <style>{`
        @keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-33.33%)}}
        .animate-marquee{display:inline-block;animation:marquee 20s linear infinite}
        @keyframes pulse-glow{0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,0.5)}50%{box-shadow:0 0 0 10px rgba(59,130,246,0)}}
       `}</style>

      {/* AI Chat Widget */}
      <AIChatWidget />

      <CompareDrawer
        items={compareItems}
        onRemove={removeCompareItem}
        onCompare={() => setCompareModalOpen(true)}
        onClear={clearCompare}
        isDark={isDark}
        lang={lang}
      />

      <CompareModal
        open={compareModalOpen}
        onOpenChange={setCompareModalOpen}
        items={compareItems}
        isDark={isDark}
        lang={lang}
        addToCart={handleAddToCart}
      />

    </div>
  );
}
