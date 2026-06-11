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
    <div className="min-h-screen bg-gray-50/30 dark:bg-[#05020d] text-foreground font-sans selection:bg-primary/30">
      {/* Premium Hero Section */}
      <div className="relative overflow-hidden border-b border-primary/10">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-background to-blue-600/5 -z-10" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 blur-3xl rounded-full opacity-50 -z-10" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/10 blur-3xl rounded-full opacity-50 -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge className="mb-6 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 backdrop-blur-sm px-4 py-1.5 text-sm" variant="secondary">
              <Zap className="h-4 w-4 mr-2 text-amber-500" /> Premium IT & Security Solutions
            </Badge>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400"
          >
            Empowering Your Business <br/> With Smart Tech
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            From professional CCTV installation to advanced server setups, our certified technicians deliver fast, reliable, and cutting-edge services.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.5, delay: 0.3 }}
            className="max-w-xl mx-auto relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-500 rounded-full blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative flex items-center">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search services (e.g. CCTV, Networking)..." 
                className="pl-12 h-14 text-base rounded-full shadow-lg bg-background/80 backdrop-blur-xl border-primary/20 focus-visible:ring-primary/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Trust & Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: "Fast Response", desc: "Quick support when you need it most", icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10" },
            { title: "Certified Experts", desc: "Highly trained IT & Security professionals", icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { title: "Quality Guarantee", desc: "100% satisfaction on all our services", icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10" }
          ].map((feature, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              key={i} 
              className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-white/[0.02] border border-border/50 hover:shadow-md transition-shadow"
            >
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${feature.bg}`}>
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
              </div>
              <div>
                <h3 className="font-bold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        
        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeCategory === cat 
                ? "bg-primary text-white shadow-md shadow-primary/20 scale-105" 
                : "bg-white dark:bg-white/5 border border-border hover:border-primary/50 text-foreground hover:text-primary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Services Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
            <p className="text-lg font-medium">Loading premium services...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bg-white dark:bg-white/[0.02] rounded-3xl border border-dashed border-border shadow-sm">
            <Wrench className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-2xl font-bold mb-2">No services found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">We couldn't find any services matching your filters. Please try another category or search term.</p>
            {(search || activeCategory !== "All") && (
              <Button onClick={() => { setSearch(""); setActiveCategory("All"); }} className="mt-6 rounded-full">
                Clear Filters
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence>
              {filteredServices.map((service) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  key={service.id}
                >
                  <Card className="flex flex-col h-full overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 bg-white/80 dark:bg-[#0a0616]/80 backdrop-blur-xl border-border/60 hover:border-primary/40 group">
                    {service.image_url ? (
                      <div className="h-52 w-full overflow-hidden bg-muted relative">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                        <img 
                          src={service.image_url} 
                          alt={service.name} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <Badge className="absolute bottom-3 left-3 z-20 bg-primary/90 hover:bg-primary text-white border-none shadow-lg backdrop-blur-md">
                          {service.category || "General"}
                        </Badge>
                      </div>
                    ) : (
                      <div className="h-52 w-full bg-gradient-to-br from-primary/5 to-primary/10 flex flex-col items-center justify-center text-primary relative overflow-hidden">
                        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:16px_16px]" />
                        <CategoryIcon category={service.category} className="h-20 w-20 mb-3 opacity-40 group-hover:scale-110 transition-transform duration-500 group-hover:opacity-60" />
                        <Badge className="absolute bottom-3 left-3 z-20 bg-background/80 text-foreground border-border/50 backdrop-blur-md">
                          {service.category || "Service"}
                        </Badge>
                      </div>
                    )}
                    
                    <CardHeader className="flex-none pt-5 pb-2">
                      <div className="flex justify-between items-start mb-2">
                        <CardTitle className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">{service.name}</CardTitle>
                      </div>
                      <div className="font-extrabold text-lg bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600 dark:from-primary dark:to-blue-400">
                        {service.price > 0 ? `৳${service.price.toLocaleString()}` : "Ask for Price"}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="flex-grow">
                      <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
                        {service.description || "Top-tier professional service tailored to your business needs."}
                      </p>
                    </CardContent>
                    
                    <CardFooter className="pt-4 pb-5 border-t border-border/30 bg-muted/10">
                      <Dialog open={openDialog === service.id} onOpenChange={(open) => setOpenDialog(open ? service.id : null)}>
                        <DialogTrigger asChild>
                          <Button className="w-full rounded-xl h-11 font-semibold group/btn overflow-hidden relative">
                            <span className="relative z-10 flex items-center">
                              Request Service
                              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                            </span>
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-in-out" />
                          </Button>
                        </DialogTrigger>
                        
                        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto rounded-2xl border-border/50 backdrop-blur-3xl bg-background/95">
                          <DialogHeader>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                              <Zap className="h-5 w-5 text-amber-500" />
                              Request {service.name}
                            </DialogTitle>
                            <DialogDescription className="text-base">
                              Fill out the form below and our certified team will contact you to confirm the service details.
                            </DialogDescription>
                          </DialogHeader>
                          
                          <form onSubmit={(e) => handleSubmit(e, service)} className="space-y-4 mt-4">
                            <div className="space-y-2">
                              <Label htmlFor="name" className="font-semibold">Your Name <span className="text-destructive">*</span></Label>
                              <Input 
                                id="name" 
                                placeholder="John Doe" 
                                className="h-11 rounded-xl bg-muted/50 border-transparent focus-visible:bg-background"
                                value={form.customer_name}
                                onChange={(e) => setForm({...form, customer_name: e.target.value})}
                                required
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="phone" className="font-semibold">Phone Number <span className="text-destructive">*</span></Label>
                                <Input 
                                  id="phone" 
                                  placeholder="017xxxxxxxx" 
                                  className="h-11 rounded-xl bg-muted/50 border-transparent focus-visible:bg-background"
                                  value={form.phone}
                                  onChange={(e) => setForm({...form, phone: e.target.value})}
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="email" className="font-semibold">Email (Optional)</Label>
                                <Input 
                                  id="email" 
                                  type="email" 
                                  placeholder="john@example.com" 
                                  className="h-11 rounded-xl bg-muted/50 border-transparent focus-visible:bg-background"
                                  value={form.email}
                                  onChange={(e) => setForm({...form, email: e.target.value})}
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="desc" className="font-semibold">Additional Details</Label>
                              <Textarea 
                                id="desc" 
                                placeholder="Please tell us about your requirement..." 
                                rows={3}
                                className="rounded-xl bg-muted/50 border-transparent focus-visible:bg-background resize-none"
                                value={form.description}
                                onChange={(e) => setForm({...form, description: e.target.value})}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="date" className="font-semibold">Preferred Date (Optional)</Label>
                                <Input 
                                  id="date" 
                                  type="date" 
                                  className="h-11 rounded-xl bg-muted/50 border-transparent focus-visible:bg-background"
                                  value={form.preferred_date}
                                  onChange={(e) => setForm({...form, preferred_date: e.target.value})}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="urgency" className="font-semibold">Urgency</Label>
                                <Select 
                                  value={form.urgency} 
                                  onValueChange={(val) => setForm({...form, urgency: val})}
                                >
                                  <SelectTrigger id="urgency" className="h-11 rounded-xl bg-muted/50 border-transparent focus-visible:bg-background">
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

                            <div className="bg-primary/5 p-4 rounded-xl flex items-start gap-3 mt-4 border border-primary/10">
                              <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                              <p className="text-sm text-muted-foreground">
                                Our support team typically responds within <strong className="text-foreground">2 hours</strong>. For emergencies, please use the WhatsApp button on the bottom right.
                              </p>
                            </div>

                            <Button 
                              type="submit" 
                              className="w-full h-12 rounded-xl text-base font-bold mt-4 shadow-lg shadow-primary/20" 
                              disabled={submitRequest.isPending}
                            >
                              {submitRequest.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting Request...
                                </>
                              ) : (
                                "Submit Request"
                              )}
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </CardFooter>
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
        transition={{ delay: 1, type: "spring" }}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white px-5 py-3.5 rounded-full shadow-2xl hover:shadow-[#25D366]/40 transition-all duration-300 hover:-translate-y-1 group"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="font-bold hidden md:block">WhatsApp Support</span>
        
        {/* Pulse effect */}
        <span className="absolute -inset-2 rounded-full border-2 border-[#25D366] opacity-0 group-hover:animate-ping" />
      </motion.a>

    </div>
  );
}
