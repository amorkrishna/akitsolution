import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package, ChevronLeft, ChevronRight, Check, Minus, Plus, Heart, Star, MessageSquareQuote, Phone } from "lucide-react";
import { SocialShareButtons } from "./SocialShareButtons";
import { useWishlistStore } from "@/stores/wishlistStore";
import { toast } from "sonner";

interface ProductDetailDialogProps {
  product: any;
  onClose: () => void;
  onOrder: (name: string, price: number, productId: string, variantId?: string, variantLabel?: string) => void;
  isDark: boolean;
  lang: "bn" | "en";
}

function QuantitySelector({ quantity, onChange, max, isDark }: { quantity: number; onChange: (q: number) => void; max: number; isDark: boolean }) {
  const btnClass = `h-8 w-8 rounded-lg flex items-center justify-center transition-all ${isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`;
  return (
    <div className="flex items-center gap-3">
      <button className={btnClass} onClick={() => onChange(Math.max(1, quantity - 1))} disabled={quantity <= 1}><Minus className="h-4 w-4" /></button>
      <span className={`text-lg font-bold min-w-[2rem] text-center ${isDark ? "text-white" : "text-gray-900"}`}>{quantity}</span>
      <button className={btnClass} onClick={() => onChange(Math.min(max, quantity + 1))} disabled={quantity >= max}><Plus className="h-4 w-4" /></button>
    </div>
  );
}

export function ProductDetailDialog({ product, onClose, onOrder, isDark, lang }: ProductDetailDialogProps) {
  const { toggleItem, isInWishlist } = useWishlistStore();
  const [selectedImage, setSelectedImage] = useState(0);
  const [viewingProduct, setViewingProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  const activeProduct = viewingProduct || product;

  const { data: galleryImages } = useQuery({
    queryKey: ["product-images", activeProduct?.id],
    queryFn: async () => {
      if (!activeProduct?.id) return [];
      const { data } = await supabase.from("product_images").select("*").eq("product_id", activeProduct.id).order("sort_order");
      return data || [];
    },
    enabled: !!activeProduct?.id,
  });

  const { data: variants } = useQuery({
    queryKey: ["product-variants", activeProduct?.id],
    queryFn: async () => {
      if (!activeProduct?.id) return [];
      const { data } = await supabase.from("product_variants").select("*").eq("product_id", activeProduct.id).order("sort_order");
      return data || [];
    },
    enabled: !!activeProduct?.id,
  });

  const { data: relatedProducts } = useQuery({
    queryKey: ["related-products", activeProduct?.category, activeProduct?.id],
    queryFn: async () => {
      if (!activeProduct?.category || !activeProduct?.id) return [];
      const { data } = await supabase.from("products").select("*").eq("show_in_store", true).eq("category", activeProduct.category).neq("id", activeProduct.id).limit(6);
      return data || [];
    },
    enabled: !!activeProduct?.id && !!activeProduct?.category,
  });

  const { data: reviews } = useQuery({
    queryKey: ["store-reviews-dialog"],
    queryFn: async () => {
      const { data } = await supabase.from("customer_reviews").select("*").eq("is_published", true).order("sort_order").limit(5);
      return data || [];
    },
  });

  const avgRating = reviews && reviews.length > 0
    ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const allImages: string[] = [];
  if (activeProduct?.image_url) allImages.push(activeProduct.image_url);
  galleryImages?.forEach((img: any) => {
    if (!allImages.includes(img.image_url)) allImages.push(img.image_url);
  });

  // Auto-select first variant when variants load
  useEffect(() => {
    if (variants && variants.length > 0 && !selectedVariant) {
      setSelectedVariant(variants[0]);
    }
  }, [variants]);

  useEffect(() => {
    setSelectedImage(0);
    setViewingProduct(null);
    setQuantity(1);
    setSelectedVariant(null);
  }, [product?.id]);

  // Handle hardware back button on mobile
  useEffect(() => {
    if (product) {
      // Push a fake state so the back button has something to pop
      window.history.pushState({ modal: "product-detail" }, "");
      
      const handlePopState = () => {
        setViewingProduct(null);
        onClose();
      };
      
      window.addEventListener("popstate", handlePopState);
      
      return () => {
        window.removeEventListener("popstate", handlePopState);
        // If the modal is closing by UI (not by back button), we clean up the history state
        if (window.history.state?.modal === "product-detail") {
          window.history.back();
        }
      };
    }
  }, [product ? "open" : "closed"]);

  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-white/60" : "text-gray-600";
  const textMuted = isDark ? "text-white/40" : "text-gray-400";
  const bgCard = isDark ? "bg-[#0f1524]" : "bg-white";
  const borderColor = isDark ? "border-white/10" : "border-gray-200";
  const thumbBorder = isDark ? "border-blue-400" : "border-blue-500";
  const thumbInactive = isDark ? "border-white/10 hover:border-white/30" : "border-gray-200 hover:border-gray-400";

  if (!product) return null;

  // Use variant price/stock if a variant is selected
  const hasVariants = variants && variants.length > 0;
  const effectivePrice = selectedVariant
    ? Number(selectedVariant.price)
    : activeProduct.cash_discount_price
      ? Number(activeProduct.cash_discount_price)
      : Number(activeProduct.price);
  const effectiveStock = selectedVariant
    ? Number(selectedVariant.stock_quantity)
    : Number(activeProduct.stock_quantity);
  const hasDiscount = !selectedVariant && Number(activeProduct.discount_percentage) > 0;
  const inStock = effectiveStock > 0;

  // Group variants by variant_group
  const variantGroups: Record<string, any[]> = {};
  variants?.forEach((v: any) => {
    const group = v.variant_group || "Option";
    if (!variantGroups[group]) variantGroups[group] = [];
    variantGroups[group].push(v);
  });

  const handleViewRelated = (p: any) => { setViewingProduct(p); setSelectedImage(0); setQuantity(1); setSelectedVariant(null); };


  return (
    <Dialog open={!!product} onOpenChange={(v) => { if (!v) { setViewingProduct(null); onClose(); } }}>
      <DialogContent className={`max-w-2xl max-h-[95vh] overflow-y-auto overflow-x-hidden ${bgCard} ${borderColor} ${textPrimary} p-0 gap-0`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
          {/* Image Gallery */}
          <div className={`relative ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
            <div className="relative aspect-square overflow-hidden">
              {allImages.length > 0 ? (
                <img src={allImages[selectedImage] || allImages[0]} alt={activeProduct.name} className="h-full w-full object-contain p-4 transition-all duration-300" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Package className={`h-24 w-24 ${isDark ? "text-white/10" : "text-gray-200"}`} />
                </div>
              )}
              {hasDiscount && (
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold shadow-lg">-{activeProduct.discount_percentage}% OFF</span>
                </div>
              )}
              {allImages.length > 1 && (
                <>
                  <button onClick={() => setSelectedImage(prev => prev > 0 ? prev - 1 : allImages.length - 1)} className={`absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center transition-all ${isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-black/10 hover:bg-black/20 text-gray-700"}`}>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => setSelectedImage(prev => prev < allImages.length - 1 ? prev + 1 : 0)} className={`absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center transition-all ${isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-black/10 hover:bg-black/20 text-gray-700"}`}>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
            {allImages.length > 1 && (
              <div className={`flex gap-2 p-3 overflow-x-auto border-t ${borderColor}`}>
                {allImages.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)} className={`h-14 w-14 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${selectedImage === i ? thumbBorder : thumbInactive}`}>
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="p-5 sm:p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {activeProduct.brand && activeProduct.brand !== "Other" && (
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${isDark ? "bg-blue-500/10 text-blue-300" : "bg-blue-50 text-blue-600"}`}>{activeProduct.brand}</span>
              )}
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isDark ? "bg-white/5 text-white/50" : "bg-gray-100 text-gray-500"}`}>{activeProduct.category}</span>
            </div>

            <div className="flex items-start justify-between gap-2 mb-3">
              <h2 className={`text-lg sm:text-xl font-bold leading-tight break-words ${textPrimary}`}>{activeProduct.name}</h2>
              <button
                onClick={() => {
                  toggleItem(activeProduct.id);
                  toast(isInWishlist(activeProduct.id) ? (lang === "bn" ? "পছন্দ থেকে সরানো হয়েছে" : "Removed from wishlist") : (lang === "bn" ? "পছন্দে যোগ হয়েছে ❤️" : "Added to wishlist ❤️"));
                }}
                className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-all ${
                  isInWishlist(activeProduct.id)
                    ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                    : isDark
                      ? "bg-white/10 text-white/50 hover:bg-white/20 hover:text-rose-400"
                      : "bg-gray-100 text-gray-400 hover:bg-rose-50 hover:text-rose-500"
                }`}
              >
                <Heart className={`h-4 w-4 ${isInWishlist(activeProduct.id) ? "fill-white" : ""}`} />
              </button>
            </div>

            {/* Price */}
            <div className={`rounded-xl p-3 mb-4 border ${isDark ? "bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border-blue-500/10" : "bg-blue-50/50 border-blue-100"}`}>
              {activeProduct.call_for_price ? (
                <div className="flex items-center gap-2">
                  <span className={`text-xl sm:text-2xl font-black ${isDark ? "bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent" : "text-amber-600"}`}>
                    {lang === "bn" ? "মূল্য জানতে কল করুন" : "Call for Price"}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-end gap-2 flex-wrap">
                    <span className={`text-2xl sm:text-3xl font-black ${isDark ? "bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent" : "text-blue-600"}`}>৳{effectivePrice.toLocaleString()}</span>
                    {!selectedVariant && activeProduct.cash_discount_price && (
                      <span className={`text-sm line-through mb-1 ${textMuted}`}>৳{Number(activeProduct.price).toLocaleString()}</span>
                    )}
                  </div>
                  {hasDiscount && (
                    <p className="text-xs text-emerald-500 font-medium mt-1">💰 {lang === "bn" ? "সেভ করুন" : "You save"} ৳{(Number(activeProduct.price) - effectivePrice).toLocaleString()}</p>
                  )}
                </>
              )}
            </div>

            {/* Variant Selector */}
            {hasVariants && Object.entries(variantGroups).map(([group, groupVariants]) => (
              <div key={group} className="mb-3">
                <label className={`text-xs font-semibold mb-1.5 block ${textSecondary}`}>{group}</label>
                <div className="flex flex-wrap gap-2">
                  {groupVariants.map((v: any) => {
                    const isSelected = selectedVariant?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => { setSelectedVariant(v); setQuantity(1); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          isSelected
                            ? isDark
                              ? "bg-blue-500/20 border-blue-400 text-blue-300 shadow-md"
                              : "bg-blue-50 border-blue-500 text-blue-700 shadow-md"
                            : isDark
                              ? "bg-white/5 border-white/10 text-white/70 hover:border-white/30"
                              : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-400"
                        }`}
                      >
                        {v.variant_label}
                        {v.price !== Number(activeProduct.price) && (
                          <span className="ml-1 opacity-70">৳{Number(v.price).toLocaleString()}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Stock */}
            <div className="mb-3">
              {inStock ? (
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span className={`text-sm font-medium ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>{lang === "bn" ? "স্টকে আছে" : "In Stock"} ({effectiveStock})</span>
                </div>
              ) : (
                <span className={`text-sm font-medium ${isDark ? "text-red-400" : "text-red-600"}`}>✗ {lang === "bn" ? "স্টক নেই" : "Out of Stock"}</span>
              )}
            </div>

            {/* Quantity Selector */}
            {inStock && !activeProduct.call_for_price && (
              <div className="mb-4">
                <label className={`text-xs font-semibold mb-1.5 block ${textSecondary}`}>{lang === "bn" ? "পরিমাণ" : "Quantity"}</label>
                <QuantitySelector quantity={quantity} onChange={setQuantity} max={effectiveStock} isDark={isDark} />
              </div>
            )}

            {/* Description & Specifications */}
            <div className="mb-4 flex-1">
              {(() => {
                let parsedDesc = activeProduct.description || "";
                let parsedSpecs: any[] = [];
                try {
                  if (activeProduct.description) {
                    const obj = JSON.parse(activeProduct.description);
                    if (obj && typeof obj === 'object' && obj.text !== undefined) {
                      parsedDesc = obj.text;
                      parsedSpecs = obj.specs || [];
                    }
                  }
                } catch (e) {}

                return (
                  <div className="space-y-4">
                    {parsedDesc ? (
                      <p className={`text-sm leading-relaxed break-words whitespace-pre-wrap ${textSecondary}`}>{parsedDesc}</p>
                    ) : (
                      <p className={`text-sm italic ${textMuted}`}>{lang === "bn" ? "কোনো বিবরণ নেই" : "No description available"}</p>
                    )}

                    {parsedSpecs.length > 0 && (
                      <div className={`mt-6 rounded-2xl shadow-sm p-4 sm:p-6 border ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-100"}`}>
                        <h2 className={`text-lg sm:text-xl font-bold mb-4 ${textPrimary}`}>Specification</h2>
                        
                        <div className={`px-4 py-2.5 rounded-lg font-semibold text-xs sm:text-sm mb-6 ${isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-900"}`}>
                          General Information
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-start">
                          <div className="md:col-span-2 overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                <tr className="border-b border-gray-100 dark:border-white/5">
                                  <td className={`py-3 font-semibold ${textPrimary} w-1/3`}>Product Name</td>
                                  <td className={`py-3 ${textSecondary}`}>{activeProduct.name}</td>
                                </tr>
                                {parsedSpecs.map((spec, i) => (
                                  <tr key={i} className="border-b border-gray-100 dark:border-white/5 last:border-0">
                                    <td className={`py-3 font-semibold ${textPrimary} w-1/3`}>{spec.feature}</td>
                                    <td className={`py-3 ${textSecondary}`}>{spec.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className={`flex justify-center items-center rounded-xl aspect-square border overflow-hidden relative ${isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"}`}>
                            {activeProduct.image_url ? (
                              <img src={activeProduct.image_url} alt={activeProduct.name} className="object-contain w-full h-full p-2" />
                            ) : (
                              <div className="text-center text-gray-400 font-medium">
                                <span className="block text-4xl mb-2">📦</span>
                                <span className="text-xs">{lang === "bn" ? "কোনো ছবি নেই" : "No Image"}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Add to Cart / Call for Price */}
            <div className="mt-auto">
              {activeProduct.call_for_price ? (
                <div className="flex gap-2">
                  <Button
                    className="flex-1 gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 border-0 shadow-xl shadow-amber-500/25 rounded-xl text-white h-12 text-sm font-semibold"
                    onClick={() => {
                      window.open(`tel:+8801919060590`);
                    }}
                  >
                    <Phone className="h-5 w-5" />
                    {lang === "bn" ? "কল করুন" : "Call Now"}
                  </Button>
                  <Button
                    className="flex-1 gap-2 bg-[#25D366] hover:bg-[#20ba5a] border-0 shadow-xl shadow-emerald-500/25 rounded-xl text-white h-12 text-sm font-semibold"
                    onClick={() => {
                      const msg = lang === "bn"
                        ? `হ্যালো, আমি এই প্রোডাক্টটির মূল্য জানতে চাই: ${activeProduct.name}`
                        : `Hello, I'd like to know the price for this product: ${activeProduct.name}`;
                      window.open(`https://wa.me/8801919060590?text=${encodeURIComponent(msg)}`, "_blank");
                    }}
                  >
                    <MessageSquareQuote className="h-5 w-5" />
                    WhatsApp
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border-0 shadow-xl shadow-blue-500/25 rounded-xl text-white h-12 text-sm font-semibold"
                  disabled={!inStock}
                  onClick={() => {
                    const label = selectedVariant ? `${activeProduct.name} - ${selectedVariant.variant_label}` : activeProduct.name;
                    for (let i = 0; i < quantity; i++) {
                      onOrder(label, effectivePrice, activeProduct.id, selectedVariant?.id, selectedVariant?.variant_label);
                    }
                  }}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {quantity > 1
                    ? `${lang === "bn" ? "অর্ডার করুন" : "Buy Now"} (${quantity}) — ৳${(effectivePrice * quantity).toLocaleString()}`
                    : (lang === "bn" ? "এখুনি কিনুন" : "Buy Now")}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Customer Reviews */}
        {reviews && reviews.length > 0 && (
          <div className={`border-t ${borderColor} p-4 sm:p-5`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquareQuote className={`h-4 w-4 ${isDark ? "text-amber-400" : "text-amber-500"}`} />
                <h3 className={`text-sm font-bold ${textPrimary}`}>{lang === "bn" ? "কাস্টমার রিভিউ" : "Customer Reviews"}</h3>
              </div>
              {avgRating && (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < Math.round(Number(avgRating)) ? "text-amber-400 fill-amber-400" : isDark ? "text-white/15" : "text-gray-200"}`} />
                    ))}
                  </div>
                  <span className={`text-xs font-bold ${isDark ? "text-amber-400" : "text-amber-600"}`}>{avgRating}</span>
                  <span className={`text-[10px] ${textMuted}`}>({reviews.length})</span>
                </div>
              )}
            </div>
            {/* Rating Summary Bar Chart */}
            {(() => {
              const total = reviews.length;
              const counts = [5, 4, 3, 2, 1].map(star => ({
                star,
                count: reviews.filter((r: any) => r.rating === star).length,
              }));
              return (
                <div className={`rounded-lg p-3 mb-3 border ${isDark ? "bg-white/[0.02] border-white/5" : "bg-gray-50/50 border-gray-100"}`}>
                  <div className="flex gap-4">
                    {/* Big average */}
                    <div className="flex flex-col items-center justify-center pr-4 border-r ${borderColor}">
                      <span className={`text-3xl font-black ${isDark ? "text-amber-400" : "text-amber-500"}`}>{avgRating}</span>
                      <div className="flex items-center gap-0.5 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < Math.round(Number(avgRating)) ? "text-amber-400 fill-amber-400" : isDark ? "text-white/15" : "text-gray-200"}`} />
                        ))}
                      </div>
                      <span className={`text-[10px] mt-1 ${textMuted}`}>{total} {lang === "bn" ? "রিভিউ" : "reviews"}</span>
                    </div>
                    {/* Bars */}
                    <div className="flex-1 space-y-1.5">
                      {counts.map(({ star, count }) => {
                        const pct = total > 0 ? (count / total) * 100 : 0;
                        return (
                          <div key={star} className="flex items-center gap-2">
                            <span className={`text-[10px] font-semibold w-3 text-right ${textMuted}`}>{star}</span>
                            <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                            <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? "bg-white/5" : "bg-gray-200"}`}>
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className={`text-[9px] font-medium w-5 text-right ${textMuted}`}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className="space-y-2.5">
              {reviews.slice(0, 3).map((review: any) => (
                <div key={review.id} className={`rounded-lg p-3 border ${isDark ? "bg-white/[0.02] border-white/5" : "bg-gray-50/50 border-gray-100"}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-50 text-blue-600"}`}>
                        {review.reviewer_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${textPrimary}`}>{review.reviewer_name}</p>
                        {review.reviewer_role && <p className={`text-[9px] ${textMuted}`}>{review.reviewer_role}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-2.5 w-2.5 ${i < review.rating ? "text-amber-400 fill-amber-400" : isDark ? "text-white/10" : "text-gray-200"}`} />
                      ))}
                    </div>
                  </div>
                  <p className={`text-[11px] leading-relaxed ${textSecondary} line-clamp-2`}>{review.review_text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Social Share */}
        <div className={`border-t ${borderColor} p-4 sm:p-5`}>
          <h3 className={`text-xs font-bold mb-2 ${textPrimary}`}>{lang === "bn" ? "শেয়ার করুন" : "Share"}</h3>
          <SocialShareButtons
            productName={activeProduct.name}
            productPrice={activeProduct.cash_discount_price ? Number(activeProduct.cash_discount_price) : Number(activeProduct.price)}
            productUrl={`https://akitsolution.store`}
            compact
          />
        </div>

        {/* Related Products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <div className={`border-t ${borderColor} p-4 sm:p-5`}>
            <h3 className={`text-sm font-bold mb-3 ${textPrimary}`}>{lang === "bn" ? "সম্পর্কিত পণ্য" : "Related Products"}</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
              {relatedProducts.slice(0, 4).map((rp: any) => {
                const rpPrice = rp.cash_discount_price ? Number(rp.cash_discount_price) : Number(rp.price);
                return (
                  <button key={rp.id} onClick={() => handleViewRelated(rp)} className={`rounded-xl overflow-hidden border text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${isDark ? "bg-white/[0.03] border-white/10 hover:border-blue-500/40" : "bg-gray-50 border-gray-200 hover:border-blue-400"}`}>
                    <div className={`aspect-square overflow-hidden ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
                      {rp.image_url ? <img src={rp.image_url} alt={rp.name} className="h-full w-full object-cover" loading="lazy" /> : <div className="h-full w-full flex items-center justify-center"><Package className={`h-6 w-6 ${isDark ? "text-white/10" : "text-gray-300"}`} /></div>}
                    </div>
                    <div className="p-2">
                      <p className={`text-[10px] sm:text-xs font-medium leading-tight line-clamp-2 ${textPrimary}`}>{rp.name}</p>
                      <p className={`text-[10px] sm:text-xs font-bold mt-1 ${isDark ? "text-blue-400" : "text-blue-600"}`}>৳{rpPrice.toLocaleString()}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
