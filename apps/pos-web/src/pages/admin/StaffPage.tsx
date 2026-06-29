import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Plus, Trash2, UserCog } from 'lucide-react';
import { staffApi, type CreateStaffInput } from '@/api/staff';
import { rolesApi } from '@/api/roles';
import { useAuthStore } from '@/stores/auth.store';
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
  const currentUser = useAuthStore((s) => s.user);
  const staffQuery = useQuery({ queryKey: ['staff'], queryFn: staffApi.list });
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['staff'] });

  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Staff | null>(null);

  const onError = (e: unknown) =>
    toast.error(e instanceof AxiosError ? ((e.response?.data as { message?: string })?.message ?? 'Failed') : 'Failed');

  const createMut = useMutation({
    mutationFn: (input: CreateStaffInput) => staffApi.create(input),
    onSuccess: () => { toast.success('Staff member added'); setFormOpen(false); invalidate(); },
    onError,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) => staffApi.setStatus(id, status),
    onSuccess: invalidate,
    onError,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => staffApi.remove(id),
    onSuccess: () => { toast.success('Staff member removed'); setDeleting(null); invalidate(); },
    onError,
  });

  const staff = staffQuery.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Staff"
        description="Manage team members and their access."
        actions={<Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> Add Staff</Button>}
      />

      {staffQuery.isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : staff.length === 0 ? (
        <EmptyState icon={UserCog} title="No staff yet" description="Add your team members to give them access." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Username</TH>
              <TH>Role</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
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
                        <div className="font-medium text-foreground">{s.fullName}{isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}</div>
                        <div className="text-xs text-muted-foreground">{s.email}</div>
                      </div>
                    </div>
                  </TD>
                  <TD className="text-muted-foreground">{s.username}</TD>
                  <TD><Badge variant="default">{s.role.name}</Badge></TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={active}
                        disabled={isSelf || statusMut.isPending}
                        onCheckedChange={(v) => statusMut.mutate({ id: s.id, status: v ? 'ACTIVE' : 'INACTIVE' })}
                      />
                      <Badge variant={active ? 'success' : 'secondary'}>{s.status}</Badge>
                    </div>
                  </TD>
                  <TD className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      disabled={isSelf}
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
        roles={rolesQuery.data ?? []}
        pending={createMut.isPending}
        onOpenChange={setFormOpen}
        onSubmit={(v) => createMut.mutate(v)}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.fullName}?`}
        description="This staff member will be removed and their sessions revoked."
        confirmLabel="Delete"
        destructive
        loading={deleteMut.isPending}
        onConfirm={() => { if (deleting) deleteMut.mutate(deleting.id); }}
      />
    </div>
  );
}

function StaffForm({
  open,
  roles,
  pending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  roles: { id: string; name: string }[];
  pending: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (v: CreateStaffInput) => void;
}) {
  const { register, handleSubmit, setValue, watch, reset } = useForm<CreateStaffInput>({
    defaultValues: { fullName: '', email: '', username: '', password: '', roleId: '' },
  });
  const roleId = watch('roleId');

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Staff Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => onSubmit(v))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" {...register('fullName', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input id="username" {...register('username', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password', { required: true })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={roleId} onValueChange={(v) => setValue('roleId', v, { shouldValidate: true })}>
              <SelectTrigger><SelectValue placeholder="Select role…" /></SelectTrigger>
              <SelectContent>
                {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <input type="hidden" {...register('roleId', { required: true })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || !roleId}>{pending ? 'Adding…' : 'Add staff'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
