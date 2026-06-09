import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useNotifications() {
  const { data: pendingOrders } = useQuery({
    queryKey: ["header-pending-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("store_orders").select("id, item_name, customer_name, created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: unreadMessages } = useQuery({
    queryKey: ["header-unread-messages"],
    queryFn: async () => {
      const { count } = await supabase.from("store_messages").select("*", { count: "exact", head: true }).eq("is_read", false);
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const { data: pendingServiceRequests } = useQuery({
    queryKey: ["header-pending-service-reqs"],
    queryFn: async () => {
      const { data } = await supabase.from("service_requests").select("id, customer_name, category, created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: activeAiChats } = useQuery({
    queryKey: ["header-active-ai-chats"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_chat_sessions").select("id, customer_name, summary, updated_at").eq("status", "active").order("updated_at", { ascending: false }).limit(5);
      return data || [];
    },
    refetchInterval: 30000,
  });

  const totalNotifications = (pendingOrders?.length || 0) + (unreadMessages || 0) + (pendingServiceRequests?.length || 0) + (activeAiChats?.length || 0);

  useEffect(() => {
    // Listen for new store orders in real-time
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'store_orders',
        },
        (payload) => {
          const newOrder = payload.new as any;
          toast.success("New Store Order!", {
            description: `${newOrder.customer_name} ordered ${newOrder.item_name} (Qty: ${newOrder.quantity})`,
            duration: 5000,
          });
        }
      )
      .subscribe();

    const aiChannel = supabase
      .channel('ai-chat-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_chat_sessions',
        },
        () => {
          toast.info("New AI Chat Started", {
            description: "A customer is talking to the AI assistant.",
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(aiChannel);
    };
  }, []);

  return {
    pendingOrders,
    unreadMessages,
    pendingServiceRequests,
    activeAiChats,
    totalNotifications
  };
}
