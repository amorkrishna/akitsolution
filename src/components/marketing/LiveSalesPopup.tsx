import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";

// Dummy data for social proof that sounds localized for BD
const NOTIFICATIONS_BN = [
  { name: "রহিম", area: "উত্তরা", service: "একটি ৪ ক্যামেরার সিসিটিভি প্যাকেজ কিনেছেন", time: "৫ মিনিট আগে" },
  { name: "করিম", area: "বনানী", service: "অফিস নেটওয়ার্ক সেটআপ বুক করেছেন", time: "১২ মিনিট আগে" },
  { name: "আব্দুল্লাহ", area: "মিরপুর", service: "ZKTeco এটেন্ডেন্স মেশিন অর্ডার করেছেন", time: "আধা ঘণ্টা আগে" },
  { name: "শফিক", area: "মতিঝিল", service: "আইটি সাপোর্ট সার্ভিস নিয়েছেন", time: "১ ঘণ্টা আগে" },
  { name: "তানভীর", area: "ধানমন্ডি", service: "একটি 8-Port Switch কিনেছেন", time: "২ ঘণ্টা আগে" },
];

const NOTIFICATIONS_EN = [
  { name: "Rahim", area: "Uttara", service: "bought a 4-Camera CCTV Package", time: "5 mins ago" },
  { name: "Karim", area: "Banani", service: "booked an Office Network Setup", time: "12 mins ago" },
  { name: "Abdullah", area: "Mirpur", service: "ordered a ZKTeco Attendance Machine", time: "30 mins ago" },
  { name: "Shafiq", area: "Motijheel", service: "purchased IT Support Services", time: "1 hour ago" },
  { name: "Tanvir", area: "Dhanmondi", service: "bought an 8-Port Switch", time: "2 hours ago" },
];

export function LiveSalesPopup() {
  const [currentNotif, setCurrentNotif] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { language } = useTranslation();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const showNotification = () => {
      const dataList = language === "bn" ? NOTIFICATIONS_BN : NOTIFICATIONS_EN;
      const randomNotif = dataList[Math.floor(Math.random() * dataList.length)];
      setCurrentNotif(randomNotif);
      setIsVisible(true);

      // Hide after 5 seconds
      timeoutId = setTimeout(() => {
        setIsVisible(false);
        // Schedule next one between 15s to 30s
        timeoutId = setTimeout(showNotification, Math.random() * 15000 + 15000);
      }, 5000);
    };

    // Initial delay before showing the first one
    timeoutId = setTimeout(showNotification, 8000);

    return () => clearTimeout(timeoutId);
  }, [language]);

  if (!currentNotif) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.4, type: "spring" }}
          className="fixed bottom-24 sm:bottom-8 right-4 sm:right-6 z-[60] max-w-xs w-full bg-white dark:bg-[#111118] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-2xl shadow-black/10 dark:shadow-black/40 flex gap-3 items-start cursor-pointer"
          onClick={() => setIsVisible(false)}
        >
          <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-full shrink-0 mt-1">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {currentNotif.name} <span className="text-gray-500 dark:text-gray-400 font-normal">from {currentNotif.area}</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-2">
              {currentNotif.service}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 font-medium">
              {currentNotif.time}
            </p>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsVisible(false);
            }}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
