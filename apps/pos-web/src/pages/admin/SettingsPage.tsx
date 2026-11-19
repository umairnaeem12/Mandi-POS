import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { ImagePlus, Loader2, Save, UtensilsCrossed } from 'lucide-react';
import { settingsApi, type UpdateSettingsInput } from '@/api/settings';
import { assetUrl } from '@/lib/assets';
import { t as tr, useLang } from '@/stores/lang.store';
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
  const { t } = useLang();
  const { data, isLoading } = useQuery({ queryKey: ['restaurant-settings'], queryFn: settingsApi.get });
  const [form, setForm] = useState<UpdateSettingsInput>({});

  useEffect(() => {
    if (data) {
      const { logoUrl: _logo, restaurantId: _id, ...rest } = data;
      setForm(rest);
    }
  }, [data]);

  const onError = (e: unknown) =>
    toast.error(e instanceof AxiosError ? ((e.response?.data as { message?: string })?.message ?? tr('common.somethingWentWrong')) : tr('common.somethingWentWrong'));

  const saveMut = useMutation({
    mutationFn: (input: UpdateSettingsInput) => settingsApi.update(input),
    onSuccess: () => { toast.success(tr('settings.saved')); qc.invalidateQueries({ queryKey: ['restaurant-settings'] }); },
    onError,
  });

  const logoMut = useMutation({
    mutationFn: (file: File) => settingsApi.uploadLogo(file),
    onSuccess: () => { toast.success(tr('settings.logoUpdated')); qc.invalidateQueries({ queryKey: ['restaurant-settings'] }); },
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
      <Input id={k} type={type} dir={type === 'email' ? 'ltr' : undefined} value={val(k)} onChange={(e) => set(k, type === 'number' ? Number(e.target.value) : e.target.value)} />
    </div>
  );

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader
        title={t('settings.title')}
        description={t('settings.subtitle')}
        actions={
          <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>
            {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('common.saveChanges')}
          </Button>
        }
      />

      {/* Branding */}
      <Card>
        <CardHeader><CardTitle>{t('settings.branding')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {data?.logoUrl ? (
                <img src={assetUrl(data.logoUrl)} alt={t('settings.logoAlt')} className="h-full w-full object-cover" />
              ) : (
                <UtensilsCrossed className="h-7 w-7 text-muted-foreground/40" />
              )}
            </div>
            <label className="inline-flex cursor-pointer">
              <span className="inline-flex h-10 items-center gap-2 rounded-md border border-input bg-card px-4 text-sm font-medium shadow-sm hover:bg-accent">
                <ImagePlus className="h-4 w-4" />
                {logoMut.isPending ? t('settings.uploading') : t('settings.uploadLogo')}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) logoMut.mutate(f); }} />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {field(t('settings.restaurantName'), 'restaurantName')}
            {field(t('common.email'), 'email', 'email')}
            {field(t('common.address'), 'address')}
            {field(t('settings.contactNumber'), 'contactNumber')}
          </div>
        </CardContent>
      </Card>

      {/* Tax & currency */}
      <Card>
        <CardHeader><CardTitle>{t('settings.taxCurrency')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">{t('settings.enableTax')}</div>
              <div className="text-xs text-muted-foreground">{t('settings.enableTaxHint')}</div>
            </div>
            <Switch checked={form.isTaxEnabled ?? false} onCheckedChange={(v) => set('isTaxEnabled', v)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {field(t('settings.currencyCode'), 'currencyCode')}
            {field(t('settings.currencySymbol'), 'currencySymbol')}
            {field(t('settings.taxName'), 'taxName')}
            {field(t('settings.taxPercent'), 'taxPercentage', 'number')}
          </div>
        </CardContent>
      </Card>

      {/* Receipt */}
      <Card>
        <CardHeader><CardTitle>{t('settings.receiptInvoice')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {field(t('settings.invoicePrefix'), 'invoicePrefix')}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="receiptHeader">{t('settings.receiptHeader')}</Label>
            <Textarea id="receiptHeader" value={val('receiptHeader')} onChange={(e) => set('receiptHeader', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="receiptFooter">{t('settings.receiptFooter')}</Label>
            <Textarea id="receiptFooter" value={val('receiptFooter')} onChange={(e) => set('receiptFooter', e.target.value)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
