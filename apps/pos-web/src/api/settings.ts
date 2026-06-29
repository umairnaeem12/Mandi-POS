import { api } from '@/lib/axios';

export interface RestaurantSettings {
  restaurantId: string;
  restaurantName: string;
  logoUrl: string | null;
  address: string | null;
  contactNumber: string | null;
  email: string | null;
  currencyCode: string;
  currencySymbol: string;
  taxName: string;
  taxPercentage: number;
  isTaxEnabled: boolean;
  receiptHeader: string | null;
  receiptFooter: string | null;
  invoicePrefix: string;
}

export type UpdateSettingsInput = Partial<Omit<RestaurantSettings, 'restaurantId' | 'logoUrl'>>;

export const settingsApi = {
  get: () => api.get<RestaurantSettings>('/restaurant-settings').then((r) => r.data),
  update: (input: UpdateSettingsInput) =>
    api.patch<RestaurantSettings>('/restaurant-settings', input).then((r) => r.data),
  uploadLogo: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post<RestaurantSettings>('/restaurant-settings/logo', fd).then((r) => r.data);
  },
};
