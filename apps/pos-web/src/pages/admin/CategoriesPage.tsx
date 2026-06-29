import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { categoriesApi, type Category, type CategoryInput } from '@/api/categories';
import { toast } from '@/components/ui/sonner';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { TableSkeleton } from '@/components/Skeletons';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function CategoriesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['categories', 'all'], queryFn: () => categoriesApi.list(true) });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['categories'] });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const onError = (e: unknown) =>
    toast.error(e instanceof AxiosError ? ((e.response?.data as { message?: string })?.message ?? 'Failed') : 'Failed');

  const saveMut = useMutation({
    mutationFn: (v: CategoryInput) => (editing ? categoriesApi.update(editing.id, v) : categoriesApi.create(v)),
    onSuccess: () => {
      toast.success(editing ? 'Category updated' : 'Category added');
      setFormOpen(false);
      setEditing(null);
      invalidate();
    },
    onError,
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => categoriesApi.update(id, { isActive }),
    onSuccess: invalidate,
    onError,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => {
      toast.success('Category deleted');
      setDeleting(null);
      invalidate();
    },
    onError,
  });

  const categories = data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Categories"
        description="Organize your menu into categories."
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Category
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No categories yet"
          description="Create your first category to group menu items."
          action={<Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> Add Category</Button>}
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Items</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {categories.map((c) => (
              <TR key={c.id} className="hover:bg-accent/40">
                <TD className="font-medium text-foreground">
                  {c.name}
                  {c.nameAr && <span dir="rtl" className="ml-2 text-xs text-muted-foreground">{c.nameAr}</span>}
                </TD>
                <TD className="text-muted-foreground">{c._count?.menuItems ?? 0}</TD>
                <TD>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={c.isActive}
                      onCheckedChange={(v) => toggleMut.mutate({ id: c.id, isActive: v })}
                    />
                    <Badge variant={c.isActive ? 'success' : 'secondary'}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </TD>
                <TD className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(c); setFormOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => setDeleting(c)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <CategoryForm
        key={editing?.id ?? 'new'}
        open={formOpen}
        editing={editing}
        pending={saveMut.isPending}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(null); }}
        onSubmit={(v) => saveMut.mutate(v)}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="This category will be removed. Items in it will need re-assigning."
        confirmLabel="Delete"
        destructive
        loading={deleteMut.isPending}
        onConfirm={() => { if (deleting) deleteMut.mutate(deleting.id); }}
      />
    </div>
  );
}

function CategoryForm({
  open,
  editing,
  pending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  editing: Category | null;
  pending: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (v: CategoryInput) => void;
}) {
  const { register, handleSubmit } = useForm<CategoryInput>({
    defaultValues: { name: editing?.name ?? '', nameAr: editing?.nameAr ?? '', description: editing?.description ?? '' },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Category' : 'Add Category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name (English)</Label>
              <Input id="name" placeholder="e.g. Grill" {...register('name', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nameAr">Name (Arabic)</Label>
              <Input id="nameAr" dir="rtl" placeholder="المشاوي" {...register('nameAr')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Input id="description" {...register('description')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Saving…' : editing ? 'Save' : 'Add'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
