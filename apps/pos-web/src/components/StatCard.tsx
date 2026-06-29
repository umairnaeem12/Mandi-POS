import type { ComponentType } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type Tone = 'primary' | 'success' | 'warning' | 'info' | 'destructive' | 'neutral';

const toneStyles: Record<Tone, { icon: string; ring: string }> = {
  primary: { icon: 'bg-primary/10 text-primary', ring: 'group-hover:ring-primary/20' },
  success: { icon: 'bg-success/10 text-success', ring: 'group-hover:ring-success/20' },
  warning: { icon: 'bg-warning/15 text-warning-foreground', ring: 'group-hover:ring-warning/20' },
  info: { icon: 'bg-info/10 text-info', ring: 'group-hover:ring-info/20' },
  destructive: { icon: 'bg-destructive/10 text-destructive', ring: 'group-hover:ring-destructive/20' },
  neutral: { icon: 'bg-muted text-muted-foreground', ring: 'group-hover:ring-border' },
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ComponentType<{ className?: string }>;
  tone?: Tone;
  trend?: { value: number; label?: string };
  loading?: boolean;
  index?: number;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'primary',
  trend,
  loading,
  index = 0,
}: StatCardProps) {
  const t = toneStyles[tone];
  const trendUp = (trend?.value ?? 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className={cn(
        'group rounded-lg border bg-card p-5 shadow-card ring-1 ring-transparent transition-all hover:shadow-card-hover',
        t.ring,
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {Icon && (
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', t.icon)}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-24" />
      ) : (
        <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</div>
      )}
      {trend && !loading && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-medium',
              trendUp ? 'text-success' : 'text-destructive',
            )}
          >
            {trendUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(trend.value)}%
          </span>
          {trend.label && <span className="text-muted-foreground">{trend.label}</span>}
        </div>
      )}
    </motion.div>
  );
}
