import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Sparkles, Package, Wrench, Boxes, MessageCircle, Heart, FileText, MoveRight, Clock, ShieldCheck, LayoutDashboard, ArrowRight } from 'lucide-react';
import { openWhatsApp } from '@/lib/whatsapp';

export function StoreSearchDialog({
  searchOpen, setSearchOpen, search, setSearch, searchScope, setSearchScope, activeIndex, setActiveIndex,
  lang, isDark, textMuted, inputBg, dialogBg, products, services, packages, settings, textPrimary,
  saveRecentSearch, clearRecentSearches, recentSearches, categoryNav, setCategoryFilter, setActiveTab, setDetailProduct
}: any) {
  return (
    <>
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

    </>
  );
}
