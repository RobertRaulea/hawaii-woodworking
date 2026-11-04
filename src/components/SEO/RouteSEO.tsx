import type React from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { SEO } from './SEO';
import type { EnvironmentName } from '../../../shared/environment';

interface RouteSEOProps {
 environment?: EnvironmentName;
}

type Language = 'ro' | 'en' | 'de';

// Localized title/description for transactional and legal routes only. All
// other routes keep per-page SEO or the site defaults; canonical and robots
// stay owned by SEO.tsx.
const ROUTE_METADATA: Record<string, Record<Language, { title: string; description: string }>> = {
 '/shipping': {
 ro: { title: 'Informații de livrare', description: 'Introdu datele de livrare pentru comanda ta din magazinul Hawaii Woodworking.' },
 en: { title: 'Shipping details', description: 'Enter the delivery details for your Hawaii Woodworking order.' },
 de: { title: 'Lieferdaten', description: 'Gib die Lieferdaten für deine Hawaii Woodworking Bestellung ein.' },
 },
 '/checkout': {
 ro: { title: 'Finalizare comandă', description: 'Verifică produsele și finalizează comanda în magazinul Hawaii Woodworking.' },
 en: { title: 'Checkout', description: 'Review your items and complete your Hawaii Woodworking order.' },
 de: { title: 'Kasse', description: 'Prüfe deine Produkte und schließe die Hawaii Woodworking Bestellung ab.' },
 },
 '/thank-you': {
 ro: { title: 'Starea plății', description: 'Verifică starea plății pentru comanda ta la Hawaii Woodworking.' },
 en: { title: 'Payment status', description: 'Check the payment status of your Hawaii Woodworking order.' },
 de: { title: 'Zahlungsstatus', description: 'Prüfe den Zahlungsstatus deiner Hawaii Woodworking Bestellung.' },
 },
 '/terms-and-conditions': {
 ro: { title: 'Termeni și condiții', description: 'Termenii și condițiile de utilizare și vânzare ale magazinului Hawaii Woodworking.' },
 en: { title: 'Terms and conditions', description: 'Terms of use and sale for the Hawaii Woodworking store.' },
 de: { title: 'Allgemeine Geschäftsbedingungen', description: 'Nutzungs- und Verkaufsbedingungen des Hawaii Woodworking Shops.' },
 },
 '/privacy-policy': {
 ro: { title: 'Politica de confidențialitate', description: 'Cum colectează și protejează Hawaii Woodworking datele tale personale.' },
 en: { title: 'Privacy policy', description: 'How Hawaii Woodworking collects and protects your personal data.' },
 de: { title: 'Datenschutzerklärung', description: 'Wie Hawaii Woodworking deine personenbezogenen Daten erhebt und schützt.' },
 },
 '/return-policy': {
 ro: { title: 'Politica de retur', description: 'Condițiile și procedura de returnare a produselor Hawaii Woodworking.' },
 en: { title: 'Return policy', description: 'Conditions and procedure for returning Hawaii Woodworking products.' },
 de: { title: 'Rückgaberichtlinie', description: 'Bedingungen und Verfahren für die Rückgabe von Hawaii Woodworking Produkten.' },
 },
 '/legal-information': {
 ro: { title: 'Informații legale', description: 'Datele de identificare și informațiile legale ale operatorului Hawaii Woodworking.' },
 en: { title: 'Legal information', description: 'Identification and legal information of the Hawaii Woodworking operator.' },
 de: { title: 'Rechtliche Informationen', description: 'Kennzeichnung und rechtliche Angaben des Hawaii Woodworking Betreibers.' },
 },
};

export const RouteSEO: React.FC<RouteSEOProps> = ({ environment }) => {
 const location = useLocation();
 const { i18n } = useTranslation();
 const language: Language =
 i18n.language === 'en' || i18n.language === 'de' ? i18n.language : 'ro';
 const metadata = ROUTE_METADATA[location.pathname];
 return (
 <SEO
 environment={environment}
 title={metadata?.[language].title}
 description={metadata?.[language].description}
 />
 );
};
