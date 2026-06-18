import { useState } from "react";
import { TopBar } from "@/components/store/TopBar";
import { SEOHead } from "@/components/SEOHead";
import { useTranslation } from "@/contexts/LanguageContext";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RepairTracker, RepairStatus } from "@/components/support/RepairTracker";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Settings, Wrench, Search, Clock, ArrowRight, Home, Building2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function SupportHub() {
  const { language: lang, setLanguage: setLang } = useTranslation();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const isDark = theme === 'dark';
  const { settings } = useCompanySettings();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [ticketQuery, setTicketQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticketResult, setTicketResult] = useState<any>(null);
  const [searched, setSearched] = useState(false);

  const handleTrackTicket = async () => {
    if (!ticketQuery.trim()) {
      toast({ title: "Error", description: "Please enter a valid ticket number.", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase
        .from('repair_tickets')
        .select('*')
        .eq('ticket_number', ticketQuery)
        .maybeSingle();
        
      if (error) throw error;
      
      setTicketResult(data);
      if (!data) {
        toast({ title: "Not Found", description: "No ticket found with this number.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error tracking ticket", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 relative ${isDark ? 'bg-[#080510] text-white' : 'bg-gray-50 text-gray-900'}`}>
      <SEOHead 
        title={lang === "bn" ? "সাপোর্ট এবং সার্ভিসিং | AK IT Solution" : "Support & Servicing | AK IT Solution"}
        description="Track your repair status, book doorstep service, and check warranty details at AK IT Solution."
        keywords="CCTV repair service Dhaka, Computer repair service, IT Support, AMC package BD, Doorstep IT service Dhaka"
      />
      
      <div className="relative z-50">
        <TopBar lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} isDark={isDark} />
        <div className={`border-b ${isDark ? 'border-white/5 bg-[#0f0a1f]/80' : 'border-gray-200 bg-white/80'} backdrop-blur-md`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className={isDark ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"}>
              <Home className="mr-2 h-4 w-4" />
              {lang === "bn" ? "হোমপেজে ফিরে যান" : "Back to Store"}
            </Button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 relative z-10">
        <div className="text-center mb-16">
          <h1 className={`text-4xl md:text-5xl font-extrabold tracking-tight mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {lang === "bn" ? "সাপোর্ট এবং সার্ভিসিং" : "Support & Servicing"}
          </h1>
          <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {lang === "bn" ? "আমরা আছি আপনার যেকোনো টেকনিক্যাল সমস্যার সমাধানে।" : "We're here to solve all your technical issues quickly."}
          </p>
        </div>

        <Tabs defaultValue="track" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-8 h-auto p-1 bg-white/10 dark:bg-black/20 backdrop-blur-sm rounded-xl">
            <TabsTrigger value="track" className="py-3 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Search className="w-4 h-4 mr-2" /> {lang === "bn" ? "স্ট্যাটাস চেক" : "Track Status"}
            </TabsTrigger>
            <TabsTrigger value="doorstep" className="py-3 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Home className="w-4 h-4 mr-2" /> {lang === "bn" ? "হোম সার্ভিস" : "Doorstep Service"}
            </TabsTrigger>
            <TabsTrigger value="amc" className="py-3 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Building2 className="w-4 h-4 mr-2" /> {lang === "bn" ? "কর্পোরেট AMC" : "Corporate AMC"}
            </TabsTrigger>
            <TabsTrigger value="warranty" className="py-3 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white" onClick={() => navigate('/warranty-check')}>
              <ShieldCheck className="w-4 h-4 mr-2" /> {lang === "bn" ? "ওয়ারেন্টি চেক" : "Check Warranty"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="track" className="mt-0">
            <Card className={`border-0 shadow-2xl ${isDark ? 'bg-[#111118]' : 'bg-white'}`}>
              <CardContent className="p-8 md:p-12">
                <div className="max-w-2xl mx-auto text-center space-y-6">
                  <div className="inline-flex items-center justify-center p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                    <Wrench className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold">{lang === "bn" ? "রিপেয়ার স্ট্যাটাস ট্র্যাক করুন" : "Track Your Repair Status"}</h2>
                  <p className="text-muted-foreground">{lang === "bn" ? "আপনার সার্ভিস রিসিটের টিকিট নম্বরটি নিচে দিন।" : "Enter your Ticket ID from the service receipt."}</p>
                  
                  <div className="flex gap-3 pt-4">
                    <Input 
                      placeholder="e.g. REP-240501-A1B2" 
                      className="h-14 text-lg"
                      value={ticketQuery}
                      onChange={(e) => setTicketQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTrackTicket()}
                    />
                    <Button onClick={handleTrackTicket} disabled={loading} className="h-14 px-8 text-lg bg-blue-600 hover:bg-blue-700">
                      {loading ? <Clock className="w-5 h-5 animate-spin" /> : "Track"}
                    </Button>
                  </div>

                  {searched && ticketResult && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-10 border-t mt-10 text-left">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h3 className="font-bold text-xl">{ticketResult.device_info}</h3>
                          <p className="text-sm text-muted-foreground">Ticket: <span className="font-mono text-primary">{ticketResult.ticket_number}</span></p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Estimated Cost</p>
                          <p className="font-bold text-lg text-emerald-500">৳{ticketResult.estimated_cost}</p>
                        </div>
                      </div>
                      <RepairTracker status={ticketResult.status as RepairStatus} />
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="doorstep" className="mt-0">
            <Card className={`border-0 shadow-2xl ${isDark ? 'bg-[#111118]' : 'bg-white'}`}>
              <CardContent className="p-8 md:p-12 text-center space-y-6">
                <div className="inline-flex items-center justify-center p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4">
                  <Home className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-3xl font-bold">{lang === "bn" ? "ঢাকায় ২৪ ঘণ্টায় হোম সার্ভিস" : "24 Hour Doorstep Service in Dhaka"}</h2>
                <p className="text-muted-foreground max-w-xl mx-auto text-lg">
                  {lang === "bn" 
                    ? "CCTV নষ্ট? নেটওয়ার্ক প্রবলেম? ল্যাপটপ অন হচ্ছে না? আমাদের এক্সপার্ট টেকনিশিয়ান চলে যাবে আপনার ঠিকানায়।" 
                    : "CCTV down? Network issues? PC not turning on? Our expert technicians will visit your location."}
                </p>
                <div className="pt-6">
                  <a href="tel:01919060590">
                    <Button className="h-14 px-8 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 rounded-full shadow-lg shadow-emerald-600/30">
                      Call Now: 01919-060590
                    </Button>
                  </a>
                  <p className="mt-4 text-sm text-muted-foreground">Or click the chat icon at the bottom right to WhatsApp us.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="amc" className="mt-0">
            <Card className={`border-0 shadow-2xl ${isDark ? 'bg-[#111118]' : 'bg-white'}`}>
              <CardContent className="p-8 md:p-12 text-center space-y-6">
                <div className="inline-flex items-center justify-center p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4">
                  <Building2 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-3xl font-bold">{lang === "bn" ? "কর্পোরেট আইটি মেইনটেনেন্স (AMC)" : "Corporate IT Maintenance (AMC)"}</h2>
                <p className="text-muted-foreground max-w-xl mx-auto text-lg">
                  {lang === "bn" 
                    ? "আপনার অফিসের ফুল আইটি সেটআপ, সার্ভার এবং সিসিটিভি সচল রাখতে আমাদের ইয়ারলি (Yearly) প্যাকেজ নিন। মাসিক চেকআপ এবং ফ্রি রিপ্লেসমেন্ট সুবিধা।" 
                    : "Keep your office IT setup, servers, and CCTV running smoothly with our Annual Maintenance Contracts. Includes monthly checkups and free replacements."}
                </p>
                <div className="pt-6">
                  <Link to="/our-services">
                    <Button className="h-14 px-8 text-lg font-bold bg-purple-600 hover:bg-purple-700 rounded-full shadow-lg shadow-purple-600/30">
                      View Our Services & Request Quote <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
