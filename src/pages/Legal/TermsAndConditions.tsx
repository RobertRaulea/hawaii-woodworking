import React from 'react';

interface TermsAndConditionsProps {}

export const TermsAndConditions: React.FC<TermsAndConditionsProps> = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Termeni și Condiții</h1>
      
      <div className="prose prose-amber max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Informații generale</h2>
          <p className="mb-4">
            Acest document stabilește termenii și condițiile de utilizare a site-ului Hawaii Tâmplărie Sibiu, 
            operat de SC Hawaii Woodworking SRL. Prin utilizarea site-ului nostru, acceptați în totalitate 
            acești termeni și condiții.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Definiții</h2>
          <p className="mb-4">
            "Noi", "nostru", "compania" sau "vânzătorul" se referă la SC Hawaii Woodworking SRL.
            "Utilizator", "client", "dumneavoastră" sau "cumpărător" se referă la persoana care utilizează site-ul.
            "Produs" se referă la orice bun disponibil pentru achiziție pe site-ul nostru.
            "Site" se referă la magazinul online Hawaii Tâmplărie Sibiu.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Prețuri și modalități de plată</h2>
          <p className="mb-4">
            Toate prețurile afișate pe site includ TVA. Ne rezervăm dreptul de a modifica prețurile 
            fără notificare prealabilă. Acceptăm plăți prin card bancar, transfer bancar și ramburs.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Livrare și expediere</h2>
          <p className="mb-4">
            Livrarea produselor se face prin servicii de curierat în toată România. Timpul de livrare 
            este estimativ și poate varia în funcție de stoc și locație. Taxa de livrare este afișată 
            în procesul de comandă.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Retur și garanție</h2>
          <p className="mb-4">
            Conform legislației române, aveți dreptul de a returna produsele în termen de 14 zile 
            calendaristice de la primire, fără a fi nevoie să justificați decizia de returnare.
            Pentru detalii complete, consultați Politica de Retur.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Drepturi de proprietate intelectuală</h2>
          <p className="mb-4">
            Toate elementele site-ului, incluzând dar fără a se limita la logo-uri, imagini, texte, 
            sunt protejate prin legile drepturilor de autor și aparțin SC Hawaii Woodworking SRL sau partenerilor săi.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Litigii</h2>
          <p className="mb-4">
            În caz de litigiu, vom încerca soluționarea pe cale amiabilă. Dacă acest lucru nu este posibil, 
            litigiul va fi soluționat de instanțele competente din România.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Modificarea termenilor și condițiilor</h2>
          <p className="mb-4">
            Ne rezervăm dreptul de a modifica acești termeni și condiții în orice moment, 
            fără notificare prealabilă. Modificările intră în vigoare imediat ce sunt publicate pe site.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Prevederi finale</h2>
          <p className="mb-4">
            Acești termeni și condiții sunt guvernați de legile române în vigoare. 
            Dacă orice parte a acestor termeni este considerată ilegală sau neaplicabilă, 
            acea parte va fi eliminată, iar restul termenilor vor rămâne valabili.
          </p>
        </section>
      </div>
      
      <p className="text-sm text-gray-500 mt-12 text-center">
        Actualizat la data: 01.05.2023
      </p>
    </div>
  );
};

export default TermsAndConditions;
