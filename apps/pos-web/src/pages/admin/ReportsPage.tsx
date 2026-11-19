import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, DollarSign, Percent, Receipt, TrendingUp } from 'lucide-react';
import { reportsApi, type Period } from '@/api/reports';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useLang } from '@/stores/lang.store';
import type { TKey } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { StatCardSkeleton } from '@/components/Skeletons';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChartCard } from '@/components/charts/ChartCard';
import { AreaTrendChart, DonutChart, HorizontalBarChart } from '@/components/charts';

const PERIODS: { value: Period; label: TKey }[] = [
  { value: 'today', label: 'common.today' },
  { value: 'weekly', label: 'dashboard.periodWeek' },
  { value: 'monthly', label: 'dashboard.periodMonth' },
  { value: 'yearly', label: 'dashboard.periodYear' },
];

export function ReportsPage() {
  const [period, setPeriod] = useState<Period>('weekly');
  const { currency } = useRestaurant();
  const { t, tEnum } = useLang();
  const money = (v: number) => formatMoney(v, currency);

  const sales = useQuery({ queryKey: ['report-sales', period], queryFn: () => reportsApi.sales(period) });
  const series = useQuery({ queryKey: ['report-series', period], queryFn: () => reportsApi.salesSeries(period) });
  const best = useQuery({ queryKey: ['report-best'], queryFn: () => reportsApi.bestSelling(8) });
  const staff = useQuery({ queryKey: ['report-staff'], queryFn: () => reportsApi.staffPerformance() });
  const tables = useQuery({ queryKey: ['report-tables'], queryFn: () => reportsApi.tableSales() });

  const s = sales.data;
  const paymentData = s
    ? [
        { name: tEnum('paymentMethod', 'CASH'), value: s.cashPayments },
        { name: tEnum('paymentMethod', 'CARD'), value: s.cardPayments },
        { name: t('dashboard.onlineBank'), value: s.onlinePayments },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('shell.navReports')}
        description={t('reports.description')}
        actions={
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
              {PERIODS.map((p) => <TabsTrigger key={p.value} value={p.value}>{t(p.label)}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {sales.isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard index={0} label={t('dashboard.revenue')} value={money(s?.totalRevenue ?? 0)} icon={DollarSign} tone="success" />
            <StatCard index={1} label={t('common.orders')} value={s?.totalOrders ?? 0} icon={Receipt} tone="info" />
            <StatCard index={2} label={t('reports.avgOrder')} value={money(s?.averageOrderValue ?? 0)} icon={TrendingUp} tone="primary" />
            <StatCard index={3} label={t('common.tax')} value={money(s?.totalTax ?? 0)} icon={Percent} tone="neutral" />
            <StatCard index={4} label={t('common.discount')} value={money(s?.totalDiscount ?? 0)} icon={BarChart3} tone="warning" />
          </>
        )}
      </div>

      {/* Sales + payments */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title={t('reports.salesOverTime')}
          subtitle={
            series.data
              ? t('dashboard.revenueOrders', {
                  revenue: money(series.data.totalRevenue),
                  n: series.data.totalOrders,
                })
              : undefined
          }
          className="lg:col-span-2"
        >
          {series.isLoading ? <Skeleton className="h-[260px] w-full" /> : <AreaTrendChart data={series.data?.points ?? []} moneyFormatter={money} />}
        </ChartCard>
        <ChartCard title={t('dashboard.revenueByPayment')}>
          {sales.isLoading ? <Skeleton className="h-[240px] w-full" /> : <DonutChart data={paymentData} moneyFormatter={money} />}
        </ChartCard>
      </div>

      {/* Best selling + table sales */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={t('dashboard.bestSelling')} subtitle={t('dashboard.byQuantitySold')}>
          {best.isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (best.data?.length ?? 0) === 0 ? (
            <EmptyState title={t('reports.noSales')} className="py-12" />
          ) : (
            <HorizontalBarChart data={(best.data ?? []).map((b) => ({ name: b.itemName, value: b.totalQuantitySold }))} />
          )}
        </ChartCard>

        <ChartCard title={t('reports.tableSales')} subtitle={t('reports.completedOrdersRevenue')}>
          {tables.isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <div className="max-h-[280px] overflow-y-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card text-start text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2">{t('common.table')}</th>
                    <th className="py-2">{t('common.orders')}</th>
                    <th className="py-2 text-end">{t('reports.sales')}</th>
                  </tr>
                </thead>
                <tbody>
                  {tables.data?.map((tb) => (
                    <tr key={tb.tableId} className="border-t">
                      <td className="py-2 font-medium text-foreground">{tb.name}</td>
                      <td className="py-2 text-muted-foreground">{tb.completedOrders}</td>
                      <td className="py-2 text-end font-medium">{money(tb.totalSales)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Staff performance */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{t('reports.staffPerformance')}</h2>
        {staff.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>{t('reports.staff')}</TH>
                <TH>{t('common.role')}</TH>
                <TH>{t('common.orders')}</TH>
                <TH>{t('reports.invoices')}</TH>
                <TH className="text-end">{t('reports.sales')}</TH>
              </TR>
            </THead>
            <TBody>
              {staff.data?.map((s2) => (
                <TR key={s2.staffId} className="hover:bg-accent/40">
                  <TD className="font-medium text-foreground">{s2.staffName}</TD>
                  <TD><Badge variant="default">{tEnum('role', s2.role)}</Badge></TD>
                  <TD className="text-muted-foreground">{s2.ordersCreated}</TD>
                  <TD className="text-muted-foreground">{s2.invoicesGenerated}</TD>
                  <TD className="text-end font-semibold">{money(s2.totalSales)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </div>
  );
}
