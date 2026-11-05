import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { DEFAULT_SHIPPING_SETTINGS } from '../../shared/shipping';
import type { ShippingSettings } from '../../shared/shipping';

/**
 * Public shipping settings (flat rate, COD flag/fees) with safe defaults
 * while the query loads or when no admin row exists yet.
 */
export const useShippingSettings = (): {
 settings: ShippingSettings;
 isLoading: boolean;
} => {
 const settings = useQuery(api.shipping.getPublicSettings);
 return {
 settings: settings ?? DEFAULT_SHIPPING_SETTINGS,
 isLoading: settings === undefined,
 };
};
