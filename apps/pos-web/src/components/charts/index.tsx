import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART, DONUT_COLORS } from './palette';

const axisProps = {
  stroke: CHART.axis,
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

function compact(n: number): string {
  return Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

interface TooltipPayload {
  active?: boolean;
  payload?: { name: string; value: number; color?: string; payload?: Record<string, unknown> }[];
  label?: string;
}

function ChartTooltip({ active, payload, label, formatter }: TooltipPayload & { formatter?: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
      {label && <div className="mb-1 font-medium text-foreground">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="capitalize">{p.name}:</span>
          <span className="font-semibold text-foreground">
            {formatter ? formatter(p.value) : compact(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---- Area trend (sales over time) ----
export function AreaTrendChart<T extends { label: string }>({
  data,
  dataKey = 'revenue',
  height = 260,
  moneyFormatter,
}: {
  data: T[];
  dataKey?: string;
  height?: number;
  moneyFormatter?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.3} />
            <stop offset="100%" stopColor={CHART.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={compact} width={42} />
        <Tooltip content={<ChartTooltip formatter={moneyFormatter} />} cursor={{ stroke: CHART.grid }} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={CHART.primary}
          strokeWidth={2.5}
          fill="url(#areaFill)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ---- Vertical bars (orders over time) ----
export function BarSeriesChart<T extends { label: string }>({
  data,
  dataKey = 'orders',
  height = 260,
  color = CHART.info,
}: {
  data: T[];
  dataKey?: string;
  height?: number;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} allowDecimals={false} width={36} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.grid, opacity: 0.4 }} />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---- Donut (payment methods / table status) ----
export function DonutChart({
  data,
  height = 240,
  moneyFormatter,
  colors = DONUT_COLORS,
}: {
  data: { name: string; value: number }[];
  height?: number;
  moneyFormatter?: (v: number) => string;
  colors?: string[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        No data yet
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ResponsiveContainer width="100%" height={height} className="!w-1/2 max-w-[220px]">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="92%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip formatter={moneyFormatter} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />
              {d.name}
            </span>
            <span className="font-medium text-foreground">
              {moneyFormatter ? moneyFormatter(d.value) : d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Horizontal bars (best sellers) ----
export function HorizontalBarChart({
  data,
  height = 280,
}: {
  data: { name: string; value: number }[];
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        No data yet
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
        <XAxis type="number" {...axisProps} tickFormatter={compact} />
        <YAxis type="category" dataKey="name" {...axisProps} width={110} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.grid, opacity: 0.4 }} />
        <Bar dataKey="value" fill={CHART.primary} radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
