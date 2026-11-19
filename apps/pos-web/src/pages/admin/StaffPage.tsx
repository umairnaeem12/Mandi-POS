import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Pencil, Plus, Trash2, UserCog } from 'lucide-react';
import { staffApi, type CreateStaffInput, type UpdateStaffInput } from '@/api/staff';
import { rolesApi } from '@/api/roles';
import { useAuthStore } from '@/stores/auth.store';
import { t as tr, useLang } from '@/stores/lang.store';
import { initials } from '@/lib/format';
import { toast } from '@/components/ui/sonner';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { TableSkeleton } from '@/components/Skeletons';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Staff } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function StaffPage() {
  const qc = useQueryClient();
  const { t, tEnum } = useLang();
  const currentUser = useAuthStore((s) => s.user);
  const staffQuery = useQuery({ queryKey: ['staff'], queryFn: staffApi.list });
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['staff'] });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [deleting, setDeleting] = useState<Staff | null>(null);

  const onError = (e: unknown) =>
    toast.error(e instanceof AxiosError ? ((e.response?.data as { message?: string })?.message ?? tr('common.somethingWentWrong')) : tr('common.somethingWentWrong'));

  const createMut = useMutation({
    mutationFn: (input: CreateStaffInput) => staffApi.create(input),
    onSuccess: () => { toast.success(tr('staff.added')); setFormOpen(false); invalidate(); },
    onError,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateStaffInput }) => staffApi.update(id, input),
    onSuccess: (_, { input }) => {
      toast.success(tr(input.password ? 'staff.passwordReset' : 'staff.updated'));
      setFormOpen(false);
      invalidate();
    },
    onError,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) => staffApi.setStatus(id, status),
    onSuccess: invalidate,
    onError,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => staffApi.remove(id),
    onSuccess: () => { toast.success(tr('staff.removed')); setDeleting(null); invalidate(); },
    onError,
  });

  const staff = staffQuery.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('staff.title')}
        description={t('staff.subtitle')}
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> {t('staff.addStaff')}</Button>}
      />

      {staffQuery.isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : staff.length === 0 ? (
        <EmptyState icon={UserCog} title={t('staff.emptyTitle')} description={t('staff.emptyDesc')} />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>{t('common.name')}</TH>
              <TH>{t('staff.username')}</TH>
              <TH>{t('common.role')}</TH>
              <TH>{t('common.status')}</TH>
              <TH className="text-end">{t('common.actions')}</TH>
            </TR>
          </THead>
          <TBody>
            {staff.map((s) => {
              const isSelf = s.id === currentUser?.id;
              const active = s.status === 'ACTIVE';
              return (
                <TR key={s.id} className="hover:bg-accent/40">
                  <TD>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8"><AvatarFallback>{initials(s.fullName)}</AvatarFallback></Avatar>
                      <div>
                        <div className="font-medium text-foreground">{s.fullName}{isSelf && <span className="ms-1 text-xs text-muted-foreground">{t('staff.you')}</span>}</div>
                        <div className="text-xs text-muted-foreground">{s.email}</div>
                      </div>
                    </div>
                  </TD>
                  <TD className="text-muted-foreground">{s.username}</TD>
                  <TD><Badge variant="default">{tEnum('role', s.role.name)}</Badge></TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={active}
                        disabled={isSelf || statusMut.isPending}
                        onCheckedChange={(v) => statusMut.mutate({ id: s.id, status: v ? 'ACTIVE' : 'INACTIVE' })}
                      />
                      <Badge variant={active ? 'success' : 'secondary'}>{tEnum('staffStatus', s.status)}</Badge>
                    </div>
                  </TD>
                  <TD className="text-end">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('staff.editStaff')}
                      title={t('staff.editStaff')}
                      onClick={() => { setEditing(s); setFormOpen(true); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      disabled={isSelf}
                      aria-label={t('staff.deleteStaff')}
                      title={t('staff.deleteStaff')}
                      onClick={() => setDeleting(s)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}

      <StaffForm
        open={formOpen}
        editing={editing}
        isSelf={!!editing && editing.id === currentUser?.id}
        roles={rolesQuery.data ?? []}
        pending={createMut.isPending || updateMut.isPending}
        onOpenChange={setFormOpen}
        onCreate={(v) => createMut.mutate(v)}
        onUpdate={(id, input) => updateMut.mutate({ id, input })}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t('staff.deleteTitle', { name: deleting?.fullName ?? '' })}
        description={t('staff.deleteDesc')}
        confirmLabel={t('common.delete')}
        destructive
        loading={deleteMut.isPending}
        onConfirm={() => { if (deleting) deleteMut.mutate(deleting.id); }}
      />
    </div>
  );
}

interface StaffFormProps {
  open: boolean;
  editing: Staff | null;
  isSelf: boolean;
  roles: { id: string; name: string }[];
  pending: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (v: CreateStaffInput) => void;
  onUpdate: (id: string, v: UpdateStaffInput) => void;
}

const EMPTY_FORM: CreateStaffInput = { fullName: '', email: '', username: '', password: '', roleId: '' };

function StaffForm({ open, editing, isSelf, roles, pending, onOpenChange, onCreate, onUpdate }: StaffFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateStaffInput>({ defaultValues: EMPTY_FORM });
  const roleId = watch('roleId');
  const { t, tEnum } = useLang();

  useEffect(() => {
    if (!open) return;
    reset(
      editing
        ? { fullName: editing.fullName, email: editing.email, username: editing.username, password: '', roleId: editing.roleId }
        : EMPTY_FORM,
    );
  }, [open, editing, reset]);

  const submit = (v: CreateStaffInput) => {
    if (!editing) return onCreate(v);
    const { password, roleId: nextRole, ...rest } = v;
    onUpdate(editing.id, {
      ...rest,
      // The backend rejects a role change on your own account, so don't send one.
      ...(isSelf ? {} : { roleId: nextRole }),
      ...(password ? { password } : {}),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? t('staff.editTitle', { name: editing.fullName }) : t('staff.addStaffMember')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">{t('staff.fullName')}</Label>
              <Input id="fullName" {...register('fullName', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">{t('common.email')}</Label>
              <Input id="email" type="email" dir="ltr" {...register('email', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="username">{t('staff.username')}</Label>
              <Input
                id="username"
                dir="ltr"
                aria-invalid={!!errors.username}
                {...register('username', { required: true, minLength: 3 })}
              />
              {errors.username?.type === 'minLength' && (
                <p className="text-xs text-destructive">{t('staff.usernameMin')}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{editing ? t('staff.newPassword') : t('common.password')}</Label>
              <Input
                id="password"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                aria-describedby={editing ? 'password-hint' : undefined}
                {...register('password', { required: !editing, minLength: 6 })}
              />
              {errors.password?.type === 'minLength' ? (
                <p className="text-xs text-destructive">{t('staff.passwordMin')}</p>
              ) : (
                editing && (
                  <p id="password-hint" className="text-xs text-muted-foreground">
                    {t('staff.newPasswordHint')}
                  </p>
                )
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t('common.role')}</Label>
            <Select
              value={roleId}
              disabled={isSelf}
              onValueChange={(v) => setValue('roleId', v, { shouldValidate: true })}
            >
              <SelectTrigger><SelectValue placeholder={t('staff.selectRole')} /></SelectTrigger>
              <SelectContent>
                {roles.map((r) => <SelectItem key={r.id} value={r.id}>{tEnum('role', r.name)}</SelectItem>)}
              </SelectContent>
            </Select>
            <input type="hidden" {...register('roleId', { required: true })} />
            {isSelf && <p className="text-xs text-muted-foreground">{t('staff.ownRoleLocked')}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={pending || !roleId}>{editing
                ? pending ? t('common.saving') : t('common.saveChanges')
                : pending ? t('staff.adding') : t('staff.addStaff')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
