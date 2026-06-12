import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { PhoneCall, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function LeadCapturePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { language } = useTranslation();

  useEffect(() => {
    // Check if we've already shown this to the user in this session
    const hasShown = sessionStorage.getItem("lead-capture-shown");
    
    if (!hasShown) {
      // Show after 15 seconds
      const timer = setTimeout(() => {
        setIsOpen(true);
        sessionStorage.setItem("lead-capture-shown", "true");
      }, 15000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("service_requests").insert({
        customer_name: name || "Website Visitor",
        phone: phone,
        category: "Free Consultation",
        description: "Requested a callback from the website lead capture popup.",
        status: "pending",
        urgency: "high"
      });

      if (error) throw error;

      toast({
        title: language === "bn" ? "ধন্যবাদ!" : "Thank You!",
        description: language === "bn" 
          ? "আমরা খুব শীঘ্রই আপনার সাথে যোগাযোগ করব।" 
          : "We will call you back shortly.",
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Error submitting lead:", error);
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-md border-0 p-0 overflow-hidden bg-white dark:bg-[#111118]">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative">
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                  <PhoneCall className="h-8 w-8 text-white" />
                </div>
              </div>
              <DialogTitle className="text-2xl font-bold text-center text-white mb-2">
                {language === "bn" ? "ফ্রি আইটি কনসালটেশন!" : "Free IT Consultation!"}
              </DialogTitle>
              <DialogDescription className="text-center text-blue-100 text-sm">
                {language === "bn" 
                  ? "আপনার নাম্বার দিন, আমাদের এক্সপার্ট এখনই আপনাকে কল করবে।" 
                  : "Leave your number, and our expert will call you back immediately."}
              </DialogDescription>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lead-name" className="dark:text-gray-300">
                  {language === "bn" ? "আপনার নাম (ঐচ্ছিক)" : "Your Name (Optional)"}
                </Label>
                <Input
                  id="lead-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={language === "bn" ? "যেমন: আব্দুর রহমান" : "e.g. Abdur Rahman"}
                  className="dark:bg-[#1a1a24] dark:border-gray-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-phone" className="dark:text-gray-300">
                  {language === "bn" ? "মোবাইল নাম্বার *" : "Mobile Number *"}
                </Label>
                <Input
                  id="lead-phone"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="dark:bg-[#1a1a24] dark:border-gray-800"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-6"
                disabled={isSubmitting || !phone}
              >
                {isSubmitting 
                  ? (language === "bn" ? "পাঠানো হচ্ছে..." : "Submitting...") 
                  : (language === "bn" ? "কল ব্যাক রিকোয়েস্ট করুন" : "Request a Callback")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
