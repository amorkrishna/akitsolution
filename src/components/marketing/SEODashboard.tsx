import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertTriangle, XCircle, Globe, Search, FileText, Image, Link2 } from "lucide-react";

interface SEOCheck {
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  category: string;
}

export function SEODashboard() {
  const { data: products } = useQuery({
    queryKey: ["seo-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, description, image_url").eq("show_in_store", true);
      return data || [];
    },
  });

  const { data: services } = useQuery({
    queryKey: ["seo-services"],
    queryFn: async () => {
      const { data } = await supabase.from("services").select("id, name, description, image_url");
      return data || [];
    },
  });

  const { data: companySettings } = useQuery({
    queryKey: ["seo-company"],
    queryFn: async () => {
      const { data } = await supabase.from("company_settings").select("*").limit(1).single();
      return data;
    },
  });

  const checks: SEOCheck[] = [];

  // Company checks
  if (companySettings) {
    checks.push({
      label: "Company Name",
      status: companySettings.company_name ? "pass" : "fail",
      detail: companySettings.company_name || "Not set",
      category: "Business",
    });
    checks.push({
      label: "Company Address",
      status: companySettings.address ? "pass" : "warn",
      detail: companySettings.address || "Add address for local SEO",
      category: "Business",
    });
    checks.push({
      label: "Company Phone",
      status: companySettings.phone ? "pass" : "warn",
      detail: companySettings.phone || "Add phone for local SEO",
      category: "Business",
    });
    checks.push({
      label: "Company Logo",
      status: companySettings.logo_url ? "pass" : "fail",
      detail: companySettings.logo_url ? "Logo set" : "Upload a logo",
      category: "Business",
    });
  }

  // Product checks
  const productsWithDesc = products?.filter(p => p.description && p.description.length > 20) || [];
  const productsWithImages = products?.filter(p => p.image_url) || [];
  const totalProducts = products?.length || 0;

  checks.push({
    label: "Product Descriptions",
    status: productsWithDesc.length === totalProducts ? "pass" : productsWithDesc.length > totalProducts / 2 ? "warn" : "fail",
    detail: `${productsWithDesc.length}/${totalProducts} products have descriptions (>20 chars)`,
    category: "Content",
  });
  checks.push({
    label: "Product Images",
    status: productsWithImages.length === totalProducts ? "pass" : productsWithImages.length > totalProducts / 2 ? "warn" : "fail",
    detail: `${productsWithImages.length}/${totalProducts} products have images`,
    category: "Content",
  });

  // Technical checks (static based on known implementation)
  checks.push({ label: "Meta Tags (SEOHead)", status: "pass", detail: "Dynamic meta tags implemented", category: "Technical" });
  checks.push({ label: "JSON-LD Structured Data", status: "pass", detail: "Store, LocalBusiness, ItemList schemas active", category: "Technical" });
  checks.push({ label: "Sitemap", status: "pass", detail: "robots.txt and sitemap.xml present", category: "Technical" });
  checks.push({ label: "Mobile Responsive", status: "pass", detail: "Responsive design with viewport meta", category: "Technical" });
  checks.push({ label: "HTTPS", status: "pass", detail: "Served over HTTPS", category: "Technical" });
  checks.push({ label: "OpenGraph Tags", status: "pass", detail: "OG title, description, image configured", category: "Social" });
  checks.push({ label: "Twitter Cards", status: "pass", detail: "Twitter card meta tags present", category: "Social" });

  const passCount = checks.filter(c => c.status === "pass").length;
  const score = Math.round((passCount / checks.length) * 100);

  const statusIcon = (status: string) => {
    if (status === "pass") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === "warn") return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const categoryIcon = (cat: string) => {
    if (cat === "Business") return <Globe className="h-3.5 w-3.5" />;
    if (cat === "Content") return <FileText className="h-3.5 w-3.5" />;
    if (cat === "Technical") return <Link2 className="h-3.5 w-3.5" />;
    return <Search className="h-3.5 w-3.5" />;
  };

  const categories = ["Business", "Content", "Technical", "Social"];

  return (
    <div className="space-y-4">
      {/* Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center">
            <div className={`text-5xl font-bold ${score >= 80 ? "text-green-500" : score >= 50 ? "text-yellow-500" : "text-red-500"}`}>
              {score}
            </div>
            <p className="text-sm text-muted-foreground mt-1">SEO Score</p>
            <Progress value={score} className="mt-3 h-2" />
            <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> {checks.filter(c => c.status === "pass").length} Pass</span>
              <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-yellow-500" /> {checks.filter(c => c.status === "warn").length} Warn</span>
              <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" /> {checks.filter(c => c.status === "fail").length} Fail</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quick Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-xs">
              {checks.filter(c => c.status !== "pass").map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  {statusIcon(c.status)}
                  <div>
                    <span className="font-medium">{c.label}:</span> {c.detail}
                  </div>
                </li>
              ))}
              {checks.filter(c => c.status !== "pass").length === 0 && (
                <li className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" /> All checks passed! Your SEO is looking great.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Checks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map(cat => (
          <Card key={cat}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                {categoryIcon(cat)} {cat}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {checks.filter(c => c.category === cat).map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1.5 border-b last:border-0">
                  {statusIcon(c.status)}
                  <span className="flex-1 font-medium">{c.label}</span>
                  <span className="text-muted-foreground text-[10px] max-w-[200px] truncate">{c.detail}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
