import { api } from '@/lib/axios';

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'ONLINE' | 'SPLIT';
export type DiscountType = 'FIXED' | 'PERCENTAGE';

export interface InvoiceItem {
  id: string;
  itemName: string;
  itemNameAr?: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

export interface Payment {
  id: string;
  paymentMethod: PaymentMethod;
  amount: string;
  referenceNumber?: string | null;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  customerName?: string | null;
  customerContact?: string | null;
  restaurantName?: string | null;
  restaurantAddress?: string | null;
  restaurantContact?: string | null;
  restaurantLogoUrl?: string | null;
  currencySymbol: string;
  subtotal: string;
  discountType?: DiscountType | null;
  discountValue: string;
  discountAmount: string;
  taxName?: string | null;
  taxPercentage: string;
  taxAmount: string;
  grandTotal: string;
  paidAmount: string;
  changeAmount: string;
  paymentStatus: PaymentStatus;
  createdAt: string;
  items: InvoiceItem[];
  payments: Payment[];
  order?: { id: string; orderNumber: string; table?: { name: string; tableNumber: number } | null };
}

export interface GenerateInvoiceInput {
  customerId?: string;
  customerName?: string;
  customerContact?: string;
  discountType?: DiscountType;
  discountValue?: number;
}

export const invoicesApi = {
  list: () => api.get<Invoice[]>('/invoices').then((r) => r.data),
  get: (id: string) => api.get<Invoice>(`/invoices/${id}`).then((r) => r.data),
  search: (params: Record<string, string>) =>
    api.get<Invoice[]>('/invoices/search', { params }).then((r) => r.data),
  generateFromOrder: (orderId: string, input: GenerateInvoiceInput) =>
    api.post<Invoice>(`/invoices/from-order/${orderId}`, input).then((r) => r.data),
  pay: (id: string, input: { paymentMethod: PaymentMethod; amount: number; referenceNumber?: string }) =>
    api.post<Invoice>(`/invoices/${id}/pay`, input).then((r) => r.data),
  print: (id: string) => api.post<Invoice>(`/invoices/${id}/print`, {}).then((r) => r.data),
};
