import type React from 'react';

import { BUSINESS } from '../../../shared/seo/seo.utils';

export const ReturnPolicy: React.FC = () => {
 return (
 <div className="max-w-3xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
 <h1 className="font-serif text-3xl lg:text-4xl font-medium text-foreground mb-10 text-center">Politica de Retur</h1>
 
 <div className="prose prose-amber max-w-none">
 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-foreground mb-4">1. Dreptul de retragere</h2>
 <p className="mb-4">
 Conform legislației în vigoare (O.U.G. nr. 34/2014), aveți dreptul de a vă retrage din contract 
 în termen de 14 zile calendaristice de la data la care dumneavoastră sau un terț desemnat de dumneavoastră, 
 altul decât transportatorul, intrați în posesia fizică a ultimului produs comandat.
 </p>
 <p className="mb-4">
 Pentru a vă exercita dreptul de retragere, trebuie să ne informați cu privire la decizia dumneavoastră 
 printr-o declarație clară (de exemplu, o scrisoare trimisă prin poștă sau e-mail). Puteți folosi
 modelul de formular de retragere disponibil la sfârșitul acestei politici, dar nu este obligatoriu.
 </p>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-foreground mb-4">2. Condiții de returnare</h2>
 <p className="mb-4">
 Puteți inspecta produsele pentru a le stabili natura, caracteristicile și funcționarea, așa cum ați
 face într-un magazin. Exercitarea dreptului legal de retragere nu este condiționată de păstrarea
 ambalajului original sau de faptul că produsul nu a fost deloc manipulat.
 </p>
 <p className="mb-4">
 Răspundeți doar pentru diminuarea valorii produselor rezultată din manipulări care depășesc ceea ce
 este necesar pentru această verificare, în condițiile legii. O asemenea diminuare nu înseamnă
 pierderea automată a dreptului de retragere.
 </p>
 <ul className="list-disc pl-6 mb-4">
 <li>Protejați produsul într-un ambalaj adecvat pentru transport; puteți folosi ambalajul original dacă îl aveți.</li>
 <li>Pentru identificarea achiziției, comunicați numărul comenzii sau o altă dovadă a cumpărării, de exemplu o copie a facturii ori a bonului fiscal.</li>
 </ul>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-foreground mb-4">3. Excepții</h2>
 <p className="mb-4">
 Excepțiile legale de la dreptul de retragere se aplică doar când produsul îndeplinește condițiile
 prevăzute de lege, de exemplu:
 </p>
 <ul className="list-disc pl-6 mb-4">
 <li>Bunuri realizate după specificațiile consumatorului sau clar personalizate; simplul fapt că un produs standard este fabricat după plasarea comenzii nu îl face automat exceptat.</li>
 <li>Bunuri sigilate care nu pot fi returnate din motive de protecție a sănătății sau de igienă și care au fost desigilate de consumator după livrare</li>
 <li>Produse care sunt susceptibile a se deteriora sau expira rapid</li>
 </ul>
 <p className="mb-4">
 Aceste excepții nu afectează drepturile legale privind produsele defecte sau neconforme, inclusiv
 în cazul produselor personalizate.
 </p>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-foreground mb-4">4. Procedura de retur</h2>
 <p className="mb-4">
 Pentru a returna un produs, vă rugăm să urmați acești pași:
 </p>
 <ol className="list-decimal pl-6 mb-4">
 <li>Informați-ne despre decizia de retragere, de exemplu la adresa de email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></li>
 <li>Împachetați produsul în ambalajul original sau într-unul adecvat pentru transport</li>
 <li>Includeți numărul comenzii sau o altă dovadă a cumpărării pentru identificarea achiziției</li>
 <li>Expediați produsul la adresa indicată de noi, fără întârziere nejustificată și în cel mult 14 zile de la comunicarea deciziei de retragere</li>
 </ol>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-foreground mb-4">5. Rambursarea</h2>
 <p className="mb-4">
 Vom rambursa sumele primite, inclusiv costul livrării standard, fără întârziere nejustificată și în
 cel mult 14 zile calendaristice de la data la care suntem informați despre decizia de retragere.
 Putem amâna rambursarea până la primirea produselor sau a dovezii expedierii lor, luând în considerare
 data cea mai apropiată. Costurile suplimentare pentru o livrare aleasă de dumneavoastră, mai scumpă
 decât livrarea standard oferită, nu sunt rambursate.
 Rambursarea se va face folosind aceeași modalitate de plată pe care ați utilizat-o pentru tranzacția inițială, 
 cu excepția cazului în care ați convenit expres altfel, fără comisioane pentru rambursare.
 </p>
 <p className="mb-4">
 Costurile de returnare sunt suportate de către client, cu excepția cazurilor în care produsul livrat nu 
 corespunde specificațiilor sau prezintă defecte.
 </p>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-foreground mb-4">6. Produse defecte</h2>
 <p className="mb-4">
 În cazul în care primiți un produs defect sau deteriorat, vă rugăm să ne anunțați cât mai curând
 după constatare la <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> sau la
 {' '}<a href={BUSINESS.phoneHref}>{BUSINESS.phoneDisplay}</a>, pentru a putea analiza situația.
 Recomandarea de notificare promptă nu limitează drepturile legale sau termenele legale de care
 beneficiați pentru produse neconforme. Remediile aplicabile se stabilesc în condițiile legii.
 </p>
 </section>

 <section className="mb-8">
 <h2 className="font-serif text-xl font-medium text-foreground mb-4">7. Model formular de retragere</h2>
 <div className="border p-4 mb-4">
 <p className="mb-2">Către: {BUSINESS.legalName}</p>
 <p className="mb-2">Adresa: {BUSINESS.address}</p>
 <p className="mb-2">Email: <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></p>
 <p className="mb-4">Telefon: <a href={BUSINESS.phoneHref}>{BUSINESS.phoneDisplay}</a></p>
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
 
 <p className="text-sm text-gray-500 dark:text-stone-400 mt-12 text-center">
 Actualizat la data: 03.11.2026
 </p>
 </div>
 );
};

export default ReturnPolicy;
