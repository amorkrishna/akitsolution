import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  MessageSquare, Phone, User, Clock, Trash2, Search, Eye, Sparkles, X,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type ChatSession = {
  id: string;
  session_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  messages: Array<{ role: string; content: string }>;
  summary: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export default function AIChatSessions() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["ai-chat-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_chat_sessions")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as ChatSession[];
    },
    refetchInterval: 15000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_chat_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-chat-sessions"] });
      toast.success("সেশন ডিলিট হয়েছে");
      setSelectedSession(null);
    },
  });

  const filtered = sessions.filter(s => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      s.customer_name?.toLowerCase().includes(q) ||
      s.customer_phone?.includes(q) ||
      s.summary?.toLowerCase().includes(q) ||
      s.messages?.some((m: any) => m.content?.toLowerCase().includes(q))
    );
  });

  const withPhone = sessions.filter(s => s.customer_phone);
  const activeCount = sessions.filter(s => s.status === "active").length;

  return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" /> AI কাস্টমার চ্যাট
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              অনলাইন স্টোরে কাস্টমারদের AI চ্যাটের ইতিহাস
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{sessions.length}</p>
              <p className="text-xs text-muted-foreground">মোট চ্যাট</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{activeCount}</p>
              <p className="text-xs text-muted-foreground">সক্রিয়</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-success">{withPhone.length}</p>
              <p className="text-xs text-muted-foreground">ফোন নম্বর পাওয়া</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-accent">
                {sessions.filter(s => s.customer_name).length}
              </p>
              <p className="text-xs text-muted-foreground">নাম পাওয়া</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="নাম, ফোন, বা কথোপকথন খুঁজুন..."
            className="pl-10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Session List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">কোনো চ্যাট সেশন পাওয়া যায়নি</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map(session => {
              const msgCount = session.messages?.length || 0;
              const lastMsg = session.messages?.[session.messages.length - 1];
              return (
                <Card
                  key={session.id}
                  className="glass-card hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedSession(session)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground text-sm">
                              {session.customer_name || "অজানা কাস্টমার"}
                            </p>
                            {session.customer_phone && (
                              <Badge variant="outline" className="gap-1 text-xs">
                                <Phone className="h-3 w-3" /> {session.customer_phone}
                              </Badge>
                            )}
                            <Badge variant={session.status === "active" ? "default" : "secondary"} className="text-xs">
                              {session.status === "active" ? "সক্রিয়" : "বন্ধ"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {lastMsg?.content?.substring(0, 150) || session.summary || "কোনো মেসেজ নেই"}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" /> {msgCount} মেসেজ
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {format(new Date(session.updated_at), "dd MMM, hh:mm a")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); setSelectedSession(session); }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(session.id); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Chat Detail Dialog */}
        <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                চ্যাট বিবরণ
              </DialogTitle>
            </DialogHeader>
            {selectedSession && (
              <div className="flex-1 overflow-hidden flex flex-col gap-3">
                {/* Customer Info */}
                <div className="rounded-xl bg-muted/50 p-3 space-y-1">
                  {selectedSession.customer_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{selectedSession.customer_name}</span>
                    </div>
                  )}
                  {selectedSession.customer_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-success" />
                      <a href={`tel:${selectedSession.customer_phone}`} className="text-primary hover:underline font-mono">
                        {selectedSession.customer_phone}
                      </a>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs ml-auto"
                        onClick={() => {
                          const phone = selectedSession.customer_phone!.replace(/[^0-9]/g, "");
                          const whatsappNumber = phone.startsWith("0") ? `88${phone}` : phone;
                          window.open(`https://wa.me/${whatsappNumber}`, "_blank");
                        }}
                      >
                        WhatsApp
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(selectedSession.created_at), "dd MMM yyyy, hh:mm a")}
                    <span>•</span>
                    <MessageSquare className="h-3 w-3" />
                    {selectedSession.messages?.length || 0} মেসেজ
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {selectedSession.messages?.map((msg: any, i: number) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}>
                        {msg.role === "assistant" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1 [&>ul]:mb-1">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p>{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
);
}
