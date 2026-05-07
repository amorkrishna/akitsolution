import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Link2, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ImagePickerProps {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  label?: string;
  className?: string;
  /** Aspect ratio for the preview (e.g. "aspect-video", "aspect-square"). */
  previewAspect?: string;
  /** Max file size in MB (default 5). */
  maxSizeMB?: number;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const ALLOWED_EXT_LABEL = "JPG, PNG, WEBP, GIF, SVG";

interface PreviewMeta {
  source: "upload" | "url";
  sizeKB?: number;
  type?: string;
  width?: number;
  height?: number;
  status: "loading" | "ok" | "error";
  error?: string;
}

/**
 * Dual-mode image picker: upload a file from device OR paste a public image URL.
 * Files go to the given Supabase Storage bucket (default: storefront-images).
 * Includes preview, type/size validation, and live metadata (dimensions, size, type).
 */
export function ImagePicker({
  value,
  onChange,
  bucket = "storefront-images",
  label = "Image",
  className = "",
  previewAspect = "aspect-video",
  maxSizeMB = 5,
}: ImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [meta, setMeta] = useState<PreviewMeta | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(`Unsupported type. Allowed: ${ALLOWED_EXT_LABEL}`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Image must be smaller than ${maxSizeMB}MB`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const sizeKB = Math.round(file.size / 1024);
    setUploading(true);
    setMeta({ source: "upload", sizeKB, type: file.type, status: "loading" });
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(pub.publicUrl);
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
      setMeta({ source: "upload", sizeKB, type: file.type, status: "error", error: err?.message });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const applyUrl = () => {
    const trimmed = urlDraft.trim();
    if (!trimmed) return;
    if (!/^https?:\/\//i.test(trimmed)) {
      toast.error("URL must start with http:// or https://");
      return;
    }
    // Validate the URL actually loads as an image before applying.
    setMeta({ source: "url", status: "loading" });
    const test = new Image();
    test.onload = () => {
      onChange(trimmed);
      setUrlDraft("");
      setMeta({
        source: "url",
        status: "ok",
        width: test.naturalWidth,
        height: test.naturalHeight,
      });
      toast.success("Image URL set");
    };
    test.onerror = () => {
      setMeta({ source: "url", status: "error", error: "Could not load image from URL" });
      toast.error("URL did not load as an image");
    };
    test.src = trimmed;
  };

  const handlePreviewLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setMeta((m) => {
      const base: PreviewMeta = m ?? { source: "url", status: "ok" };
      return {
        ...base,
        status: "ok",
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
    });
  };

  const handlePreviewError = () => {
    setMeta((m) => ({
      source: m?.source ?? "url",
      ...(m ?? {}),
      status: "error",
      error: "Image failed to load",
    }));
  };

  const clear = () => {
    onChange("");
    setMeta(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="text-sm font-medium">{label}</label>}

      {/* Preview */}
      <div className={`relative w-full ${previewAspect} rounded-lg overflow-hidden border bg-muted`}>
        {value ? (
          <>
            <img
              src={value}
              alt="preview"
              className="h-full w-full object-cover"
              onLoad={handlePreviewLoad}
              onError={handlePreviewError}
            />
            <button
              type="button"
              onClick={clear}
              className="absolute top-2 right-2 h-7 w-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:scale-105 transition"
              aria-label="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
      </div>

      {/* Metadata strip */}
      {(value || meta) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {meta?.status === "loading" && (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Checking…
            </span>
          )}
          {meta?.status === "ok" && (
            <span className="flex items-center gap-1 text-emerald-500">
              <CheckCircle2 className="h-3 w-3" /> Valid
            </span>
          )}
          {meta?.status === "error" && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3 w-3" /> {meta.error || "Invalid image"}
            </span>
          )}
          {meta?.type && <span>Type: {meta.type.replace("image/", "").toUpperCase()}</span>}
          {typeof meta?.sizeKB === "number" && (
            <span>
              Size: {meta.sizeKB >= 1024 ? `${(meta.sizeKB / 1024).toFixed(2)} MB` : `${meta.sizeKB} KB`}
            </span>
          )}
          {meta?.width && meta?.height && (
            <span>
              {meta.width}×{meta.height}px
            </span>
          )}
          <span className="ml-auto opacity-70">
            Max {maxSizeMB}MB · {ALLOWED_EXT_LABEL}
          </span>
        </div>
      )}

      {/* Upload */}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          className="hidden"
          onChange={handleFile}
          disabled={uploading}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Uploading…" : "Upload"}
        </Button>
      </div>

      {/* URL paste */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="…or paste image URL"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyUrl();
              }
            }}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={applyUrl} disabled={!urlDraft.trim()}>
          Apply
        </Button>
      </div>
    </div>
  );
}

export default ImagePicker;