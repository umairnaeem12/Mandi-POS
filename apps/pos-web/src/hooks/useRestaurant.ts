import { useQuery } from '@tanstack/react-query';
import { settingsApi, type RestaurantSettings } from '@/api/settings';

// Cached restaurant settings — used for brand name/logo, currency symbol, tax, etc.
export function useRestaurant() {
  const query = useQuery<RestaurantSettings>({
    queryKey: ['restaurant-settings'],
    queryFn: settingsApi.get,
    staleTime: 5 * 60 * 1000,
  });
  return {
    settings: query.data,
    name: query.data?.restaurantName ?? 'Restaurant POS',
    logoUrl: query.data?.logoUrl ?? null,
    currency: query.data?.currencySymbol ?? 'Rs',
    query,
  };
}
