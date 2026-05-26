import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Search, Users, FileText, Package, ShoppingCart, TrendingUp, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const { data: clients } = useQuery({
    queryKey: ["search-clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name, phone").limit(5);
      return data || [];
    },
    enabled: open,
  });

  const { data: products } = useQuery({
    queryKey: ["search-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name").limit(5);
      return data || [];
    },
    enabled: open,
  });

  const { data: invoices } = useQuery({
    queryKey: ["search-invoices"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("id, invoice_number").limit(5);
      return data || [];
    },
    enabled: open,
  });

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-9 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex text-muted-foreground text-xs">Search anything...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => runCommand(() => navigate("/dashboard"))}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/clients"))}>
              <Users className="mr-2 h-4 w-4" />
              <span>Clients</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/products"))}>
              <Package className="mr-2 h-4 w-4" />
              <span>Products</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/invoices"))}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Invoices</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/orders"))}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              <span>Orders</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/revenue"))}>
              <TrendingUp className="mr-2 h-4 w-4" />
              <span>Revenue</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          {clients && clients.length > 0 && (
            <CommandGroup heading="Clients">
              {clients.map((client) => (
                <CommandItem key={client.id} onSelect={() => runCommand(() => navigate("/clients"))}>
                  <Users className="mr-2 h-4 w-4 text-primary" />
                  <span>{client.name}</span>
                  {client.phone && <span className="ml-2 text-xs text-muted-foreground">{client.phone}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {products && products.length > 0 && (
            <CommandGroup heading="Products">
              {products.map((product) => (
                <CommandItem key={product.id} onSelect={() => runCommand(() => navigate("/products"))}>
                  <Package className="mr-2 h-4 w-4 text-info" />
                  <span>{product.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {invoices && invoices.length > 0 && (
            <CommandGroup heading="Invoices">
              {invoices.map((invoice) => (
                <CommandItem key={invoice.id} onSelect={() => runCommand(() => navigate("/invoices"))}>
                  <FileText className="mr-2 h-4 w-4 text-warning" />
                  <span>{invoice.invoice_number}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
