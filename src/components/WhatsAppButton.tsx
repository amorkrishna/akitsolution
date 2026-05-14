import { MessageCircle } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";

export function WhatsAppButton() {
  const { language } = useTranslation();
  const phoneNumber = "+8801919060590";
  const message = language === "bn" 
    ? "হ্যালো, আমি আপনার প্রোডাক্ট সম্পর্কে জানতে চাই।" 
    : "Hello, I want to know about your products.";
  
  const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 group"
      aria-label="Contact on WhatsApp"
    >
      <div className="relative flex items-center justify-center">
        {/* Pulse Ring */}
        <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-25 group-hover:animate-none"></div>
        
        {/* Main Button */}
        <div className="relative h-14 w-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30 transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-12">
          <MessageCircle className="h-7 w-7 text-white fill-white" />
        </div>
        
        {/* Tooltip/Label */}
        <div className="absolute left-full ml-3 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap shadow-xl border border-white/10">
          {language === "bn" ? "আমাদের সাথে কথা বলুন" : "Chat with us"}
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
        </div>
      </div>
    </a>
  );
}
