import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Wrench, ArrowLeft, Loader2, CheckCircle2, ShieldCheck, Clock, Server, Monitor, Network, Fingerprint } from "lucide-react";
import { motion } from "framer-motion";
import { SEOHead } from "@/components/SEOHead";
import { TopBar } from "@/components/store/TopBar";

const CategoryIcon = ({ category, className }: { category: string, className?: string }) => {
  const cat = category?.toLowerCase() || "";
  if (cat.includes("cctv")) return <ShieldCheck className={className} />;
  if (cat.includes("computer")) return <Monitor className={className} />;
  if (cat.includes("network")) return <Network className={className} />;
  if (cat.includes("server")) return <Server className={className} />;
  if (cat.includes("attendance")) return <Fingerprint className={className} />;
  return <Wrench className={className} />;
};

export default function PublicServiceDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [openDialog, setOpenDialog] = useState(false);
  
  const [lang, setLang] = useState<"bn" | "en">("en");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light";
    return saved || "dark";
  });

  const isDark = theme === "dark";

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [isDark, theme]);

  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    email: "",
    description: "",
    preferred_date: "",
    urgency: "normal",
  });

  const { data: service, isLoading } = useQuery({
    queryKey: ["service", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!service) return;
      const payload = {
        customer_name: form.customer_name,
        phone: form.phone,
        email: form.email || null,
        category: service.category || "Other",
        description: `Service Requested: ${service.name}\n\nAdditional Details: ${form.description}`,
        preferred_date: form.preferred_date || null,
        urgency: form.urgency,
        status: "pending",
      };

      const { error } = await supabase.from("service_requests").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Service Request Submitted!",
        description: "We will get back to you shortly.",
      });
      setOpenDialog(false);
      setForm({
        customer_name: "",
        phone: "",
        email: "",
        description: "",
        preferred_date: "",
        urgency: "normal",
      });
    },
    onError: (e: any) => {
      toast({
        title: "Submission Failed",
        description: e.message || "Could not submit your request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name || !form.phone) {
      toast({ title: "Name and Phone are required", variant: "destructive" });
      return;
    }
    submitRequest.mutate();
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#080510]' : 'bg-gray-50'}`}>
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${isDark ? 'bg-[#080510] text-white' : 'bg-gray-50 text-gray-900'}`}>
        <h2 className="text-2xl font-bold mb-4">Service not found</h2>
        <Button onClick={() => navigate('/our-services')}>Back to Services</Button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 relative ${isDark ? 'bg-[#080510] text-white' : 'bg-gray-50 text-gray-900'}`}>
      <SEOHead 
        title={`${service.name} | AK IT Solution Dhaka`}
        description={service.description?.substring(0, 160) || `Professional ${service.name} service by AK IT Solution in Dhaka, Bangladesh.`}
        keywords={`${service.category}, ${service.name}, Best ${service.category} in Dhaka, ${service.name} service near me, Top IT company in Motijheel, ${service.category} in Banani, ${service.category} in Uttara, IT support service Dhanmondi, Server configuration Dhaka BD`}
      />
      
      <div className="relative z-50">
        <TopBar lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} isDark={isDark} />
        <div className={`border-b ${isDark ? 'border-white/5 bg-[#0f0a1f]/80' : 'border-gray-200 bg-white/80'} backdrop-blur-md`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate('/our-services')} className={isDark ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {lang === "bn" ? "সব সার্ভিস" : "All Services"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            {service.image_url ? (
              <div className="rounded-[2rem] overflow-hidden shadow-2xl relative h-[400px] lg:h-[500px]">
                <img src={service.image_url} alt={service.name} className="w-full h-full object-cover" />
                <div className="absolute top-6 left-6">
                  <Badge className="bg-white/90 text-gray-900 font-semibold px-4 py-1.5 text-sm shadow-lg border-0 backdrop-blur-md">
                    {service.category}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="rounded-[2rem] h-[400px] lg:h-[500px] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center shadow-xl border border-gray-200 dark:border-gray-800">
                <CategoryIcon category={service.category} className="h-32 w-32 text-blue-600 dark:text-blue-400 opacity-80" />
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="space-y-8">
            <div>
              <h1 className="text-4xl lg:text-5xl font-extrabold mb-4 leading-tight">{service.name}</h1>
              <p className={`text-lg leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {service.description || "High-quality professional service tailored to meet your business needs effectively."}
              </p>
            </div>

            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#111118] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-500 font-medium">{lang === "bn" ? "প্রাইস শুরু" : "Starting at"}</span>
                <span className="text-3xl font-black text-blue-600 dark:text-blue-400">
                  {service.price > 0 ? `৳${service.price.toLocaleString()}` : "Ask for Price"}
                </span>
              </div>
              
              <ul className="space-y-3 mb-8">
                {["Professional & Certified Technicians", "Fast Response & Setup", "Quality Assurance Guarantee", "Post-Service Support"].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className={isDark ? "text-gray-300" : "text-gray-700"}>{feature}</span>
                  </li>
                ))}
              </ul>

              <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full h-14 text-lg font-bold rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02]">
                    {lang === "bn" ? "সার্ভিসটি বুক করুন" : "Book This Service Now"}
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto rounded-[2rem] border-0 shadow-2xl p-0 bg-white dark:bg-[#111118]">
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-6 text-white relative">
                    <DialogHeader className="text-left z-10 relative">
                      <DialogTitle className="text-2xl font-bold text-white mb-2">Book {service.name}</DialogTitle>
                      <DialogDescription className="text-blue-100 text-sm">
                        Please provide your contact information. Our team will get back to you shortly.
                      </DialogDescription>
                    </DialogHeader>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="dark:text-gray-300">Full Name <span className="text-red-500">*</span></Label>
                      <Input 
                        id="name" 
                        placeholder="e.g. John Doe" 
                        className="h-12 rounded-xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                        value={form.customer_name}
                        onChange={(e) => setForm({...form, customer_name: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="dark:text-gray-300">Phone <span className="text-red-500">*</span></Label>
                        <Input 
                          id="phone" 
                          placeholder="017xxxxxxxx" 
                          className="h-12 rounded-xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                          value={form.phone}
                          onChange={(e) => setForm({...form, phone: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="dark:text-gray-300">Email <span className="text-gray-400 text-xs font-normal">(Optional)</span></Label>
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="john@email.com" 
                          className="h-12 rounded-xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                          value={form.email}
                          onChange={(e) => setForm({...form, email: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="desc" className="dark:text-gray-300">Additional Context</Label>
                      <Textarea 
                        id="desc" 
                        placeholder="Any specific requirements or details..." 
                        rows={3}
                        className="rounded-xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 resize-none py-3"
                        value={form.description}
                        onChange={(e) => setForm({...form, description: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="date" className="dark:text-gray-300">Preferred Date</Label>
                        <Input 
                          id="date" 
                          type="date" 
                          className="h-12 rounded-xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                          value={form.preferred_date}
                          onChange={(e) => setForm({...form, preferred_date: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="urgency" className="dark:text-gray-300">Priority</Label>
                        <Select value={form.urgency} onValueChange={(val) => setForm({...form, urgency: val})}>
                          <SelectTrigger id="urgency" className="h-12 rounded-xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="emergency">Emergency</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-12 rounded-xl text-base font-bold mt-6 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20" 
                      disabled={submitRequest.isPending}
                    >
                      {submitRequest.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Confirm Request"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            
          </motion.div>
        </div>
      </div>
    </div>
  );
}
