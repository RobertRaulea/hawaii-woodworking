import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { it } from 'node:test';
import { initReactI18next } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { BUSINESS } from '../../shared/seo/seo.utils';
import { Footer } from '../../src/components/Footer/Footer';
import { LegalInformation } from '../../src/pages/Legal/LegalInformation';
import { PrivacyPolicy } from '../../src/pages/Legal/PrivacyPolicy';
import { ReturnPolicy } from '../../src/pages/Legal/ReturnPolicy';
import { TermsAndConditions } from '../../src/pages/Legal/TermsAndConditions';

const resources = Object.fromEntries(
  ['ro', 'en', 'de'].map((language) => [
    language,
    {
      translation: JSON.parse(
        readFileSync(new URL(`../../src/i18n/locales/${language}.json`, import.meta.url), 'utf8'),
      ) as Record<string, unknown>,
    },
  ]),
);

await i18n.use(initReactI18next).init({
  resources,
  lng: 'ro',
  fallbackLng: 'ro',
  interpolation: { escapeValue: false },
});

const legalPages = [
  { Component: LegalInformation, title: 'Informații Legale' },
  { Component: PrivacyPolicy, title: 'Politica de Confidențialitate' },
  { Component: ReturnPolicy, title: 'Politica de Retur' },
  { Component: TermsAndConditions, title: 'Termeni și Condiții' },
];

for (const { Component, title } of legalPages) {
  it(`${title} uses canonical merchant identification and actionable contacts without unsupported claims`, () => {
    const { container } = render(<MemoryRouter><Component /></MemoryRouter>);
    const heading = screen.getByRole('heading', { level: 1, name: title });
    assert.equal(screen.getAllByRole('heading', { level: 1 }).length, 1);
    for (const className of ['font-serif', 'text-foreground']) {
      assert.ok(heading.classList.contains(className));
    }
    const text = container.textContent ?? '';
    for (const value of [BUSINESS.legalName, BUSINESS.address, BUSINESS.email, BUSINESS.phoneDisplay]) {
      assert.ok(text.includes(value), value);
    }
    for (const link of screen.getAllByRole('link', { name: BUSINESS.email })) {
      assert.equal(link.getAttribute('href'), `mailto:${BUSINESS.email}`);
    }
    for (const link of screen.getAllByRole('link', { name: BUSINESS.phoneDisplay })) {
      assert.equal(link.getAttribute('href'), BUSINESS.phoneHref);
    }
    assert.doesNotMatch(text, /SC Hawaii Woodworking SRL|contact@hawaiiwoodworking\.ro/);
    assert.doesNotMatch(text, /\bSOL\b|\bODR\b|\bFSC\b|Forest Stewardship Council/);
    assert.doesNotMatch(text, /(?:123|456)\/(?:01\.01\.)?2020/);
    assert.doesNotMatch(text, /înregistrat[ăa] ca operator|deține toate autorizațiile/i);
    for (const link of screen.getAllByRole('link')) {
      assert.doesNotMatch(link.getAttribute('href') ?? '', /ec\.europa\.eu\/consumers\/odr/);
    }
  });
}

it('withdrawal form has real merchant fields but preserves the customer template blanks', () => {
  render(<ReturnPolicy />);
  const section = screen.getByRole('heading', { name: '7. Model formular de retragere' }).closest('section');
  assert.ok(section);
  const form = within(section);
  const merchantFields = Array.from(section.querySelectorAll('p')).slice(0, 4)
    .map((paragraph) => paragraph.textContent);
  assert.deepEqual(merchantFields, [
    `Către: ${BUSINESS.legalName}`,
    `Adresa: ${BUSINESS.address}`,
    `Email: ${BUSINESS.email}`,
    `Telefon: ${BUSINESS.phoneDisplay}`,
  ]);
  assert.doesNotMatch(merchantFields.join(' '), /\[Adresa completă\]|\[Număr de telefon\]/);
  for (const value of [
    '[Numele produselor]',
    'Comandate la data: [Data comenzii]',
    'Primite la data: [Data primirii]',
    'Numele consumatorului: [Numele dumneavoastră]',
    'Adresa consumatorului: [Adresa dumneavoastră]',
    'Semnătura consumatorului: [Doar în cazul în care acest formular este transmis pe hârtie]',
    'Data: [Data completării formularului]',
  ]) {
    assert.ok(form.getByText(value), value);
  }
});

it('returns distinguish necessary inspection, diminished value and personalized-goods exceptions from defects', () => {
  const { container } = render(<ReturnPolicy />);
  const text = (container.textContent ?? '').replace(/\s+/g, ' ');
  assert.doesNotMatch(text, /48\s*(?:de\s*)?ore|în aceeași stare|Să nu prezinte semne de uzură/);
  assert.match(text, /Puteți inspecta produsele pentru a le stabili natura, caracteristicile și funcționarea/);
  assert.match(text, /nu este condiționată de păstrarea ambalajului original/);
  assert.match(text, /diminuarea valorii produselor rezultată din manipulări care depășesc ceea ce este necesar/);
  assert.match(text, /nu înseamnă pierderea automată a dreptului de retragere/);
  assert.match(text, /Bunuri realizate după specificațiile consumatorului sau clar personalizate/);
  assert.match(text, /simplul fapt că un produs standard este fabricat după plasarea comenzii nu îl face automat exceptat/);
  assert.match(text, /excepții nu afectează drepturile legale privind produsele defecte sau neconforme, inclusiv în cazul produselor personalizate/);
  assert.match(text, /notificare promptă nu limitează drepturile legale sau termenele legale/);
  assert.match(text, /14 zile calendaristice de la data la care suntem informați despre decizia de retragere/);
});

it('legal information retains company facts and the existing ANPC link without an authority-registration claim', () => {
  const { container } = render(<MemoryRouter><LegalInformation /></MemoryRouter>);
  const text = container.textContent ?? '';
  for (const value of ['48789961', 'J32/1718/2023', '200 LEI']) {
    assert.ok(text.includes(value));
  }
  assert.equal(screen.getByRole('link', { name: 'www.anpc.gov.ro' }).getAttribute('href'), 'http://www.anpc.gov.ro/');
  assert.match(text, /este operatorul datelor cu caracter personal/);
  assert.match(text, /Regulamentul \(UE\) 2016\/679/);
  assert.ok(screen.getByRole('heading', { name: 'Documente privind activitatea și materialele' }));
});

it('terms state non-VAT status and Romania-only delivery without inventing a tariff', () => {
  const { container } = render(<TermsAndConditions />);
  const text = (container.textContent ?? '').replace(/\s+/g, ' ');
  assert.match(text, /neplătitoare de TVA/);
  assert.match(text, /nu se adaugă TVA la plată/);
  assert.doesNotMatch(text, /prețurile afișate pe site includ TVA/);
  assert.match(text, /exclusiv în România/);
  assert.match(text, /Taxa de livrare este afișată în procesul de comandă/);
  assert.doesNotMatch(text, /\d+\s*(?:lei|ron|€)/i);
});

for (const language of ['ro', 'en', 'de']) {
  it(`footer keeps SAL and existing accessible contacts/social links but no discontinued ODR link (${language})`, async () => {
    await i18n.changeLanguage(language);
    render(<MemoryRouter><Footer /></MemoryRouter>);
    const footer = screen.getByRole('contentinfo');
    const links = within(footer).getAllByRole('link');
    assert.ok(links.some((link) => link.getAttribute('href') === 'https://anpc.ro/ce-este-sal/'));
    for (const link of links) {
      assert.doesNotMatch(link.getAttribute('href') ?? '', /ec\.europa\.eu\/consumers\/odr/);
    }
    assert.doesNotMatch(footer.textContent ?? '', /\bSOL\b|\bODR\b/);
    assert.equal(within(footer).getByRole('link', { name: BUSINESS.email }).getAttribute('href'), `mailto:${BUSINESS.email}`);
    assert.equal(within(footer).getByRole('link', { name: BUSINESS.phoneDisplay }).getAttribute('href'), BUSINESS.phoneHref);
    for (const name of ['Facebook', 'Instagram', 'TikTok']) {
      assert.equal(within(footer).getByRole('link', { name }).querySelector('svg')?.getAttribute('aria-hidden'), 'true');
    }
  });
}

it('footer legal navigation still opens the return policy with the usable withdrawal form', async () => {
  await i18n.changeLanguage('ro');
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <Footer />
      <Routes>
        <Route path="/" element={<h1>Magazin</h1>} />
        <Route path="/return-policy" element={<ReturnPolicy />} />
      </Routes>
    </MemoryRouter>,
  );
  await user.click(within(screen.getByRole('contentinfo')).getByRole('link', { name: /Politica de Retur/i }));
  assert.ok(screen.getByRole('heading', { level: 1, name: 'Politica de Retur' }));
  assert.ok(screen.getByRole('heading', { name: '7. Model formular de retragere' }));
  assert.ok(screen.getByText(`Către: ${BUSINESS.legalName}`));
  assert.ok(screen.getByText('Numele consumatorului: [Numele dumneavoastră]'));
});
