import type React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, HelpCircle } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { useCart } from '../../context/CartContext';
import { useAdminQuery } from '../../hooks/useAdminQuery';
import { Button } from '@/components/ui/button';

export const ThankYou: React.FC = () => {
 const { t, i18n } = useTranslation();
 const { clearCart } = useCart();
 const [searchParams] = useSearchParams();
 const sessionId = searchParams.get('session_id') ?? '';
 const validSessionId = searchParams.getAll('session_id').length === 1 && /^cs_(?:test_|live_)?[A-Za-z0-9]{16,240}$/.test(sessionId);
 const { data, error } = useAdminQuery(api.orders.getCheckoutConfirmation, validSessionId ? { sessionId } : 'skip');
 const state = !validSessionId || error || !data ? 'unconfirmed' : data.state;
 const paymentReceived = state === 'confirmed' || state === 'review';
 const clearedSessions = useRef(new Set<string>());
 const language = i18n.resolvedLanguage?.split('-')[0] ?? i18n.language?.split('-')[0];
 const messages = {
 ro: {
 unconfirmed: ['Plata nu este confirmată', 'Nu putem confirma plata. Dacă ai efectuat o plată, nu plăti din nou. Păstrează confirmarea Stripe și contactează echipa pentru verificare.'],
 pending: ['Confirmarea plății este în așteptare', 'Așteptăm confirmarea procesatorului de plăți. Pagina se actualizează automat. Nu plăti din nou.'],
 confirmed: ['Plată confirmată', 'Plata a fost confirmată cu succes. Comanda va urma procesul de pregătire; această confirmare nu reprezintă expedierea.'],
 review: ['Plată primită — comanda necesită verificare', 'Plata a fost primită, dar comanda necesită verificarea echipei și nu este pregătită pentru expediere. Nu plăti din nou.'],
 cancelled: ['Comandă anulată — plată neconfirmată', 'Comanda este anulată și plata nu este confirmată. Dacă ai plătit, contactează echipa pentru verificare și nu plăti din nou.'],
 },
 en: {
 unconfirmed: ['Payment is not confirmed', 'We cannot confirm payment. If you have paid, do not pay again. Keep your Stripe confirmation and contact the team for verification.'],
 pending: ['Payment confirmation pending', 'We are waiting for the payment processor confirmation. This page updates automatically. Do not pay again.'],
 confirmed: ['Payment confirmed', 'Your payment was confirmed successfully. The order will enter preparation; this confirmation does not mean it has shipped.'],
 review: ['Payment received — order needs review', 'Payment was received, but the order needs team review and is not ready for shipping. Do not pay again.'],
 cancelled: ['Order cancelled — payment unconfirmed', 'The order is cancelled and payment is not confirmed. If you have paid, contact the team for verification and do not pay again.'],
 },
 de: {
 unconfirmed: ['Zahlung nicht bestätigt', 'Wir können die Zahlung nicht bestätigen. Wenn du bezahlt hast, zahle nicht erneut. Bewahre die Stripe-Bestätigung auf und kontaktiere unser Team zur Prüfung.'],
 pending: ['Zahlungsbestätigung ausstehend', 'Wir warten auf die Bestätigung des Zahlungsanbieters. Diese Seite aktualisiert sich automatisch. Bitte nicht erneut bezahlen.'],
 confirmed: ['Zahlung bestätigt', 'Deine Zahlung wurde erfolgreich bestätigt. Die Bestellung wird anschließend vorbereitet; diese Bestätigung bedeutet nicht, dass sie versendet wurde.'],
 review: ['Zahlung erhalten — Bestellung wird geprüft', 'Die Zahlung ist eingegangen, aber unser Team muss die Bestellung prüfen. Sie ist nicht versandbereit. Bitte nicht erneut bezahlen.'],
 cancelled: ['Bestellung storniert — Zahlung unbestätigt', 'Die Bestellung ist storniert und die Zahlung ist nicht bestätigt. Wenn du bezahlt hast, kontaktiere unser Team zur Prüfung und zahle nicht erneut.'],
 },
 }[language === 'en' || language === 'de' ? language : 'ro'][state];

 useEffect(() => {
 if (!paymentReceived || clearedSessions.current.has(sessionId)) return;
 clearedSessions.current.add(sessionId);
 clearCart();
 }, [paymentReceived, sessionId, clearCart]);

 return (
 <div className="max-w-2xl mx-auto px-6 lg:px-8 py-20 lg:py-28 text-center">
 <div className="animate-fade-in-up">
 <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-8">
 {paymentReceived
 ? <Check aria-hidden="true" className="w-8 h-8 text-emerald-500" strokeWidth={2} />
 : <HelpCircle aria-hidden="true" className="w-8 h-8 text-muted-foreground" strokeWidth={2} />}
 </div>
 <h1 className="font-serif text-3xl lg:text-4xl font-medium text-foreground mb-4">{t(`thankYou.confirmation.${state}.title`, { defaultValue: messages[0] })}</h1>
 <p role="status" className="text-muted-foreground text-base leading-relaxed mb-10 max-w-md mx-auto">
 {t(`thankYou.confirmation.${state}.message`, { defaultValue: messages[1] })}
 </p>
 <Button
 asChild
 variant="outline"
 className="h-auto rounded-md border-stone-900 dark:border-stone-400 px-8 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-stone-900 hover:text-white dark:hover:bg-stone-50 dark:hover:text-stone-900"
 >
 <Link to="/">{t('thankYou.backToHome')}</Link>
 </Button>
 </div>
 </div>
 );
};
