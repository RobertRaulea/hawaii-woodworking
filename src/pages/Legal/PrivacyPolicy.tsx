import type React from 'react';

import { BUSINESS } from '../../../shared/seo/seo.utils';

export const PrivacyPolicy: React.FC = () => {
 return (
 <div className="max-w-3xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
 <h1 className="font-serif text-3xl lg:text-4xl font-medium text-stone-900 dark:text-stone-50 mb-10 text-center">Politica de Confidențialitate</h1>
 
 <div className="prose prose-amber max-w-none">
 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-stone-900 dark:text-stone-50 mb-4">1. Informații generale</h2>
 <p className="mb-4">
 Această Politică de Confidențialitate explică modul în care {BUSINESS.legalName} colectează,
 utilizează și protejează datele dumneavoastră personale atunci când utilizați site-ul nostru. 
 Respectăm dreptul dumneavoastră la confidențialitate și ne angajăm să protejăm datele personale în 
 conformitate cu Regulamentul General privind Protecția Datelor (GDPR) și legislația română în vigoare.
 </p>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-stone-900 dark:text-stone-50 mb-4">2. Informații colectate</h2>
 <p className="mb-4">
 Colectăm următoarele tipuri de informații:
 </p>
 <ul className="list-disc pl-6 mb-4">
 <li>Date de identificare: nume, prenume</li>
 <li>Date de contact: adresă de e-mail, număr de telefon, adresă de livrare și facturare</li>
 <li>Date de cont: nume de utilizator gestionat de furnizorul de autentificare Clerk; magazinul nu stochează parola contului</li>
 <li>Date despre tranzacții: produse achiziționate, sumele plătite</li>
 <li>Date tehnice: adresă IP, browser, dispozitiv utilizat</li>
 </ul>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-stone-900 dark:text-stone-50 mb-4">3. Scopul colectării datelor</h2>
 <p className="mb-4">
 Utilizăm datele colectate pentru următoarele scopuri:
 </p>
 <ul className="list-disc pl-6 mb-4">
 <li>Procesarea comenzilor și livrarea produselor</li>
 <li>Comunicarea legată de comenzile plasate</li>
 <li>Gestionarea contului dumneavoastră</li>
 <li>Îmbunătățirea serviciilor noastre</li>
 <li>Respectarea obligațiilor legale</li>
 </ul>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-stone-900 dark:text-stone-50 mb-4">4. Temeiul legal pentru prelucrarea datelor</h2>
 <p className="mb-4">
 Procesăm datele dumneavoastră personale în baza următoarelor temeiuri legale:
 </p>
 <ul className="list-disc pl-6 mb-4">
 <li>Executarea contractului de vânzare-cumpărare</li>
 <li>Consimțământul dumneavoastră</li>
 <li>Îndeplinirea obligațiilor legale</li>
 <li>Interesele noastre comerciale legitime</li>
 </ul>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-stone-900 dark:text-stone-50 mb-4">5. Perioada de păstrare a datelor</h2>
 <p className="mb-4">
 Păstrăm datele personale atât timp cât este necesar pentru scopurile pentru care au fost colectate sau 
 conform cerințelor legale (de exemplu, păstrarea facturilor pentru perioada prevăzută de legislația fiscală).
 </p>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-stone-900 dark:text-stone-50 mb-4">6. Drepturile dumneavoastră</h2>
 <p className="mb-4">
 Conform GDPR, beneficiați de următoarele drepturi:
 </p>
 <ul className="list-disc pl-6 mb-4">
 <li>Dreptul la informare</li>
 <li>Dreptul de acces la date</li>
 <li>Dreptul la rectificarea datelor</li>
 <li>Dreptul la ștergerea datelor ("dreptul de a fi uitat")</li>
 <li>Dreptul la restricționarea prelucrării</li>
 <li>Dreptul la portabilitatea datelor</li>
 <li>Dreptul la opoziție</li>
 <li>Dreptul de a nu face obiectul unei decizii bazate exclusiv pe prelucrare automată</li>
 </ul>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-stone-900 dark:text-stone-50 mb-4">7. Cookie-uri și stocare locală</h2>
 <p className="mb-4">
 Site-ul folosește stocare locală strict necesară pentru funcționarea magazinului: coșul de cumpărături,
 datele formularului de livrare completate de dumneavoastră, preferința de limbă și de temă, precum și
 sesiunea de autentificare administrată de furnizorul Clerk. Aceste date rămân în browserul dumneavoastră
 și nu sunt transmise în scopuri de analiză.
 </p>
 <p className="mb-4">
 Separat, doar dacă vă exprimați acordul în mod explicit, încărcăm instrumentul de statistici PostHog
 găzduit în Uniunea Europeană, care înregistrează paginile vizitate și interacțiunile cu produsele sub
 un identificator pseudonim. Dacă vă conectați la cont după ce ați acceptat, acel identificator pseudonim
 poate fi asociat cu contul dumneavoastră. Nu transmitem conținutul formularelor, parole, date de card
 sau alte câmpuri completate de dumneavoastră, iar înregistrarea sesiunilor este dezactivată. Respectăm
 semnalele browserului „Do Not Track” și „Global Privacy Control”.
 </p>
 <p className="mb-4">
 Pentru statisticile opționale, păstrăm local doar identificatori pseudonimi și timpul ultimei activități,
 nu URL-uri brute sau conținutul formularelor. Acordul este solicitat din nou după cel mult 180 de zile.
 </p>
 <p className="mb-4">
 Acordul poate fi retras sau modificat în orice moment din butonul de setări pentru statistici, disponibil
 permanent pe site. Perioada de păstrare a datelor de statistici este stabilită în configurarea furnizorului
 de analiză; pentru întrebări sau solicitări, ne puteți contacta la adresa de email
 {' '}<a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>.
 </p>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-stone-900 dark:text-stone-50 mb-4">8. Securitatea datelor</h2>
 <p className="mb-4">
 Implementăm măsuri tehnice și organizatorice adecvate pentru a proteja datele personale 
 împotriva accesului neautorizat, modificării, divulgării sau distrugerii accidentale.
 </p>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-stone-900 dark:text-stone-50 mb-4">9. Contact</h2>
 <p className="mb-4">
 Pentru orice întrebări sau solicitări legate de prelucrarea datelor personale, ne puteți 
 contacta la adresa de email: <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>,
 {' '}telefon: <a href={BUSINESS.phoneHref}>{BUSINESS.phoneDisplay}</a> sau la adresa: {BUSINESS.address}.
 </p>
 </section>
 </div>
 
 <p className="text-sm text-gray-500 dark:text-stone-400 mt-12 text-center">
 Actualizat la data: 03.11.2026
 </p>
 </div>
 );
};

export default PrivacyPolicy;
