import type React from 'react';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAction, useConvexAuth } from 'convex/react';
import { useAuth } from '@clerk/clerk-react';
import { ConvexError } from 'convex/values';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { Id } from '../../../convex/_generated/dataModel';
import { api } from '../../../convex/_generated/api';
import type { CartItem } from '../../context/CartContext';
import { useCart } from '../../context/CartContext';
import { useShipping } from '../../context/ShippingContext';
import { getAnalyticsContext, trackAnalytics } from '../../utils/analytics.utils';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { Card } from '@/components/ui/card';

export const Checkout: React.FC = () => {
 const { t, i18n } = useTranslation();
 const language = i18n.resolvedLanguage?.split('-')[0] ?? i18n.language?.split('-')[0];
 const copy = {
 ro: {
 tariff: 'Costul transportului nu este încă stabilit. Plata este indisponibilă până la configurarea tarifului.',
 test: 'TEST: plată simulată doar pentru produse. Tariful transportului nu este încă stabilit; nu se încasează bani și nu se livrează produse.',
 country: 'Livrăm doar în România. Corectează țara adresei de livrare.',
 edit: 'Corectează datele de livrare',
 subtotal: 'Subtotal produse',
 empty: 'Coșul este gol.',
 payButton: 'Plătește cu cardul',
 redirecting: 'Se redirecționează...',
 connecting: 'Se conecteaza contul...',
 stripeUrlMissing: 'URL sesiune Stripe indisponibilă',
 paymentError: 'Nu am putut iniția plata. Te rugăm să încerci din nou.',
 },
 en: {
 tariff: 'The shipping tariff is not yet confirmed. Payment is unavailable until the tariff is configured.',
 test: 'TEST: simulated product-only payment. Shipping tariff pending; no money is collected and no products are shipped.',
 country: 'Delivery is available only in Romania. Please correct the shipping country.',
 edit: 'Correct shipping details',
 subtotal: 'Product subtotal',
 empty: 'Your cart is empty.',
 payButton: 'Pay by card',
 redirecting: 'Redirecting...',
 connecting: 'Signing you in...',
 stripeUrlMissing: 'Stripe session URL unavailable',
 paymentError: 'We could not start the payment. Please try again.',
 },
 de: {
 tariff: 'Die Versandkosten stehen noch nicht fest. Zahlungen sind bis zur Festlegung des Tarifs nicht verfügbar.',
 test: 'TEST: simulierte Zahlung nur für Produkte. Versandkosten noch offen; es wird kein Geld eingezogen und nichts versendet.',
 country: 'Die Lieferung ist nur innerhalb Rumäniens möglich. Bitte korrigiere das Lieferland.',
 edit: 'Lieferdaten korrigieren',
 subtotal: 'Zwischensumme Produkte',
 empty: 'Ihr Warenkorb ist leer.',
 payButton: 'Mit Karte zahlen',
 redirecting: 'Weiterleitung...',
 connecting: 'Konto wird angemeldet...',
 stripeUrlMissing: 'Stripe-Sitzungs-URL nicht verfügbar',
 paymentError: 'Wir konnten die Zahlung nicht starten. Bitte versuche es erneut.',
 },
 }[language === 'en' || language === 'de' ? language : 'ro'];
 const { state } = useCart();
 const { shippingData } = useShipping();
 const productionPaymentBlocked = import.meta.env?.VITE_APP_ENV === 'production';
 const shippingCountry = shippingData?.shippingAddress.country.trim().normalize('NFC').toLowerCase();
 const countryValid = shippingCountry === 'romania' || shippingCountry === 'românia' || shippingCountry === 'ro';
 const navigate = useNavigate();
 const [loading, setLoading] = useState(false);
 const { isLoaded, isSignedIn } = useAuth();
 const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
 const authReady = isLoaded && !isAuthLoading && (!isSignedIn || isAuthenticated);
 const createCheckoutSession = useAction(api.checkout.createCheckoutSession);

 // Redirect to shipping if no shipping data
 useEffect(() => {
 if (!shippingData) {
 navigate('/shipping', { replace: true });
 }
 }, [shippingData, navigate]);

 const total = state.items.reduce(
 (sum: number, item: CartItem) => sum + item.price * item.quantity,
 0
 );

 const handleCheckout = async () => {
 if (!shippingData || !authReady || productionPaymentBlocked || !countryValid) return;
 setLoading(true);

 try {
 const items = state.items.map((item: CartItem) => ({
 productId: item.id as Id<'products'>,
 quantity: item.quantity,
 }));

 const billingAddress = shippingData.sameAsShipping
 ? shippingData.shippingAddress
 : shippingData.billingAddress;

 // Optional consent-bound attribution context; never transmitted without consent.
 const analytics = getAnalyticsContext();

 const response = await createCheckoutSession({
 origin: window.location.origin,
 items,
 customer: {
 email: shippingData.email,
 phone: shippingData.phone,
 firstName: shippingData.firstName,
 lastName: shippingData.lastName,
 shippingAddress: shippingData.shippingAddress,
 billingAddress,
 newsletter: shippingData.newsletter,
 },
 ...(analytics ? { analytics } : {}),
 });

 // A usable redirect target is a parseable HTTPS URL without credentials.
 const checkoutUrl = (() => {
 try {
 const url = new URL(String(response?.url ?? ''));
 return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
 } catch {
 return null;
 }
 })();

 if (!checkoutUrl) {
 trackAnalytics('checkout_initiation_failed', {
 error_code: 'checkout_initiation_failed',
 surface: 'checkout',
 });
 toast.error(t('checkout.stripeUrlMissing', { defaultValue: copy.stripeUrlMissing }));
 return;
 }

 trackAnalytics('checkout_started', { surface: 'checkout' });
 window.location.href = checkoutUrl;
 } catch (error) {
 trackAnalytics('checkout_initiation_failed', {
 error_code: 'checkout_initiation_failed',
 surface: 'checkout',
 });
 const message =
 error instanceof ConvexError && typeof error.data === 'string'
 ? error.data
 : t('checkout.paymentError', { defaultValue: copy.paymentError });
 toast.error(message);
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="max-w-2xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
 <h1 className="font-serif text-3xl font-medium text-foreground mb-8">{t('checkout.title')}</h1>
 
 <Card className="rounded-lg border-border p-6 shadow-none">
 {state.items.length === 0 && <p className="text-muted-foreground text-sm">{t('checkout.empty', { defaultValue: copy.empty })}</p>}
 <div className="space-y-0">
 {state.items.map((item: CartItem) => (
 <div key={item.id} className="flex justify-between items-center py-4 border-b border-stone-100 dark:border-stone-800 last:border-b-0">
 <div>
 <span className="text-sm font-medium text-foreground">{item.name}</span>
 <span className="text-stone-400 dark:text-stone-500 text-sm ml-2">× {item.quantity}</span>
 </div>
 <span className="text-sm font-medium text-foreground">{(item.price * item.quantity).toFixed(2)} RON</span>
 </div>
 ))}
 </div>
 
 <div className="border-t border-border mt-4 pt-4 flex justify-between items-center">
 <span className="font-medium text-foreground">{t('checkout.productSubtotal', { defaultValue: copy.subtotal })}</span>
 <span className="text-lg font-semibold text-foreground">{total.toFixed(2)} RON</span>
 </div>
 </Card>
 <p id="shipping-tariff-notice" role="status" className="mt-6 text-sm text-stone-600 dark:text-stone-300">
 {t(productionPaymentBlocked ? 'checkout.tariffPending' : 'checkout.testTariffPending', { defaultValue: productionPaymentBlocked ? copy.tariff : copy.test })}
 </p>
 {!countryValid && shippingData && (
 <FieldError  className="mt-4 text-red-600 dark:text-red-400">
 {t('checkout.romaniaOnly', { defaultValue: copy.country })}{' '}
 <Link className="underline" to="/shipping">{t('checkout.correctShipping', { defaultValue: copy.edit })}</Link>
 </FieldError>
 )}

 <Button
 disabled={loading || total === 0 || !authReady || !shippingData || !countryValid || productionPaymentBlocked}
 aria-describedby="shipping-tariff-notice"
 onClick={handleCheckout}
 className="mt-8 h-auto w-full rounded-md bg-stone-900 px-6 py-3.5 text-sm font-medium tracking-wide text-white transition-all duration-200 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white disabled:opacity-50"
 >
 {loading
 ? t('checkout.redirecting', { defaultValue: copy.redirecting })
 : !authReady
 ? t('checkout.connecting', { defaultValue: copy.connecting })
 : t('checkout.payButton', { defaultValue: copy.payButton })}
 </Button>
 </div>
 );
};
