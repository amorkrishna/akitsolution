import { useState } from "react";
import { Menu, X, Globe, Moon, Sun, Wrench, MessageCircle, LogIn, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTranslation } from "@/contexts/LanguageContext";

interface MobileMenuProps {
  lang: "bn" | "en";
  setLang: (lang: "bn" | "en") => void;
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  isDark: boolean;
  settings: any;
}

export function MobileMenu({ lang, setLang, theme, setTheme, isDark, settings }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const whatsappNumber = settings?.whatsapp_number || "8801919060590";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(lang === "bn" ? "আসসালামু আলাইকুম, আমি আপনার প্রোডাক্ট সম্পর্কে জানতে চাই।" : "Hello, I want to know about your products.")}`;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className={`h-8 w-8 rounded-md flex items-center justify-center transition-all ${isDark ? "bg-white/5 text-white" : "bg-gray-100 text-gray-900"}`}>
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className={`w-[80vw] sm:w-[350px] p-0 border-l ${isDark ? "bg-[#0f0a1f] border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
            <span className="font-bold text-lg">Menu</span>
            <button onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-6 overflow-y-auto flex-1">
            
            {/* Theme Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
              <span className="font-medium text-sm flex items-center gap-2">
                {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                {lang === "bn" ? "ডার্ক মোড" : "Dark Mode"}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className={`rounded-full px-4 h-8 ${isDark ? "border-white/20 hover:bg-white/10" : ""}`}
              >
                {isDark ? "Turn Off" : "Turn On"}
              </Button>
            </div>

            {/* Language Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
              <span className="font-medium text-sm flex items-center gap-2">
                <Globe className="h-4 w-4" />
                {lang === "bn" ? "ভাষা" : "Language"}
              </span>
              <div className={`flex items-center rounded-full p-0.5 border ${isDark ? "bg-[#0f0a1f] border-white/10" : "bg-white border-gray-300"}`}>
                <button
                  onClick={() => setLang("bn")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${lang === "bn" ? "bg-blue-600 text-white" : "text-gray-500 dark:text-gray-400"}`}
                >
                  বাংলা
                </button>
                <button
                  onClick={() => setLang("en")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${lang === "en" ? "bg-blue-600 text-white" : "text-gray-500 dark:text-gray-400"}`}
                >
                  EN
                </button>
              </div>
            </div>

            <div className="h-px w-full bg-gray-200 dark:bg-white/10"></div>

            {/* Links */}
            <div className="space-y-2">
              <a href="/our-services" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Wrench className="h-4 w-4 text-blue-600 dark:text-blue-400 group-hover:text-white" />
                </div>
                <span className="font-medium">{lang === "bn" ? "আমাদের সার্ভিসসমূহ" : "Our Services"}</span>
              </a>
              
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg group-hover:bg-[#25D366] group-hover:text-white transition-colors">
                  <MessageCircle className="h-4 w-4 text-[#25D366] dark:text-[#25D366] group-hover:text-white" />
                </div>
                <span className="font-medium">{lang === "bn" ? "হোয়াটসঅ্যাপ" : "WhatsApp"}</span>
              </a>

              <a href={`tel:${whatsappNumber}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-colors">
                  <Phone className="h-4 w-4 text-orange-500 dark:text-orange-400 group-hover:text-white" />
                </div>
                <span className="font-medium">{lang === "bn" ? "সরাসরি কল" : "Call Now"}</span>
              </a>

              <a href="/auth" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                <div className="bg-gray-100 dark:bg-white/10 p-2 rounded-lg group-hover:bg-gray-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-colors">
                  <LogIn className="h-4 w-4 text-gray-600 dark:text-gray-300 group-hover:text-white dark:group-hover:text-black" />
                </div>
                <span className="font-medium">{lang === "bn" ? "লগইন / রেজিস্টার" : "Login / Register"}</span>
              </a>
            </div>

          </div>
          
          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-white/10 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} {settings?.company_name}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
