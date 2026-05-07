import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Download, Play, Pause, RotateCcw, Loader2, Video, Monitor } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface PromoTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

interface PromoScene {
  id: number;
  duration: number;
  text: string;
  subtext: string;
  animation: "fadeIn" | "slideUp" | "scaleIn" | "rotateIn" | "bounceIn";
}

interface PromoConfig {
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  theme: PromoTheme;
  animationStyle: string;
  layout: string;
  elements: string[];
  mood: string;
  companyName: string;
  scenes: PromoScene[];
}

// Animated background elements
function AnimatedBackground({ config, time }: { config: PromoConfig; time: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 1920;
    canvas.height = 1080;

    const { theme, elements } = config;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, theme.background);
    grad.addColorStop(0.5, theme.primary + "33");
    grad.addColorStop(1, theme.background);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw animated elements
    elements.forEach((el, i) => {
      const phase = time * 0.001 + i * 1.5;
      ctx.save();

      if (el === "particles" || el === "dots") {
        for (let j = 0; j < 40; j++) {
          const x = (Math.sin(phase + j * 0.7) * 0.5 + 0.5) * canvas.width;
          const y = (Math.cos(phase + j * 1.1) * 0.5 + 0.5) * canvas.height;
          const r = 2 + Math.sin(phase + j) * 2;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = theme.accent + "60";
          ctx.fill();
        }
      }

      if (el === "waves" || el === "aurora") {
        ctx.beginPath();
        for (let x = 0; x <= canvas.width; x += 5) {
          const y = canvas.height * 0.6 + Math.sin(x * 0.005 + phase) * 80 + Math.sin(x * 0.01 + phase * 1.5) * 40;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        const waveGrad = ctx.createLinearGradient(0, canvas.height * 0.5, 0, canvas.height);
        waveGrad.addColorStop(0, theme.primary + "30");
        waveGrad.addColorStop(1, theme.secondary + "20");
        ctx.fillStyle = waveGrad;
        ctx.fill();
      }

      if (el === "circles" || el === "rings") {
        for (let j = 0; j < 5; j++) {
          const cx = canvas.width * (0.2 + j * 0.15);
          const cy = canvas.height * 0.5;
          const r = 60 + Math.sin(phase + j) * 30;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = theme.accent + "40";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      if (el === "grid" || el === "lines") {
        ctx.strokeStyle = theme.primary + "15";
        ctx.lineWidth = 1;
        const spacing = 60;
        for (let x = 0; x < canvas.width; x += spacing) {
          const offset = Math.sin(phase + x * 0.01) * 10;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + offset, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += spacing) {
          const offset = Math.cos(phase + y * 0.01) * 10;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y + offset);
          ctx.stroke();
        }
      }

      if (el === "gradient-orbs") {
        for (let j = 0; j < 3; j++) {
          const cx = canvas.width * (0.3 + j * 0.2) + Math.sin(phase + j * 2) * 100;
          const cy = canvas.height * 0.4 + Math.cos(phase + j * 1.5) * 80;
          const r = 120 + Math.sin(phase) * 40;
          const orbGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          orbGrad.addColorStop(0, theme.accent + "40");
          orbGrad.addColorStop(1, theme.accent + "00");
          ctx.fillStyle = orbGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (el === "geometric") {
        for (let j = 0; j < 6; j++) {
          const cx = canvas.width * (0.1 + j * 0.15);
          const cy = canvas.height * (0.3 + Math.sin(phase + j) * 0.2);
          const size = 30 + Math.sin(phase + j * 0.5) * 15;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(phase * 0.5 + j);
          ctx.strokeStyle = theme.secondary + "50";
          ctx.lineWidth = 2;
          ctx.strokeRect(-size / 2, -size / 2, size, size);
          ctx.restore();
        }
      }

      ctx.restore();
    });
  }, [config, time]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

// Scene renderer
function SceneContent({ scene, config, progress }: { scene: PromoScene; config: PromoConfig; progress: number }) {
  const getAnimationStyle = (): React.CSSProperties => {
    const p = Math.min(1, progress * 2); // faster entrance
    const ease = 1 - Math.pow(1 - p, 3); // easeOutCubic
    
    switch (scene.animation) {
      case "slideUp":
        return { opacity: ease, transform: `translateY(${(1 - ease) * 60}px)` };
      case "scaleIn":
        return { opacity: ease, transform: `scale(${0.7 + ease * 0.3})` };
      case "rotateIn":
        return { opacity: ease, transform: `rotate(${(1 - ease) * -10}deg) scale(${0.9 + ease * 0.1})` };
      case "bounceIn": {
        const bounce = ease > 0.8 ? 1 + Math.sin((ease - 0.8) * Math.PI * 5) * 0.05 : ease;
        return { opacity: Math.min(1, ease * 1.5), transform: `scale(${bounce})` };
      }
      default:
        return { opacity: ease };
    }
  };

  const layoutClass = config.layout === "split"
    ? "items-start text-left pl-[10%]"
    : config.layout === "diagonal"
    ? "items-center text-center rotate-[-2deg]"
    : "items-center text-center";

  return (
    <div className={`absolute inset-0 flex flex-col justify-center ${layoutClass} px-8`} style={getAnimationStyle()}>
      <h2
        className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-4 max-w-[80%] drop-shadow-lg"
        style={{ color: config.theme.text }}
      >
        {scene.text}
      </h2>
      <p
        className="text-lg sm:text-xl md:text-2xl font-medium max-w-[70%] drop-shadow"
        style={{ color: config.theme.text + "CC" }}
      >
        {scene.subtext}
      </p>
    </div>
  );
}

// Main promo preview
function PromoPreview({ config, isPlaying, onTimeUpdate }: {
  config: PromoConfig;
  isPlaying: boolean;
  onTimeUpdate?: (time: number) => void;
}) {
  const [time, setTime] = useState(0);
  const [currentScene, setCurrentScene] = useState(0);
  const [sceneProgress, setSceneProgress] = useState(0);
  const animRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  const totalDuration = config.scenes.reduce((sum, s) => sum + s.duration, 0) * 1000;

  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = performance.now() - pausedTimeRef.current;
      const animate = (now: number) => {
        const elapsed = now - startTimeRef.current;
        const looped = elapsed % totalDuration;
        setTime(looped);
        pausedTimeRef.current = looped;
        onTimeUpdate?.(looped);

        // Determine current scene
        let acc = 0;
        for (let i = 0; i < config.scenes.length; i++) {
          const sceneDur = config.scenes[i].duration * 1000;
          if (looped < acc + sceneDur) {
            setCurrentScene(i);
            setSceneProgress((looped - acc) / sceneDur);
            break;
          }
          acc += sceneDur;
        }

        animRef.current = requestAnimationFrame(animate);
      };
      animRef.current = requestAnimationFrame(animate);
    } else {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [isPlaying, config, totalDuration]);

  const scene = config.scenes[currentScene];

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl shadow-2xl"
      style={{ aspectRatio: "16/9", background: config.theme.background }}
      id="promo-preview"
    >
      <AnimatedBackground config={config} time={time} />
      
      {/* Company watermark */}
      <div className="absolute top-6 left-8 z-10 flex items-center gap-3" style={{ opacity: 0.9 }}>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg"
          style={{ background: config.theme.primary, color: config.theme.text }}
        >
          AK
        </div>
        <span className="text-sm font-semibold tracking-wider" style={{ color: config.theme.text + "99" }}>
          {config.companyName}
        </span>
      </div>

      {/* Scene content */}
      {scene && <SceneContent scene={scene} config={config} progress={sceneProgress} />}

      {/* CTA overlay in last scene */}
      {currentScene === config.scenes.length - 1 && sceneProgress > 0.3 && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10">
          <div
            className="px-8 py-3 rounded-full text-lg font-bold shadow-xl"
            style={{
              background: config.theme.accent,
              color: config.theme.background,
              opacity: Math.min(1, (sceneProgress - 0.3) * 3),
              transform: `scale(${Math.min(1, 0.8 + (sceneProgress - 0.3) * 0.6)})`,
            }}
          >
            {config.cta}
          </div>
        </div>
      )}

      {/* Scene indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {config.scenes.map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === currentScene ? 32 : 12,
              background: i === currentScene ? config.theme.accent : config.theme.text + "40",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function PromoGenerator() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<PromoConfig | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setConfig(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-promo", {
        body: { prompt: prompt.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setConfig(data);
      setIsPlaying(true);
      toast.success("প্রমো জেনারেট হয়েছে!");
    } catch (err: any) {
      toast.error(err.message || "প্রমো জেনারেট করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    const el = document.getElementById("promo-preview");
    if (!el) return;
    setExporting(true);
    try {
      // Capture multiple frames for a storyboard PDF
      const wasPlaying = isPlaying;
      setIsPlaying(false);
      await new Promise(r => setTimeout(r, 200));

      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: null });
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, 297, 167);

      // Add info page
      pdf.addPage();
      pdf.setFontSize(24);
      pdf.text(config?.title || "Promo", 20, 30);
      pdf.setFontSize(14);
      pdf.text(config?.subtitle || "", 20, 45);
      pdf.setFontSize(11);
      pdf.text(`Animation: ${config?.animationStyle}`, 20, 65);
      pdf.text(`Mood: ${config?.mood}`, 20, 75);
      pdf.text(`Layout: ${config?.layout}`, 20, 85);
      pdf.text(`Colors: ${config?.theme.primary}, ${config?.theme.secondary}, ${config?.theme.accent}`, 20, 95);
      
      config?.scenes.forEach((scene, i) => {
        pdf.text(`Scene ${i + 1}: ${scene.text}`, 20, 115 + i * 15);
      });

      pdf.save("promo-storyboard.pdf");
      if (wasPlaying) setIsPlaying(true);
      toast.success("PDF ডাউনলোড হয়েছে!");
    } catch (err) {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleExportVideo = async () => {
    if (!config) return;
    setExporting(true);

    try {
      const el = document.getElementById("promo-preview");
      if (!el) throw new Error("Preview not found");

      // Use MediaRecorder to capture the preview as video
      const canvas = el.querySelector("canvas");
      if (!canvas) throw new Error("Canvas not found");

      // Create an offscreen canvas that composites everything
      const offscreen = document.createElement("canvas");
      offscreen.width = 1920;
      offscreen.height = 1080;
      const offCtx = offscreen.getContext("2d")!;

      const stream = offscreen.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 5000000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "promo-video.webm";
        a.click();
        URL.revokeObjectURL(url);
        setExporting(false);
        toast.success("ভিডিও ডাউনলোড হয়েছে!");
      };

      mediaRecorder.start();

      // Record for total duration
      const totalMs = config.scenes.reduce((s, sc) => s + sc.duration, 0) * 1000;
      
      const startTime = performance.now();
      const recordFrame = () => {
        const elapsed = performance.now() - startTime;
        if (elapsed >= totalMs) {
          mediaRecorder.stop();
          return;
        }

        // Composite: copy the animated canvas
        const sourceCanvas = el.querySelector("canvas");
        if (sourceCanvas) {
          offCtx.drawImage(sourceCanvas, 0, 0, 1920, 1080);
        }

        // Draw text overlay
        let acc = 0;
        let activeScene: PromoScene | null = null;
        let sceneProgress = 0;
        for (const scene of config.scenes) {
          const dur = scene.duration * 1000;
          if (elapsed < acc + dur) {
            activeScene = scene;
            sceneProgress = (elapsed - acc) / dur;
            break;
          }
          acc += dur;
        }

        if (activeScene) {
          const ease = Math.min(1, sceneProgress * 2);
          const alpha = 1 - Math.pow(1 - ease, 3);
          offCtx.save();
          offCtx.globalAlpha = alpha;
          offCtx.fillStyle = config.theme.text;
          offCtx.font = "bold 72px sans-serif";
          offCtx.textAlign = "center";
          offCtx.fillText(activeScene.text, 960, 480 + (1 - alpha) * 40);
          offCtx.font = "32px sans-serif";
          offCtx.globalAlpha = alpha * 0.8;
          offCtx.fillText(activeScene.subtext, 960, 560 + (1 - alpha) * 30);
          offCtx.restore();
        }

        requestAnimationFrame(recordFrame);
      };

      // Make sure animation is playing
      setIsPlaying(true);
      requestAnimationFrame(recordFrame);

    } catch (err: any) {
      toast.error(err.message || "ভিডিও এক্সপোর্ট করতে সমস্যা");
      setExporting(false);
    }
  };

  const presetPrompts = [
    "Create a blue tech promo for CCTV camera installation services",
    "Design a Bangla promo for computer accessories with red and gold theme",
    "Make an energetic green promo for networking solutions",
    "Create an elegant dark promo for server room setup services",
    "Design a playful colorful promo for printer and photocopier sales",
  ];

  return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              AI Promo Generator
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              কমান্ড দিন, AI স্বয়ংক্রিয়ভাবে প্রমোশনাল ভিডিও/অ্যানিমেশন তৈরি করবে
            </p>
          </div>
        </div>

        {/* Input */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="যেমন: CCTV ক্যামেরার জন্য নীল থিমে একটি প্রমো তৈরি করো..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleGenerate()}
                className="flex-1"
              />
              <Button onClick={handleGenerate} disabled={loading || !prompt.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="ml-2 hidden sm:inline">Generate</span>
              </Button>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              {presetPrompts.map((p, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent text-xs"
                  onClick={() => { setPrompt(p); }}
                >
                  {p.slice(0, 45)}...
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <Sparkles className="h-6 w-6 text-primary absolute inset-0 m-auto" />
            </div>
            <p className="text-muted-foreground animate-pulse">AI প্রমো ডিজাইন করছে...</p>
          </div>
        )}

        {/* Preview */}
        {config && !loading && (
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                {isPlaying ? "Pause" : "Play"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setIsPlaying(false); setTimeout(() => setIsPlaying(true), 100); }}
              >
                <RotateCcw className="h-4 w-4 mr-1" /> Restart
              </Button>

              <div className="flex-1" />

              <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting}>
                <Monitor className="h-4 w-4 mr-1" /> Storyboard PDF
              </Button>
              <Button size="sm" onClick={handleExportVideo} disabled={exporting}>
                {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Video className="h-4 w-4 mr-1" />}
                Export Video
              </Button>
            </div>

            {/* Preview area */}
            <PromoPreview config={config} isPlaying={isPlaying} />

            {/* Config details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Style</p>
                  <p className="font-semibold text-sm capitalize">{config.animationStyle}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Mood</p>
                  <p className="font-semibold text-sm capitalize">{config.mood}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Layout</p>
                  <p className="font-semibold text-sm capitalize">{config.layout}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Scenes</p>
                  <p className="font-semibold text-sm">{config.scenes.length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Color palette */}
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-3">Color Palette</p>
                <div className="flex gap-3">
                  {Object.entries(config.theme).map(([key, color]) => (
                    <div key={key} className="flex flex-col items-center gap-1">
                      <div
                        className="w-12 h-12 rounded-lg border shadow-sm"
                        style={{ background: color }}
                      />
                      <span className="text-[10px] text-muted-foreground capitalize">{key}</span>
                      <span className="text-[9px] font-mono text-muted-foreground">{color}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Scenes timeline */}
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-3">Scenes Timeline</p>
                <div className="space-y-2">
                  {config.scenes.map((scene, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: config.theme.primary, color: config.theme.text }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{scene.text}</p>
                        <p className="text-xs text-muted-foreground truncate">{scene.subtext}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {scene.duration}s • {scene.animation}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty state */}
        {!config && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">AI Promo Generator</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-1">
                টেক্সট কমান্ড দিন এবং AI স্বয়ংক্রিয়ভাবে অ্যানিমেটেড প্রমোশনাল ভিডিও তৈরি করবে।
                রং, অ্যানিমেশন, টেক্সট সব কিছু AI নির্ধারণ করবে।
              </p>
            </div>
          </div>
        )}
      </div>
);
}
