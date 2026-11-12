// Test catalog data: 30 products (5 per category) with free-license product
// photos verified fetchable (HTTP 200, image/jpeg, < 200KB) for the seed action.

export interface TestProductImage {
  sourceUrl: string;
  licenseUrl: string;
  license: string;
}

export interface TestProduct {
  demoKey: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  image: TestProductImage;
}

export const testProducts: readonly TestProduct[] = [
  {
    demoKey: 'test-v2-icoana-lemn-tei',
    sku: 'HW-ICO-01',
    name: 'Icoană pictată pe lemn de tei',
    description:
      'Icoană pictată manual pe panou din lemn de tei, cu detalii aurii și lac protector. Format 20 × 30 cm, potrivită pentru colțul de rugăciune.',
    category: 'Icoane',
    price: 89,
    stock: 24,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/2309/1966136254_f1d79d7e7b_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/11076844@N00/1966136254',
      license: 'cc-by-2.0',
    },
  },
  {
    demoKey: 'test-v2-icoana-stil-rusesc',
    sku: 'HW-ICO-02',
    name: 'Icoană ortodoxă în stil rusesc',
    description:
      'Icoană realizată în stilul tradițional rus, pe lemn, cu fond auriu și tonuri calde. Piesă de dimensiuni medii, gata de agățat.',
    category: 'Icoane',
    price: 112,
    stock: 31,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/2389/1966161364_a1625046f0_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/11076844@N00/1966161364',
      license: 'cc-by-2.0',
    },
  },
  {
    demoKey: 'test-v2-icoana-mica-casa',
    sku: 'HW-ICO-03',
    name: 'Icoană mică pentru casă și daruire',
    description:
      'Icoană de format mic pe suport din lemn, ușor de dăruit sau de ținut pe noptieră. Finisaj lucios care protejează pictura.',
    category: 'Icoane',
    price: 48,
    stock: 18,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/2057/1966147734_a2424ba1c3_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/11076844@N00/1966147734',
      license: 'cc-by-2.0',
    },
  },
  {
    demoKey: 'test-v2-cruce-sculptata',
    sku: 'HW-ICO-04',
    name: 'Cruce din lemn sculptată manual',
    description:
      'Cruce din lemn sculptată manual, cu model vegetal în relief și finisaj ceruit. Se agață pe perete sau se așază pe iconar.',
    category: 'Icoane',
    price: 75,
    stock: 22,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/3728/10335911573_a207acfe1f_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/31801622@N07/10335911573',
      license: 'cc-by-sa-2.0',
    },
  },
  {
    demoKey: 'test-v2-triptic-deisis',
    sku: 'HW-ICO-05',
    name: 'Triptic ortodox Deisis',
    description:
      'Triptic pictat pe lemn cu reprezentarea Deisis: Hristos împreună cu Maica Domnului și Sfântul Ioan Botezătorul. Panouri articulate care se închid ca o carte.',
    category: 'Icoane',
    price: 119,
    stock: 27,
    image: {
      sourceUrl:
        'https://commons.wikimedia.org/wiki/Special:FilePath/Deesis%20with%20Saints%2C%20triptych%2018-19%20cent.jpg?width=480',
      licenseUrl:
        'https://commons.wikimedia.org/wiki/File:Deesis_with_Saints%2C_triptych_18-19_cent.jpg',
      license: 'public-domain',
    },
  },
  {
    demoKey: 'test-v2-tocator-stejar',
    sku: 'HW-PLT-01',
    name: 'Tocător din stejar masiv',
    description:
      'Tocător lucrat din lemn de stejar masiv, cu fibră deosebită și margine rotunjită. Tratat cu ulei alimentar, dimensiuni circa 40 × 25 cm.',
    category: 'Platouri de lemn',
    price: 120,
    stock: 26,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/3365/3622467023_e30a11cd69_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/7393803@N03/3622467023',
      license: 'cc-by-sa-2.0',
    },
  },
  {
    demoKey: 'test-v2-tocator-nuc',
    sku: 'HW-PLT-02',
    name: 'Tocător din lemn de nuc',
    description:
      'Tocător rezistent din lemn de nuc, gros și stabil, potrivit pentru uz zilnic în bucătărie. Finisat cu ulei mineral alimentar.',
    category: 'Platouri de lemn',
    price: 145,
    stock: 33,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/8567/15963597794_ebe4cbd2f1_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/10069023@N00/15963597794',
      license: 'cc-by-2.0',
    },
  },
  {
    demoKey: 'test-v2-platou-branzeturi',
    sku: 'HW-PLT-03',
    name: 'Platou pentru brânzeturi',
    description:
      'Platou de servire din lemn pentru brânzeturi și vin, cu suprafață netedă ușor de curățat. Ideal pentru mese festive și pentru cadouri.',
    category: 'Platouri de lemn',
    price: 165,
    stock: 21,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/8402/8692988715_98c420881b_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/95408008@N08/8692988715',
      license: 'cc-by-2.0',
    },
  },
  {
    demoKey: 'test-v2-tava-servire',
    sku: 'HW-PLT-04',
    name: 'Tavă de servire din lemn',
    description:
      'Tavă dreptunghiulară din lemn cu mânere decupate, bună pentru cafea, ceai sau micul dejun. Suprafață finisată natural, ușor de întreținut.',
    category: 'Platouri de lemn',
    price: 95,
    stock: 36,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/65535/47623662121_10babfcde9_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/147592390@N06/47623662121',
      license: 'cc-by-2.0',
    },
  },
  {
    demoKey: 'test-v2-platou-boluri',
    sku: 'HW-PLT-05',
    name: 'Platou rustic cu boluri din lemn',
    description:
      'Set de servire format din platou și boluri sculptate din lemn, cu formă organică de tip frunză. Fiecare piesă este unicat prin fibră și culoare.',
    category: 'Platouri de lemn',
    price: 210,
    stock: 4,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/3950/15374548498_3a8e29943b_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/23212428@N00/15374548498',
      license: 'cc-by-2.0',
    },
  },
  {
    demoKey: 'test-v2-turn-invatare',
    sku: 'HW-MON-01',
    name: 'Turn de învățare Montessori',
    description:
      'Turn de siguranță din lemn care îi permite copilului să ajungă la blatul de bucătărie fără risc. Treapta se reglează pe înălțime.',
    category: 'Mobilier Montessori',
    price: 389,
    stock: 19,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/2003/2168151633_06de139d10_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/85463968@N00/2168151633',
      license: 'cc-by-sa-2.0',
    },
  },
  {
    demoKey: 'test-v2-set-masa-scaune',
    sku: 'HW-MON-02',
    name: 'Set masă și scăunele pentru copii',
    description:
      'Set din masă și două scăunele din lemn la înălțimea copiilor, pentru joacă, desen și gustări. Colțuri rotunjite și finisaj sigur pentru cei mici.',
    category: 'Mobilier Montessori',
    price: 549,
    stock: 25,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/6162/6155651060_fe787c1b17_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/67321821@N06/6155651060',
      license: 'cc-by-sa-2.0',
    },
  },
  {
    demoKey: 'test-v2-pat-montessori',
    sku: 'HW-MON-03',
    name: 'Pat Montessori la nivelul podelei',
    description:
      'Pat pentru copii montat la nivelul podelei, care încurajează autonomia la culcare și la trezire. Cadru din lemn masiv pentru saltea de 140 × 70 cm.',
    category: 'Mobilier Montessori',
    price: 679,
    stock: 23,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/185/438382208_4b85d91b60_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/35261188@N00/438382208',
      license: 'cc-by-2.0',
    },
  },
  {
    demoKey: 'test-v2-raft-jucarii',
    sku: 'HW-MON-04',
    name: 'Raft Montessori pentru jucării',
    description:
      'Raft deschis din lemn, la înălțimea copilului, pentru expunerea jucăriilor și a cărților. Modulele ajută la organizarea pe categorii.',
    category: 'Mobilier Montessori',
    price: 259,
    stock: 30,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/4065/4677987125_79592d1551_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/50899545@N05/4677987125',
      license: 'cc-by-sa-2.0',
    },
  },
  {
    demoKey: 'test-v2-magazin-joaca',
    sku: 'HW-MON-05',
    name: 'Magazin de joacă din lemn',
    description:
      'Stand de joc din lemn tip magazin, cu rafturi și tejghea pentru joaca de-a vânzătorul. Dezvoltă vocabularul și interacțiunea socială a copiilor.',
    category: 'Mobilier Montessori',
    price: 829,
    stock: 2,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/8590/15990303327_a74b16b847_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/63504485@N00/15990303327',
      license: 'cc-by-2.0',
    },
  },
  {
    demoKey: 'test-v2-lampa-birou',
    sku: 'HW-LMP-01',
    name: 'Lampă de birou din lemn',
    description:
      'Lampă de birou cu bază din lemn și braț reglabil, potrivită pentru citit și lucru. Funcționează cu bec E14, cablu inclus.',
    category: 'Lămpi lemn masiv',
    price: 185,
    stock: 28,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/3051/3059177097_f0ec2c4f02_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/32611380@N06/3059177097',
      license: 'cc-by-2.0',
    },
  },
  {
    demoKey: 'test-v2-lampa-masa-sculptata',
    sku: 'HW-LMP-02',
    name: 'Lampă de masă sculptată',
    description:
      'Lampă de masă cu picior sculptat din lemn și abajur textil, pentru lumină caldă în living sau dormitor. Înălțime aproximativă 45 cm.',
    category: 'Lămpi lemn masiv',
    price: 240,
    stock: 17,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/5084/5246457936_234a9156cf_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/53771866@N05/5246457936',
      license: 'cc-by-sa-2.0',
    },
  },
  {
    demoKey: 'test-v2-lampa-noptiera',
    sku: 'HW-LMP-03',
    name: 'Lampă de noptieră din lemn',
    description:
      'Lampă compactă de noptieră cu bază din lemn, ideală pentru lumină ambientală discretă. Comutator integrat pe cablu.',
    category: 'Lămpi lemn masiv',
    price: 155,
    stock: 35,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/7459/14197394762_2157cf824f_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/56705951@N04/14197394762',
      license: 'cc-by-2.0',
    },
  },
  {
    demoKey: 'test-v2-veioza-lemn-masiv',
    sku: 'HW-LMP-04',
    name: 'Veioză din lemn masiv',
    description:
      'Veioză cu corp lucrat din lemn masiv, cu textură vizibilă și finisaj uleiat. Creează o lumină plăcută pentru lectură.',
    category: 'Lămpi lemn masiv',
    price: 320,
    stock: 20,
    image: {
      sourceUrl:
        'https://commons.wikimedia.org/wiki/Special:FilePath/Wooden%20Lamp.jpg?width=640',
      licenseUrl: 'https://commons.wikimedia.org/wiki/File:Wooden_Lamp.jpg',
      license: 'cc-by-sa-4.0',
    },
  },
  {
    demoKey: 'test-v2-lampa-rustica',
    sku: 'HW-LMP-05',
    name: 'Lampă rustică de masă',
    description:
      'Lampă de masă în stil rustic, cu picior din lemn lucrat manual și abajur din material textil. Se potrivește în interiorul tradițional.',
    category: 'Lămpi lemn masiv',
    price: 275,
    stock: 15,
    image: {
      sourceUrl:
        'https://commons.wikimedia.org/wiki/Special:FilePath/Wooden%20Antique%20Table%20Lamp.jpg?width=480',
      licenseUrl:
        'https://commons.wikimedia.org/wiki/File:Wooden_Antique_Table_Lamp.jpg',
      license: 'cc0',
    },
  },
  {
    demoKey: 'test-v2-suport-vin-6',
    sku: 'HW-VIN-01',
    name: 'Suport de vin pentru 6 sticle',
    description:
      'Suport din lemn pentru șase sticle de vin, cu rame deschise care lasă etichetele la vedere. Stabil pe blat sau în cămară.',
    category: 'Suporturi de vin',
    price: 120,
    stock: 32,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/4045/4527080917_751a3a1539_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/36910487@N07/4527080917',
      license: 'cc-by-2.0',
    },
  },
  {
    demoKey: 'test-v2-suport-jarrah',
    sku: 'HW-VIN-02',
    name: 'Suport orizontal pentru sticle',
    description:
      'Suport de vin din lemn de esență tare, cu locașuri orizontale pentru sticle. Forma compactă încape ușor și pe raft.',
    category: 'Suporturi de vin',
    price: 145,
    stock: 25,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/3263/3232166937_2b9a73edda_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/68132273@N00/3232166937',
      license: 'cc-by-2.0',
    },
  },
  {
    demoKey: 'test-v2-suport-sticla',
    sku: 'HW-VIN-03',
    name: 'Suport echilibrat pentru o sticlă',
    description:
      'Suport din lemn pentru o singură sticlă de vin, echilibrat prin propria greutate — un efect vizual surprinzător. Cadou apreciat de iubitorii de vin.',
    category: 'Suporturi de vin',
    price: 65,
    stock: 38,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/2906/14643998389_d606208c60_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/72807733@N07/14643998389',
      license: 'cc-by-2.0',
    },
  },
  {
    demoKey: 'test-v2-cutie-vin',
    sku: 'HW-VIN-04',
    name: 'Cutie din lemn pentru vin',
    description:
      'Cutie din lemn pentru o sticlă de vin, cu capac glisant și interior protejat. Perfectă pentru transport sau pentru daruire.',
    category: 'Suporturi de vin',
    price: 89,
    stock: 29,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/5645/30697432706_8b568f89c6_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/40391641@N04/30697432706',
      license: 'cc-by-2.0',
    },
  },
  {
    demoKey: 'test-v2-cutie-cadou-vin',
    sku: 'HW-VIN-05',
    name: 'Cutie cadou pentru vin',
    description:
      'Cutie cadou din lemn pentru sticle de vin sau băuturi fine, cu aspect elegant și mâner de transport. Potrivită pentru ocazii speciale.',
    category: 'Suporturi de vin',
    price: 99,
    stock: 4,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/3891/15127493425_288ce71154_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/62243473@N05/15127493425',
      license: 'cc-by-2.0',
    },
  },
  {
    demoKey: 'test-v2-dragon-articulat',
    sku: 'HW-P3D-01',
    name: 'Dragon articulat',
    description:
      'Dragon cu articulații flexibile printat din PLA, care se mișcă fluid și poate fi poziționat în mai multe ipostaze. Lungime aproximativă 30 cm.',
    category: 'Printuri 3D',
    price: 59,
    stock: 40,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/4050/4646486555_497bd33fd1_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/33907867@N02/4646486555',
      license: 'cc-by-2.0',
    },
  },
  {
    demoKey: 'test-v2-suport-telefon',
    sku: 'HW-P3D-02',
    name: 'Suport de telefon',
    description:
      'Suport de birou pentru telefon printat 3D, cu unghi confortabil pentru apeluri video și notificări. Compatibil cu majoritatea telefoanelor.',
    category: 'Printuri 3D',
    price: 29,
    stock: 34,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/772/22946913243_afdc8d6f3b_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/102948369@N03/22946913243',
      license: 'cc-by-sa-2.0',
    },
  },
  {
    demoKey: 'test-v2-vaza-spirala',
    sku: 'HW-P3D-03',
    name: 'Vază spirală',
    description:
      'Vază cu profil spiralat printată 3D, cu suprafață texturată care prinde lumina frumos. Potrivită pentru flori uscate sau ca obiect decorativ.',
    category: 'Printuri 3D',
    price: 45,
    stock: 27,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/2943/15158214949_c45637f43b_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/33907867@N02/15158214949',
      license: 'cc-by-2.0',
    },
  },
  {
    demoKey: 'test-v2-suport-casti',
    sku: 'HW-P3D-04',
    name: 'Suport pentru căști',
    description:
      'Suport de birou pentru căști printat 3D, cu bază stabilă și braț lat care nu lasă urme pe bandolieră. Ține biroul ordonat.',
    category: 'Printuri 3D',
    price: 39,
    stock: 30,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/6125/5974350937_e9a3766c08_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/9407293@N03/5974350937',
      license: 'cc-by-2.0',
    },
  },
  {
    demoKey: 'test-v2-barcuta-benchy',
    sku: 'HW-P3D-05',
    name: 'Barcuță Benchy decorativă',
    description:
      'Celebra barcuță de calibrare a imprimantelor 3D, printată în culori vii. Mic obiect decorativ pentru biroul pasionaților de tehnologie.',
    category: 'Printuri 3D',
    price: 19,
    stock: 36,
    image: {
      sourceUrl:
        'https://live.staticflickr.com/317/19709520299_6e2089a6e1_z.jpg',
      licenseUrl: 'https://www.flickr.com/photos/33907867@N02/19709520299',
      license: 'cc-by-2.0',
    },
  },
] as const;
