import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Percent, X, Plus, Image as ImageIcon, Eye, EyeOff, Phone } from "lucide-react";

export function ProductFinderManualTab({
  manualForm,
  setManualForm,
  handleManualSubmit,
  manualLoading,
  CATEGORIES,
  BRANDS,
  handleManualPriceChange,
  handleManualPercentageChange,
  manualImagePreviews,
  manualPrimaryIndex,
  setManualPrimaryIndex,
  removeManualImage,
  handleManualImageSelect,
  setManualImageFiles,
  setManualImagePreviews
}: any) {
  return (
    <form onSubmit={handleManualSubmit} className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Basic Info + Pricing */}
                <div className="lg:col-span-2 space-y-6">
                  <Card className="border shadow-sm rounded-3xl overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b border-border/50 px-6 py-5">
                      <CardTitle className="text-lg font-bold">প্রাথমিক তথ্য (Basic Info)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">প্রোডাক্টের নাম <span className="text-destructive">*</span></Label>
                        <Input
                          value={manualForm.name}
                          onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                          placeholder="যেমন: Dahua 2MP Full Color Bullet Camera..."
                          className="h-12 text-base rounded-xl bg-muted/20"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">ক্যাটাগরি</Label>
                          <Select value={manualForm.category} onValueChange={(v) => setManualForm({ ...manualForm, category: v })}>
                            <SelectTrigger className="h-12 rounded-xl bg-muted/20"><SelectValue /></SelectTrigger>
                            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">ব্র্যান্ড</Label>
                          <Select value={manualForm.brand} onValueChange={(v) => setManualForm({ ...manualForm, brand: v })}>
                            <SelectTrigger className="h-12 rounded-xl bg-muted/20"><SelectValue /></SelectTrigger>
                            <SelectContent>{BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">বিস্তারিত বিবরণ</Label>
                        <Textarea
                          value={manualForm.description}
                          onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                          placeholder="প্রোডাক্টের ফিচার ও তথ্য লিখুন..."
                          rows={5}
                          className="rounded-xl bg-muted/20 resize-none"
                        />
                      </div>
                    </CardContent>
                  </Card>
    
                  <Card className="border shadow-sm rounded-3xl overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b border-border/50 px-6 py-5">
                      <CardTitle className="text-lg flex items-center gap-2 font-bold">
                        <Percent className="h-5 w-5 text-primary" /> মূল্য ও স্টক
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">রেগুলার মূল্য ৳ {!manualForm.call_for_price && <span className="text-destructive">*</span>}</Label>
                          <Input
                            type="number"
                            value={manualForm.price}
                            onChange={(e) => handleManualPriceChange("price", e.target.value)}
                            className="h-14 text-xl font-bold rounded-xl border-primary/30 bg-primary/5"
                            placeholder="0"
                            disabled={manualForm.call_for_price}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">ক্যাশ ডিসকাউন্ট মূল্য ৳</Label>
                          <Input
                            type="number"
                            value={manualForm.cash_discount_price}
                            onChange={(e) => handleManualPriceChange("cash_discount_price", e.target.value)}
                            className="h-14 text-xl text-primary font-bold rounded-xl bg-muted/20"
                            placeholder="0"
                            disabled={manualForm.call_for_price}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">ডিসকাউন্ট (%)</Label>
                          <Input type="number" step="0.1" min="0" max="99" value={manualForm.discount_percentage} onChange={(e) => handleManualPercentageChange(e.target.value)} className="h-12 rounded-xl bg-muted/20" disabled={manualForm.call_for_price} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">স্টক পরিমাণ</Label>
                          <Input type="number" value={manualForm.stock_quantity} onChange={(e) => setManualForm({ ...manualForm, stock_quantity: e.target.value })} className="h-12 rounded-xl bg-muted/20" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">SKU / বারকোড</Label>
                          <Input value={manualForm.sku} onChange={(e) => setManualForm({ ...manualForm, sku: e.target.value })} placeholder="Optional..." className="h-12 rounded-xl bg-muted/20" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
    
                {/* Right: Image + Settings */}
                <div className="space-y-6">
                  {/* Image Upload */}
                  <Card className="border shadow-sm rounded-3xl overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b border-border/50 px-6 py-5">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold">প্রোডাক্টের ছবি</CardTitle>
                        {manualImagePreviews.length > 0 && (
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                            {manualImagePreviews.length}টি ছবি নির্বাচিত
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
    
                      {/* Multi-image previews grid */}
                      {manualImagePreviews.length > 0 ? (
                        <div className="space-y-3">
                          {/* Primary (large) preview */}
                          <div className="relative w-full aspect-square rounded-2xl border-2 border-primary/30 bg-white overflow-hidden">
                            <img
                              src={manualImagePreviews[manualPrimaryIndex] || manualImagePreviews[0]}
                              alt="Primary"
                              className="h-full w-full object-contain p-2"
                            />
                            <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                              মূল ছবি
                            </div>
                          </div>
    
                          {/* Thumbnails row */}
                          <div className="flex gap-2 flex-wrap">
                            {manualImagePreviews.map((preview, i) => (
                              <div
                                key={i}
                                className={`relative h-14 w-14 rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
                                  manualPrimaryIndex === i ? "border-primary shadow-md" : "border-border hover:border-primary/50"
                                }`}
                                onClick={() => setManualPrimaryIndex(i)}
                              >
                                <img src={preview} alt={`ছবি ${i + 1}`} className="h-full w-full object-cover bg-white" />
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); removeManualImage(i); }}
                                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                                {manualPrimaryIndex === i && (
                                  <div className="absolute bottom-0 inset-x-0 bg-primary/80 text-white text-[8px] text-center font-bold py-0.5">প্রধান</div>
                                )}
                              </div>
                            ))}
    
                            {/* Add more button */}
                            <Label
                              htmlFor="manual-product-image"
                              className="h-14 w-14 rounded-xl border-2 border-dashed border-border hover:border-primary cursor-pointer flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-all"
                            >
                              <Plus className="h-5 w-5" />
                              <span className="text-[9px] font-bold mt-0.5">আরো</span>
                            </Label>
                          </div>
    
                          <p className="text-[10px] text-muted-foreground">👆 থাম্বনেইলে ক্লিক করে মূল ছবি পরিবর্তন করুন। ❌ দিয়ে ছবি সরান।</p>
                        </div>
                      ) : manualForm.image_url ? (
                        <div className="relative w-full aspect-square rounded-2xl border-2 border-primary/30 bg-white overflow-hidden">
                          <img src={manualForm.image_url} alt="Preview" className="h-full w-full object-contain p-2" onError={(e) => (e.currentTarget.style.display = "none")} />
                          <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">URL ছবি</div>
                        </div>
                      ) : (
                        /* Empty state upload area */
                        <Label
                          htmlFor="manual-product-image"
                          className="w-full aspect-square rounded-2xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
                        >
                          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <ImageIcon className="h-8 w-8 text-primary" />
                          </div>
                          <span className="font-bold text-sm text-foreground">ক্লিক করে ছবি আপলোড করুন</span>
                          <span className="text-xs mt-1 text-muted-foreground">একসাথে একাধিক ছবি বেছে নিতে পারবেন</span>
                          <span className="text-xs mt-0.5 opacity-60">JPG, PNG, WebP</span>
                        </Label>
                      )}
    
                      <input
                        id="manual-product-image"
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleManualImageSelect}
                      />
    
                      {/* Image URL paste */}
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-muted-foreground">অথবা ছবির লিঙ্ক (Image URL) পেস্ট করুন</Label>
                        <Input
                          value={manualForm.image_url}
                          onChange={(e) => {
                            setManualForm(f => ({ ...f, image_url: e.target.value }));
                          }}
                          placeholder="https://example.com/product.jpg"
                          className="h-10 text-xs rounded-xl bg-muted/20"
                        />
                      </div>
    
                      {/* Clear all button */}
                      {(manualImagePreviews.length > 0 || manualForm.image_url) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs text-destructive hover:text-destructive"
                          onClick={() => {
                            setManualImageFiles([]);
                            setManualImagePreviews([]);
                            setManualPrimaryIndex(0);
                            setManualForm(f => ({ ...f, image_url: "" }));
                          }}
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> সব ছবি সরান
                        </Button>
                      )}
                    </CardContent>
                  </Card>
    
                  {/* Publish toggle */}
                  <Card className="border shadow-sm rounded-3xl overflow-hidden">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex gap-3">
                          <div className="p-2.5 bg-primary/10 rounded-xl">
                            {manualForm.show_in_store ? <Eye className="h-5 w-5 text-primary" /> : <EyeOff className="h-5 w-5 text-muted-foreground" />}
                          </div>
                          <div>
                            <Label className="text-sm font-bold block mb-0.5">স্টোরে দেখান (Publish)</Label>
                            <p className="text-xs text-muted-foreground">অনলাইন স্টোরে দৃশ্যমান হবে</p>
                          </div>
                        </div>
                        <Switch checked={manualForm.show_in_store} onCheckedChange={(v) => setManualForm({ ...manualForm, show_in_store: v })} />
                      </div>
                      <div className="border-t border-border/50 pt-4 flex items-center justify-between gap-4">
                        <div className="flex gap-3">
                          <div className="p-2.5 bg-amber-500/10 rounded-xl">
                            <Phone className="h-5 w-5 text-amber-500" />
                          </div>
                          <div>
                            <Label className="text-sm font-bold block mb-0.5">Call for Price</Label>
                            <p className="text-xs text-muted-foreground">মূল্য লুকিয়ে ফোন করতে বলুন</p>
                          </div>
                        </div>
                        <Switch checked={manualForm.call_for_price || false} onCheckedChange={(v) => setManualForm({ ...manualForm, call_for_price: v })} />
                      </div>
                    </CardContent>
                  </Card>
    
                  <Button
                    type="submit"
                    disabled={manualLoading}
                    className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/25 rounded-3xl hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-blue-600 to-indigo-600 transition-all"
                  >
                    {manualLoading ? <Loader2 className="animate-spin h-6 w-6 mr-2" /> : <Save className="h-6 w-6 mr-2" />}
                    প্রোডাক্ট সেভ করুন
                  </Button>
                </div>
              </div>
            </form>
  );
}
