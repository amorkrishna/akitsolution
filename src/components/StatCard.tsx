import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

export function StatCard({ title, value, icon: Icon, trend, trendUp }: StatCardProps) {
  return (
    <div className="glass-card rounded-xl p-3 sm:p-4 lg:p-5 animate-fade-in group hover:-translate-y-0.5 transition-all duration-300">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <span className="text-[8px] sm:text-[10px] lg:text-xs text-muted-foreground font-semibold uppercase tracking-wider leading-tight">{title}</span>
        <div className="w-7 h-7 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-lg sm:rounded-xl stat-gradient flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-[18px] lg:w-[18px] text-primary" />
        </div>
      </div>
      <div className="text-base sm:text-lg lg:text-2xl font-bold tracking-tight font-display truncate">{value}</div>
      {trend && (
        <p className={`text-[8px] sm:text-[10px] lg:text-xs mt-1 sm:mt-1.5 font-medium flex items-center gap-1 ${trendUp ? "text-success" : "text-destructive"}`}>
          <span className={`inline-block w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${trendUp ? "bg-success" : "bg-destructive"}`} />
          <span className="truncate">{trend}</span>
        </p>
      )}
    </div>
  );
}
