import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WishlistStore {
  items: string[];
  toggleItem: (id: string) => void;
  isInWishlist: (id: string) => boolean;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      toggleItem: (id) =>
        set((state) => ({
          items: state.items.includes(id)
            ? state.items.filter((i) => i !== id)
            : [...state.items, id],
        })),
      isInWishlist: (id) => get().items.includes(id),
      clearWishlist: () => set({ items: [] }),
    }),
    { name: "store-wishlist" }
  )
);
