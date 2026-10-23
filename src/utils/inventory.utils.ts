import { ConvexError } from 'convex/values';
import type {
  InventoryProduct,
  InventoryReceipt,
  InventoryRequest,
} from '../types/inventory.types';

export const formatStock = (quantity: number | null) =>
  quantity === null ? 'Neevidențiat' : quantity.toLocaleString('ro-RO');

export type StockLocation = 'all' | 'workshop' | `fairs:${string}`;

export interface LocationStock {
  physical: number | null;
  reserved: number | null;
  available: number | null;
}

const emptyStock: LocationStock = {
  physical: null,
  reserved: null,
  available: null,
};

export const locationFairId = (location: StockLocation) =>
  location.startsWith('fairs:') ? location.slice(6) : null;

export const locationStock = (
  product: InventoryProduct,
  location: StockLocation,
): LocationStock => {
  if (product.invalidStock) return emptyStock;
  if (location === 'workshop') {
    return {
      physical: product.onlinePhysicalStock,
      reserved: product.onlineHeldOrders,
      available: product.onlineStock,
    };
  }
  if (location === 'all') {
    if (product.onlinePhysicalStock === null) return emptyStock;
    const fairs = product.fairs.reduce(
      (sum, row) => sum + (row.quantity ?? 0),
      0,
    );
    return {
      physical: product.onlinePhysicalStock + fairs,
      reserved: product.onlineHeldOrders,
      available: (product.onlineStock ?? 0) + fairs,
    };
  }
  const fairId = locationFairId(location);
  const quantity =
    product.fairs.find((row) => row.fairId === fairId)?.quantity ?? 0;
  return { physical: quantity, reserved: 0, available: quantity };
};

export type StockAvailability = 'all' | 'available' | 'low' | 'out' | 'reserved';

export interface StockFilters {
  term: string;
  location: StockLocation;
  category: string;
  availability: StockAvailability;
}

export const filterStockRows = (
  products: InventoryProduct[],
  filters: StockFilters,
): InventoryProduct[] => {
  const term = filters.term.trim().toLowerCase();
  return products.filter((product) => {
    if (
      term &&
      ![product.name, product.sku, product.category].some((value) =>
        (value ?? '').toLowerCase().includes(term),
      )
    )
      return false;
    if (filters.category && product.category !== filters.category)
      return false;
    const fairId = locationFairId(filters.location);
    if (fairId && !product.fairs.some((row) => row.fairId === fairId))
      return false;
    const stock = locationStock(product, filters.location);
    switch (filters.availability) {
      case 'available':
        return stock.available !== null && stock.available > 0;
      case 'out':
        return stock.available === 0;
      case 'reserved':
        return stock.reserved !== null && stock.reserved > 0;
      case 'low': {
        const atelier = locationStock(product, 'workshop');
        return (
          atelier.available !== null &&
          atelier.available <= (product.lowStockThreshold ?? 5)
        );
      }
      default:
        return true;
    }
  });
};

export const inventoryError = (error: unknown) =>
  error instanceof ConvexError && typeof error.data === 'string'
    ? error.data
    : 'Rezultatul operațiunii nu este confirmat. Verifică aceeași operațiune înainte de a porni alta.';

export const inventoryNotice = (receipt: InventoryReceipt) => {
  if (receipt.kind === 'archive') {
    return `${receipt.fairName} a fost arhivat. ${receipt.returnedUnits ?? 0} buc. din ${receipt.returnedProducts ?? 0} produse au fost returnate online. Totalul stocului nu s-a schimbat.`;
  }
  const stock = receipt.stockAfter;
  const action =
    receipt.direction === 'to_online'
      ? 'returnate online'
      : `transferate la ${receipt.fairName}`;
  const prefix = `${receipt.quantity} buc. ${receipt.productName ?? ''} ${action}.`;
  if (!stock) return prefix;
  const held =
    (stock.onlineHeldOrders ?? 0) > 0
      ? ` · Online fizic: ${formatStock(stock.onlinePhysicalStock ?? null)} · Ținute pentru comenzi plătite: ${formatStock(stock.onlineHeldOrders ?? null)}`
      : '';
  return `${receipt.legacyReplay ? 'Transfer deja înregistrat. Stoc curent: ' : prefix + ' După transfer: '}Total: ${formatStock(stock.totalStock)} · Online disponibil: ${formatStock(stock.onlineStock)}${held} · Acest târg: ${formatStock(stock.fairStock)} · Alte târguri: ${formatStock(stock.fairsStock - stock.fairStock)}.`;
};

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const positive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

export const readInventoryCheckpoint = (
  key: string,
): { pending: InventoryRequest | null; error: string } => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { pending: null, error: '' };
    const value: unknown = JSON.parse(raw);
    if (
      !record(value) ||
      typeof value.requestId !== 'string' ||
      !/^[a-zA-Z0-9-]{16,100}$/.test(value.requestId) ||
      typeof value.fairId !== 'string' ||
      !value.fairId
    )
      throw new Error('Invalid operation');
    if (value.kind === 'transfer') {
      if (
        typeof value.productId !== 'string' ||
        !value.productId ||
        !positive(value.quantity) ||
        (value.direction !== 'to_fair' && value.direction !== 'to_online')
      )
        throw new Error('Invalid transfer');
    } else if (value.kind === 'archive') {
      if (
        !Array.isArray(value.expectedInventory) ||
        value.expectedInventory.length > 500 ||
        !value.expectedInventory.every(
          (item: unknown) =>
            record(item) &&
            typeof item.productId === 'string' &&
            positive(item.quantity),
        )
      ) {
        throw new Error('Invalid archive');
      }
    } else throw new Error('Invalid kind');
    return { pending: value as unknown as InventoryRequest, error: '' };
  } catch {
    return {
      pending: null,
      error:
        'Recuperarea locală a inventarului nu este disponibilă. Verifică operațiunile anterioare și accesul la stocarea browserului înainte de alt transfer.',
    };
  }
};
