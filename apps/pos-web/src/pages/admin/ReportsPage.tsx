import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, DollarSign, Percent, Receipt, TrendingUp } from 'lucide-react';
import { reportsApi, type Period } from '@/api/reports';
import { useRestaurant } from '@/hooks/useRestaurant';
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

const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'weekly', label: 'Week' },
  { value: 'monthly', label: 'Month' },
  { value: 'yearly', label: 'Year' },
];

export function ReportsPage() {
  const [period, setPeriod] = useState<Period>('weekly');
  const { currency } = useRestaurant();
  const money = (v: number) => formatMoney(v, currency);

  const sales = useQuery({ queryKey: ['report-sales', period], queryFn: () => reportsApi.sales(period) });
  const series = useQuery({ queryKey: ['report-series', period], queryFn: () => reportsApi.salesSeries(period) });
  const best = useQuery({ queryKey: ['report-best'], queryFn: () => reportsApi.bestSelling(8) });
  const staff = useQuery({ queryKey: ['report-staff'], queryFn: () => reportsApi.staffPerformance() });
  const tables = useQuery({ queryKey: ['report-tables'], queryFn: () => reportsApi.tableSales() });

  const s = sales.data;
  const paymentData = s
    ? [
        { name: 'Cash', value: s.cashPayments },
        { name: 'Card', value: s.cardPayments },
        { name: 'Online / Bank', value: s.onlinePayments },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Sales, items, tables, and staff performance."
        actions={
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
              {PERIODS.map((p) => <TabsTrigger key={p.value} value={p.value}>{p.label}</TabsTrigger>)}
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
            <StatCard index={0} label="Revenue" value={money(s?.totalRevenue ?? 0)} icon={DollarSign} tone="success" />
            <StatCard index={1} label="Orders" value={s?.totalOrders ?? 0} icon={Receipt} tone="info" />
            <StatCard index={2} label="Avg Order" value={money(s?.averageOrderValue ?? 0)} icon={TrendingUp} tone="primary" />
            <StatCard index={3} label="Tax" value={money(s?.totalTax ?? 0)} icon={Percent} tone="neutral" />
            <StatCard index={4} label="Discount" value={money(s?.totalDiscount ?? 0)} icon={BarChart3} tone="warning" />
          </>
        )}
      </div>

      {/* Sales + payments */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Sales Over Time"
          subtitle={series.data ? `${money(series.data.totalRevenue)} · ${series.data.totalOrders} orders` : undefined}
          className="lg:col-span-2"
        >
          {series.isLoading ? <Skeleton className="h-[260px] w-full" /> : <AreaTrendChart data={series.data?.points ?? []} moneyFormatter={money} />}
        </ChartCard>
        <ChartCard title="Revenue by Payment">
          {sales.isLoading ? <Skeleton className="h-[240px] w-full" /> : <DonutChart data={paymentData} moneyFormatter={money} />}
        </ChartCard>
      </div>

      {/* Best selling + table sales */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Best Selling Items" subtitle="By quantity sold">
          {best.isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (best.data?.length ?? 0) === 0 ? (
            <EmptyState title="No sales yet" className="py-12" />
          ) : (
            <HorizontalBarChart data={(best.data ?? []).map((b) => ({ name: b.itemName, value: b.totalQuantitySold }))} />
          )}
        </ChartCard>

        <ChartCard title="Table-wise Sales" subtitle="Completed orders revenue">
          {tables.isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <div className="max-h-[280px] overflow-y-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="py-2">Table</th><th className="py-2">Orders</th><th className="py-2 text-right">Sales</th></tr>
                </thead>
                <tbody>
                  {tables.data?.map((t) => (
                    <tr key={t.tableId} className="border-t">
                      <td className="py-2 font-medium text-foreground">{t.name}</td>
                      <td className="py-2 text-muted-foreground">{t.completedOrders}</td>
                      <td className="py-2 text-right font-medium">{money(t.totalSales)}</td>
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
        <h2 className="text-lg font-semibold">Staff Performance</h2>
        {staff.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Staff</TH><TH>Role</TH><TH>Orders</TH><TH>Invoices</TH><TH className="text-right">Sales</TH>
              </TR>
            </THead>
            <TBody>
              {staff.data?.map((s2) => (
                <TR key={s2.staffId} className="hover:bg-accent/40">
                  <TD className="font-medium text-foreground">{s2.staffName}</TD>
                  <TD><Badge variant="default">{s2.role}</Badge></TD>
                  <TD className="text-muted-foreground">{s2.ordersCreated}</TD>
                  <TD className="text-muted-foreground">{s2.invoicesGenerated}</TD>
                  <TD className="text-right font-semibold">{money(s2.totalSales)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </div>
  );
}
