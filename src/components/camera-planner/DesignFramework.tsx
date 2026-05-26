import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  ShieldCheck, Cpu, Presentation, Info, Copy, Check,
  Eye, Layers, FileText, Building2, Factory, GraduationCap, Landmark,
} from "lucide-react";

const FRAMEWORK_POINTS = [
  {
    icon: Eye,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    gradient: "from-blue-500/20 to-indigo-500/10",
    title: "Pre-Installation Verification",
    tagline: "See problems before they cost you money.",
    body: `Identify and correct line-of-sight obstructions in the 3D phase before a single cable is pulled. Our interactive 3D environment lets engineers walk through a virtual site, spot blind spots, and reposition cameras instantly — saving massive labor and hardware costs before any physical work begins.`,
    useCases: ["Blind-spot detection", "Cable routing optimization", "Hardware cost reduction"],
  },
  {
    icon: Cpu,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    gradient: "from-emerald-500/20 to-teal-500/10",
    title: "Perfect Asset Alignment",
    tagline: "Designed around your real-world environment.",
    body: `Our 3D planners adjust seamlessly around physical assets like office tables, factory machinery, or public road structures. Every camera placement is context-aware — whether it's a high-ceiling warehouse, a school corridor, or a multi-lane road junction, the system models the real environment to deliver maximum coverage with minimum hardware.`,
    useCases: ["Office furniture layouts", "Factory machinery zones", "Road & infrastructure projects"],
  },
  {
    icon: Presentation,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    gradient: "from-violet-500/20 to-purple-500/10",
    title: "Seamless Stakeholder Communication",
    tagline: "Technical precision, board-room clarity.",
    body: `Complex technical data is translated into easily digestible, highly visual PNG images and comprehensive PDF packages that any corporate board, government agency, or site engineer can instantly understand. Our exports include camera schedules, coverage percentages, zone labels, and architectural-grade 2D blueprints — ready to attach to any proposal.`,
    useCases: ["Corporate board presentations", "Government tender submissions", "Site engineer handoffs"],
  },
];

const CLIENT_TYPES = [
  { icon: Building2, label: "Corporate Offices" },
  { icon: GraduationCap, label: "Schools & Campuses" },
  { icon: Factory, label: "Industrial Facilities" },
  { icon: Landmark, label: "Government & Roads" },
];

const PROPOSAL_TEMPLATE = `CCTV DESIGN & INSTALLATION PROPOSAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHY OUR DESIGN FRAMEWORK IS SUPERIOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. PRE-INSTALLATION VERIFICATION
   Identify and correct line-of-sight obstructions in the 3D planning phase
   before a single cable is pulled — saving massive labor and hardware costs.

2. PERFECT ASSET ALIGNMENT
   Our 3D planners adjust seamlessly around physical assets like office tables,
   factory machinery, or public road structures, ensuring maximum coverage
   with minimum hardware investment.

3. SEAMLESS STAKEHOLDER COMMUNICATION
   Complex technical data is translated into easily digestible, highly visual
   PNG images and comprehensive PDF packages that any corporate board,
   government agency, or site engineer can instantly understand.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Attached to this proposal:
  ✓ 2D Architectural Blueprint (PNG)
  ✓ 3D Visualization (PNG)
  ✓ Camera Schedule & Coverage Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button
      variant="outline"
      size="sm"
      className="text-xs gap-1.5 h-8"
      onClick={copy}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied!" : label}
    </Button>
  );
}

export function DesignFramework() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1.5 h-8 text-muted-foreground hover:text-foreground"
        >
          <Info className="h-3.5 w-3.5 text-primary" />
          Design Framework
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        {/* Hero header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 px-8 py-8 rounded-t-lg">
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.1))]" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]">
                Methodology
              </Badge>
              <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-[10px]">
                For Proposals
              </Badge>
            </div>
            <DialogTitle className="text-2xl font-bold text-white leading-tight mb-2">
              Why Our Design Framework<br />
              <span className="text-blue-300">Is Superior</span>
            </DialogTitle>
            <p className="text-slate-300 text-sm leading-relaxed max-w-lg">
              A professional three-phase approach to CCTV planning that eliminates guesswork,
              reduces costs, and communicates with any stakeholder at any level.
            </p>

            {/* Client type badges */}
            <div className="flex flex-wrap gap-2 mt-4">
              {CLIENT_TYPES.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white/80 text-[11px] font-medium"
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-6">

          {/* Three framework points */}
          {FRAMEWORK_POINTS.map((point, idx) => {
            const Icon = point.icon;
            return (
              <div
                key={point.title}
                className={`rounded-xl border ${point.border} bg-gradient-to-br ${point.gradient} p-5`}
              >
                <div className="flex items-start gap-4">
                  {/* Number + icon */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-2">
                    <div className={`h-10 w-10 rounded-xl ${point.bg} flex items-center justify-center border ${point.border}`}>
                      <Icon className={`h-5 w-5 ${point.color}`} />
                    </div>
                    <span className={`text-lg font-black ${point.color} opacity-40`}>
                      0{idx + 1}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-foreground mb-0.5">{point.title}</h3>
                    <p className={`text-xs font-semibold ${point.color} mb-2`}>{point.tagline}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      {point.body}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {point.useCases.map((uc) => (
                        <Badge
                          key={uc}
                          variant="outline"
                          className={`text-[10px] ${point.border} ${point.color} bg-transparent`}
                        >
                          {uc}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <Separator />

          {/* How to use this */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-amber-400" />
              <h4 className="text-sm font-bold text-amber-300">How To Use This Framework</h4>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div className="space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-amber-400" />
                  Website / Portfolio
                </p>
                <p>Use the three framework points to show clients your end-to-end workflow. Embed the exported blueprint PNGs alongside each point to demonstrate real output quality.</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-amber-400" />
                  Professional Proposals
                </p>
                <p>Adapt the headings into your business template when sending quotes to large corporate clients or government entities for schools, roads, or factory projects. Attach the PNG exports as technical annexures.</p>
              </div>
            </div>
          </div>

          {/* Copy actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">Copy for proposal:</span>
            <CopyButton text={PROPOSAL_TEMPLATE} label="Proposal Template" />
            <CopyButton
              text={FRAMEWORK_POINTS.map(
                (p, i) => `${i + 1}. ${p.title.toUpperCase()}\n${p.body}`
              ).join("\n\n")}
              label="Framework Text Only"
            />
            <CopyButton
              text={FRAMEWORK_POINTS.map((p) => `• ${p.title}: ${p.tagline}`).join("\n")}
              label="One-liner Summary"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Compact sidebar card ──────────────────────────────────────────────────────
export function DesignFrameworkCard() {
  return (
    <div className="rounded-lg border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
        <span className="text-[11px] font-bold text-blue-300">Superior Design Framework</span>
      </div>
      <div className="space-y-1.5">
        {FRAMEWORK_POINTS.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.title} className="flex items-start gap-2">
              <Icon className={`h-3 w-3 ${p.color} flex-shrink-0 mt-0.5`} />
              <div>
                <p className="text-[10px] font-semibold text-foreground">{p.title}</p>
                <p className="text-[9px] text-muted-foreground leading-relaxed">{p.tagline}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
