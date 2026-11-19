import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { ShieldCheck, Users } from 'lucide-react';
import { permissionsApi, rolesApi } from '@/api/roles';
import { toast } from '@/components/ui/sonner';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Role } from '@/types';
import type { TKey } from '@/i18n';
import { t as tr, useLang } from '@/stores/lang.store';

// Permission names stay as stored; unknown keys (added server-side later) show raw.
function permLabel(t: (key: TKey) => string, name: string) {
  const key = `roles.perm_${name}` as TKey;
  const label = t(key);
  return label === key ? name : label;
}

export function RolesPage() {
  const qc = useQueryClient();
  const { t, tEnum } = useLang();
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });
  const permsQuery = useQuery({ queryKey: ['permissions'], queryFn: permissionsApi.list });
  const [editing, setEditing] = useState<Role | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const saveMut = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) => rolesApi.setPermissions(id, permissions),
    onSuccess: () => {
      toast.success(tr('roles.updated'));
      qc.invalidateQueries({ queryKey: ['roles'] });
      setEditing(null);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof AxiosError ? ((e.response?.data as { message?: string })?.message ?? tr('common.somethingWentWrong')) : tr('common.somethingWentWrong')),
  });

  const startEdit = (role: Role) => {
    setEditing(role);
    setSelected(new Set(role.permissions.map((p) => p.permission.name)));
  };

  const toggle = (name: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const allPerms = permsQuery.data ?? [];
  const allSelected = allPerms.length > 0 && allPerms.every((p) => selected.has(p.name));

  return (
    <div className="space-y-5">
      <PageHeader title={t('roles.title')} description={t('roles.subtitle')} />

      {rolesQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rolesQuery.data?.map((role) => (
            <Card key={role.id}>
              <CardContent className="flex items-center justify-between gap-3 pt-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      {tEnum('role', role.name)}
                      {role.isSystem && <Badge variant="secondary">{t('roles.system')}</Badge>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{t('roles.permissionCount', { n: role.permissions.length })}</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {t('roles.staffCount', { n: role._count?.users ?? 0 })}</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" onClick={() => startEdit(role)}>{t('common.edit')}</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('roles.dialogTitle', { name: tEnum('role', editing?.name) })}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-sm text-muted-foreground">{t('roles.selectedOf', { selected: selected.size, total: allPerms.length })}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(allSelected ? new Set() : new Set(allPerms.map((p) => p.name)))}
            >
              {allSelected ? t('roles.clearAll') : t('roles.selectAll')}
            </Button>
          </div>
          <div className="grid max-h-[55vh] grid-cols-1 gap-2 overflow-y-auto scrollbar-thin sm:grid-cols-2">
            {allPerms.map((perm) => {
              const on = selected.has(perm.name);
              return (
                <label
                  key={perm.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${on ? 'border-primary bg-primary/5' : 'hover:bg-accent'}`}
                >
                  <input type="checkbox" className="h-4 w-4 rounded border-input text-primary focus:ring-ring" checked={on} onChange={() => toggle(perm.name)} />
                  <span className="font-medium text-foreground">{permLabel(t, perm.name)}</span>
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
            <Button disabled={saveMut.isPending} onClick={() => editing && saveMut.mutate({ id: editing.id, permissions: [...selected] })}>
              {saveMut.isPending ? t('common.saving') : t('roles.savePermissions')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
