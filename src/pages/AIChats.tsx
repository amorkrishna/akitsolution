import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, MoreVertical, Search, MessageSquare, ShoppingCart, Info, Clock, UserCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";

export default function AIChats() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSessions();

    const channel = supabase
      .channel('ai-chats-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_chat_sessions' }, (payload) => {
        fetchSessions();
        if (payload.new && selectedSession && payload.new.id === selectedSession.id) {
          setSelectedSession(payload.new);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedSession?.id]);

  const fetchSessions = async () => {
    const { data } = await supabase
      .from("ai_chat_sessions")
      .select("*")
      .order("updated_at", { ascending: false });
    
    if (data) {
      setSessions(data);
      if (!selectedSession && data.length > 0) {
        setSelectedSession(data[0]);
      } else if (selectedSession) {
        const updatedSelected = data.find(s => s.id === selectedSession.id);
        if (updatedSelected) setSelectedSession(updatedSelected);
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedSession]);

  return (
    <div className="flex h-[calc(100vh-80px)] w-full gap-4 p-4 md:p-6 bg-muted/20">
      
      {/* Sidebar for Chat History */}
      <Card className="hidden md:flex w-80 flex-col border-border/50 shadow-sm bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Store AI Chats</h2>
          </div>
        </div>
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-2">
            {sessions.map((session) => {
              const isSelected = selectedSession?.id === session.id;
              return (
                <div
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className={`p-3 rounded-xl cursor-pointer transition-colors border ${
                    isSelected ? "bg-primary/10 border-primary/20" : "bg-card border-transparent hover:bg-muted"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-sm truncate pr-2 flex items-center gap-1.5">
                      <UserCircle className="w-4 h-4 text-muted-foreground" />
                      {session.customer_name || "Unknown Visitor"}
                    </h3>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(session.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">
                    {session.summary || "No summary available"}
                  </p>
                  {session.customer_phone && (
                    <Badge variant="outline" className="mt-2 text-[10px] bg-background">
                      {session.customer_phone}
                    </Badge>
                  )}
                </div>
              );
            })}
            {sessions.length === 0 && (
              <p className="text-sm text-center text-muted-foreground py-10">No AI chats yet</p>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col border-border/50 shadow-md bg-background overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-card/50 backdrop-blur z-10">
          {selectedSession ? (
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></span>
              </div>
              <div>
                <h1 className="text-lg font-semibold leading-none mb-1">
                  {selectedSession.customer_name || "Store Visitor"}
                </h1>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  {selectedSession.customer_phone && <span>📞 {selectedSession.customer_phone}</span>}
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(selectedSession.updated_at).toLocaleString()}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold leading-none mb-1">Select a chat</h1>
            </div>
          )}
          <Badge variant={selectedSession?.status === "active" ? "default" : "secondary"}>
            {selectedSession?.status || "Unknown"}
          </Badge>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth bg-muted/10"
        >
          {selectedSession ? (
            (selectedSession.messages || []).map((message: any, index: number) => (
              <div
                key={index}
                className={`flex items-end gap-3 max-w-[85%] ${
                  message.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className={message.role === "assistant" ? "bg-primary text-primary-foreground" : "bg-muted"}>
                    {message.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`flex flex-col gap-1 ${
                    message.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none shadow-sm"
                        : "bg-card border border-border/50 text-foreground rounded-bl-none shadow-sm"
                    }`}
                  >
                    {message.role === "assistant" ? (
                       <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1 [&>ul]:mb-1 [&>ol]:mb-1 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm [&>p]:text-sm [&>li]:text-sm">
                         <ReactMarkdown>{message.content}</ReactMarkdown>
                       </div>
                    ) : (
                      <p>{message.content}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a conversation from the sidebar to view details</p>
            </div>
          )}
        </div>

        {/* Input Area (Disabled for monitoring) */}
        <div className="p-4 bg-card border-t text-center">
           <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 py-3 rounded-xl border border-border/50">
             <Info className="w-4 h-4 text-primary" />
             This is a read-only view of the automated Store AI chat.
           </div>
        </div>
      </Card>
    </div>
  );
}
