import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import { categoryNav } from './StoreConstants';

export function StoreFooter({
  isDark, logoSrc, settings, textPrimary, textMuted, customFooterText, t, socialLinks,
  setCategoryFilter, setActiveTab, lang
}: any) {
  return (
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
  );
}
