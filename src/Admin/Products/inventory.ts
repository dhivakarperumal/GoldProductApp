import { API_BASE_URL } from '../../api';

export type Product = {
  id: number | string;
  product_code?: string;
  name?: string;
  category?: string;
  subcategory?: string;
  metal_type?: string;
  product_type?: string;
  purity?: string;
  gross_weight?: string | number;
  net_weight?: string | number;
  total_stock?: string | number;
  stock_status?: string;
  final_price?: string | number;
  offer_price?: string | number;
  mrp?: string | number;
  images?: unknown;
  variants?: unknown;
  description?: string;
  specifications?: unknown;
  specification?: unknown;
  product_specifications?: unknown;
  care_instructions?: string;
  status?: string;
  [key: string]: unknown;
};

export type Category = {
  id?: number | string;
  catId: string;
  name: string;
  description?: string;
  subcategory?: unknown;
  images?: unknown;
  status?: string;
  totalProducts?: number;
};

export type Metal = {
  id: number | string;
  name: string;
  purity?: string;
  description?: string;
  image?: string;
  status?: string;
  totalProducts?: number;
};

export type InventoryScreen =
  | 'all'
  | 'viewProduct'
  | 'addProduct'
  | 'stock'
  | 'categories'
  | 'metals';

export function parseArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export function mediaUrl(path: unknown): string | undefined {
  if (typeof path !== 'string' || !path.trim()) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const origin = API_BASE_URL.replace(/\/api\/?$/i, '');
  return `${origin}/${path.replace(/^\/+/, '')}`;
}

export function inventoryError(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Please try again.';
}

export function currency(value: unknown): string {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : '—';
}
