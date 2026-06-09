import { ShieldCheck, Headphones, Truck, Award, Zap, Search, ShoppingCart, Wrench } from 'lucide-react';

export function StoreFeatures({
  isDark, t, lang, textPrimary, textSecondary, textMuted, sectionBg, featureCardBg
}: any) {
  return (
    <>
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

    </>
  );
}
