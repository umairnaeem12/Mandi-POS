// Concrete hex values mirroring the CSS theme tokens (Recharts needs real colors,
// not CSS var() references, on SVG presentation attributes).
export const CHART = {
  primary: '#f97316',
  primarySoft: '#fed7aa',
  success: '#16a34a',
  info: '#3b82f6',
  warning: '#f59e0b',
  danger: '#dc2626',
  purple: '#8b5cf6',
  slate: '#64748b',
  grid: '#e2e8f0',
  axis: '#94a3b8',
};

export const DONUT_COLORS = [
  CHART.primary,
  CHART.info,
  CHART.success,
  CHART.purple,
  CHART.warning,
  CHART.danger,
];
