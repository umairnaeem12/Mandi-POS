import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { ImagePlus, Loader2, Save, UtensilsCrossed } from 'lucide-react';
import { settingsApi, type UpdateSettingsInput } from '@/api/settings';
import { assetUrl } from '@/lib/assets';
import { toast } from '@/components/ui/sonner';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['restaurant-settings'], queryFn: settingsApi.get });
  const [form, setForm] = useState<UpdateSettingsInput>({});

  useEffect(() => {
    if (data) {
      const { logoUrl: _logo, restaurantId: _id, ...rest } = data;
      setForm(rest);
    }
  }, [data]);

  const onError = (e: unknown) =>
    toast.error(e instanceof AxiosError ? ((e.response?.data as { message?: string })?.message ?? 'Failed') : 'Failed');

  const saveMut = useMutation({
    mutationFn: (input: UpdateSettingsInput) => settingsApi.update(input),
    onSuccess: () => { toast.success('Settings saved'); qc.invalidateQueries({ queryKey: ['restaurant-settings'] }); },
    onError,
  });

  const logoMut = useMutation({
    mutationFn: (file: File) => settingsApi.uploadLogo(file),
    onSuccess: () => { toast.success('Logo updated'); qc.invalidateQueries({ queryKey: ['restaurant-settings'] }); },
    onError,
  });

  const set = (k: keyof UpdateSettingsInput, v: string | number | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const val = (k: keyof UpdateSettingsInput) => (form[k] as string | number | undefined) ?? '';

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // A render function (not a component) so inputs don't remount/lose focus on each keystroke.
  const field = (label: string, k: keyof UpdateSettingsInput, type = 'text') => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} value={val(k)} onChange={(e) => set(k, type === 'number' ? Number(e.target.value) : e.target.value)} />
    </div>
  );

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader
        title="Restaurant Settings"
        description="Branding, tax, currency, and receipt configuration."
        actions={
          <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>
            {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        }
      />

      {/* Branding */}
      <Card>
        <CardHeader><CardTitle>Branding</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {data?.logoUrl ? (
                <img src={assetUrl(data.logoUrl)} alt="logo" className="h-full w-full object-cover" />
              ) : (
                <UtensilsCrossed className="h-7 w-7 text-muted-foreground/40" />
              )}
            </div>
            <label className="inline-flex cursor-pointer">
              <span className="inline-flex h-10 items-center gap-2 rounded-md border border-input bg-card px-4 text-sm font-medium shadow-sm hover:bg-accent">
                <ImagePlus className="h-4 w-4" />
                {logoMut.isPending ? 'Uploading…' : 'Upload logo'}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) logoMut.mutate(f); }} />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('Restaurant name', 'restaurantName')}
            {field('Email', 'email', 'email')}
            {field('Address', 'address')}
            {field('Contact number', 'contactNumber')}
          </div>
        </CardContent>
      </Card>

      {/* Tax & currency */}
      <Card>
        <CardHeader><CardTitle>Tax & Currency</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Enable tax</div>
              <div className="text-xs text-muted-foreground">Apply tax to invoices automatically.</div>
            </div>
            <Switch checked={form.isTaxEnabled ?? false} onCheckedChange={(v) => set('isTaxEnabled', v)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {field('Currency code', 'currencyCode')}
            {field('Currency symbol', 'currencySymbol')}
            {field('Tax name', 'taxName')}
            {field('Tax %', 'taxPercentage', 'number')}
          </div>
        </CardContent>
      </Card>

      {/* Receipt */}
      <Card>
        <CardHeader><CardTitle>Receipt & Invoice</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {field('Invoice prefix', 'invoicePrefix')}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="receiptHeader">Receipt header</Label>
            <Textarea id="receiptHeader" value={val('receiptHeader')} onChange={(e) => set('receiptHeader', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="receiptFooter">Receipt footer</Label>
            <Textarea id="receiptFooter" value={val('receiptFooter')} onChange={(e) => set('receiptFooter', e.target.value)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
