import { Phone, Mail, Globe, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopBarProps {
  lang: "bn" | "en";
  setLang: (lang: "bn" | "en") => void;
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  isDark: boolean;
}

export function TopBar({ lang, setLang, theme, setTheme, isDark }: TopBarProps) {
  const translations = {
    bn: {
      phone: "+880 1919-060590",
      email: "info@akitsolution.store",
      support: "সার্ভিস সাপোর্ট",
    },
    en: {
      phone: "+880 1919-060590",
      email: "info@akitsolution.store",
      support: "Support",
    }
  };

  const t = translations[lang];

  return (
    <div className={`w-full py-2 px-4 sm:px-6 lg:px-8 border-b transition-colors duration-300 ${
      isDark ? "bg-[#0f0a1f]/80 border-white/5 backdrop-blur-md" : "bg-gray-50 border-gray-200"
    }`}>
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-[10px] sm:text-xs font-medium">
        {/* Left: Contact Info */}
        <div className="flex items-center gap-4">
          <a href={`tel:${t.phone.replace(/\s/g, '')}`} className={`flex items-center gap-1.5 transition-colors ${
            isDark ? "text-white/60 hover:text-primary" : "text-gray-500 hover:text-primary"
          }`}>
            <Phone className="h-3 w-3" />
            <span className="hidden sm:inline">{t.phone}</span>
          </a>
          <a href={`mailto:${t.email}`} className={`flex items-center gap-1.5 transition-colors ${
            isDark ? "text-white/60 hover:text-primary" : "text-gray-500 hover:text-primary"
          }`}>
            <Mail className="h-3 w-3" />
            <span className="hidden sm:inline">{t.email}</span>
          </a>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <div className={`flex items-center rounded-full p-0.5 border ${
            isDark ? "bg-white/5 border-white/10" : "bg-gray-200/50 border-gray-300"
          }`}>
            <button
              onClick={() => setLang("bn")}
              className={`px-2 py-0.5 rounded-full transition-all ${
                lang === "bn" 
                ? "bg-primary text-white shadow-sm" 
                : isDark ? "text-white/40 hover:text-white/60" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              BN
            </button>
            <button
              onClick={() => setLang("en")}
              className={`px-2 py-0.5 rounded-full transition-all ${
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
            className={`h-7 w-7 rounded-full ${
              isDark ? "text-white/60 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-900 hover:bg-gray-200"
            }`}
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
