import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon?: LucideIcon;
  badge?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  trend,
  icon: Icon,
  badge,
}) => {
  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-xs hover:border-[hsl(var(--ring)/0.45)] transition-colors flex flex-col justify-between group">
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-mono">
          {label}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-[hsl(var(--secondary))] flex items-center justify-center text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--accent-text))] transition-colors">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-[hsl(var(--foreground))] font-display">
          {value}
        </div>
        {(subtext || trend || badge) && (
          <div className="mt-1.5 flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
            {trend && (
              <span className={`font-medium ${trend.isPositive ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
            {trend && subtext && <span aria-hidden="true">·</span>}
            {subtext && <span>{subtext}</span>}
            {badge && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[hsl(var(--accent-text))] font-semibold">{badge}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
