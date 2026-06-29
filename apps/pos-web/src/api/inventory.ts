import { api } from '@/lib/axios';

export const INVENTORY_UNITS = ['KG', 'GRAM', 'LITER', 'ML', 'PIECE', 'PACKET', 'BOX', 'BOTTLE'] as const;
export type InventoryUnit = (typeof INVENTORY_UNITS)[number];

export interface InventoryItem {
  id: string;
  name: string;
  unit: InventoryUnit;
  currentStock: string; // Decimal as string
  lowStockLimit: string;
  isActive: boolean;
}

export interface InventoryTransaction {
  id: string;
  type: string;
  quantity: string;
  previousStock: string;
  newStock: string;
  notes?: string | null;
  createdAt: string;
  inventoryItem: { id: string; name: string; unit: string };
}

export interface CreateItemInput {
  name: string;
  unit: InventoryUnit;
  currentStock?: number;
  lowStockLimit?: number;
}

export const inventoryApi = {
  list: () => api.get<InventoryItem[]>('/inventory/items').then((r) => r.data),
  lowStock: () => api.get<InventoryItem[]>('/inventory/low-stock').then((r) => r.data),
  create: (input: CreateItemInput) =>
    api.post<InventoryItem>('/inventory/items', input).then((r) => r.data),
  update: (id: string, input: Partial<{ name: string; unit: InventoryUnit; lowStockLimit: number; isActive: boolean }>) =>
    api.patch<InventoryItem>(`/inventory/items/${id}`, input).then((r) => r.data),
  remove: (id: string) => api.delete(`/inventory/items/${id}`).then((r) => r.data),
  stockIn: (inventoryItemId: string, quantity: number, notes?: string) =>
    api.post('/inventory/stock-in', { inventoryItemId, quantity, notes }).then((r) => r.data),
  stockOut: (inventoryItemId: string, quantity: number, type?: 'STOCK_OUT' | 'WASTAGE', notes?: string) =>
    api.post('/inventory/stock-out', { inventoryItemId, quantity, type, notes }).then((r) => r.data),
  adjustment: (inventoryItemId: string, newStock: number, notes?: string) =>
    api.post('/inventory/adjustment', { inventoryItemId, newStock, notes }).then((r) => r.data),
  transactions: (limit = 50) =>
    api.get<InventoryTransaction[]>('/inventory/transactions', { params: { limit } }).then((r) => r.data),
};
