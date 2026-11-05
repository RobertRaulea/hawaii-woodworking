import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAction, useConvexAuth, useMutation } from 'convex/react';
import { useAuth } from '@clerk/clerk-react';
import { ConvexError } from 'convex/values';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { Id } from '../../../convex/_generated/dataModel';
import { api } from '../../../convex/_generated/api';
import type { CartItem } from '../../context/CartContext';
import { useCart } from '../../context/CartContext';
import { useShipping } from '../../context/ShippingContext';
import { useShippingSettings } from '../../hooks/useShippingSettings';
import { computeOrderTotals, codAllowed } from '../../../shared/shipping';
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
 paymentMethod: 'Metodă de plată',
 methodCard: 'Card online',
 methodCod: 'Ramburs (plătești curierului la livrare)',
 shipping: 'Transport',
 shippingFree: 'Gratuit',
 codFee: 'Taxă ramburs',
 total: 'Total',
 codUnavailable: 'Ramburs indisponibil peste valoarea maximă.',
 codButton: 'Plasează comanda cu ramburs',
 codError: 'Nu am putut plasa comanda. Te rugăm să încerci din nou.',
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
 paymentMethod: 'Payment method',
 methodCard: 'Online card',
 methodCod: 'Cash on delivery (pay the courier)',
 shipping: 'Shipping',
 shippingFree: 'Free',
 codFee: 'COD fee',
 total: 'Total',
 codUnavailable: 'COD unavailable above the maximum order value.',
 codButton: 'Place cash-on-delivery order',
 codError: 'We could not place the order. Please try again.',
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
 paymentMethod: 'Zahlungsmethode',
 methodCard: 'Online-Karte',
 methodCod: 'Nachnahme (Zahlung an den Kurier)',
 shipping: 'Versand',
 shippingFree: 'Kostenlos',
 codFee: 'Nachnahmegebühr',
 total: 'Gesamt',
 codUnavailable: 'Nachnahme über dem Maximalbetrag nicht verfügbar.',
 codButton: 'Nachnahme-Bestellung aufgeben',
 codError: 'Wir konnten die Bestellung nicht aufgeben. Bitte versuche es erneut.',
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
 const placeCodOrder = useMutation(api.codOrders.placeCodOrder);
 const { settings: shippingSettings } = useShippingSettings();
 const [paymentMethod, setPaymentMethod] = useState<'card' | 'cod'>('card');
 const codRequestId = useRef<string | null>(null);

 // Redirect to shipping if no shipping data
 useEffect(() => {
 if (!shippingData) {
 navigate('/shipping', { replace: true });
 }
 }, [shippingData, navigate]);

 const subtotalCents = Math.round(
 state.items.reduce(
 (sum: number, item: CartItem) => sum + item.price * item.quantity,
 0
 ) * 100
 );
 const totals = computeOrderTotals({
 settings: shippingSettings,
 subtotalCents,
 paymentMethod,
 });
 const total = totals.totalCents / 100;
 const codEligible = codAllowed(shippingSettings, totals.totalCents);
 const freeShippingApplied =
 totals.shippingCents === 0 &&
 shippingSettings.freeShippingThresholdCents !== undefined &&
 subtotalCents >= shippingSettings.freeShippingThresholdCents;

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

 const handleCodOrder = async () => {
 if (!shippingData || !authReady || productionPaymentBlocked || !countryValid || !codEligible) return;
 codRequestId.current ??= crypto.randomUUID();
 const requestId = codRequestId.current;
 setLoading(true);
 try {
 const items = state.items.map((item: CartItem) => ({
 productId: item.id as Id<'products'>,
 quantity: item.quantity,
 }));
 const billingAddress = shippingData.sameAsShipping
 ? shippingData.shippingAddress
 : shippingData.billingAddress;
 await placeCodOrder({
 requestId,
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
 });
 trackAnalytics('checkout_started', { surface: 'checkout', method: 'cod' });
 codRequestId.current = null;
 navigate(`/thank-you?session_id=cod:${requestId}`);
 } catch (error) {
 const message =
 error instanceof ConvexError && typeof error.data === 'string'
 ? error.data
 : t('checkout.codError', { defaultValue: copy.codError });
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
 
 <div className="border-t border-border mt-4 pt-4 space-y-2">
 <div className="flex justify-between items-center">
 <span className="font-medium text-foreground">{t('checkout.productSubtotal', { defaultValue: copy.subtotal })}</span>
 <span className="text-sm font-medium text-foreground">{(subtotalCents / 100).toFixed(2)} RON</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="font-medium text-foreground">{t('checkout.shipping', { defaultValue: copy.shipping })}</span>
 <span className="text-sm font-medium text-foreground">
 {freeShippingApplied
 ? t('checkout.shippingFree', { defaultValue: copy.shippingFree })
 : `${(totals.shippingCents / 100).toFixed(2)} RON`}
 </span>
 </div>
 {totals.codFeeCents > 0 && (
 <div className="flex justify-between items-center">
 <span className="font-medium text-foreground">{t('checkout.codFee', { defaultValue: copy.codFee })}</span>
 <span className="text-sm font-medium text-foreground">{(totals.codFeeCents / 100).toFixed(2)} RON</span>
 </div>
 )}
 <div className="flex justify-between items-center border-t border-border pt-2">
 <span className="font-medium text-foreground">{t('checkout.total', { defaultValue: copy.total })}</span>
 <span className="text-lg font-semibold text-foreground">{total.toFixed(2)} RON</span>
 </div>
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

 <fieldset className="mt-6">
 <legend className="sr-only">{t('checkout.paymentMethod', { defaultValue: copy.paymentMethod })}</legend>
 <div className="space-y-2" role="radiogroup">
 <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-stone-200 dark:border-stone-700 px-4 py-3">
 <input
 type="radio"
 name="paymentMethod"
 value="card"
 checked={paymentMethod === 'card'}
 onChange={() => setPaymentMethod('card')}
 className="size-4 accent-amber-600"
 />
 <span className="text-sm font-medium text-foreground">{t('checkout.methodCard', { defaultValue: copy.methodCard })}</span>
 </label>
 {shippingSettings.codEnabled && (
 <label className={`flex items-center gap-3 rounded-lg border border-stone-200 dark:border-stone-700 px-4 py-3 ${codEligible ? 'cursor-pointer' : 'opacity-60'}`}>
 <input
 type="radio"
 name="paymentMethod"
 value="cod"
 checked={paymentMethod === 'cod'}
 onChange={() => setPaymentMethod('cod')}
 disabled={!codEligible}
 className="size-4 accent-amber-600"
 />
 <span className="text-sm font-medium text-foreground">{t('checkout.methodCod', { defaultValue: copy.methodCod })}</span>
 </label>
 )}
 </div>
 {shippingSettings.codEnabled && !codEligible && (
 <p className="mt-2 text-xs text-muted-foreground">{t('checkout.codUnavailable', { defaultValue: copy.codUnavailable })}</p>
 )}
 </fieldset>

 <Button
 disabled={
 loading ||
 subtotalCents === 0 ||
 !authReady ||
 !shippingData ||
 !countryValid ||
 productionPaymentBlocked ||
 (paymentMethod === 'cod' && !codEligible)
 }
 aria-describedby="shipping-tariff-notice"
 onClick={paymentMethod === 'cod' ? handleCodOrder : handleCheckout}
 className="mt-8 h-auto w-full rounded-md bg-stone-900 px-6 py-3.5 text-sm font-medium tracking-wide text-white transition-all duration-200 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white disabled:opacity-50"
 >
 {loading
 ? t('checkout.redirecting', { defaultValue: copy.redirecting })
 : !authReady
 ? t('checkout.connecting', { defaultValue: copy.connecting })
 : paymentMethod === 'cod'
 ? t('checkout.codButton', { defaultValue: copy.codButton })
 : t('checkout.payButton', { defaultValue: copy.payButton })}
 </Button>
 </div>
 );
};
