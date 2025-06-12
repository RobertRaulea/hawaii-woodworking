import React from 'react';

interface PrivacyPolicyProps {}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Politica de Confidențialitate</h1>
      
      <div className="prose prose-amber max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Informații generale</h2>
          <p className="mb-4">
            Această Politică de Confidențialitate explică modul în care SC Hawaii Woodworking SRL colectează, 
            utilizează și protejează datele dumneavoastră personale atunci când utilizați site-ul nostru. 
            Respectăm dreptul dumneavoastră la confidențialitate și ne angajăm să protejăm datele personale în 
            conformitate cu Regulamentul General privind Protecția Datelor (GDPR) și legislația română în vigoare.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Informații colectate</h2>
          <p className="mb-4">
            Colectăm următoarele tipuri de informații:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Date de identificare: nume, prenume</li>
            <li>Date de contact: adresă de e-mail, număr de telefon, adresă de livrare și facturare</li>
            <li>Date de cont: nume utilizator, parolă</li>
            <li>Date despre tranzacții: produse achiziționate, sumele plătite</li>
            <li>Date tehnice: adresă IP, browser, dispozitiv utilizat</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Scopul colectării datelor</h2>
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
          <h2 className="text-2xl font-semibold mb-4">4. Temeiul legal pentru prelucrarea datelor</h2>
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
          <h2 className="text-2xl font-semibold mb-4">5. Perioada de păstrare a datelor</h2>
          <p className="mb-4">
            Păstrăm datele personale atât timp cât este necesar pentru scopurile pentru care au fost colectate sau 
            conform cerințelor legale (de exemplu, păstrarea facturilor pentru perioada prevăzută de legislația fiscală).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Drepturile dumneavoastră</h2>
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
          <h2 className="text-2xl font-semibold mb-4">7. Cookie-uri</h2>
          <p className="mb-4">
            Site-ul nostru utilizează cookie-uri pentru a îmbunătăți experiența de navigare. 
            Puteți seta browserul pentru a refuza toate sau anumite cookie-uri.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Securitatea datelor</h2>
          <p className="mb-4">
            Implementăm măsuri tehnice și organizatorice adecvate pentru a proteja datele personale 
            împotriva accesului neautorizat, modificării, divulgării sau distrugerii accidentale.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Contact</h2>
          <p className="mb-4">
            Pentru orice întrebări sau solicitări legate de prelucrarea datelor personale, ne puteți 
            contacta la adresa de email: contact@hawaiiwoodworking.ro
          </p>
        </section>
      </div>
      
      <p className="text-sm text-gray-500 mt-12 text-center">
        Actualizat la data: 01.05.2023
      </p>
    </div>
  );
};

export default PrivacyPolicy;
