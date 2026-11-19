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
import { intlLocale, type Lang } from '@/i18n';
import { useLang } from '@/stores/lang.store';
import { CHART, DONUT_COLORS } from './palette';

const axisProps = {
  stroke: CHART.axis,
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

function compact(n: number, lang: Lang): string {
  return Intl.NumberFormat(intlLocale(lang) ?? 'en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
}

// The backend sends English bucket labels ("Mon", "Jan 5", "3 PM"); swap the
// month, weekday and AM/PM tokens for Arabic so the axis follows the UI language.
const AR_TOKENS: Record<string, string> = (() => {
  const map: Record<string, string> = { AM: 'ص', PM: 'م' };
  const ar = intlLocale('ar');
  for (let m = 0; m < 12; m++) {
    const d = new Date(2024, m, 1);
    map[d.toLocaleDateString('en-US', { month: 'short' })] = d.toLocaleDateString(ar, { month: 'long' });
  }
  for (let i = 0; i < 7; i++) {
    const d = new Date(2024, 0, 7 + i); // 7 Jan 2024 is a Sunday
    map[d.toLocaleDateString('en-US', { weekday: 'short' })] = d.toLocaleDateString(ar, { weekday: 'long' });
  }
  return map;
})();

function localizeLabel(label: string, lang: Lang): string {
  if (lang !== 'ar' || typeof label !== 'string') return label;
  const day = /^([A-Z][a-z]{2}) (\d{1,2})$/.exec(label);
  if (day && AR_TOKENS[day[1]]) return `${day[2]} ${AR_TOKENS[day[1]]}`;
  return label.replace(/\b[A-Z][A-Za-z]{1,2}\b/g, (tok) => AR_TOKENS[tok] ?? tok);
}

interface TooltipPayload {
  active?: boolean;
  payload?: { name: string; value: number; color?: string; payload?: Record<string, unknown> }[];
  label?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  timeLabel,
}: TooltipPayload & { formatter?: (v: number) => string; timeLabel?: boolean }) {
  const { lang, dir } = useLang();
  if (!active || !payload?.length) return null;
  return (
    <div dir={dir} className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
      {label && (
        <div className="mb-1 font-medium text-foreground">
          {timeLabel ? localizeLabel(label, lang) : label}
        </div>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="capitalize">{p.name}:</span>
          <span className="font-semibold text-foreground">
            {formatter ? formatter(p.value) : compact(p.value, lang)}
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
  seriesName,
}: {
  data: T[];
  dataKey?: string;
  height?: number;
  moneyFormatter?: (v: number) => string;
  seriesName?: string;
}) {
  const { t, lang } = useLang();
  // Charts stay LTR inside: recharts misplaces axis ticks under dir="rtl".
  return (
    <div dir="ltr">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.3} />
              <stop offset="100%" stopColor={CHART.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" {...axisProps} tickFormatter={(v: string) => localizeLabel(v, lang)} />
          <YAxis {...axisProps} tickFormatter={(v: number) => compact(v, lang)} width={42} />
          <Tooltip content={<ChartTooltip formatter={moneyFormatter} timeLabel />} cursor={{ stroke: CHART.grid }} />
          <Area
            type="monotone"
            dataKey={dataKey}
            name={seriesName ?? t('dashboard.revenue')}
            stroke={CHART.primary}
            strokeWidth={2.5}
            fill="url(#areaFill)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- Vertical bars (orders over time) ----
export function BarSeriesChart<T extends { label: string }>({
  data,
  dataKey = 'orders',
  height = 260,
  color = CHART.info,
  seriesName,
}: {
  data: T[];
  dataKey?: string;
  height?: number;
  color?: string;
  seriesName?: string;
}) {
  const { t, lang } = useLang();
  return (
    <div dir="ltr">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
          <XAxis dataKey="label" {...axisProps} tickFormatter={(v: string) => localizeLabel(v, lang)} />
          <YAxis {...axisProps} allowDecimals={false} width={36} />
          <Tooltip content={<ChartTooltip timeLabel />} cursor={{ fill: CHART.grid, opacity: 0.4 }} />
          <Bar
            dataKey={dataKey}
            name={seriesName ?? t('common.orders')}
            fill={color}
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
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
  const { t } = useLang();
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        {t('dashboard.noDataYet')}
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
  seriesName,
}: {
  data: { name: string; value: number }[];
  height?: number;
  seriesName?: string;
}) {
  const { t, lang, isAr } = useLang();
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        {t('dashboard.noDataYet')}
      </div>
    );
  }
  // Mirrored by hand in Arabic (labels on the right, bars growing leftwards).
  return (
    <div dir="ltr">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: isAr ? 0 : 12, left: isAr ? 12 : 0, bottom: 0 }}
        >
          <XAxis type="number" {...axisProps} reversed={isAr} tickFormatter={(v: number) => compact(v, lang)} />
          <YAxis
            type="category"
            dataKey="name"
            {...axisProps}
            orientation={isAr ? 'right' : 'left'}
            width={110}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.grid, opacity: 0.4 }} />
          <Bar
            dataKey="value"
            name={seriesName ?? t('common.quantity')}
            fill={CHART.primary}
            radius={isAr ? [4, 0, 0, 4] : [0, 4, 4, 0]}
            maxBarSize={22}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
