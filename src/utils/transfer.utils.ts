import type { TransferStatus } from '../types/transfers.types';

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  requested: 'Solicitare',
  draft: 'Draft',
  in_transit: 'În tranzit',
  partially_received: 'Recepționat parțial',
  received: 'Recepționat',
  cancelled: 'Anulat',
};

export const TRANSFER_STATUS_ORDER: TransferStatus[] = [
  'requested',
  'draft',
  'in_transit',
  'partially_received',
  'received',
  'cancelled',
];

export const TRANSFER_EVENT_LABELS: Record<string, string> = {
  requested: 'Solicitat',
  accepted: 'Acceptat',
  created: 'Creat',
  updated: 'Actualizat',
  shipped: 'Expediat',
  received: 'Recepționat',
  cancelled: 'Anulat',
};

export const WORKSHOP = 'workshop';

export const endpointFromValue = (
  value: string,
): { location: 'workshop' } | { location: 'fair'; fairId: string } =>
  value === WORKSHOP
    ? { location: 'workshop' }
    : { location: 'fair', fairId: value };

export const endpointValue = (
  location: 'workshop' | 'fair' | undefined,
  fairId: string | undefined,
): string => (location === 'fair' && fairId ? fairId : WORKSHOP);
