import { MessageCircle, Phone } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";

export function WhatsAppButton({ phone }: { phone?: string }) {
  const { language } = useTranslation();
  
  // Normalize the phone number for WhatsApp
  const rawPhone = phone || "+8801919060590";
  // If number starts with 0 and doesn't have country code, prepend 88
  let formattedPhone = rawPhone.replace(/[^0-9]/g, '');
  if (formattedPhone.length === 11 && formattedPhone.startsWith('0')) {
    formattedPhone = '88' + formattedPhone;
  } else if (formattedPhone.length === 10 && !formattedPhone.startsWith('88')) {
    formattedPhone = '880' + formattedPhone;
  }

  const message = language === "bn" 
    ? "আসসালামু আলাইকুম, আমি আপনার প্রোডাক্ট ও সার্ভিস সম্পর্কে জানতে চাই।" 
    : "Hello, I want to know about your products and services.";
  
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-6 z-50 flex flex-col sm:flex-row gap-3">
      {/* Call Now Button - Especially visible on mobile */}
      <a
        href={`tel:${formattedPhone}`}
        className="group relative"
        aria-label="Call Now"
      >
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-20 group-hover:animate-none"></div>
          <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 transform transition-all duration-300 group-hover:scale-110 group-hover:-rotate-12">
            <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-white fill-white" />
          </div>
          <div className="absolute left-full ml-3 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap shadow-xl border border-white/10">
            {language === "bn" ? "সরাসরি কল করুন" : "Call Now"}
            <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
          </div>
        </div>
      </a>

      {/* WhatsApp Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative"
        aria-label="Contact on WhatsApp"
      >
        <div className="relative flex items-center justify-center">
          {/* Pulse Ring */}
          <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-25 group-hover:animate-none"></div>
          
          {/* Main Button */}
          <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30 transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-12">
            <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7 text-white fill-white" />
          </div>
          
          {/* Tooltip/Label */}
          <div className="absolute left-full ml-3 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap shadow-xl border border-white/10">
            {language === "bn" ? "আমাদের সাথে চ্যাট করুন" : "Chat with us"}
            <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
          </div>
        </div>
      </a>
    </div>
  );
}
