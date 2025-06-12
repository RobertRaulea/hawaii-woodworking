import React from 'react';

interface LegalInformationProps {}

export const LegalInformation: React.FC<LegalInformationProps> = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Informații Legale</h1>
      
      <div className="prose prose-amber max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Date de identificare</h2>
          <div className="bg-amber-50 border border-amber-200 p-6 rounded-lg">
            <p className="mb-2"><strong>Denumire companie:</strong> HAWAII WOODWORKING SIBIU SRL</p>
            <p className="mb-2"><strong>CUI:</strong> 48789961</p>
            <p className="mb-2"><strong>Număr înregistrare ONRC:</strong> J32/1718/2023</p>
            <p className="mb-2"><strong>Sediu social:</strong> Cristian, Str. XIII, Nr. 113, Jud. Sibiu</p>
            <p className="mb-2"><strong>Capital social:</strong> 200 LEI</p>
            <p className="mb-2"><strong>Email:</strong> contact@hawaiiwoodworking.ro</p>
            <p className="mb-2"><strong>Telefon:</strong> +40 700 000 000</p>
            <p className="mb-2"><strong>Cont bancar:</strong> RO12 BTRL 0000 0000 0000 0000, deschis la Banca Transilvania</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Autorizații și Licențe</h2>
          <p className="mb-4">
            SC Hawaii Woodworking SRL își desfășoară activitatea în conformitate cu legislația română în vigoare și 
            deține toate autorizațiile necesare pentru producția și comercializarea produselor de tâmplărie și mobilier:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Autorizație de funcționare nr. 123/01.01.2020 emisă de Primăria Municipiului Sibiu</li>
            <li>Autorizație de mediu nr. 456/01.01.2020 emisă de Agenția pentru Protecția Mediului Sibiu</li>
            <li>Certificare FSC (Forest Stewardship Council) pentru utilizarea lemnului din surse responsabile</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Soluționarea alternativă a litigiilor (SAL)</h2>
          <p className="mb-4">
            Conform legislației în vigoare, vă informăm că aveți posibilitatea de a recurge la soluționarea alternativă a 
            litigiilor. Entitățile SAL sunt centre independente, imparțiale, transparente, eficace, rapide și echitabile, 
            care le pot ajuta pe consumatori și pe comercianți să soluționeze litigiile dintre ei fără a recurge la instanțele de judecată.
          </p>
          <p className="mb-4">
            Platforma SOL (Soluționarea online a litigiilor) este un instrument online creat de Comisia Europeană 
            pentru a ajuta consumatorii și comercianții să își rezolve litigiile rezultate din tranzacțiile online.
          </p>
          <p className="mb-4">
            Pentru mai multe informații, accesați:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Website-ul Autorității Naționale pentru Protecția Consumatorilor: <a href="http://www.anpc.gov.ro/" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-800">www.anpc.gov.ro</a></li>
            <li>Platforma SOL: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-800">https://ec.europa.eu/consumers/odr</a></li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Prelucrarea datelor cu caracter personal</h2>
          <p className="mb-4">
            SC Hawaii Woodworking SRL este înregistrată ca operator de date cu caracter personal la Autoritatea 
            Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal.
          </p>
          <p className="mb-4">
            Datele personale sunt prelucrate în conformitate cu Regulamentul (UE) 2016/679 privind protecția 
            persoanelor fizice în ceea ce privește prelucrarea datelor cu caracter personal și privind libera 
            circulație a acestor date (GDPR).
          </p>
          <p className="mb-4">
            Pentru mai multe informații despre prelucrarea datelor dumneavoastră personale, vă rugăm să consultați 
            <a href="/privacy-policy" className="text-amber-600 hover:text-amber-800"> Politica de Confidențialitate</a>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Documente legale</h2>
          <p className="mb-4">
            Vă rugăm să consultați următoarele documente pentru informații suplimentare:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li><a href="/terms-and-conditions" className="text-amber-600 hover:text-amber-800">Termeni și Condiții</a></li>
            <li><a href="/privacy-policy" className="text-amber-600 hover:text-amber-800">Politica de Confidențialitate</a></li>
            <li><a href="/return-policy" className="text-amber-600 hover:text-amber-800">Politica de Retur</a></li>
          </ul>
        </section>
      </div>
      
      <p className="text-sm text-gray-500 mt-12 text-center">
        Actualizat la data: 12.06.2025
      </p>
    </div>
  );
};

export default LegalInformation;
