import type React from 'react';

import { BUSINESS } from '../../../shared/seo/seo.utils';

export const TermsAndConditions: React.FC = () => {
 return (
 <div className="max-w-3xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
 <h1 className="font-serif text-3xl lg:text-4xl font-medium text-stone-900 dark:text-stone-50 mb-10 text-center">Termeni și Condiții</h1>
 
 <div className="prose prose-amber max-w-none">
 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-stone-900 dark:text-stone-50 mb-4">1. Informații generale</h2>
 <p className="mb-4">
 Acest document stabilește termenii și condițiile de utilizare a site-ului Hawaii Tâmplărie Sibiu, 
 operat de {BUSINESS.legalName}. Prin utilizarea site-ului nostru, acceptați în totalitate
 acești termeni și condiții.
 </p>
 <p className="mb-4">
 Ne puteți contacta la <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>,
 {' '}telefon: <a href={BUSINESS.phoneHref}>{BUSINESS.phoneDisplay}</a> sau la adresa: {BUSINESS.address}.
 </p>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-stone-900 dark:text-stone-50 mb-4">2. Definiții</h2>
 <p className="mb-4">
 "Noi", "nostru", "compania" sau "vânzătorul" se referă la {BUSINESS.legalName}.
 "Utilizator", "client", "dumneavoastră" sau "cumpărător" se referă la persoana care utilizează site-ul.
 "Produs" se referă la orice bun disponibil pentru achiziție pe site-ul nostru.
 "Site" se referă la magazinul online Hawaii Tâmplărie Sibiu.
 </p>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-stone-900 dark:text-stone-50 mb-4">3. Prețuri și modalități de plată</h2>
 <p className="mb-4">
 Compania este neplătitoare de TVA; prețurile afișate nu includ TVA și nu se adaugă TVA la plată.
 Ne rezervăm dreptul de a modifica prețurile
 fără notificare prealabilă. Acceptăm plăți prin card bancar, transfer bancar și ramburs.
 </p>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-stone-900 dark:text-stone-50 mb-4">4. Livrare și expediere</h2>
 <p className="mb-4">
 Livrarea produselor se face prin servicii de curierat exclusiv în România. Timpul de livrare
 este estimativ și poate varia în funcție de stoc și locație. Taxa de livrare este afișată 
 în procesul de comandă.
 </p>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-stone-900 dark:text-stone-50 mb-4">5. Retur și garanție</h2>
 <p className="mb-4">
 Consumatorii au dreptul de retragere în termen de 14 zile calendaristice de la primirea produselor,
 fără a justifica decizia, cu excepțiile prevăzute de lege, inclusiv bunurile realizate după
 specificațiile consumatorului sau clar personalizate. Excepția nu afectează drepturile legale
 în cazul produselor neconforme. Pentru detalii, consultați Politica de Retur.
 </p>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-stone-900 dark:text-stone-50 mb-4">6. Drepturi de proprietate intelectuală</h2>
 <p className="mb-4">
 Toate elementele site-ului, incluzând dar fără a se limita la logo-uri, imagini, texte, 
 sunt protejate prin legile drepturilor de autor și aparțin {BUSINESS.legalName} sau partenerilor săi.
 </p>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-stone-900 dark:text-stone-50 mb-4">7. Litigii</h2>
 <p className="mb-4">
 În caz de litigiu, vom încerca soluționarea pe cale amiabilă. Dacă acest lucru nu este posibil, 
 litigiul va fi soluționat de instanțele competente din România.
 </p>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-stone-900 dark:text-stone-50 mb-4">8. Modificarea termenilor și condițiilor</h2>
 <p className="mb-4">
 Ne rezervăm dreptul de a modifica acești termeni și condiții în orice moment, 
 fără notificare prealabilă. Modificările intră în vigoare imediat ce sunt publicate pe site.
 </p>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-stone-900 dark:text-stone-50 mb-4">9. Prevederi finale</h2>
 <p className="mb-4">
 Acești termeni și condiții sunt guvernați de legile române în vigoare. 
 Dacă orice parte a acestor termeni este considerată ilegală sau neaplicabilă, 
 acea parte va fi eliminată, iar restul termenilor vor rămâne valabili.
 </p>
 </section>
 </div>
 
 <p className="text-xs text-stone-400 dark:text-stone-500 mt-14 text-center tracking-wide">
 Actualizat la data: 03.11.2026
 </p>
 </div>
 );
};

export default TermsAndConditions;
