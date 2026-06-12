import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Wrench, Clock, ShieldCheck, ArrowRight, Loader2, Server, Monitor, Network, Fingerprint, Search, Zap, CheckCircle2, Phone, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { SEOHead } from "@/components/SEOHead";

// Fallback icons for categories
const CategoryIcon = ({ category, className }: { category: string, className?: string }) => {
  const cat = category?.toLowerCase() || "";
  if (cat.includes("cctv")) return <ShieldCheck className={className} />;
  if (cat.includes("computer")) return <Monitor className={className} />;
  if (cat.includes("network")) return <Network className={className} />;
  if (cat.includes("server")) return <Server className={className} />;
  if (cat.includes("attendance")) return <Fingerprint className={className} />;
  return <Wrench className={className} />;
};

const CATEGORIES = ["All", "CCTV", "Computer", "Network", "Server", "Attendance", "IT Support"];

export default function PublicServices() {
  const { toast } = useToast();
  const { settings } = useCompanySettings();
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  
  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    email: "",
    description: "",
    preferred_date: "",
    urgency: "normal",
  });

  // Fetch active services
  const { data: services = [], isLoading } = useQuery({
    queryKey: ["public-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Mutation to submit service request
  const submitRequest = useMutation({
    mutationFn: async (service: any) => {
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
      setOpenDialog(null);
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

  const handleSubmit = (e: React.FormEvent, service: any) => {
    e.preventDefault();
    if (!form.customer_name || !form.phone) {
      toast({ title: "Name and Phone are required", variant: "destructive" });
      return;
    }
    submitRequest.mutate(service);
  };

  const filteredServices = services.filter((s) => {
    const matchesSearch = s.name?.toLowerCase().includes(search.toLowerCase()) || s.category?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All" || s.category?.toLowerCase().includes(activeCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  const whatsappNumber = settings?.whatsapp_number || "8801919060590";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hello, I need an urgent IT/CCTV service.")}`;

  return (
    <div className="min-h-screen bg-[#080510] text-white overflow-hidden relative">
      <SEOHead 
        title="Our Services | Premium IT & Security Solutions"
        description="Explore our premium IT, networking, and security solutions. Professional CCTV installation, server setups, and network support."
      />
      {/* Premium Ambient Background */}
      <div className="absolute top-0 left-0 right-0 h-[600px] w-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-[800px] h-[800px] bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-transparent rounded-full blur-[100px]" />
        <div className="absolute -top-20 -left-20 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500/10 via-blue-500/5 to-transparent rounded-full blur-[80px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] dark:opacity-[0.05] mix-blend-overlay" />
      </div>

      {/* Premium Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12 text-center relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-gray-900 dark:text-white leading-[1.1]">
            Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Services</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10 font-medium">
            Explore our premium range of IT, networking, and security solutions.
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl mx-auto relative group"
        >
          <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition duration-700 pointer-events-none"></div>
          <div className="relative flex items-center bg-white dark:bg-[#111118] p-2 rounded-full border border-gray-200 dark:border-gray-800 shadow-lg shadow-black/5 dark:shadow-black/20">
            <div className="pl-4 pr-2">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input 
              placeholder="Search for a service..." 
              className="flex-1 h-12 text-base border-0 focus-visible:ring-0 bg-transparent px-2 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button className="h-12 px-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">
              Search
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Trust & Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: "Fast Response", desc: "Quick support when you need it most", icon: Clock, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
            { title: "Certified Experts", desc: "Highly trained IT & Security professionals", icon: ShieldCheck, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
            { title: "Quality Guarantee", desc: "100% satisfaction on all our services", icon: CheckCircle2, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20" }
          ].map((feature, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
              key={i} 
              className="flex items-center gap-5 p-5 rounded-3xl bg-white/60 dark:bg-[#111118]/60 backdrop-blur-xl border border-gray-100 dark:border-gray-800/60 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${feature.bg}`}>
                <feature.icon className={`h-7 w-7 ${feature.color}`} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">{feature.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 pt-8">
        
        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-3 justify-center mb-12">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 relative overflow-hidden group ${
                  isActive 
                  ? "text-white shadow-lg shadow-blue-600/20 scale-105" 
                  : "bg-white dark:bg-[#111118] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {isActive && <div className="absolute inset-0 bg-blue-600 z-0" />}
                <span className="relative z-10">{cat}</span>
              </button>
            )
          })}
        </div>

        {/* Services Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="h-10 w-10 animate-spin mb-4 text-blue-600" />
            <p className="text-lg font-medium text-gray-500">Loading premium services...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 bg-white/50 dark:bg-[#111118]/50 backdrop-blur-sm rounded-[3rem] border border-dashed border-gray-300 dark:border-gray-800">
            <Wrench className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-700 mb-6" />
            <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">No services found</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">We couldn't find any services matching your filters. Please try another category or search term.</p>
            {(search || activeCategory !== "All") && (
              <Button onClick={() => { setSearch(""); setActiveCategory("All"); }} className="mt-8 rounded-full h-11 px-6">
                Clear Filters
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredServices.map((service, i) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  key={service.id}
                  className="h-full"
                >
                  <Card className="flex flex-col h-full overflow-hidden border-0 bg-white dark:bg-[#111118] shadow-sm hover:shadow-2xl hover:shadow-blue-900/5 dark:hover:shadow-blue-900/20 transition-all duration-500 group rounded-[2rem] ring-1 ring-gray-100 dark:ring-gray-800/60">
                    {service.image_url ? (
                      <div className="h-56 w-full overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent z-10" />
                        <img 
                          src={service.image_url} 
                          alt={service.name} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute bottom-4 left-4 z-20">
                          <Badge className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/20 font-medium px-3 py-1 text-xs">
                            {service.category || "General"}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="h-56 w-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 flex flex-col items-center justify-center relative overflow-hidden group-hover:from-blue-100 group-hover:to-indigo-100 dark:group-hover:from-blue-900/40 dark:group-hover:to-indigo-900/40 transition-colors duration-500">
                        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3Ccircle cx='13' cy='13' r='1'/%3E%3C/g%3E%3C/svg%3E\")" }} />
                        <div className="relative z-10 bg-white dark:bg-[#111118] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                          <CategoryIcon category={service.category} className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="absolute bottom-4 left-4 z-20">
                          <Badge className="bg-white/80 dark:bg-black/50 text-gray-900 dark:text-white backdrop-blur-md border border-gray-200 dark:border-gray-700 font-medium px-3 py-1 text-xs">
                            {service.category || "Service"}
                          </Badge>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex-grow p-6">
                      <div className="flex flex-col h-full">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{service.name}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed line-clamp-3 mb-6 flex-grow">
                          {service.description || "Top-tier professional service tailored to your business needs. Designed for reliability and performance."}
                        </p>
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800/60 mt-auto flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Starting at</span>
                          <span className="font-extrabold text-xl text-gray-900 dark:text-white">
                            {service.price > 0 ? `৳${service.price.toLocaleString()}` : "Ask Price"}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 pt-0">
                      <Dialog open={openDialog === service.id} onOpenChange={(open) => setOpenDialog(open ? service.id : null)}>
                        <DialogTrigger asChild>
                          <Button className="w-full rounded-xl h-12 font-semibold bg-gray-50 hover:bg-blue-600 text-gray-900 hover:text-white dark:bg-gray-800 dark:text-white dark:hover:bg-blue-600 transition-all duration-300 group/btn">
                            Request Service
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                          </Button>
                        </DialogTrigger>
                        
                        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto rounded-[2rem] border-0 shadow-2xl p-0 overflow-hidden bg-white dark:bg-[#111118]">
                          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-6 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                              <CategoryIcon category={service.category} className="h-32 w-32 -mt-10 -mr-10" />
                            </div>
                            <DialogHeader className="relative z-10 text-left">
                              <DialogTitle className="text-2xl font-bold text-white mb-2">Request {service.name}</DialogTitle>
                              <DialogDescription className="text-blue-100 text-sm">
                                Fill out the details below. Our technical experts will get back to you shortly to discuss requirements.
                              </DialogDescription>
                            </DialogHeader>
                          </div>
                          
                          <form onSubmit={(e) => handleSubmit(e, service)} className="p-6 space-y-5">
                            <div className="space-y-1.5">
                              <Label htmlFor="name" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Full Name <span className="text-red-500">*</span></Label>
                              <Input 
                                id="name" 
                                placeholder="e.g. John Doe" 
                                className="h-12 rounded-xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus-visible:ring-blue-600"
                                value={form.customer_name}
                                onChange={(e) => setForm({...form, customer_name: e.target.value})}
                                required
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Phone <span className="text-red-500">*</span></Label>
                                <Input 
                                  id="phone" 
                                  placeholder="017xxxxxxxx" 
                                  className="h-12 rounded-xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus-visible:ring-blue-600"
                                  value={form.phone}
                                  onChange={(e) => setForm({...form, phone: e.target.value})}
                                  required
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Email <span className="text-gray-400 font-normal">(Optional)</span></Label>
                                <Input 
                                  id="email" 
                                  type="email" 
                                  placeholder="john@email.com" 
                                  className="h-12 rounded-xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus-visible:ring-blue-600"
                                  value={form.email}
                                  onChange={(e) => setForm({...form, email: e.target.value})}
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="desc" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Additional Context</Label>
                              <Textarea 
                                id="desc" 
                                placeholder="Any specific requirements or details..." 
                                rows={3}
                                className="rounded-xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus-visible:ring-blue-600 resize-none py-3"
                                value={form.description}
                                onChange={(e) => setForm({...form, description: e.target.value})}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label htmlFor="date" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Preferred Date</Label>
                                <Input 
                                  id="date" 
                                  type="date" 
                                  className="h-12 rounded-xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus-visible:ring-blue-600"
                                  value={form.preferred_date}
                                  onChange={(e) => setForm({...form, preferred_date: e.target.value})}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="urgency" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Priority</Label>
                                <Select 
                                  value={form.urgency} 
                                  onValueChange={(val) => setForm({...form, urgency: val})}
                                >
                                  <SelectTrigger id="urgency" className="h-12 rounded-xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus-visible:ring-blue-600">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl border-gray-200 dark:border-gray-800 shadow-xl">
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
                              {submitRequest.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...
                                </>
                              ) : (
                                "Submit Request"
                              )}
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Floating WhatsApp CTA */}
      <motion.a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 20 }}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1DA851] text-white px-5 py-4 rounded-full shadow-2xl hover:shadow-[#25D366]/30 transition-all duration-300 hover:-translate-y-1 group border border-[#25D366]/50"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="font-bold hidden md:block">Chat on WhatsApp</span>
        <span className="absolute -inset-2 rounded-full border-2 border-[#25D366] opacity-0 group-hover:animate-ping" />
      </motion.a>

    </div>
  );
}
