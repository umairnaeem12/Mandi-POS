import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity as ActivityIcon,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  DollarSign,
  LayoutGrid,
  Package,
  TrendingUp,
  Users,
} from 'lucide-react';
import { dashboardApi } from '@/api/dashboard';
import { reportsApi, type Period } from '@/api/reports';
import { tablesApi } from '@/api/tables';
import { useSocketEvent } from '@/lib/socket';
import { useAuthStore } from '@/stores/auth.store';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useLang } from '@/stores/lang.store';
import type { TKey } from '@/i18n';
import { formatMoney, timeAgo } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { StatCardSkeleton } from '@/components/Skeletons';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartCard } from '@/components/charts/ChartCard';
import { AreaTrendChart, BarSeriesChart, DonutChart, HorizontalBarChart } from '@/components/charts';
import { CHART } from '@/components/charts/palette';

const PERIODS: { value: Period; label: TKey }[] = [
  { value: 'today', label: 'common.today' },
  { value: 'weekly', label: 'dashboard.periodWeek' },
  { value: 'monthly', label: 'dashboard.periodMonth' },
  { value: 'yearly', label: 'dashboard.periodYear' },
];

const TABLE_STATUS = [
  { key: 'AVAILABLE', color: CHART.success },
  { key: 'OCCUPIED', color: CHART.primary },
  { key: 'RESERVED', color: CHART.warning },
  { key: 'CLEANING', color: CHART.slate },
];

export function DashboardPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { currency } = useRestaurant();
  const { t, tEnum } = useLang();
  const [period, setPeriod] = useState<Period>('today');
  const money = (v: number) => formatMoney(v, currency);

  const summary = useQuery({ queryKey: ['dashboard-summary'], queryFn: dashboardApi.summary });
  const series = useQuery({
    queryKey: ['dashboard-series', period],
    queryFn: () => dashboardApi.salesSeries(period),
  });
  const sales = useQuery({ queryKey: ['report-sales', period], queryFn: () => reportsApi.sales(period) });
  const todaySales = useQuery({ queryKey: ['report-sales', 'today'], queryFn: () => reportsApi.sales('today') });
  const bestSelling = useQuery({ queryKey: ['best-selling'], queryFn: () => reportsApi.bestSelling(6) });
  const tables = useQuery({ queryKey: ['tables'], queryFn: tablesApi.list });
  const inventory = useQuery({ queryKey: ['inventory-status'], queryFn: dashboardApi.inventoryStatus });
  const activities = useQuery({ queryKey: ['dashboard-activities'], queryFn: dashboardApi.recentActivities });

  // Live refresh
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    qc.invalidateQueries({ queryKey: ['dashboard-series'] });
    qc.invalidateQueries({ queryKey: ['report-sales'] });
    qc.invalidateQueries({ queryKey: ['dashboard-activities'] });
    qc.invalidateQueries({ queryKey: ['tables'] });
  };
  useSocketEvent('dashboard.recent_activity_created', refresh);
  useSocketEvent('invoice.paid', refresh);
  useSocketEvent('order.created', refresh);
  useSocketEvent('order.status_changed', refresh);
  useSocketEvent('table.status_changed', () => qc.invalidateQueries({ queryKey: ['tables'] }));

  const s = summary.data;
  const loading = summary.isLoading;

  const paymentData = sales.data
    ? [
        { name: tEnum('paymentMethod', 'CASH'), value: sales.data.cashPayments },
        { name: tEnum('paymentMethod', 'CARD'), value: sales.data.cardPayments },
        { name: t('dashboard.onlineBank'), value: sales.data.onlinePayments },
      ].filter((d) => d.value > 0)
    : [];

  const tableStatusData = TABLE_STATUS.map((ts) => ({
    name: tEnum('tableStatus', ts.key),
    value: (tables.data ?? []).filter((tb) => tb.status === ts.key).length,
  })).filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('shell.navDashboard')}
        description={t('dashboard.welcome', { name: user?.fullName?.split(' ')[0] ?? '' })}
        actions={
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
              {PERIODS.map((p) => (
                <TabsTrigger key={p.value} value={p.value}>
                  {t(p.label)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard index={0} label={t('dashboard.todaySales')} value={money(s?.todaySales ?? 0)} icon={DollarSign} tone="success" />
            <StatCard index={1} label={t('dashboard.ordersToday')} value={s?.totalOrdersToday ?? 0} icon={ClipboardList} tone="info" />
            <StatCard index={2} label={t('dashboard.completedToday')} value={s?.completedOrdersToday ?? 0} icon={CheckCircle2} tone="success" />
            <StatCard index={3} label={t('dashboard.pendingOrders')} value={s?.pendingOrders ?? 0} icon={Clock} tone="warning" />
            <StatCard index={4} label={t('dashboard.avgOrderValue')} value={money(todaySales.data?.averageOrderValue ?? 0)} icon={TrendingUp} tone="primary" />
            <StatCard index={5} label={t('dashboard.occupiedTables')} value={s?.occupiedTables ?? 0} icon={LayoutGrid} tone="info" />
            <StatCard index={6} label={t('dashboard.lowStockItems')} value={s?.lowStockItems ?? 0} icon={AlertTriangle} tone={s && s.lowStockItems > 0 ? 'destructive' : 'neutral'} />
            <StatCard index={7} label={t('dashboard.activeStaff')} value={s?.activeStaff ?? 0} icon={Users} tone="neutral" />
          </>
        )}
      </div>

      {/* Sales + payments */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title={t('dashboard.salesOverview')}
          subtitle={
            series.data
              ? t('dashboard.revenueOrders', {
                  revenue: money(series.data.totalRevenue),
                  n: series.data.totalOrders,
                })
              : undefined
          }
          className="lg:col-span-2"
          index={0}
        >
          {series.isLoading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : (
            <AreaTrendChart data={series.data?.points ?? []} moneyFormatter={money} />
          )}
        </ChartCard>

        <ChartCard title={t('dashboard.revenueByPayment')} subtitle={t('dashboard.byPaymentMethod')} index={1}>
          {sales.isLoading ? <Skeleton className="h-[240px] w-full" /> : <DonutChart data={paymentData} moneyFormatter={money} />}
        </ChartCard>
      </div>

      {/* Orders + best selling + tables */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title={t('common.orders')} subtitle={t('dashboard.orderCountOverTime')} index={0}>
          {series.isLoading ? <Skeleton className="h-[260px] w-full" /> : <BarSeriesChart data={series.data?.points ?? []} />}
        </ChartCard>

        <ChartCard title={t('dashboard.bestSelling')} subtitle={t('dashboard.byQuantitySold')} index={1}>
          {bestSelling.isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <HorizontalBarChart
              data={(bestSelling.data ?? []).map((b) => ({ name: b.itemName, value: b.totalQuantitySold }))}
            />
          )}
        </ChartCard>

        <ChartCard title={t('dashboard.tableStatus')} subtitle={t('dashboard.currentFloor')} index={2}>
          {tables.isLoading ? (
            <Skeleton className="h-[240px] w-full" />
          ) : (
            <DonutChart data={tableStatusData} colors={TABLE_STATUS.map((ts) => ts.color)} />
          )}
        </ChartCard>
      </div>

      {/* Activity + inventory */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title={t('shell.recentActivity')}
          subtitle={t('dashboard.liveFeed')}
          className="lg:col-span-2"
          index={0}
        >
          {activities.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : activities.data?.length === 0 ? (
            <EmptyState
              icon={ActivityIcon}
              title={t('dashboard.noActivity')}
              description={t('dashboard.noActivityDesc')}
              className="py-10"
            />
          ) : (
            <div className="max-h-[360px] space-y-1 overflow-y-auto scrollbar-thin pe-1">
              {activities.data?.map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-md px-2 py-2 hover:bg-accent">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{a.description}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {tEnum('module', a.module)} · {timeAgo(a.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title={t('dashboard.inventoryAlerts')} subtitle={t('dashboard.lowOutOfStock')} index={1}>
          {inventory.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : inventory.data?.lowStockItems.length === 0 ? (
            <EmptyState
              icon={Package}
              title={t('dashboard.stockHealthy')}
              description={t('dashboard.noLowStock')}
              className="py-10"
            />
          ) : (
            <div className="space-y-2">
              {inventory.data?.lowStockItems.slice(0, 6).map((item) => {
                const cur = Number(item.currentStock);
                const limit = Number(item.lowStockLimit) || 1;
                const pct = Math.min(100, (cur / limit) * 100);
                const out = cur <= 0;
                return (
                  <div key={item.id} className="rounded-lg border p-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{item.name}</span>
                      <span className={out ? 'text-destructive' : 'text-warning-foreground'}>
                        {cur} / {limit} {tEnum('unit', item.unit)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={out ? 'h-full bg-destructive' : 'h-full bg-warning'}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
