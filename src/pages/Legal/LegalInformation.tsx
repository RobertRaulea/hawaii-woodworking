import type React from 'react';

import { Card } from '@/components/ui/card';
import { BUSINESS } from '../../../shared/seo/seo.utils';

export const LegalInformation: React.FC = () => {
 return (
 <div className="max-w-3xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
 <h1 className="font-serif text-3xl lg:text-4xl font-medium text-foreground mb-10 text-center">Informații Legale</h1>
 
 <div className="prose prose-amber max-w-none">
 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-foreground mb-4">Date de identificare</h2>
 <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 p-6 rounded-lg shadow-none">
 <p className="mb-2"><strong>Denumire companie:</strong> {BUSINESS.legalName}</p>
 <p className="mb-2"><strong>CUI:</strong> 48789961</p>
 <p className="mb-2"><strong>Număr înregistrare ONRC:</strong> J32/1718/2023</p>
 <p className="mb-2"><strong>Sediu social:</strong> {BUSINESS.address}</p>
 <p className="mb-2"><strong>Capital social:</strong> 200 LEI</p>
 <p className="mb-2"><strong>Email:</strong> <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></p>
 <p className="mb-2"><strong>Telefon:</strong> <a href={BUSINESS.phoneHref}>{BUSINESS.phoneDisplay}</a></p>
 <p className="mb-2"><strong>Cont bancar:</strong> RO43BTRLRONCRT0CV5643601, deschis la Banca Transilvania</p>
 </Card>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-foreground mb-4">Documente privind activitatea și materialele</h2>
 <p className="mb-4">
 Pentru informații și documente privind activitatea {BUSINESS.legalName}, materialele sau un anumit produs,
 vă rugăm să ne contactați la <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>.
 Documentele disponibile și aplicabilitatea lor se confirmă pentru solicitarea concretă.
 </p>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-foreground mb-4">Soluționarea alternativă a litigiilor (SAL)</h2>
 <p className="mb-4">
 Conform legislației în vigoare, vă informăm că aveți posibilitatea de a recurge la soluționarea alternativă a 
 litigiilor. Entitățile SAL sunt centre independente, imparțiale, transparente, eficace, rapide și echitabile, 
 care le pot ajuta pe consumatori și pe comercianți să soluționeze litigiile dintre ei fără a recurge la instanțele de judecată.
 </p>
 <p className="mb-4">
 Pentru mai multe informații, accesați:
 </p>
 <ul className="list-disc pl-6 mb-4">
 <li>Website-ul Autorității Naționale pentru Protecția Consumatorilor: <a href="http://www.anpc.gov.ro/" target="_blank" rel="noopener noreferrer" className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300">www.anpc.gov.ro</a></li>
 </ul>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-foreground mb-4">Prelucrarea datelor cu caracter personal</h2>
 <p className="mb-4">
 {BUSINESS.legalName}, cu sediul la {BUSINESS.address}, este operatorul datelor cu caracter personal
 prelucrate prin acest site. Pentru solicitări privind datele personale, ne puteți contacta la
 {' '}<a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>.
 </p>
 <p className="mb-4">
 Prelucrării datelor personale i se aplică Regulamentul (UE) 2016/679 privind protecția
 persoanelor fizice în ceea ce privește prelucrarea datelor cu caracter personal și privind libera
 circulație a acestor date (GDPR).
 </p>
 <p className="mb-4">
 Pentru mai multe informații despre prelucrarea datelor dumneavoastră personale, vă rugăm să consultați 
 <a href="/privacy-policy" className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300"> Politica de Confidențialitate</a>.
 </p>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-foreground mb-4">Documente legale</h2>
 <p className="mb-4">
 Vă rugăm să consultați următoarele documente pentru informații suplimentare:
 </p>
 <ul className="list-disc pl-6 mb-4">
 <li><a href="/terms-and-conditions" className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300">Termeni și Condiții</a></li>
 <li><a href="/privacy-policy" className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300">Politica de Confidențialitate</a></li>
 <li><a href="/return-policy" className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300">Politica de Retur</a></li>
 </ul>
 </section>
 </div>
 
 <p className="text-sm text-gray-500 dark:text-stone-400 mt-12 text-center">
 Actualizat la data: 03.11.2026
 </p>
 </div>
 );
};

export default LegalInformation;
