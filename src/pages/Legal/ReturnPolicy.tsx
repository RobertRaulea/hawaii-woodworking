import React from 'react';

interface ReturnPolicyProps {}

export const ReturnPolicy: React.FC<ReturnPolicyProps> = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Politica de Retur</h1>
      
      <div className="prose prose-amber max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Dreptul de retragere</h2>
          <p className="mb-4">
            Conform legislației în vigoare (O.U.G. nr. 34/2014), aveți dreptul de a vă retrage din contract 
            în termen de 14 zile calendaristice de la data la care dumneavoastră sau un terț desemnat de dumneavoastră, 
            altul decât transportatorul, intrați în posesia fizică a ultimului produs comandat.
          </p>
          <p className="mb-4">
            Pentru a vă exercita dreptul de retragere, trebuie să ne informați cu privire la decizia dumneavoastră 
            printr-o declarație clară (de exemplu, o scrisoare trimisă prin poștă, fax sau e-mail). Puteți folosi 
            modelul de formular de retragere disponibil la sfârșitul acestei politici, dar nu este obligatoriu.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Condiții de returnare</h2>
          <p className="mb-4">
            Pentru a fi eligibile pentru returnare, produsele trebuie să îndeplinească următoarele condiții:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Să fie în aceeași stare în care au fost primite</li>
            <li>Să nu prezinte semne de uzură sau deteriorare</li>
            <li>Să fie returnate în ambalajul original, dacă este posibil</li>
            <li>Să fie însoțite de factura sau bonul fiscal</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Excepții</h2>
          <p className="mb-4">
            Conform legislației în vigoare, următoarele categorii de produse nu pot fi returnate:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Produse personalizate sau fabricate la comandă conform specificațiilor clientului</li>
            <li>Produse care, din motive de igienă sau protecția sănătății, nu pot fi returnate odată ce sigiliul a fost rupt</li>
            <li>Produse care sunt susceptibile a se deteriora sau expira rapid</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Procedura de retur</h2>
          <p className="mb-4">
            Pentru a returna un produs, vă rugăm să urmați acești pași:
          </p>
          <ol className="list-decimal pl-6 mb-4">
            <li>Contactați-ne la adresa de email contact@hawaiiwoodworking.ro pentru a ne informa despre intenția de retur</li>
            <li>Împachetați produsul în ambalajul original sau într-unul adecvat pentru transport</li>
            <li>Atașați o copie a facturii sau bonului fiscal</li>
            <li>Expediați produsul la adresa indicată de noi</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Rambursarea</h2>
          <p className="mb-4">
            După primirea și verificarea produsului returnat, vom procesa rambursarea în maximum 14 zile calendaristice. 
            Rambursarea se va face folosind aceeași modalitate de plată pe care ați utilizat-o pentru tranzacția inițială, 
            cu excepția cazului în care ați convenit altfel.
          </p>
          <p className="mb-4">
            Costurile de returnare sunt suportate de către client, cu excepția cazurilor în care produsul livrat nu 
            corespunde specificațiilor sau prezintă defecte.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Produse defecte</h2>
          <p className="mb-4">
            În cazul în care primiți un produs defect sau deteriorat, vă rugăm să ne contactați în termen de 48 de ore 
            de la primirea coletului. Vom înlocui produsul sau vom oferi o rambursare completă, inclusiv costurile de livrare.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Model formular de retragere</h2>
          <div className="border p-4 mb-4">
            <p className="mb-2">Către: SC Hawaii Woodworking SRL</p>
            <p className="mb-2">Adresa: [Adresa completă]</p>
            <p className="mb-2">Email: contact@hawaiiwoodworking.ro</p>
            <p className="mb-4">Telefon: [Număr de telefon]</p>
            <p className="mb-2">Vă informez prin prezenta cu privire la retragerea mea din contractul referitor la vânzarea următoarelor produse:</p>
            <p className="mb-2">[Numele produselor]</p>
            <p className="mb-2">Comandate la data: [Data comenzii]</p>
            <p className="mb-2">Primite la data: [Data primirii]</p>
            <p className="mb-2">Numele consumatorului: [Numele dumneavoastră]</p>
            <p className="mb-2">Adresa consumatorului: [Adresa dumneavoastră]</p>
            <p className="mb-2">Semnătura consumatorului: [Doar în cazul în care acest formular este transmis pe hârtie]</p>
            <p className="mb-2">Data: [Data completării formularului]</p>
          </div>
        </section>
      </div>
      
      <p className="text-sm text-gray-500 mt-12 text-center">
        Actualizat la data: 01.05.2023
      </p>
    </div>
  );
};

export default ReturnPolicy;
