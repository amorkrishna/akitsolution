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
import { useSearchParams } from "react-router-dom";

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

import { categoryNav, translations, sectionCards, serviceSubcategories } from '@/components/store/StoreConstants';
import { AutoSlidingTabs, PortfolioGallery, UnifiedRequestForm } from '@/components/store/StoreHelpers';
import { StoreFooter } from '@/components/store/StoreFooter';
import { StoreFeatures } from '@/components/store/StoreFeatures';
import { StoreSearchDialog } from '@/components/store/StoreSearchDialog';
export default function Store() {
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [msgDialog, setMsgDialog] = useState(false);
  const [msgForm, setMsgForm] = useState({ name: "", phone: "", message: "" });
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab = (tabParam === "products" || tabParam === "services" || tabParam === "packages" || tabParam === "builder" || tabParam === "tracking")
    ? tabParam
    : "products";
  const [activeTab, setActiveTabState] = useState<"products" | "services" | "packages" | "builder" | "tracking">(initialTab);

  const setActiveTab = useCallback((tab: "products" | "services" | "packages" | "builder" | "tracking") => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  }, [setSearchParams]);

  useEffect(() => {
    if (tabParam && (tabParam === "products" || tabParam === "services" || tabParam === "packages" || tabParam === "builder" || tabParam === "tracking")) {
      setActiveTabState(tabParam);
    }
  }, [tabParam]);
  const [lang, setLang] = useState<"bn" | "en">("en");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light";
    return saved || "dark";
  });
  const [detailProduct, setDetailProduct] = useState<any>(null);
  const [serviceCatFilter, setServiceCatFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [defaultCategorySet, setDefaultCategorySet] = useState(false);
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

  // Handle hardware back button on mobile for modals
  useEffect(() => {
    if (cartOpen || checkoutOpen || detailProduct) {
      // Only push state if we are transitioning from nothing open to something open
      window.history.pushState({ modal: "store-modal" }, "");
      
      const handlePopState = () => {
        if (checkoutOpen) setCheckoutOpen(false);
        else if (cartOpen) setCartOpen(false);
        else if (detailProduct) setDetailProduct(null);
      };
      
      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, [cartOpen, checkoutOpen, !!detailProduct]);
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
        
        // Sort client-side to prevent crash if SQL column isn't created yet
        return (data || []).sort((a: any, b: any) => {
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          return 0;
        });
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

  // Reverted default category logic so all products show by default, 
  // but they are still sorted with top-ranked categories first.

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

  const priorityCategories = categoryTiles.length > 0 
    ? [categoryTiles[0].title] 
    : ["CCTV", "Camera", "DVR/NVR"];

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
        title={metaTitle || "AK IT Solution - CCTV Installation & IT Services in Bangladesh"}
        description={metaDescription || "AK IT Solution — বাংলাদেশের অন্যতম বিশ্বস্ত IT সলিউশন কোম্পানি। ঢাকা সহ সারা বাংলাদেশে প্রফেশনাল CCTV ইনস্টলেশন, নেটওয়ার্ক সেটআপ, সার্ভার সেটআপ ও আইটি সাপোর্ট সার্ভিস।"}
        url="https://akitsolution.store/"
        image="https://akitsolution.store/og-image.png"
        type="website"
        keywords="CCTV camera price in Bangladesh, CCTV installation service Bangladesh, সিসিটিভি ক্যামেরা ইনস্টলেশন বাংলাদেশ, network setup service Bangladesh, সিসিটিভি প্যাকেজ দাম, CCTV camera Dhaka, CCTV installation service Dhaka, Hikvision CCTV camera price BD, Dahua CC camera price Bangladesh, IP camera price in Bangladesh, WiFi CC camera price BD, DVR price in Bangladesh, NVR price BD, networking equipment price Bangladesh, router price BD, attendance machine price Bangladesh, ZKTeco attendance machine price, IT solutions company Bangladesh, server setup Bangladesh, IT support service Bangladesh, AK IT Solution, ICT Bhaban Dhaka"
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
              <a 
                href={`https://wa.me/${settings?.whatsapp_number || "8801919060590"}?text=${encodeURIComponent(lang === "bn" ? "আসসালামু আলাইকুম, আমি আপনার প্রোডাক্ট সম্পর্কে জানতে চাই।" : "Hello, I want to know about your products.")}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="h-7 w-7 rounded-md flex items-center justify-center bg-[#25D366] text-white shadow-md shadow-[#25D366]/25 hover:bg-[#128C7E] transition-all"
              >
                <MessageCircle className="h-3 w-3" />
              </a>
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
          <div className="flex overflow-x-auto pb-2 sm:pb-0 sm:grid sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {categoryNav.filter(c => c.key !== "all").map((cat) => {
              const Icon = cat.icon;
              const count = products?.filter((p: any) => p.category === cat.key).length || 0;
              if (count === 0) return null;
              return (
                <button
                  key={cat.key}
                  onClick={() => { setCategoryFilter(cat.key); setActiveTab("products"); document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" }); }}
                  className={`group snap-start min-w-[100px] sm:min-w-0 flex-shrink-0 rounded-xl sm:rounded-2xl p-3 sm:p-4 border text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${isDark
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
                    <div className="p-3 sm:p-4 flex flex-col flex-1 relative">
                      {product.is_featured && (
                        <div className="absolute -top-3 left-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 z-10 border border-white/20">
                          <Star className="h-2 w-2 fill-white" /> Top
                        </div>
                      )}
                      <h3 className={`font-semibold text-[11px] sm:text-sm leading-snug line-clamp-2 group-hover:text-violet-400 transition-colors ${product.is_featured ? "mt-1" : ""} ${textPrimary}`}>{product.name}</h3>
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
                          <Button size="sm" className="text-[9px] sm:text-[11px] gap-1.5 h-8 sm:h-9 px-3 sm:px-4 bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 border-0 shadow-lg shadow-violet-500/20 rounded-lg disabled:opacity-40 flex-shrink-0 font-bold text-white" disabled={product.stock_quantity === 0} onClick={(e) => { e.stopPropagation(); handleAddToCart(product); setCartOpen(true); }}>
                            {lang === "bn" ? "অর্ডার করুন" : "Buy Now"}
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



      <StoreFeatures isDark={isDark} t={t} lang={lang} textPrimary={textPrimary} textSecondary={textSecondary} textMuted={textMuted} sectionBg={sectionBg} featureCardBg={featureCardBg} />
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
      <StoreFooter isDark={isDark} logoSrc={logoSrc} settings={settings} textPrimary={textPrimary} textMuted={textMuted} customFooterText={customFooterText} t={t} socialLinks={socialLinks} setCategoryFilter={setCategoryFilter} setActiveTab={setActiveTab} lang={lang} />

      <StoreSearchDialog searchOpen={searchOpen} setSearchOpen={setSearchOpen} search={search} setSearch={setSearch} searchScope={searchScope} setSearchScope={setSearchScope} activeIndex={activeIndex} setActiveIndex={setActiveIndex} lang={lang} isDark={isDark} textMuted={textMuted} inputBg={inputBg} dialogBg={dialogBg} products={products} services={services} packages={packages} settings={settings} textPrimary={textPrimary} />
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
          setCartOpen(true);
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
        <div className="flex items-center justify-around h-16 px-1">
          {[
            { key: "products", icon: Package, label: t.products },
            { key: "services", icon: Wrench, label: t.services },
            { key: "packages", icon: Boxes, label: t.packages },
            { key: "builder", icon: Sparkles, label: lang === "bn" ? "তৈরি" : "Build" },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key as any); document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" }); }}
              className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-all duration-300 ${activeTab === key ? isDark ? "text-violet-400 bg-violet-500/10" : "text-violet-600 bg-violet-50" : isDark ? "text-white/40 hover:text-white/60" : "text-gray-400 hover:text-gray-600"}`}
            >
              <Icon className={`h-5 w-5 transition-all ${activeTab === key ? "scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" : ""}`} />
              <span className="text-[9px] font-semibold">{label}</span>
            </button>
          ))}
          <button
            onClick={() => setCartOpen(true)}
            className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-all relative ${isDark ? "text-white/40 hover:text-white/60" : "text-gray-400 hover:text-gray-600"}`}
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="text-[9px] font-semibold">{lang === "bn" ? "কার্ট" : "Cart"}</span>
            {totalItems() > 0 && (
              <span className="absolute top-0.5 right-1.5 bg-red-500 text-white text-[8px] font-bold h-3.5 w-3.5 flex items-center justify-center rounded-full">
                {totalItems()}
              </span>
            )}
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

      {/* Floating WhatsApp Chat Button */}
      <WhatsAppButton phone={settings?.whatsapp_number || settings?.phone} />

      {/* Floating Right-Side Cart Logo */}
      {totalItems() > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className={`hidden sm:flex fixed right-0 top-1/2 -translate-y-1/2 z-[60] p-3 rounded-l-2xl shadow-[-4px_0_15px_rgba(0,0,0,0.1)] flex-col items-center gap-1 transition-transform hover:-translate-x-1 ${
            isDark ? "bg-violet-600 hover:bg-violet-500 text-white" : "bg-violet-600 hover:bg-violet-700 text-white"
          }`}
        >
          <ShoppingCart className="h-6 w-6" />
          <span className="bg-white text-violet-700 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
            {totalItems()}
          </span>
          <span className="text-[8px] font-bold tracking-wider uppercase mt-1 [writing-mode:vertical-lr] rotate-180">
            {lang === "bn" ? "কার্ট" : "Cart"}
          </span>
        </button>
      )}

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
