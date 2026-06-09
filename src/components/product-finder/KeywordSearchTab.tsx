import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Search, X } from "lucide-react";

export function ProductFinderKeywordTab({
  keywordInput,
  setKeywordInput,
  handleKeywordSearch,
  isFetchingKeyword
}: any) {
  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20 shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-primary/5 border-b border-primary/10 px-6 py-5">
          <CardTitle className="text-xl flex items-center gap-2 text-primary font-extrabold">
            <Sparkles className="h-5 w-5 text-yellow-500" /> AI দিয়ে প্রোডাক্ট খুঁজুন
          </CardTitle>
          <CardDescription className="text-sm font-medium">
            যেকোনো প্রোডাক্টের নাম বা কীওয়ার্ড লিখুন — AI স্বয়ংক্রিয়ভাবে প্রোডাক্টের ডেটা তৈরি করবে।
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">কীওয়ার্ড (Keyword)</Label>
            <div className="flex gap-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleKeywordSearch()}
                placeholder="যেমন: Dahua 4MP IP Camera, ZKTeco attendance machine..."
                className="h-12 text-base rounded-xl bg-muted/20 flex-1"
                disabled={isFetchingKeyword}
              />
              {keywordInput && (
                <Button variant="ghost" size="icon" onClick={() => setKeywordInput("")} className="h-12 w-12 rounded-xl">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {["Hikvision IP Camera", "Dahua 8MP DVR", "ZKTeco Fingerprint", "TP-Link Switch", "UPS 1000VA", "Gaming Monitor"].map(kw => (
              <button
                key={kw}
                onClick={() => setKeywordInput(kw)}
                className="text-xs px-3 py-2 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left font-medium text-muted-foreground hover:text-foreground"
              >
                {kw}
              </button>
            ))}
          </div>

          <Button
            onClick={handleKeywordSearch}
            disabled={isFetchingKeyword || !keywordInput.trim()}
            className="w-full h-13 rounded-xl text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg"
          >
            {isFetchingKeyword ? (
              <><Loader2 className="animate-spin h-5 w-5 mr-2" /> AI অনুসন্ধান করছে…</>
            ) : (
              <><Search className="h-5 w-5 mr-2" /> AI দিয়ে প্রোডাক্ট খুঁজুন</>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            💡 অনুসন্ধান শেষে প্রোডাক্টগুলো "লিঙ্ক ইম্পোর্ট" ট্যাবে দেখাবে
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
