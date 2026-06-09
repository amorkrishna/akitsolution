import { useState, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Sparkles, TrendingUp, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface InsightData {
  todayProfit: number;
  todaySalesRevenue: number;
  pendingOrders: number;
  lowStockCount: number;
  outOfStockCount: number;
  unreadMessages: number;
  totalClients: number;
}

export function AIDashboardInsights({ data }: { data: InsightData }) {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API Key missing");
      }

      // Read from session storage to avoid spamming the API on every nav
      const cached = sessionStorage.getItem("dashboard_ai_insights");
      const cacheTime = sessionStorage.getItem("dashboard_ai_insights_time");
      
      if (!forceRefresh && cached && cacheTime) {
        const isFresh = new Date().getTime() - Number(cacheTime) < 1000 * 60 * 30; // 30 mins
        if (isFresh) {
          setInsights(cached);
          setLoading(false);
          return;
        }
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
        Act as an expert retail business analyst for an IT & CCTV retail store in Bangladesh.
        Review the following real-time dashboard metrics and provide a 3-bullet point executive summary.
        Keep it extremely concise, professional, and actionable. Do not use markdown headers, just 3 bullet points.
        Use Bengali language.
        
        Metrics today:
        - Net Profit Today: ৳${data.todayProfit}
        - Total Sales Revenue Today: ৳${data.todaySalesRevenue}
        - Pending Online Orders: ${data.pendingOrders}
        - Low Stock Items: ${data.lowStockCount}
        - Out of Stock Items: ${data.outOfStockCount}
        - Unread Customer Messages: ${data.unreadMessages}
        - Total Clients: ${data.totalClients}
        
        Rules:
        - If profit is negative, suggest cost cutting or pushing sales.
        - If there are pending orders or unread messages, emphasize customer service urgency.
        - If stock is low, remind about inventory management.
        - Add a relevant emoji at the start of each bullet point.
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      setInsights(responseText);
      sessionStorage.setItem("dashboard_ai_insights", responseText);
      sessionStorage.setItem("dashboard_ai_insights_time", new Date().getTime().toString());
    } catch (err: any) {
      console.error("AI Insight Error:", err);
      setError(err.message || "Failed to generate AI insights.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Adding a slight delay so it doesn't block initial dashboard render
    const timer = setTimeout(() => {
      fetchInsights();
    }, 1000);
    return () => clearTimeout(timer);
  }, [data.todayProfit, data.pendingOrders]);

  if (error && !insights) return null; // Hide completely if API key is missing to not clutter dashboard

  return (
    <Card className="glass-card border-primary/20 relative overflow-hidden group">
      {/* Subtle animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-accent/5 opacity-50" />
      
      <CardContent className="p-4 sm:p-5 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-md flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            </div>
            <h3 className="font-semibold text-sm flex items-center gap-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
              AI Business Insights
            </h3>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors"
            onClick={() => fetchInsights(true)}
            disabled={loading}
            title="Refresh Insights"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {loading && !insights ? (
          <div className="space-y-2 mt-2">
            <div className="h-3 w-[90%] bg-muted/60 animate-pulse rounded"></div>
            <div className="h-3 w-[75%] bg-muted/60 animate-pulse rounded"></div>
            <div className="h-3 w-[85%] bg-muted/60 animate-pulse rounded"></div>
          </div>
        ) : (
          <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {insights}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
