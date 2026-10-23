import { mock } from 'node:test';
import type { Id } from '../../convex/_generated/dataModel';
import type {
  InventoryController,
  InventoryProduct,
  InventoryFair,
  InventoryReceipt,
  NewInventoryRequest,
} from '../../src/types/inventory.types';

export const fairId = 'fair-1' as Id<'fairs'>;
export const productId = 'magnet' as Id<'products'>;
export const fair: InventoryFair = {
  _id: fairId,
  _creationTime: 1,
  name: 'Târg Crăciun',
  active: true,
  createdBy: 'admin-1',
};
export const product: InventoryProduct = {
  id: productId,
  name: 'Magnet Sibiu',
  sku: 'MAG-01',
  category: 'Suveniruri',
  favorite: true,
  trackStock: true,
  onlineStock: 100,
  onlinePhysicalStock: 100,
  onlineHeldOrders: 0,
  fairsStock: 34,
  totalStock: 134,
  inTransitStock: 0,
  status: 'active',
  invalidStock: false,
  lowStockThreshold: null,
  fairs: [{ fairId, name: fair.name, quantity: 34 }],
};
export const receipt: InventoryReceipt = {
  _id: 'receipt-1' as Id<'inventoryOperations'>,
  _creationTime: 1,
  requestId: 'receipt-request-0001',
  actorId: 'admin-1',
  kind: 'transfer',
  direction: 'to_fair',
  fairId,
  fairName: fair.name,
  productId,
  productName: product.name,
  quantity: 10,
  createdAt: 1,
  stockAfter: {
    onlineStock: 90,
    fairStock: 44,
    fairsStock: 44,
    totalStock: 134,
  },
};
export const operationMock = () =>
  ({
    pending: null,
    completed: null,
    busy: false,
    online: true,
    blocked: false,
    error: '',
    start: mock.fn<(request: NewInventoryRequest) => Promise<void>>(
      async () => {},
    ),
    retry: mock.fn(async () => {}),
    dismissCompleted: mock.fn(() => {}),
  }) satisfies InventoryController;
