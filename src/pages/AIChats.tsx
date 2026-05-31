import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, MoreVertical, Search, Paperclip, MessageSquare, ShoppingCart, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const AIChats = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I am your advanced AI assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Fetch recent store activity and listen for new ones
  useEffect(() => {
    const fetchRecentActivity = async () => {
      const { data: orders } = await supabase
        .from("store_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
        
      const { data: storeMessages } = await supabase
        .from("store_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      const combined: Message[] = [
        {
          id: "1",
          role: "assistant",
          content: "Hello! I am your AI Store Assistant. I'm actively monitoring the store and will notify you of any new orders or messages here in real-time.",
          timestamp: new Date(),
        }
      ];

      if (orders) {
        orders.forEach(order => {
          combined.push({
            id: `order-${order.id}`,
            role: "assistant",
            content: `🛍️ Store Update: New order received from ${order.customer_name} for ${order.item_name} (Qty: ${order.quantity}).`,
            timestamp: new Date(order.created_at),
          });
        });
      }

      if (storeMessages) {
        storeMessages.forEach(msg => {
          combined.push({
            id: `msg-${msg.id}`,
            role: "assistant",
            content: `💬 New Customer Message: ${msg.customer_name} says: "${msg.message}"`,
            timestamp: new Date(msg.created_at),
          });
        });
      }

      // Sort by timestamp
      combined.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      setMessages(combined);
    };

    fetchRecentActivity();

    // Subscribe to new orders
    const orderChannel = supabase
      .channel('aichat-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'store_orders' }, (payload) => {
        const order = payload.new as any;
        setMessages(prev => [...prev, {
          id: `order-${order.id}`,
          role: "assistant",
          content: `🛍️ Alert: A new order was just placed by ${order.customer_name} for ${order.item_name} (Qty: ${order.quantity})!`,
          timestamp: new Date(order.created_at || new Date()),
        }]);
      })
      .subscribe();

    // Subscribe to new messages
    const messageChannel = supabase
      .channel('aichat-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'store_messages' }, (payload) => {
        const msg = payload.new as any;
        setMessages(prev => [...prev, {
          id: `msg-${msg.id}`,
          role: "assistant",
          content: `💬 Alert: A new message just arrived from ${msg.customer_name}: "${msg.message}"`,
          timestamp: new Date(msg.created_at || new Date()),
        }]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(messageChannel);
    };
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const newAiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm a simulated AI response. To make me fully functional, you can connect me to an AI API like OpenAI, Gemini, or Anthropic!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, newAiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] w-full gap-4 p-4 md:p-6 bg-muted/20">
      
      {/* Sidebar for Chat History (Hidden on small screens) */}
      <Card className="hidden md:flex w-80 flex-col border-border/50 shadow-sm bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Chats</h2>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Search className="w-4 h-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`p-3 rounded-xl cursor-pointer transition-colors ${
                  i === 1 ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-medium text-sm truncate pr-4">
                    {i === 1 ? "Current Conversation" : `Previous Chat ${i}`}
                  </h3>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {i === 1 ? "Just now" : "Yesterday"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {i === 1
                    ? "How can I help you today?"
                    : "Can you summarize the project status?"}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="p-4 border-t">
          <Button className="w-full gap-2 rounded-xl" variant="outline">
            <Sparkles className="w-4 h-4" />
            New Chat
          </Button>
        </div>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col border-border/50 shadow-md bg-background overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-card/50 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary">
                  <Bot className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></span>
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-none mb-1">AK IT AI Assistant</h1>
              <p className="text-xs text-muted-foreground">Always here to help</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth"
        >
          {messages.map((message) => (
            <div
              key={message.id}
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
                      : "bg-muted text-foreground rounded-bl-none shadow-sm"
                  }`}
                >
                  {message.content}
                </div>
                <span className="text-[10px] text-muted-foreground px-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex items-end gap-3 max-w-[85%] mr-auto">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="px-4 py-4 rounded-2xl rounded-bl-none bg-muted shadow-sm flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-background border-t">
          <div className="relative flex items-center max-w-4xl mx-auto">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute left-2 text-muted-foreground hover:text-foreground rounded-full"
            >
              <Paperclip className="w-5 h-5" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message AI Assistant..."
              className="pl-12 pr-14 py-6 rounded-full border-muted-foreground/20 focus-visible:ring-primary/50 shadow-sm text-base bg-muted/30"
            />
            <Button
              size="icon"
              className="absolute right-1.5 h-10 w-10 rounded-full transition-transform active:scale-95"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-center mt-2">
            <span className="text-[10px] text-muted-foreground">
              AI can make mistakes. Verify important information.
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AIChats;
