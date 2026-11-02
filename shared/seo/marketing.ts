import type { SiteLanguage } from './seo.types';

export interface LandingSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LandingCard {
  title: string;
  body: string;
  href: string;
  linkLabel: string;
}

export interface LandingFaq {
  question: string;
  answer: string;
}

export interface LandingPage {
  path: string;
  kind: 'service' | 'page';
  crumb: string;
  seoTitle: string;
  seoDescription: string;
  eyebrow: string;
  heading: string;
  intro: string;
  sections: LandingSection[];
  cards?: LandingCard[];
  faqTitle: string;
  faqs: LandingFaq[];
  ctaTitle: string;
  ctaBody: string;
  emailSubject: string;
  emailBody: string;
}

export interface MarketingCopy {
  pages: {
    services: LandingPage;
    cnc: LandingPage;
    custom: LandingPage;
    circular: LandingPage;
    panels: LandingPage;
  };
  contact: {
    callLabel: string;
    emailLabel: string;
  };
  crumbs: {
    home: string;
    services: string;
  };
}

const ro: MarketingCopy = {
  contact: {
    callLabel: 'Sună-ne',
    emailLabel: 'Trimite e-mail',
  },
  crumbs: {
    home: 'Acasă',
    services: 'Servicii',
  },
  pages: {
    services: {
      path: '/servicii',
      kind: 'page',
      crumb: 'Servicii',
      seoTitle: 'Servicii de tâmplărie și prelucrare a lemnului',
      seoDescription:
        'Servicii Hawaii Woodworking: prelucrare CNC în lemn, MDF și placaj, debitare la circular, panouri din lemn masiv cu lamelă continuă, produse personalizate la comandă și magazin online. Comenzi mici evaluate individual, în toată România.',
      eyebrow: 'Hawaii Woodworking · Servicii',
      heading: 'Servicii de prelucrare a lemnului',
      intro:
        'Atelierul nostru din județul Sibiu prelucrează lemnul pentru clienți din toată România: prelucrări CNC, produse personalizate la comandă și un magazin online cu produse finite.',
      sections: [
        {
          heading: 'Cu ce te putem ajuta',
          paragraphs: [
            'Alege serviciul potrivit proiectului tău: prelucrare CNC pentru piese din lemn, MDF sau placaj, debitare la circular, panouri din lemn masiv cu lamelă continuă, produse personalizate realizate la comandă sau produsele finite din magazinul online.',
          ],
        },
      ],
      cards: [
        {
          title: 'Prelucrare CNC în lemn, MDF și placaj',
          body: 'Piese unice, prototipuri și serii mici prelucrate CNC, cu ofertă în funcție de proiect.',
          href: '/servicii/prelucrare-cnc-lemn',
          linkLabel: 'Detalii CNC',
        },
        {
          title: 'Produse personalizate la comandă',
          body: 'Cadouri, decorațiuni și piese realizate pe specificațiile tale, pornind de la portofoliul nostru.',
          href: '/produse-personalizate',
          linkLabel: 'Detalii personalizare',
        },
        {
          title: 'Debitare la circular',
          body: 'Debitare a lemnului și a panourilor după lista ta de piese, cu confirmare individuală.',
          href: '/servicii/debitare-circular',
          linkLabel: 'Detalii debitare',
        },
        {
          title: 'Panouri din lemn masiv cu lamelă continuă',
          body: 'Panouri din lemn masiv, solicitate la cerere pentru proiectul tău.',
          href: '/servicii/panouri-lemn-masiv-lamela-continua',
          linkLabel: 'Detalii panouri',
        },
        {
          title: 'Magazinul online',
          body: 'Produse din lemn finite, cu preț afișat și disponibilitate verificabilă în magazin.',
          href: '/products',
          linkLabel: 'Vezi produsele',
        },
      ],
      faqTitle: 'Întrebări frecvente',
      faqs: [
        {
          question: 'Lucrați cu clienți din afara Sibiului?',
          answer:
            'Da. Proiectele se discută la distanță, pe email sau telefonic, și deservim clienți din toată România.',
        },
        {
          question: 'Pot solicita o singură bucată sau o serie mică?',
          answer:
            'Da, poți solicita. Comenzile mici, piesele unice și prototipurile sunt evaluate individual, în funcție de proiect și materiale.',
        },
        {
          question: 'Cum cer o ofertă?',
          answer:
            'Scrie-ne pe email sau sună-ne cu detaliile proiectului (ce vrei să realizezi, dimensiuni, material, cantitate, termen). Revenim cu o evaluare și o ofertă.',
        },
      ],
      ctaTitle: 'Discută cu noi proiectul tău',
      ctaBody:
        'Sună-ne sau trimite-ne un email cu detaliile proiectului. Butonul de email deschide aplicația ta de email cu un mesaj precompletat — cererea nu este trimisă automat.',
      emailSubject: 'Solicitare ofertă – Servicii de prelucrare a lemnului',
      emailBody:
        'Bună ziua,\n\nAș dori mai multe informații despre serviciile voastre de prelucrare a lemnului.\n\nCe vreau să realizez:\nMaterial (lemn / MDF / placaj):\nDimensiuni:\nCantitate:\nTermen dorit:\n\nNume:\nTelefon:\n\nMulțumesc!',
    },
    cnc: {
      path: '/servicii/prelucrare-cnc-lemn',
      kind: 'service',
      crumb: 'Prelucrare CNC',
      seoTitle: 'Prelucrări CNC lemn, MDF și placaj | Comenzi mici',
      seoDescription:
        'Prelucrare CNC în lemn, MDF și placaj: debitare, gravură și piese pentru proiecte mici sau prototipuri. Comenzile mici sunt evaluate individual. Cere o ofertă.',
      eyebrow: 'Servicii · CNC',
      heading: 'Prelucrare CNC a lemnului, MDF-ului și placajului',
      intro:
        'Folosim prelucrarea CNC pentru piese din lemn, MDF și placaj: de la decorațiuni și inscripții la componente și prototipuri. Fiecare cerere este evaluată individual, inclusiv comenzile de o singură bucată sau seriile mici.',
      sections: [
        {
          heading: 'Materiale prelucrate',
          paragraphs: [
            'Prelucrăm CNC trei categorii de materiale lemnoase. Compatibilitatea exactă cu proiectul tău se confirmă la evaluare.',
          ],
          bullets: [
            'Lemn masiv — pentru piese decorative și funcționale.',
            'MDF — pentru piese plane, inscripții și decorațiuni, inclusiv pentru finisaje vopsite.',
            'Placaj — pentru piese care au nevoie de rezistență la grosimi mici.',
          ],
        },
        {
          heading: 'Comenzi mici și prototipuri',
          paragraphs: [
            'Poți solicita o singură piesă, un prototip sau o serie mică. Fezabilitatea și cantitatea acceptată se confirmă individual, în funcție de complexitate și material.',
          ],
        },
        {
          heading: 'Ce influențează prețul',
          paragraphs: [
            'Costul unei prelucrări CNC se stabilește individual, în funcție de desenul piesei, material, dimensiuni, cantitate și finisajul cerut. Prețul și acceptarea comenzii se confirmă după evaluarea proiectului.',
          ],
        },
        {
          heading: 'Cum soliciți o ofertă',
          bullets: [
            'Spune-ne pe email sau telefonic ce vrei să realizezi.',
            'Include dimensiunile pieselor, materialul dorit (lemn, MDF sau placaj) și cantitatea.',
            'Atașează, dacă ai, o schiță, un desen tehnic sau o fotografie de referință.',
            'Menționează termenul la care ai nevoie de piese.',
            'Revenim cu o evaluare: fezabilitate, preț și termen confirmate individual.',
          ],
        },
        {
          heading: 'Confirmarea proiectului',
          paragraphs: [
            'Toleranțele, alegerea materialului, fezabilitatea, costul final și termenul de realizare se confirmă după evaluarea fiecărui proiect.',
          ],
        },
      ],
      cards: [
        {
          title: 'Produse personalizate',
          body: 'Piese realizate pe specificațiile tale, pornind de la lucrările noastre.',
          href: '/produse-personalizate',
          linkLabel: 'Detalii',
        },
        {
          title: 'Magazinul online',
          body: 'Produse finite cu preț afișat și disponibilitate verificabilă în magazin.',
          href: '/products',
          linkLabel: 'Vezi produsele',
        },
      ],
      faqTitle: 'Întrebări frecvente',
      faqs: [
        {
          question: 'Există o cantitate minimă de comandă?',
          answer:
            'Poți solicita inclusiv o singură piesă sau o serie mică. Cantitatea acceptată, prețul și fezabilitatea se confirmă după evaluarea proiectului.',
        },
        {
          question: 'Ce informații sau fișiere sunt utile pentru ofertă?',
          answer:
            'Dimensiunile, materialul dorit și cantitatea sunt esențiale. O schiță, un desen tehnic sau o fotografie de referință ne ajută să evaluăm mai repede proiectul.',
        },
        {
          question: 'Cât costă prelucrarea CNC?',
          answer:
            'Prețul depinde de desenul piesei, material, dimensiuni, cantitate și finisaj și se confirmă după evaluarea cererii.',
        },
        {
          question: 'Ce materiale acceptați?',
          answer:
            'Oferta prezentată aici se referă la lemn, MDF și placaj; compatibilitatea materialului cu proiectul se confirmă la evaluare.',
        },
      ],
      ctaTitle: 'Cere o ofertă pentru proiectul tău',
      ctaBody:
        'Descrie-ne piesele de care ai nevoie, cu dimensiuni, material, cantitate și termen. Butonul de email deschide aplicația ta de email cu un mesaj precompletat — cererea nu este trimisă automat.',
      emailSubject: 'Solicitare ofertă – Prelucrare CNC',
      emailBody:
        'Bună ziua,\n\nAș dori o ofertă pentru prelucrare CNC.\n\nMaterial (lemn / MDF / placaj):\nDimensiuni piese:\nCantitate:\nFinisaj dorit:\nTermen dorit:\nDescriere proiect sau link către schiță / referință:\n\nNume:\nTelefon:\n\nMulțumesc!',
    },
    custom: {
      path: '/produse-personalizate',
      kind: 'service',
      crumb: 'Produse personalizate',
      seoTitle: 'Produse din lemn personalizate la comandă',
      seoDescription:
        'Cadouri, decorațiuni și produse din lemn realizate pe specificațiile tale: dimensiuni, materiale și personalizări discutate individual. Vezi portofoliul și cere o ofertă.',
      eyebrow: 'Servicii · La comandă',
      heading: 'Produse din lemn personalizate',
      intro:
        'Vrei un cadou personalizat, o decorațiune sau o piesă care nu există în magazin? Pornim de la produsele noastre sau de la lucrările din portofoliu și discutăm împreună dimensiunile, materialul, personalizarea și cantitatea, înainte de a-ți face o ofertă.',
      sections: [
        {
          heading: 'Cum funcționează',
          paragraphs: [
            'Alegi un produs din magazin sau o lucrare din portofoliu ca referință, apoi stabilim împreună ce se poate adapta: dimensiuni, material, gravură sau alte personalizări și cantitatea. Nu toate produsele pot fi modificate — posibilitățile concrete se confirmă la cerere.',
          ],
        },
        {
          heading: 'Pentru ce este potrivit',
          paragraphs: ['Exemple de proiecte pe care le poți solicita:'],
          bullets: [
            'cadouri personalizate (nume, mesaje, date aniversare);',
            'decorațiuni pentru casă sau restaurant;',
            'serii mici de produse pentru evenimente sau firme.',
          ],
        },
      ],
      cards: [
        {
          title: 'Portofoliul lucrărilor la comandă',
          body: 'Vezi lucrări realizate anterior la comandă.',
          href: '/catalog',
          linkLabel: 'Vezi portofoliul',
        },
        {
          title: 'Magazinul online',
          body: 'Produse finite care pot servi ca referință.',
          href: '/products',
          linkLabel: 'Vezi produsele',
        },
        {
          title: 'Prelucrare CNC',
          body: 'Piese din lemn, MDF și placaj debitate sau gravate CNC.',
          href: '/servicii/prelucrare-cnc-lemn',
          linkLabel: 'Detalii CNC',
        },
      ],
      faqTitle: 'Întrebări frecvente',
      faqs: [
        {
          question: 'Pot personaliza orice produs din magazin?',
          answer:
            'Nu toate produsele pot fi modificate. Spune-ne la ce te gândești și îți confirmăm ce se poate realiza.',
        },
        {
          question: 'Cât durează realizarea unei comenzi personalizate?',
          answer:
            'Termenul depinde de proiect și se confirmă individual, după ce stabilim împreună detaliile.',
        },
        {
          question: 'Cât costă un produs personalizat?',
          answer:
            'Prețul depinde de material, dimensiuni, complexitate și cantitate. Primești o ofertă după ce discutăm proiectul.',
        },
        {
          question: 'Cum plasez o cerere?',
          answer:
            'Scrie-ne pe email sau sună-ne cu detaliile: produs sau lucrare de referință, dimensiuni, personalizarea dorită, cantitate și termen.',
        },
      ],
      ctaTitle: 'Povestește-ne ce ai în minte',
      ctaBody:
        'Trimite-ne produsul sau lucrarea de referință, dimensiunile și personalizarea dorită. Butonul de email deschide aplicația ta de email cu un mesaj precompletat — cererea nu este trimisă automat.',
      emailSubject: 'Solicitare ofertă – Produs personalizat',
      emailBody:
        'Bună ziua,\n\nAș dori o ofertă pentru un produs personalizat.\n\nProdus sau lucrare de referință:\nDimensiuni:\nPersonalizare dorită (gravură, text, altele):\nCantitate:\nTermen dorit:\n\nNume:\nTelefon:\n\nMulțumesc!',
    },
    circular: {
      path: '/servicii/debitare-circular',
      kind: 'service',
      crumb: 'Debitare la circular',
      seoTitle: 'Debitare la circular pentru lemn și panouri',
      seoDescription:
        'Debitare la circular pentru proiecte din lemn. Trimite detaliile materialului, dimensiunile și lista de piese; fezabilitatea, prețul și termenul se confirmă individual.',
      eyebrow: 'Servicii · Debitare',
      heading: 'Debitare la circular',
      intro:
        'Oferim debitare la circular pentru proiecte din lemn, pe baza dimensiunilor cerute și a evaluării fiecărei cereri.',
      sections: [
        {
          heading: 'Debitare după lista de piese',
          paragraphs: [
            'Ne trimiți lista de piese cu dimensiunile pe fiecare piesă, grosimea, cantitatea și, dacă ai, o schiță sau un plan de debitare ca referință. Fiecare cerere este evaluată individual.',
          ],
        },
        {
          heading: 'Ce confirmăm înainte de lucru',
          paragraphs: [
            'Compatibilitatea materialului, dimensiunile realizabile, planul de debitare și toleranțele, precum și prețul și termenul, se confirmă individual, în funcție de cerere.',
          ],
        },
      ],
      cards: [
        {
          title: 'Panouri din lemn masiv cu lamelă continuă',
          body: 'Panouri din lemn masiv solicitate la cerere pentru proiectul tău.',
          href: '/servicii/panouri-lemn-masiv-lamela-continua',
          linkLabel: 'Detalii panouri',
        },
        {
          title: 'Prelucrare CNC',
          body: 'Piese din lemn, MDF și placaj debitate sau gravate CNC.',
          href: '/servicii/prelucrare-cnc-lemn',
          linkLabel: 'Detalii CNC',
        },
      ],
      faqTitle: 'Întrebări frecvente',
      faqs: [
        {
          question: 'Cât costă debitarea la circular?',
          answer:
            'Prețul depinde de material, numărul de piese și dimensiunile solicitate și se confirmă după evaluarea cererii.',
        },
        {
          question: 'Ce informații sunt utile pentru ofertă?',
          answer:
            'Materialul și grosimea, dimensiunile pe fiecare piesă, cantitatea și termenul dorit. O schiță sau un plan de debitare ne ajută să evaluăm mai repede.',
        },
        {
          question: 'Pot aduce material propriu?',
          answer:
            'Posibilitatea de a lucra pe materialul clientului se confirmă înainte de trimiterea materialului — nu este acceptată automat.',
        },
      ],
      ctaTitle: 'Cere o ofertă pentru debitare',
      ctaBody:
        'Trimite-ne detaliile materialului, grosimea, dimensiunile pieselor, cantitatea și termenul dorit. Butonul de email deschide aplicația ta de email cu un mesaj precompletat — cererea nu este trimisă automat.',
      emailSubject: 'Solicitare ofertă – Debitare la circular',
      emailBody:
        'Bună ziua,\n\nAș dori o ofertă pentru debitare la circular.\n\nMaterial:\nGrosime:\nDimensiuni piese:\nCantitate:\nTermen dorit:\nSchiță sau referință:\n\nNume:\nTelefon:\n\nMulțumesc!',
    },
    panels: {
      path: '/servicii/panouri-lemn-masiv-lamela-continua',
      kind: 'page',
      crumb: 'Panouri lemn masiv',
      seoTitle: 'Panouri din lemn masiv cu lamelă continuă',
      seoDescription:
        'Panouri din lemn masiv cu lamelă continuă, pentru proiectul tău. Solicită detalii despre esență, dimensiuni, grosime, disponibilitate și preț.',
      eyebrow: 'Servicii · Panouri',
      heading: 'Panouri din lemn masiv cu lamelă continuă',
      intro:
        'Cauți panouri din lemn masiv cu lamelă continuă? Trimite-ne cerințele proiectului pentru a confirma opțiunile disponibile, dimensiunile și oferta.',
      sections: [
        {
          heading: 'Ce înseamnă lamelă continuă',
          paragraphs: [
            'Panoul este alcătuit din lamele de lemn masiv lipite pe lățime. Fiecare lamelă continuă pe toată lungimea panoului, fără îmbinări cap la cap; nu este o singură scândură lată.',
          ],
        },
        {
          heading: 'Alegerea panoului',
          paragraphs: [
            'Pentru o cerere, indică esența de lemn dorită, lungimea, lățimea și grosimea, cantitatea și scopul utilizării. Opțiunile concrete se confirmă la cerere.',
          ],
        },
        {
          heading: 'Disponibilitate și ofertă',
          paragraphs: [
            'Esența, dimensiunile disponibile, prețul, finisarea și opțiunile de livrare se confirmă pentru fiecare cerere.',
          ],
        },
      ],
      cards: [
        {
          title: 'Debitare la circular',
          body: 'Debitare a lemnului și a panourilor după lista ta de piese.',
          href: '/servicii/debitare-circular',
          linkLabel: 'Detalii debitare',
        },
        {
          title: 'Prelucrare CNC',
          body: 'Piese din lemn, MDF și placaj debitate sau gravate CNC.',
          href: '/servicii/prelucrare-cnc-lemn',
          linkLabel: 'Detalii CNC',
        },
      ],
      faqTitle: 'Întrebări frecvente',
      faqs: [
        {
          question: 'Care este diferența față de o singură scândură masivă?',
          answer:
            'Un panou este lipit din mai multe lamele; la varianta cu lamelă continuă, fiecare lamelă acoperă întreaga lungime a panoului, fără îmbinări cap-coadă. Rămâne în continuare un panou din lamele, nu o singură bucată de lemn.',
        },
        {
          question: 'Ce esențe și dimensiuni sunt disponibile?',
          answer:
            'Spune-ne esența și dimensiunile dorite. Îți confirmăm opțiunile disponibile înainte de stabilirea ofertei.',
        },
        {
          question: 'Cât costă un panou?',
          answer:
            'Prețul depinde de esență, dimensiuni, grosime și cantitate și se confirmă după evaluarea cererii.',
        },
      ],
      ctaTitle: 'Solicită detalii pentru proiectul tău',
      ctaBody:
        'Trimite-ne esența dorită, dimensiunile (lungime, lățime, grosime), cantitatea, scopul utilizării și termenul. Butonul de email deschide aplicația ta de email cu un mesaj precompletat — cererea nu este trimisă automat.',
      emailSubject: 'Solicitare ofertă – Panouri lemn masiv cu lamelă continuă',
      emailBody:
        'Bună ziua,\n\nAș dori detalii despre panouri din lemn masiv cu lamelă continuă.\n\nEsență dorită:\nDimensiuni (lungime, lățime, grosime):\nCantitate:\nScopul utilizării:\nTermen dorit:\n\nNume:\nTelefon:\n\nMulțumesc!',
    },
  },
};

const en: MarketingCopy = {
  contact: {
    callLabel: 'Call us',
    emailLabel: 'Send email',
  },
  crumbs: {
    home: 'Home',
    services: 'Services',
  },
  pages: {
    services: {
      path: '/servicii',
      kind: 'page',
      crumb: 'Services',
      seoTitle: 'Woodworking and CNC machining services',
      seoDescription:
        'Hawaii Woodworking services: CNC machining in wood, MDF and plywood, made-to-order custom products and an online shop. Small orders assessed individually, across Romania.',
      eyebrow: 'Hawaii Woodworking · Services',
      heading: 'Woodworking services',
      intro:
        'Our workshop in Sibiu county machines wood for customers across Romania: CNC machining, made-to-order custom products and an online shop with finished items.',
      sections: [
        {
          heading: 'How we can help',
          paragraphs: [
            'Choose the service that fits your project: CNC machining for wood, MDF or plywood parts, made-to-order custom products, or the finished items in our online shop.',
          ],
        },
      ],
      cards: [
        {
          title: 'CNC machining in wood, MDF and plywood',
          body: 'Single pieces, prototypes and small batches machined by CNC, quoted per project.',
          href: '/servicii/prelucrare-cnc-lemn',
          linkLabel: 'CNC details',
        },
        {
          title: 'Made-to-order custom products',
          body: 'Gifts, decorations and pieces made to your specifications, based on our portfolio.',
          href: '/produse-personalizate',
          linkLabel: 'Custom details',
        },
        {
          title: 'Online shop',
          body: 'Finished wood products, with a listed price and availability you can check in the shop.',
          href: '/products',
          linkLabel: 'Browse products',
        },
      ],
      faqTitle: 'Frequently asked questions',
      faqs: [
        {
          question: 'Do you work with customers outside Sibiu?',
          answer:
            'Yes. Projects are discussed remotely, by email or phone, and we serve customers across Romania.',
        },
        {
          question: 'Can I request a single piece or a small batch?',
          answer:
            'Yes, you can. Small orders, single pieces and prototypes are assessed individually, based on the project and materials.',
        },
        {
          question: 'How do I request a quote?',
          answer:
            'Email or call us with the project details (what you want made, dimensions, material, quantity, deadline). We reply with an assessment and a quote.',
        },
      ],
      ctaTitle: 'Tell us about your project',
      ctaBody:
        'Call or email us with the project details. The email button opens your email app with a pre-filled message — your request is not sent automatically.',
      emailSubject: 'Quote request – Woodworking services',
      emailBody:
        'Hello,\n\nI would like more information about your woodworking services.\n\nWhat I would like made:\nMaterial (wood / MDF / plywood):\nDimensions:\nQuantity:\nDesired deadline:\n\nName:\nPhone:\n\nThank you!',
    },
    cnc: {
      path: '/servicii/prelucrare-cnc-lemn',
      kind: 'service',
      crumb: 'CNC machining',
      seoTitle: 'CNC machining in wood, MDF and plywood | Small orders',
      seoDescription:
        'CNC machining in wood, MDF and plywood: cutting, engraving and parts for small projects or prototypes. Small orders are assessed individually. Request a quote.',
      eyebrow: 'Services · CNC',
      heading: 'CNC machining of wood, MDF and plywood',
      intro:
        'We use CNC machining for parts in wood, MDF and plywood: from decorations and lettering to components and prototypes. Every request is assessed individually, including single-piece orders and small batches.',
      sections: [
        {
          heading: 'Materials we machine',
          paragraphs: [
            'We CNC-machine three categories of wood-based materials. Exact suitability for your project is confirmed during assessment.',
          ],
          bullets: [
            'Solid wood — for decorative and functional parts.',
            'MDF — for flat parts, lettering and decorations, including painted finishes.',
            'Plywood — for parts that need strength at small thicknesses.',
          ],
        },
        {
          heading: 'Small orders and prototypes',
          paragraphs: [
            'You can request a single piece, a prototype or a small batch. Feasibility and the accepted quantity are confirmed individually, based on complexity and material.',
          ],
        },
        {
          heading: 'What affects the price',
          paragraphs: [
            'The cost of CNC machining is set individually, based on the part drawing, material, dimensions, quantity and requested finish. Price and order acceptance are confirmed after the project is assessed.',
          ],
        },
        {
          heading: 'How to request a quote',
          bullets: [
            'Tell us by email or phone what you want made.',
            'Include the part dimensions, the material you want (wood, MDF or plywood) and the quantity.',
            'Attach a sketch, technical drawing or reference photo if you have one.',
            'Mention when you need the parts.',
            'We reply with an assessment: feasibility, price and deadline confirmed individually.',
          ],
        },
        {
          heading: 'Confirming your project',
          paragraphs: [
            'Tolerances, material selection, feasibility, final cost and lead time are confirmed after each project is assessed.',
          ],
        },
      ],
      cards: [
        {
          title: 'Custom products',
          body: 'Pieces made to your specifications, based on our work.',
          href: '/produse-personalizate',
          linkLabel: 'Details',
        },
        {
          title: 'Online shop',
          body: 'Finished products with listed prices.',
          href: '/products',
          linkLabel: 'Browse products',
        },
      ],
      faqTitle: 'Frequently asked questions',
      faqs: [
        {
          question: 'Is there a minimum order quantity?',
          answer:
            'You can request even a single piece or a small batch. The accepted quantity, price and feasibility are confirmed after the project is assessed.',
        },
        {
          question: 'What information or files help with a quote?',
          answer:
            'Dimensions, the desired material and quantity are essential. A sketch, technical drawing or reference photo helps us assess the project faster.',
        },
        {
          question: 'How much does CNC machining cost?',
          answer:
            'The price depends on the part drawing, material, dimensions, quantity and finish, and is confirmed after your request is assessed.',
        },
        {
          question: 'What materials do you machine?',
          answer:
            'The offer presented here covers wood, MDF and plywood; material compatibility with your project is confirmed during assessment.',
        },
      ],
      ctaTitle: 'Request a quote for your project',
      ctaBody:
        'Describe the parts you need, with dimensions, material, quantity and deadline. The email button opens your email app with a pre-filled message — your request is not sent automatically.',
      emailSubject: 'Quote request – CNC machining',
      emailBody:
        'Hello,\n\nI would like a quote for CNC machining.\n\nMaterial (wood / MDF / plywood):\nPart dimensions:\nQuantity:\nDesired finish:\nDesired deadline:\nProject description or link to sketch / reference:\n\nName:\nPhone:\n\nThank you!',
    },
    custom: {
      path: '/produse-personalizate',
      kind: 'service',
      crumb: 'Custom products',
      seoTitle: 'Made-to-order custom wood products',
      seoDescription:
        'Gifts, decorations and wood products made to your specifications: dimensions, materials and personalisation discussed individually. See the portfolio and request a quote.',
      eyebrow: 'Services · Made to order',
      heading: 'Custom wood products',
      intro:
        'Want a personalised gift, a decoration or a piece that is not in the shop? We start from our products or portfolio pieces and discuss dimensions, material, personalisation and quantity together before making you an offer.',
      sections: [
        {
          heading: 'How it works',
          paragraphs: [
            'You pick a product from the shop or a portfolio piece as a reference, then we agree together what can be adapted: dimensions, material, engraving or other personalisation, and quantity. Not every product can be modified — the concrete options are confirmed on request.',
          ],
        },
        {
          heading: 'What it is suited for',
          paragraphs: ['Examples of projects you can request:'],
          bullets: [
            'personalised gifts (names, messages, anniversary dates);',
            'decorations for homes or restaurants;',
            'small product runs for events or companies.',
          ],
        },
      ],
      cards: [
        {
          title: 'Made-to-order portfolio',
          body: 'See pieces previously made to order.',
          href: '/catalog',
          linkLabel: 'View portfolio',
        },
        {
          title: 'Online shop',
          body: 'Finished products that can serve as a reference.',
          href: '/products',
          linkLabel: 'Browse products',
        },
        {
          title: 'CNC machining',
          body: 'Wood, MDF and plywood parts cut or engraved by CNC.',
          href: '/servicii/prelucrare-cnc-lemn',
          linkLabel: 'CNC details',
        },
      ],
      faqTitle: 'Frequently asked questions',
      faqs: [
        {
          question: 'Can any shop product be personalised?',
          answer:
            'Not all products can be modified. Tell us what you have in mind and we will confirm what can be done.',
        },
        {
          question: 'How long does a custom order take?',
          answer:
            'The lead time depends on the project and is confirmed individually once we agree the details.',
        },
        {
          question: 'How much does a custom product cost?',
          answer:
            'The price depends on material, size, complexity and quantity. You receive a quote after we discuss the project.',
        },
        {
          question: 'How do I place a request?',
          answer:
            'Email or call us with the details: reference product or piece, dimensions, the personalisation you want, quantity and deadline.',
        },
      ],
      ctaTitle: 'Tell us what you have in mind',
      ctaBody:
        'Send us the reference product or piece, the dimensions and the personalisation you want. The email button opens your email app with a pre-filled message — your request is not sent automatically.',
      emailSubject: 'Quote request – Custom product',
      emailBody:
        'Hello,\n\nI would like a quote for a custom product.\n\nReference product or piece:\nDimensions:\nDesired personalisation (engraving, text, other):\nQuantity:\nDesired deadline:\n\nName:\nPhone:\n\nThank you!',
    },
    circular: {
      path: '/servicii/debitare-circular',
      kind: 'service',
      crumb: 'Circular saw cutting',
      seoTitle: 'Circular saw cutting for wood and panels',
      seoDescription:
        'Circular saw cutting for wood projects. Send the material details, dimensions and parts list; feasibility, price and lead time are confirmed individually.',
      eyebrow: 'Services · Cutting',
      heading: 'Circular saw cutting',
      intro:
        'We offer circular saw cutting for wood projects, based on the required dimensions and an assessment of each request.',
      sections: [
        {
          heading: 'Cutting to your parts list',
          paragraphs: [
            'Send us your parts list with the dimensions for each piece, the thickness, the quantity and, if you have one, a sketch or cutting plan as a reference. Every request is assessed individually.',
          ],
        },
        {
          heading: 'What we confirm before cutting',
          paragraphs: [
            'Material compatibility, workable dimensions, the cutting plan and tolerances, as well as price and lead time, are confirmed individually for each request.',
          ],
        },
      ],
      cards: [
        {
          title: 'Continuous-stave solid wood panels',
          body: 'Solid wood panels requested for your project.',
          href: '/servicii/panouri-lemn-masiv-lamela-continua',
          linkLabel: 'Panel details',
        },
        {
          title: 'CNC machining',
          body: 'Wood, MDF and plywood parts cut or engraved by CNC.',
          href: '/servicii/prelucrare-cnc-lemn',
          linkLabel: 'CNC details',
        },
      ],
      faqTitle: 'Frequently asked questions',
      faqs: [
        {
          question: 'How much does circular saw cutting cost?',
          answer:
            'The price depends on the material, the number of pieces and the requested dimensions, and is confirmed after the request is assessed.',
        },
        {
          question: 'What information helps with a quote?',
          answer:
            'The material and thickness, the dimensions of each piece, the quantity and your deadline. A sketch or cutting plan helps us assess faster.',
        },
        {
          question: 'Can I supply my own material?',
          answer:
            'The possibility of working on customer-supplied material is confirmed before you send it — it is not accepted automatically.',
        },
      ],
      ctaTitle: 'Request a quote for cutting',
      ctaBody:
        'Send us the material details, thickness, part dimensions, quantity and desired deadline. The email button opens your email app with a pre-filled message — your request is not sent automatically.',
      emailSubject: 'Quote request – Circular saw cutting',
      emailBody:
        'Hello,\n\nI would like a quote for circular saw cutting.\n\nMaterial:\nThickness:\nPart dimensions:\nQuantity:\nDesired deadline:\nSketch or reference:\n\nName:\nPhone:\n\nThank you!',
    },
    panels: {
      path: '/servicii/panouri-lemn-masiv-lamela-continua',
      kind: 'page',
      crumb: 'Solid wood panels',
      seoTitle: 'Continuous-stave solid wood panels',
      seoDescription:
        'Continuous-stave solid wood panels for your project. Ask for details on species, dimensions, thickness, availability and price.',
      eyebrow: 'Services · Panels',
      heading: 'Continuous-stave solid wood panels',
      intro:
        'Looking for continuous-stave solid wood panels? Send us your project requirements so we can confirm the available options, dimensions and offer.',
      sections: [
        {
          heading: 'What continuous stave means',
          paragraphs: [
            'The panel is made of solid-wood lamellae glued side by side. Each lamella runs continuously along the full length of the panel, with no end-to-end joints; it is not a single wide board.',
          ],
        },
        {
          heading: 'Choosing a panel',
          paragraphs: [
            'For an enquiry, tell us the wood species you want, the length, width and thickness, the quantity and the intended use. The concrete options are confirmed on request.',
          ],
        },
        {
          heading: 'Availability and offer',
          paragraphs: [
            'The species, available dimensions, price, finishing and delivery options are confirmed for each enquiry.',
          ],
        },
      ],
      cards: [
        {
          title: 'Circular saw cutting',
          body: 'Cutting wood and panels to your parts list.',
          href: '/servicii/debitare-circular',
          linkLabel: 'Cutting details',
        },
        {
          title: 'CNC machining',
          body: 'Wood, MDF and plywood parts cut or engraved by CNC.',
          href: '/servicii/prelucrare-cnc-lemn',
          linkLabel: 'CNC details',
        },
      ],
      faqTitle: 'Frequently asked questions',
      faqs: [
        {
          question: 'How is it different from a single solid board?',
          answer:
            'A panel is glued from several lamellae; in the continuous-stave version each lamella covers the full length of the panel with no end joints. It is still a lamella panel, not a single piece of wood.',
        },
        {
          question: 'What species and dimensions are available?',
          answer:
            'Tell us the species and dimensions you want. We will confirm the available options before the quote is set.',
        },
        {
          question: 'How much does a panel cost?',
          answer:
            'The price depends on species, dimensions, thickness and quantity, and is confirmed after the enquiry is assessed.',
        },
      ],
      ctaTitle: 'Request details for your project',
      ctaBody:
        'Send us the desired species, dimensions (length, width, thickness), quantity, intended use and deadline. The email button opens your email app with a pre-filled message — your request is not sent automatically.',
      emailSubject: 'Quote request – Continuous-stave solid wood panels',
      emailBody:
        'Hello,\n\nI would like details on continuous-stave solid wood panels.\n\nDesired species:\nDimensions (length, width, thickness):\nQuantity:\nIntended use:\nDesired deadline:\n\nName:\nPhone:\n\nThank you!',
    },
  },
};

const de: MarketingCopy = {
  contact: {
    callLabel: 'Anrufen',
    emailLabel: 'E-Mail senden',
  },
  crumbs: {
    home: 'Startseite',
    services: 'Leistungen',
  },
  pages: {
    services: {
      path: '/servicii',
      kind: 'page',
      crumb: 'Leistungen',
      seoTitle: 'Tischlerei- und CNC-Bearbeitungsleistungen',
      seoDescription:
        'Leistungen von Hawaii Woodworking: CNC-Bearbeitung in Holz, MDF und Sperrholz, personalisierte Produkte auf Bestellung und Online-Shop. Kleinaufträge werden individuell geprüft, in ganz Rumänien.',
      eyebrow: 'Hawaii Woodworking · Leistungen',
      heading: 'Holzbearbeitung als Service',
      intro:
        'Unsere Werkstatt im Kreis Sibiu bearbeitet Holz für Kunden in ganz Rumänien: CNC-Bearbeitung, personalisierte Produkte auf Bestellung und ein Online-Shop mit fertigen Artikeln.',
      sections: [
        {
          heading: 'Wobei wir helfen können',
          paragraphs: [
            'Wählen Sie die Leistung, die zu Ihrem Projekt passt: CNC-Bearbeitung für Teile aus Holz, MDF oder Sperrholz, personalisierte Produkte auf Bestellung oder die fertigen Artikel in unserem Online-Shop.',
          ],
        },
      ],
      cards: [
        {
          title: 'CNC-Bearbeitung in Holz, MDF und Sperrholz',
          body: 'Einzelstücke, Prototypen und Kleinserien per CNC gefertigt, mit projektbezogenem Angebot.',
          href: '/servicii/prelucrare-cnc-lemn',
          linkLabel: 'CNC-Details',
        },
        {
          title: 'Personalisierte Produkte auf Bestellung',
          body: 'Geschenke, Dekorationen und Teile nach Ihren Vorgaben, basierend auf unserem Portfolio.',
          href: '/produse-personalizate',
          linkLabel: 'Details zur Personalisierung',
        },
        {
          title: 'Online-Shop',
          body: 'Fertige Holzprodukte mit ausgewiesenem Preis und im Shop prüfbarer Verfügbarkeit.',
          href: '/products',
          linkLabel: 'Produkte ansehen',
        },
      ],
      faqTitle: 'Häufige Fragen',
      faqs: [
        {
          question: 'Arbeiten Sie mit Kunden außerhalb von Sibiu?',
          answer:
            'Ja. Projekte werden remote per E-Mail oder Telefon besprochen, und wir beliefern Kunden in ganz Rumänien.',
        },
        {
          question: 'Kann ich ein Einzelstück oder eine Kleinserie anfragen?',
          answer:
            'Ja, das können Sie. Kleinaufträge, Einzelstücke und Prototypen werden je nach Projekt und Material individuell geprüft.',
        },
        {
          question: 'Wie frage ich ein Angebot an?',
          answer:
            'Schreiben Sie uns eine E-Mail oder rufen Sie uns mit den Projektdetails an (was gefertigt werden soll, Maße, Material, Menge, Termin). Wir antworten mit einer Einschätzung und einem Angebot.',
        },
      ],
      ctaTitle: 'Erzählen Sie uns von Ihrem Projekt',
      ctaBody:
        'Rufen Sie uns an oder schreiben Sie uns mit den Projektdetails. Die E-Mail-Schaltfläche öffnet Ihre E-Mail-App mit einer vorausgefüllten Nachricht — Ihre Anfrage wird nicht automatisch gesendet.',
      emailSubject: 'Angebotsanfrage – Holzbearbeitung',
      emailBody:
        'Guten Tag,\n\nich hätte gern weitere Informationen zu Ihren Holzbearbeitungsleistungen.\n\nWas gefertigt werden soll:\nMaterial (Holz / MDF / Sperrholz):\nMaße:\nMenge:\nGewünschter Termin:\n\nName:\nTelefon:\n\nVielen Dank!',
    },
    cnc: {
      path: '/servicii/prelucrare-cnc-lemn',
      kind: 'service',
      crumb: 'CNC-Bearbeitung',
      seoTitle: 'CNC-Bearbeitung in Holz, MDF und Sperrholz | Kleinaufträge',
      seoDescription:
        'CNC-Bearbeitung in Holz, MDF und Sperrholz: Zuschnitt, Gravur und Teile für kleine Projekte oder Prototypen. Kleinaufträge werden individuell geprüft. Angebot anfragen.',
      eyebrow: 'Leistungen · CNC',
      heading: 'CNC-Bearbeitung von Holz, MDF und Sperrholz',
      intro:
        'Wir nutzen die CNC-Bearbeitung für Teile aus Holz, MDF und Sperrholz: von Dekorationen und Schriftzügen bis zu Bauteilen und Prototypen. Jede Anfrage wird individuell geprüft, auch Einzelstücke und Kleinserien.',
      sections: [
        {
          heading: 'Bearbeitete Materialien',
          paragraphs: [
            'Wir bearbeiten per CNC drei Kategorien holzbasierter Materialien. Die genaue Eignung für Ihr Projekt wird bei der Prüfung bestätigt.',
          ],
          bullets: [
            'Massivholz — für dekorative und funktionelle Teile.',
            'MDF — für flache Teile, Schriftzüge und Dekorationen, auch für lackierte Oberflächen.',
            'Sperrholz — für Teile, die bei geringer Stärke belastbar sein müssen.',
          ],
        },
        {
          heading: 'Kleinaufträge und Prototypen',
          paragraphs: [
            'Sie können ein Einzelstück, einen Prototyp oder eine Kleinserie anfragen. Machbarkeit und akzeptierte Menge werden je nach Komplexität und Material individuell bestätigt.',
          ],
        },
        {
          heading: 'Was den Preis beeinflusst',
          paragraphs: [
            'Die Kosten der CNC-Bearbeitung werden individuell festgelegt, je nach Zeichnung des Teils, Material, Maßen, Menge und gewünschter Oberfläche. Preis und Auftragsannahme werden nach Prüfung des Projekts bestätigt.',
          ],
        },
        {
          heading: 'So fragen Sie ein Angebot an',
          bullets: [
            'Teilen Sie uns per E-Mail oder Telefon mit, was gefertigt werden soll.',
            'Geben Sie die Maße der Teile, das gewünschte Material (Holz, MDF oder Sperrholz) und die Menge an.',
            'Fügen Sie, falls vorhanden, eine Skizze, eine technische Zeichnung oder ein Referenzfoto bei.',
            'Nennen Sie den Termin, zu dem Sie die Teile benötigen.',
            'Wir antworten mit einer Einschätzung: Machbarkeit, Preis und Termin werden individuell bestätigt.',
          ],
        },
        {
          heading: 'Bestätigung Ihres Projekts',
          paragraphs: [
            'Toleranzen, Materialauswahl, Machbarkeit, Endkosten und Lieferzeit werden nach der Prüfung jedes Projekts bestätigt.',
          ],
        },
      ],
      cards: [
        {
          title: 'Personalisierte Produkte',
          body: 'Teile nach Ihren Vorgaben, basierend auf unseren Arbeiten.',
          href: '/produse-personalizate',
          linkLabel: 'Details',
        },
        {
          title: 'Online-Shop',
          body: 'Fertige Produkte mit ausgewiesenen Preisen.',
          href: '/products',
          linkLabel: 'Produkte ansehen',
        },
      ],
      faqTitle: 'Häufige Fragen',
      faqs: [
        {
          question: 'Gibt es eine Mindestbestellmenge?',
          answer:
            'Sie können auch ein Einzelstück oder eine Kleinserie anfragen. Akzeptierte Menge, Preis und Machbarkeit werden nach Prüfung des Projekts bestätigt.',
        },
        {
          question: 'Welche Angaben oder Dateien helfen beim Angebot?',
          answer:
            'Maße, gewünschtes Material und Menge sind entscheidend. Eine Skizze, technische Zeichnung oder ein Referenzfoto beschleunigt die Prüfung.',
        },
        {
          question: 'Was kostet die CNC-Bearbeitung?',
          answer:
            'Der Preis hängt von der Zeichnung des Teils, dem Material, den Maßen, der Menge und der Oberfläche ab und wird nach Prüfung Ihrer Anfrage bestätigt.',
        },
        {
          question: 'Welche Materialien bearbeiten Sie?',
          answer:
            'Das hier vorgestellte Angebot umfasst Holz, MDF und Sperrholz; die Materialeignung für Ihr Projekt wird bei der Prüfung bestätigt.',
        },
      ],
      ctaTitle: 'Angebot für Ihr Projekt anfragen',
      ctaBody:
        'Beschreiben Sie die benötigten Teile mit Maßen, Material, Menge und Termin. Die E-Mail-Schaltfläche öffnet Ihre E-Mail-App mit einer vorausgefüllten Nachricht — Ihre Anfrage wird nicht automatisch gesendet.',
      emailSubject: 'Angebotsanfrage – CNC-Bearbeitung',
      emailBody:
        'Guten Tag,\n\nich hätte gern ein Angebot für CNC-Bearbeitung.\n\nMaterial (Holz / MDF / Sperrholz):\nMaße der Teile:\nMenge:\nGewünschte Oberfläche:\nGewünschter Termin:\nProjektbeschreibung oder Link zu Skizze / Referenz:\n\nName:\nTelefon:\n\nVielen Dank!',
    },
    custom: {
      path: '/produse-personalizate',
      kind: 'service',
      crumb: 'Personalisierte Produkte',
      seoTitle: 'Personalisierte Holzprodukte auf Bestellung',
      seoDescription:
        'Geschenke, Dekorationen und Holzprodukte nach Ihren Vorgaben: Maße, Materialien und Personalisierung werden individuell besprochen. Portfolio ansehen und Angebot anfragen.',
      eyebrow: 'Leistungen · Auf Bestellung',
      heading: 'Personalisierte Holzprodukte',
      intro:
        'Sie möchten ein personalisiertes Geschenk, eine Dekoration oder ein Teil, das es im Shop nicht gibt? Wir gehen von unseren Produkten oder Portfolio-Arbeiten aus und besprechen gemeinsam Maße, Material, Personalisierung und Menge, bevor Sie ein Angebot erhalten.',
      sections: [
        {
          heading: 'So funktioniert es',
          paragraphs: [
            'Sie wählen ein Produkt aus dem Shop oder eine Arbeit aus dem Portfolio als Referenz, dann legen wir gemeinsam fest, was angepasst werden kann: Maße, Material, Gravur oder andere Personalisierung und Menge. Nicht jedes Produkt kann geändert werden — die konkreten Möglichkeiten werden auf Anfrage bestätigt.',
          ],
        },
        {
          heading: 'Wofür es geeignet ist',
          paragraphs: ['Beispiele für Projekte, die Sie anfragen können:'],
          bullets: [
            'personalisierten Geschenken (Namen, Botschaften, Jubiläumsdaten);',
            'Dekorationen für Zuhause oder Restaurants;',
            'kleinen Produktserien für Veranstaltungen oder Firmen.',
          ],
        },
      ],
      cards: [
        {
          title: 'Portfolio der Auftragsarbeiten',
          body: 'Sehen Sie früher auf Bestellung gefertigte Arbeiten.',
          href: '/catalog',
          linkLabel: 'Portfolio ansehen',
        },
        {
          title: 'Online-Shop',
          body: 'Fertige Produkte als Referenz.',
          href: '/products',
          linkLabel: 'Produkte ansehen',
        },
        {
          title: 'CNC-Bearbeitung',
          body: 'Teile aus Holz, MDF und Sperrholz, per CNC geschnitten oder graviert.',
          href: '/servicii/prelucrare-cnc-lemn',
          linkLabel: 'CNC-Details',
        },
      ],
      faqTitle: 'Häufige Fragen',
      faqs: [
        {
          question: 'Kann jedes Shop-Produkt personalisiert werden?',
          answer:
            'Nicht alle Produkte können geändert werden. Sagen Sie uns, was Sie vorhaben, und wir bestätigen, was möglich ist.',
        },
        {
          question: 'Wie lange dauert ein Sonderauftrag?',
          answer:
            'Die Dauer hängt vom Projekt ab und wird individuell bestätigt, sobald die Details feststehen.',
        },
        {
          question: 'Was kostet ein personalisiertes Produkt?',
          answer:
            'Der Preis hängt von Material, Maßen, Komplexität und Menge ab. Sie erhalten ein Angebot, nachdem wir das Projekt besprochen haben.',
        },
        {
          question: 'Wie stelle ich eine Anfrage?',
          answer:
            'Schreiben Sie uns eine E-Mail oder rufen Sie uns mit den Details an: Referenzprodukt oder -arbeit, Maße, gewünschte Personalisierung, Menge und Termin.',
        },
      ],
      ctaTitle: 'Sagen Sie uns, was Sie vorhaben',
      ctaBody:
        'Senden Sie uns das Referenzprodukt oder die Referenzarbeit, die Maße und die gewünschte Personalisierung. Die E-Mail-Schaltfläche öffnet Ihre E-Mail-App mit einer vorausgefüllten Nachricht — Ihre Anfrage wird nicht automatisch gesendet.',
      emailSubject: 'Angebotsanfrage – Personalisiertes Produkt',
      emailBody:
        'Guten Tag,\n\nich hätte gern ein Angebot für ein personalisiertes Produkt.\n\nReferenzprodukt oder -arbeit:\nMaße:\nGewünschte Personalisierung (Gravur, Text, sonstiges):\nMenge:\nGewünschter Termin:\n\nName:\nTelefon:\n\nVielen Dank!',
    },
    circular: {
      path: '/servicii/debitare-circular',
      kind: 'service',
      crumb: 'Zuschnitt an der Kreissäge',
      seoTitle: 'Zuschnitt an der Kreissäge für Holz und Platten',
      seoDescription:
        'Zuschnitt an der Kreissäge für Holzprojekte. Senden Sie Angaben zum Material, Maße und Teileliste; Machbarkeit, Preis und Termin werden individuell bestätigt.',
      eyebrow: 'Leistungen · Zuschnitt',
      heading: 'Zuschnitt an der Kreissäge',
      intro:
        'Wir bieten Zuschnitt an der Kreissäge für Holzprojekte an, auf Basis der gewünschten Maße und der Prüfung jeder Anfrage.',
      sections: [
        {
          heading: 'Zuschnitt nach Ihrer Teileliste',
          paragraphs: [
            'Senden Sie uns Ihre Teileliste mit den Maßen je Teil, der Stärke, der Menge und, falls vorhanden, einer Skizze oder einem Schnittplan als Referenz. Jede Anfrage wird individuell geprüft.',
          ],
        },
        {
          heading: 'Was wir vor dem Zuschnitt bestätigen',
          paragraphs: [
            'Materialverträglichkeit, realisierbare Maße, Schnittplan und Toleranzen sowie Preis und Termin werden je nach Anfrage individuell bestätigt.',
          ],
        },
      ],
      cards: [
        {
          title: 'Massivholzplatten mit durchgehenden Lamellen',
          body: 'Massivholzplatten, auf Anfrage für Ihr Projekt.',
          href: '/servicii/panouri-lemn-masiv-lamela-continua',
          linkLabel: 'Platten-Details',
        },
        {
          title: 'CNC-Bearbeitung',
          body: 'Teile aus Holz, MDF und Sperrholz, per CNC geschnitten oder graviert.',
          href: '/servicii/prelucrare-cnc-lemn',
          linkLabel: 'CNC-Details',
        },
      ],
      faqTitle: 'Häufige Fragen',
      faqs: [
        {
          question: 'Was kostet der Zuschnitt an der Kreissäge?',
          answer:
            'Der Preis hängt von Material, Stückzahl und gewünschten Maßen ab und wird nach Prüfung der Anfrage bestätigt.',
        },
        {
          question: 'Welche Angaben helfen beim Angebot?',
          answer:
            'Material und Stärke, Maße je Teil, Menge und gewünschter Termin. Eine Skizze oder ein Schnittplan beschleunigt die Prüfung.',
        },
        {
          question: 'Kann ich eigenes Material liefern?',
          answer:
            'Die Möglichkeit, auf Kundenmaterial zu arbeiten, wird vor der Lieferung bestätigt — sie wird nicht automatisch akzeptiert.',
        },
      ],
      ctaTitle: 'Angebot für Zuschnitt anfragen',
      ctaBody:
        'Senden Sie uns Angaben zum Material, Stärke, Teilmaße, Menge und gewünschten Termin. Die E-Mail-Schaltfläche öffnet Ihre E-Mail-App mit einer vorausgefüllten Nachricht — Ihre Anfrage wird nicht automatisch gesendet.',
      emailSubject: 'Angebotsanfrage – Zuschnitt an der Kreissäge',
      emailBody:
        'Guten Tag,\n\nich hätte gern ein Angebot für Zuschnitt an der Kreissäge.\n\nMaterial:\nStärke:\nTeilmaße:\nMenge:\nGewünschter Termin:\nSkizze oder Referenz:\n\nName:\nTelefon:\n\nVielen Dank!',
    },
    panels: {
      path: '/servicii/panouri-lemn-masiv-lamela-continua',
      kind: 'page',
      crumb: 'Massivholzplatten',
      seoTitle: 'Massivholzplatten mit durchgehenden Lamellen',
      seoDescription:
        'Massivholzplatten mit durchgehenden Lamellen für Ihr Projekt. Fragen Sie Details zu Holzart, Maßen, Stärke, Verfügbarkeit und Preis an.',
      eyebrow: 'Leistungen · Platten',
      heading: 'Massivholzplatten mit durchgehenden Lamellen',
      intro:
        'Sie suchen Massivholzplatten mit durchgehenden Lamellen? Senden Sie uns Ihre Projektanforderungen, damit wir die verfügbaren Optionen, Maße und das Angebot bestätigen können.',
      sections: [
        {
          heading: 'Was durchgehende Lamellen bedeuten',
          paragraphs: [
            'Die Platte besteht aus über die Breite verleimten Massivholzlamellen. Jede Lamelle läuft durchgehend über die gesamte Plattenlänge, ohne Stoßverbindungen; es ist kein einzelnes breites Brett.',
          ],
        },
        {
          heading: 'Die Platte auswählen',
          paragraphs: [
            'Geben Sie für eine Anfrage die gewünschte Holzart, Länge, Breite und Stärke, die Menge und den Verwendungszweck an. Die konkreten Optionen werden auf Anfrage bestätigt.',
          ],
        },
        {
          heading: 'Verfügbarkeit und Angebot',
          paragraphs: [
            'Holzart, verfügbare Maße, Preis, Oberfläche und Lieferoptionen werden für jede Anfrage bestätigt.',
          ],
        },
      ],
      cards: [
        {
          title: 'Zuschnitt an der Kreissäge',
          body: 'Zuschnitt von Holz und Platten nach Ihrer Teileliste.',
          href: '/servicii/debitare-circular',
          linkLabel: 'Zuschnitt-Details',
        },
        {
          title: 'CNC-Bearbeitung',
          body: 'Teile aus Holz, MDF und Sperrholz, per CNC geschnitten oder graviert.',
          href: '/servicii/prelucrare-cnc-lemn',
          linkLabel: 'CNC-Details',
        },
      ],
      faqTitle: 'Häufige Fragen',
      faqs: [
        {
          question: 'Wie unterscheidet sie sich von einem einzelnen Massivbrett?',
          answer:
            'Eine Platte wird aus mehreren Lamellen verleimt; bei der Variante mit durchgehenden Lamellen deckt jede Lamelle die gesamte Plattenlänge ohne Stoßverbindungen ab. Es bleibt eine Lamellenplatte, kein einzelnes Holzstück.',
        },
        {
          question: 'Welche Holzarten und Maße sind verfügbar?',
          answer:
            'Nennen Sie uns die gewünschte Holzart und Maße. Wir bestätigen die verfügbaren Optionen vor Festlegung des Angebots.',
        },
        {
          question: 'Was kostet eine Platte?',
          answer:
            'Der Preis hängt von Holzart, Maßen, Stärke und Menge ab und wird nach Prüfung der Anfrage bestätigt.',
        },
      ],
      ctaTitle: 'Details für Ihr Projekt anfragen',
      ctaBody:
        'Senden Sie uns die gewünschte Holzart, die Maße (Länge, Breite, Stärke), die Menge, den Verwendungszweck und den Termin. Die E-Mail-Schaltfläche öffnet Ihre E-Mail-App mit einer vorausgefüllten Nachricht — Ihre Anfrage wird nicht automatisch gesendet.',
      emailSubject: 'Angebotsanfrage – Massivholzplatten mit durchgehenden Lamellen',
      emailBody:
        'Guten Tag,\n\nich hätte gern Details zu Massivholzplatten mit durchgehenden Lamellen.\n\nGewünschte Holzart:\nMaße (Länge, Breite, Stärke):\nMenge:\nVerwendungszweck:\nGewünschter Termin:\n\nName:\nTelefon:\n\nVielen Dank!',
    },
  },
};

export const marketingCopy: Record<SiteLanguage, MarketingCopy> = { ro, en, de };
