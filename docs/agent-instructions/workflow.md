# Workflow cu Robert

Ghid scris în română, ca Robert să îl poată citi și corecta ușor. Regulile scurte sunt în `AGENTS.md`; aici sunt explicațiile, stilul lui Robert și greșelile care s-au repetat. Sursa: 32 de conversații din 21 oct – 4 nov 2026.

## Cum scrie Robert

- Română informală, fără diacritice, des dictată. Greșeli de scriere frecvente. Interpretează intenția, nu literele.
- Două moduri:
  - **Cereri scurte:** „status ?", „continue", „Aleg varianta A", „comite fără deploy". Răspunde direct.
  - **Specificații lungi** cu secțiuni OBIECTIV / CONTEXT / REGULI / TESTE / LIVRABIL, pline de „Nu...". Urmează-le literal. Dacă ele conțin „oprește-te", oprește-te.
- Scrie o singură cerere mare, cu mai multe lucruri în ea. Împarte-le în pași numerotați în plan și confirmă ordinea.
- Trimite capturi de ecran și erori din consolă ca raport de bug. Ele sunt dovada: reproduce simptomul înainte să repari.
- Îți spune uneori ce skill să folosești („folosește skill-ul caveman", „findSkills"). Folosește-l.

## Ce funcționează

- Audit, apoi plan, apoi implementare, apoi commit, apoi lista pașilor manuali pentru el.
- Opțiuni cu litere (a/b/c), cu recomandarea marcată. Întrebările deschise merg mai greu.
- Un modul mărginit per mesaj, cu context citit întâi (`docs/backoffice-context.md`, `docs/decisions.md`).
- „Reutilizează, nu reconstrui." Etape mici, cu teste la fiecare etapă.
- Pentru statusuri: bullet-uri „Făcut / Nefăcut / Blocat".

## Greșeli repetate și regula care le previne

| Greșeala | Ce se întâmplă | Regula |
| --- | --- | --- |
| Declari „gata" fără verificare | Funcția Convex nu exista pe deployment (pagină albă, eroarea trimisă de 3 ori); butonul de dark mode nu mergea; spațiul din galerie era tot acolo | Verifică simptomul inițial. Spune explicit ce nu ai testat în browser |
| Îi spui lui ce să facă | „spune-mi tu direct, nu mai sta să te întreb" | Execută. Pașii manuali doar pentru ce cere acces la dashboard-ul lui, ca listă numerotată |
| Rabbit hole | ~60 de mesaje de automatizare a GUI-ului IDE pentru o schimbare simplă | Dă 4 pași manuali și oprește-te. Fără automatizare de GUI |
| Refactor invizibil | Migrare shadcn în 13 iterații; Robert: „nu observ nici o schimbare în UI" | Confirmă dinainte ce rezultat vizibil așteaptă |
| Status vag sau lung | „status ?" repetat de mai multe ori | Listă scurtă Făcut / Nefăcut / Blocat |
| Presupui că ești singurul care editează | Robert modifică fișiere între mesaje | Recitește fișierul înainte de editare |
| Acțiuni la distanță | Deploy, publish, seed, activare provider | Nu fără aprobare explicită. „Comite" înseamnă doar local |
| Valori de business inventate | Tarif transport, TVA, date firmă | Întreabă sau notează ca blocant |
| Acțiune fără feedback | „Preia comandă" făcea comanda să dispară fără notificare | Feedback vizibil și un loc unde rezultatul rămâne vizibil |
| Testezi doar prima acțiune | Recepția parțială cerea refresh pentru ultimul produs | Testează și a doua acțiune din flux |
| Lucru în paralel pe aceleași fișiere cu un subagent | Conflicte de API între fișiere | Un singur autor per fișier |
| Marketing nerealist | „apără primul loc pe Google" | Spune dinainte că nu se poate garanta |

## Secrete

Robert nu pune chei în chat. Verifică doar prefixele. Dacă ai nevoie de o valoare secretă, cere-i să o introducă el în dashboard sau în skill-ul `upload-secrets`. Un secret deja expus se tratează ca fapt de rotit, nu se repetă niciodată în răspuns.

## Plan înainte de lucru (format)

1. **Ce vreau să fac** (1-3 propoziții, română simplă).
2. **Ce NU ating.**
3. **Pași** numerotați, fiecare cu ce verific la final.
4. **Glosar:** termenii noi sau complecși, câte o linie.
5. **Întrebări** cu ask tool, doar ce îți lipsește pentru context corect, cu varianta recomandată marcată.

După aprobare, execută. Nu cere aprobare din nou pentru fiecare pas.

## Schimbare de topic

Dacă Robert trece la alt task, feature sau topic, recomandă o conversație nouă. Conversațiile lungi cu mai multe topicuri au dus la context pierdut. Starea durabilă stă în `docs/` și în `docs/decisions.md`, nu în istoricul chatului.

## Skill-ul personal (mai târziu)

Când acest workflow e matur, îl transformăm într-un skill în `~/.config/devin/skills/` și îl copiem pe alte proiecte. Până atunci, regulile trăiesc în acest repo.
