import { X, ArrowRightLeft, Comparison } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CompareDrawerProps {
  items: any[];
  onRemove: (id: string) => void;
  onCompare: () => void;
  onClear: () => void;
  isDark: boolean;
  lang: "bn" | "en";
}

export function CompareDrawer({ items, onRemove, onCompare, onClear, isDark, lang }: CompareDrawerProps) {
  if (items.length === 0) return null;

  return (
    <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl p-4 rounded-2xl shadow-2xl border backdrop-blur-xl animate-in fade-in slide-in-from-bottom-10 duration-500 ${
      isDark ? "bg-[#0f0a1f]/90 border-white/10" : "bg-white/90 border-gray-200"
    }`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
          {items.map((item) => (
            <div key={item.id} className="relative group flex-shrink-0">
              <img 
                src={item.image_url} 
                alt={item.name} 
                className="h-12 w-12 rounded-lg object-cover ring-2 ring-primary/20"
              />
              <button
                onClick={() => onRemove(item.id)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, i) => (
            <div key={i} className={`h-12 w-12 rounded-lg border-2 border-dashed flex items-center justify-center ${
              isDark ? "border-white/10 text-white/10" : "border-gray-200 text-gray-300"
            }`}>
              <Plus className="h-4 w-4" />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className={isDark ? "text-white/60 hover:text-white" : "text-gray-500"}
          >
            {lang === "bn" ? "মুছে ফেলুন" : "Clear"}
          </Button>
          <Button
            onClick={onCompare}
            disabled={items.length < 2}
            className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 rounded-xl gap-2 h-10 px-6 font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          >
            <ArrowRightLeft className="h-4 w-4" />
            {lang === "bn" ? "তুলনা করুন" : "Compare"}
          </Button>
        </div>
      </div>
    </div>
  );
}

import { Plus } from "lucide-react";
