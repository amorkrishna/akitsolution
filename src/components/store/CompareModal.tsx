import { X, Check, ShoppingCart } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CompareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: any[];
  isDark: boolean;
  lang: "bn" | "en";
  addToCart: (item: any) => void;
}

export function CompareModal({ open, onOpenChange, items, isDark, lang, addToCart }: CompareModalProps) {
  const t = {
    bn: {
      title: "পণ্য তুলনা",
      price: "মূল্য",
      category: "ক্যাটাগরি",
      brand: "ব্র্যান্ড",
      warranty: "ওয়ারেন্টি",
      specifications: "বৈশিষ্ট্যসমূহ",
      addToCart: "কার্টে যোগ করুন",
      buyNow: "এখনই কিনুন",
    },
    en: {
      title: "Product Comparison",
      price: "Price",
      category: "Category",
      brand: "Brand",
      warranty: "Warranty",
      specifications: "Specifications",
      addToCart: "Add to Cart",
      buyNow: "Buy Now",
    }
  }[lang];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-5xl w-[95vw] h-[90vh] overflow-hidden flex flex-col p-0 border-none ${
        isDark ? "bg-[#0f0a1f] text-white" : "bg-white text-gray-900"
      }`}>
        <DialogHeader className="p-6 border-b border-white/5 flex flex-row items-center justify-between">
          <DialogTitle className="text-2xl font-bold tracking-tight">{t.title}</DialogTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-x-auto p-6 custom-scrollbar">
          <div className="min-w-[800px]">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-1/5 p-4 text-left border-b border-white/5 font-medium text-muted-foreground">{lang === "bn" ? "বৈশিষ্ট্য" : "Feature"}</th>
                  {items.map((item) => (
                    <th key={item.id} className="w-1/4 p-4 text-center border-b border-white/5">
                      <div className="flex flex-col items-center gap-3">
                        <img 
                          src={item.image_url} 
                          alt={item.name} 
                          className="h-32 w-32 object-cover rounded-2xl shadow-xl ring-1 ring-white/10"
                        />
                        <div className="space-y-1">
                          <h3 className="font-bold text-sm line-clamp-2">{item.name}</h3>
                          <div className="text-primary font-black text-lg">৳{item.price.toLocaleString()}</div>
                        </div>
                        <Button 
                          onClick={() => { addToCart(item); onOpenChange(false); }}
                          className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 h-9 text-xs"
                        >
                          <ShoppingCart className="h-3 w-3" />
                          {t.addToCart}
                        </Button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="p-4 font-medium text-muted-foreground">{t.category}</td>
                  {items.map(item => (
                    <td key={item.id} className="p-4 text-center text-sm">{item.category}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 font-medium text-muted-foreground">{t.brand}</td>
                  {items.map(item => (
                    <td key={item.id} className="p-4 text-center text-sm">{item.brand || "N/A"}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 font-medium text-muted-foreground">{t.warranty}</td>
                  {items.map(item => (
                    <td key={item.id} className="p-4 text-center text-sm">
                      <div className="flex items-center justify-center gap-1.5 text-emerald-400">
                        <Check className="h-3.5 w-3.5" />
                        {item.warranty || (lang === "bn" ? "১ বছর" : "1 Year")}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 font-medium text-muted-foreground align-top">{t.specifications}</td>
                  {items.map(item => (
                    <td key={item.id} className="p-4 align-top">
                      <div className="space-y-2">
                        {item.description?.split('\n').slice(0, 5).map((line: string, i: number) => (
                          <div key={i} className="text-xs text-muted-foreground line-clamp-1 flex items-start gap-2">
                            <div className="h-1 w-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                            {line}
                          </div>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
