// Room names double as Supabase Realtime topics, so the restaurant id must stay
// the second ':' segment: the realtime.messages RLS policy matches on it.
export const rooms = {
  restaurant: (restaurantId: string) => `restaurant:${restaurantId}`,
  kitchen: (restaurantId: string) => `kitchen:${restaurantId}`,
  adminDashboard: (restaurantId: string) => `admin-dashboard:${restaurantId}`,
  table: (restaurantId: string, tableId: string) => `table:${restaurantId}:${tableId}`,
};
