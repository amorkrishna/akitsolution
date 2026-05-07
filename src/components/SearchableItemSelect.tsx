import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  name: string;
  category: string;
  price: number;
  sku?: string | null;
}

interface SearchableItemSelectProps {
  items: Item[];
  value: string;
  onSelect: (id: string) => void;
  placeholder?: string;
}

function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  // Direct include
  if (t.includes(q)) return true;
  // Fuzzy: every character of query appears in order
  let ti = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const idx = t.indexOf(q[qi], ti);
    if (idx === -1) return false;
    ti = idx + 1;
  }
  return true;
}

function matchScore(item: Item, query: string): number {
  const q = query.toLowerCase();
  const name = item.name.toLowerCase();
  // Exact start match = highest
  if (name.startsWith(q)) return 100;
  // Contains match
  if (name.includes(q)) return 80;
  // SKU match
  if (item.sku && item.sku.toLowerCase().includes(q)) return 70;
  // Category match
  if (item.category.toLowerCase().includes(q)) return 60;
  // Fuzzy match
  if (fuzzyMatch(name, q)) return 40;
  if (item.sku && fuzzyMatch(item.sku, q)) return 30;
  if (fuzzyMatch(item.category, q)) return 20;
  return 0;
}

export function SearchableItemSelect({ items, value, onSelect, placeholder = "Search products..." }: SearchableItemSelectProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    return items
      .map(item => ({ item, score: matchScore(item, search.trim()) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(x => x.item);
  }, [items, search]);

  useEffect(() => {
    setHighlightIndex(-1);
  }, [search]);

  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const el = listRef.current.children[highlightIndex] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex(prev => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex(prev => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < filtered.length) {
        onSelect(filtered[highlightIndex].id);
        setSearch("");
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const selected = items.find(i => i.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={open ? search : ""}
          onChange={(e) => { setSearch(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => { setOpen(true); setSearch(""); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-9 h-9"
        />
        {open && search && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={() => setSearch("")}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Dropdown list */}
      {open && (
        <div ref={listRef} className="absolute z-[9999] mt-1 w-full max-h-60 overflow-y-auto rounded-md border bg-popover shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">No items found</div>
          ) : (
            filtered.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex justify-between items-center gap-2",
                  value === item.id && "bg-accent/50",
                  highlightIndex === index && "bg-accent text-accent-foreground"
                )}
                onClick={() => { onSelect(item.id); setSearch(""); setOpen(false); }}
              >
                <span className="truncate">
                  {item.name}
                  {item.sku && <span className="text-muted-foreground ml-1">({item.sku})</span>}
                  <span className="text-muted-foreground ml-1">• {item.category}</span>
                </span>
                <span className="text-xs font-medium shrink-0">৳{Number(item.price).toLocaleString()}</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Selected item shown below */}
      {selected && !open && (
        <div className="mt-1.5 flex items-center justify-between px-3 py-1.5 rounded-md bg-accent/30 border text-sm">
          <span className="truncate">
            <span className="font-medium">{selected.name}</span>
            {selected.sku && <span className="text-muted-foreground ml-1">({selected.sku})</span>}
          </span>
          <span className="text-xs font-medium shrink-0">৳{Number(selected.price).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
