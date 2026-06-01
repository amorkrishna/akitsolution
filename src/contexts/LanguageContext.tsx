import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type Language = "bn" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Flat translation dictionary
const translations: Record<string, Record<Language, string>> = {
  // Sidebar groups
  "sidebar.overview": { bn: "ওভারভিউ", en: "Overview" },
  "sidebar.finance": { bn: "ফাইন্যান্স", en: "Finance" },
  "sidebar.operations": { bn: "অপারেশন", en: "Operations" },
  "sidebar.hr": { bn: "এইচআর", en: "HR" },
  "sidebar.marketing": { bn: "মার্কেটিং", en: "Marketing" },
  "sidebar.system": { bn: "সিস্টেম", en: "System" },

  // Sidebar items
  "nav.dashboard": { bn: "ড্যাশবোর্ড", en: "Dashboard" },
  "nav.clients": { bn: "ক্লায়েন্ট", en: "Clients" },
  "nav.leads": { bn: "লিড", en: "Leads" },
  "nav.products": { bn: "প্রোডাক্ট", en: "Products" },
  "nav.product_finder": { bn: "প্রোডাক্ট ফাইন্ডার", en: "Product Finder" },
  "nav.purchases": { bn: "ক্রয়", en: "Purchases" },
  "nav.orders": { bn: "অর্ডার", en: "Orders" },
  "nav.inventory": { bn: "ইনভেন্টরি", en: "Inventory" },
  "nav.revenue": { bn: "রেভিনিউ", en: "Revenue" },
  "nav.quotations": { bn: "কোটেশন", en: "Quotations" },
  "nav.invoices": { bn: "ইনভয়েস", en: "Invoices" },
  "nav.expenses": { bn: "খরচ", en: "Expenses" },
  "nav.reports": { bn: "রিপোর্ট", en: "Reports" },
  "nav.service_requests": { bn: "সার্ভিস রিকোয়েস্ট", en: "Service Requests" },
  "nav.packages": { bn: "প্যাকেজ", en: "Packages" },
  "nav.services": { bn: "সার্ভিস", en: "Services" },
  "nav.servicing": { bn: "সার্ভিসিং", en: "Servicing" },
  "nav.reviews": { bn: "রিভিউ", en: "Reviews" },
  "nav.portfolio": { bn: "পোর্টফোলিও", en: "Portfolio" },
  "nav.tenders": { bn: "টেন্ডার", en: "Tenders" },
  "nav.ai_chats": { bn: "AI চ্যাট", en: "AI Chats" },
  "nav.today": { bn: "আজকের কাজ", en: "Today" },
  "nav.employees": { bn: "কর্মচারী", en: "Employees" },
  "nav.attendance": { bn: "হাজিরা", en: "Attendance" },
  "nav.user_management": { bn: "ইউজার ম্যানেজমেন্ট", en: "User Management" },
  "nav.store_customize": { bn: "স্টোর কাস্টমাইজ", en: "Store Customize" },
  "nav.online_store": { bn: "অনলাইন স্টোর", en: "Online Store" },
  "nav.settings": { bn: "সেটিংস", en: "Settings" },

  // Common
  "common.save": { bn: "সেভ করুন", en: "Save" },
  "common.cancel": { bn: "বাতিল", en: "Cancel" },
  "common.delete": { bn: "ডিলিট", en: "Delete" },
  "common.edit": { bn: "এডিট", en: "Edit" },
  "common.add": { bn: "যোগ করুন", en: "Add" },
  "common.search": { bn: "খুঁজুন...", en: "Search..." },
  "common.actions": { bn: "অ্যাকশন", en: "Actions" },
  "common.name": { bn: "নাম", en: "Name" },
  "common.email": { bn: "ইমেইল", en: "Email" },
  "common.phone": { bn: "ফোন", en: "Phone" },
  "common.address": { bn: "ঠিকানা", en: "Address" },
  "common.company": { bn: "কোম্পানি", en: "Company" },
  "common.notes": { bn: "নোট", en: "Notes" },
  "common.status": { bn: "স্ট্যাটাস", en: "Status" },
  "common.date": { bn: "তারিখ", en: "Date" },
  "common.amount": { bn: "পরিমাণ", en: "Amount" },
  "common.total": { bn: "মোট", en: "Total" },
  "common.export_csv": { bn: "CSV ডাউনলোড", en: "Export CSV" },
  "common.export_pdf": { bn: "PDF ডাউনলোড", en: "Export PDF" },
  "common.no_data": { bn: "কোনো ডেটা নেই", en: "No data available" },
  "common.loading": { bn: "লোড হচ্ছে...", en: "Loading..." },
  "common.light_mode": { bn: "লাইট মোড", en: "Light Mode" },
  "common.dark_mode": { bn: "ডার্ক মোড", en: "Dark Mode" },
  "common.search_pages": { bn: "পেজ খুঁজুন...", en: "Search pages..." },
  "common.no_pages_found": { bn: "কোনো পেজ পাওয়া যায়নি", en: "No pages found" },

  // Pages
  "page.clients.title": { bn: "ক্লায়েন্ট", en: "Clients" },
  "page.clients.subtitle": { bn: "আপনার ক্লায়েন্ট ডেটাবেস পরিচালনা করুন", en: "Manage your client database" },
  "page.clients.add": { bn: "ক্লায়েন্ট যোগ করুন", en: "Add Client" },
  "page.clients.edit": { bn: "ক্লায়েন্ট এডিট করুন", en: "Edit Client" },
  "page.clients.no_clients": { bn: "কোনো ক্লায়েন্ট নেই। প্রথম ক্লায়েন্ট যোগ করুন।", en: "No clients yet. Add your first client." },

  "page.revenue.title": { bn: "রেভিনিউ ড্যাশবোর্ড", en: "Revenue Dashboard" },
  "page.revenue.subtitle": { bn: "বিক্রি, খরচ ও লাভ-ক্ষতির সম্পূর্ণ বিশ্লেষণ", en: "Complete analysis of sales, expenses & profit-loss" },
  "page.revenue.total_income": { bn: "মোট আয়", en: "Total Income" },
  "page.revenue.total_expense": { bn: "মোট খরচ", en: "Total Expense" },
  "page.revenue.net_profit": { bn: "নেট লাভ", en: "Net Profit" },
  "page.revenue.today_income": { bn: "আজকের আয়", en: "Today's Income" },
  "page.revenue.monthly_chart": { bn: "মাসিক আয় vs খরচ", en: "Monthly Income vs Expense" },
  "page.revenue.profit_trend": { bn: "লাভ/ক্ষতি ট্রেন্ড", en: "Profit/Loss Trend" },
  "page.revenue.category_expense": { bn: "ক্যাটাগরি অনুযায়ী খরচ", en: "Expense by Category" },
  "page.revenue.top_products": { bn: "সবচেয়ে বেশি বিক্রি", en: "Top Selling Products" },
  "page.revenue.add_expense": { bn: "খরচ যোগ করুন", en: "Add Expense" },
  "page.revenue.income": { bn: "আয়", en: "Income" },
  "page.revenue.expense": { bn: "খরচ", en: "Expense" },

  "page.reports.title": { bn: "অ্যাডভান্সড রিপোর্ট", en: "Advanced Reports" },
  "page.reports.subtitle": { bn: "ব্যবসার সম্পূর্ণ বিশ্লেষণ ও রিপোর্ট", en: "Complete business analysis & reports" },
  "page.reports.profit_loss": { bn: "লাভ-ক্ষতি বিবরণী", en: "Profit & Loss Statement" },
  "page.reports.client_revenue": { bn: "ক্লায়েন্ট অনুযায়ী আয়", en: "Revenue by Client" },
  "page.reports.product_performance": { bn: "প্রোডাক্ট পারফরম্যান্স", en: "Product Performance" },
  "page.reports.monthly_summary": { bn: "মাসিক সারাংশ", en: "Monthly Summary" },

  // Date ranges
  "date.3m": { bn: "৩ মাস", en: "3 Months" },
  "date.6m": { bn: "৬ মাস", en: "6 Months" },
  "date.12m": { bn: "১ বছর", en: "1 Year" },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem("app-language") as Language) || "bn";
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app-language", lang);
  }, []);

  const t = useCallback((key: string): string => {
    return translations[key]?.[language] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useTranslation must be used within LanguageProvider");
  return context;
}
