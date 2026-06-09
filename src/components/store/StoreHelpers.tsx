import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRightLeft, Camera, Cpu, Globe, HardDrive, Headphones, Keyboard, Laptop, Monitor, Printer, Router, Server, Zap, Wrench, Mail, Truck, Package, MapPin } from 'lucide-react';
import { StoreCarousel } from './StoreCarousel';

export function AutoSlidingTabs({
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
        <div className={`flex flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain snap-x py-3 px-2 mt-2 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50/80"} scroll-smooth`}>
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
        <div className={`flex flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain snap-x py-3 px-2 mt-2 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50/80"} scroll-smooth`}>
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

export function PortfolioGallery({ isDark, lang, textPrimary, textMuted, textSecondary }: { isDark: boolean; lang: string; textPrimary: string; textMuted: string; textSecondary: string }) {
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


export function UnifiedRequestForm({ isDark, lang, textPrimary, textMuted, inlineInputCls, selectBg }: { isDark: boolean; lang: string; textPrimary: string; textMuted: string; inlineInputCls: string; selectBg: string }) {
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


