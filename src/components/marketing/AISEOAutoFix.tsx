import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
}

export function AISEOAutoFix({ products }: { products: any[] }) {
  const [isFixing, setIsFixing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);

  const handleAutoFix = async () => {
    // Find products without good descriptions
    const missingDesc = products?.filter(p => !p.description || p.description.length < 20) || [];
    
    if (missingDesc.length === 0) {
      toast.success("All products already have descriptions. SEO is perfect!");
      return;
    }

    setTotal(missingDesc.length);
    setProgress(0);
    setIsFixing(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("VITE_GEMINI_API_KEY is missing");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      let fixedCount = 0;

      for (const product of missingDesc) {
        try {
          const prompt = `
            Act as an expert SEO copywriter.
            Write a 2-3 sentence engaging, professional SEO description for a product.
            Language: Bengali (বাংলা)
            Product Name: ${product.name}
            Category: ${product.category || 'IT & CCTV'}
            Price: ${product.price} BDT
            
            Rules:
            - Make it sound premium and persuasive.
            - Include keywords related to the product and "Bangladesh".
            - Do not include markdown formatting or quotes. Just the raw text.
          `;

          const result = await model.generateContent(prompt);
          const seoDescription = result.response.text().trim();

          if (seoDescription) {
            const { error } = await supabase
              .from('products')
              .update({ description: seoDescription })
              .eq('id', product.id);

            if (!error) fixedCount++;
          }
        } catch (err) {
          console.error(`Failed to generate SEO for product ${product.id}`, err);
        }
        
        setProgress(prev => prev + 1);
        // Small delay to prevent rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (fixedCount > 0) {
        toast.success(`Successfully auto-generated ${fixedCount} SEO descriptions!`);
      } else {
        toast.error("Failed to generate descriptions. Check console for details.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start AI Auto-Fix");
    } finally {
      setIsFixing(false);
    }
  };

  const missingCount = products?.filter(p => !p.description || p.description.length < 20)?.length || 0;

  if (missingCount === 0) return null;

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <h4 className="font-semibold text-primary flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI SEO Auto-Fix
        </h4>
        <p className="text-sm text-muted-foreground mt-1">
          {missingCount} products are missing SEO descriptions. Let Gemini AI write them for you.
        </p>
      </div>
      
      <div className="flex items-center gap-3 w-full sm:w-auto">
        {isFixing ? (
          <div className="flex items-center gap-3 flex-1 sm:flex-none">
            <span className="text-xs font-medium">{progress} / {total}</span>
            <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300" 
                style={{ width: `${(progress / total) * 100}%` }} 
              />
            </div>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        ) : (
          <Button onClick={handleAutoFix} className="w-full sm:w-auto gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
            <Sparkles className="h-4 w-4" />
            Auto-Fix {missingCount} Products
          </Button>
        )}
      </div>
    </div>
  );
}
