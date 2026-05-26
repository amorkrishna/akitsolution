import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Layers, ChevronRight, Camera } from "lucide-react";
import { SCENE_TEMPLATES, type SceneTemplate } from "./templates";
import { useCameraPlannerStore } from "@/stores/cameraPlannerStore";
import { cn } from "@/lib/utils";

interface TemplateSelectorProps {
  onLoaded?: () => void;
}

function TemplateCard({
  template,
  onSelect,
}: {
  template: SceneTemplate;
  onSelect: () => void;
}) {
  const { room, cameras } = template;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left p-4 rounded-xl border border-border/60 bg-card",
        "hover:border-primary/50 hover:bg-primary/5 transition-all group"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl flex-shrink-0 w-10 text-center">{template.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-bold group-hover:text-primary transition-colors">
              {template.label}
            </h4>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors ml-auto" />
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
            {template.description}
          </p>
          {/* Stats */}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-2">
            <span className="flex items-center gap-1">
              <Camera className="h-3 w-3" />
              {cameras.length} cameras
            </span>
            <span>{room.width}m × {room.length}m × {room.height}m</span>
          </div>
          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {template.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[9px] px-1.5 py-0 h-4"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

export function TemplateSelector({ onLoaded }: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const { loadScene } = useCameraPlannerStore();

  const handleSelect = (t: SceneTemplate) => {
    loadScene(t.room, t.cameras, t.label);
    setOpen(false);
    onLoaded?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full text-xs justify-start gap-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5"
        >
          <Layers className="h-3.5 w-3.5 text-primary" />
          Load Scene Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Scene Templates
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Pre-built camera layouts for common environments. Loads instantly with realistic placements.
          </p>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {SCENE_TEMPLATES.map((t) => (
            <TemplateCard key={t.key} template={t} onSelect={() => handleSelect(t)} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
