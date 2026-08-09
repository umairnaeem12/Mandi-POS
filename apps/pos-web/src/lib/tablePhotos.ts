// Restaurant photos used as table-card banners. Assigned by table number so a
// given table keeps the same image across reloads and across the admin/waiter
// screens. Swap these URLs for photos of the real venue when available.
const TABLE_PHOTOS = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1592861956120-e524fc739696?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=800&auto=format&fit=crop',
];

export const tablePhoto = (tableNumber: number) =>
  TABLE_PHOTOS[Math.abs(tableNumber) % TABLE_PHOTOS.length];
