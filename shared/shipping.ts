/**
 * Shared shipping/COD money model. All amounts are integer cents (RON);
 * order rows and UI convert with toFixed(2). Courier-specific or
 * weight-based rules are a later extension of this shape.
 */

export interface ShippingSettings {
  flatRateCents: number;
  freeShippingThresholdCents?: number;
  codEnabled: boolean;
  codFeeCents: number;
  codMaxOrderCents?: number;
}

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  flatRateCents: 2500,
  codEnabled: true,
  codFeeCents: 0,
};

export type PaymentMethod = "card" | "cod";

export interface OrderTotals {
  shippingCents: number;
  codFeeCents: number;
  totalCents: number;
}

export const computeOrderTotals = ({
  settings,
  subtotalCents,
  paymentMethod,
}: {
  settings: ShippingSettings;
  subtotalCents: number;
  paymentMethod: PaymentMethod;
}): OrderTotals => {
  const shippingCents =
    settings.freeShippingThresholdCents !== undefined &&
    subtotalCents >= settings.freeShippingThresholdCents
      ? 0
      : settings.flatRateCents;
  const codFeeCents = paymentMethod === "cod" ? settings.codFeeCents : 0;
  return {
    shippingCents,
    codFeeCents,
    totalCents: subtotalCents + shippingCents + codFeeCents,
  };
};

export const codAllowed = (
  settings: ShippingSettings,
  totalCents: number,
): boolean =>
  settings.codEnabled &&
  (settings.codMaxOrderCents === undefined ||
    totalCents <= settings.codMaxOrderCents);
