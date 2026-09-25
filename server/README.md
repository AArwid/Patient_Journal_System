# Express API - Patient Journal System

Det här är min (Fredriks) del av gruppuppgiften. Jag har byggt backend-API:et
i Express: routes för att söka patienter, läsa journaler, skriva anteckningar,
och en middleware (`auditLogger`) som ser till att allt som läses/skrivs
loggas, så vi kan visa vem som tittat på vad.

## Mappstruktur

- `database/schema.sql` - SQL-schemat, delas av hela backend
- `server/src/db/` - SQLite-koppling + repositories för patients/users/notes
- `server/src/middleware/` - requireAuth, requireRole, requirePatientAccess, auditLogger
- `server/src/routes/` - auth-routes och patient/notes-routes
- `server/src/services/` - auditChainClient och broadcastClient (se längre ner)
- `server/tests/` - alla tester (Jest + Supertest)

Viktig grej: journaler och anteckningar ligger BARA i SQL. Access-loggarna
(vem har kollat vad) hamnar aldrig i SQL utan skickas vidare till
blockkedjan istället, enligt GDPR-kravet i uppgiften.

## Komma igång

```bash
cd server
npm install
cp .env.example .env
npm run seed
npm run dev
```

Seed-scriptet skapar en testpatient och en inloggning för varje roll.
Lösenordet för alla test-konton är `password123`.

API:et kör då på `http://localhost:3001` (eller vad du satt PORT till i .env).

### Två servrar samtidigt (för P2P-grejen)

Eftersom uppgiften vill att vi ska ha två servrar igång samtidigt (typ
sjukhus + ambulans):

```bash
# terminal 1
PORT=3001 SERVER_ID=hospital-1 npm run dev

# terminal 2
PORT=3002 SERVER_ID=ambulance-1 npm run dev
```

Om du kör på Windows i PowerShell blir det istället:
`$env:PORT=3001; $env:SERVER_ID="hospital-1"; npm run dev`

Båda servrarna kan peka på samma databasfil om man vill att de ska se samma
journaldata, men sessionerna är separata - den som är inloggad på server 1
är inte automatiskt inloggad på server 2.

## Testkonton (efter npm run seed)

- Läkare: doctor@example.com
- Sjuksköterska: nurse@example.com
- Vårdcentral: clinic@example.com
- Patient: patient@example.com
- Obehörig: unauthorized@example.com

Alla har lösenordet `password123`.

## Vad finns för endpoints

- `POST /api/auth/login` - logga in med email + lösenord
- `POST /api/auth/logout`
- `GET /api/auth/me` - vem är inloggad just nu
- `GET /api/patients?q=namn` - sök patient (bara för läkare/sjuksköterska/vårdcentral)
- `GET /api/patients/:id` - hämta journalen
- `GET /api/patients/:id/notes` - hämta anteckningar (filtreras beroende på vem som frågar)
- `POST /api/patients/:id/notes` - lägg till anteckning, `{ content, visibility }` där visibility är private/staff/all
- `GET /api/patients/:id/access-logs` - se vem som kollat på journalen

En patient kommer bara åt sitt eget `:id` - testar man ändra id:t i URL:en
för att kika på någon annans journal blir det 403. Rollen `unauthorized`
kommer aldrig in någonstans, den får 403 på allt. Det här är testat i
`tests/access-control.test.js`.

## Om blockkedjan och P2P-delen

`services/auditChainClient.js` och `services/broadcastClient.js` är just nu
bara stubbar - de låtsas vara blockkedjan/P2P-nätverket så att jag kunnat
bygga och testa min del utan att behöva vänta på Arwid och Ahmed. De har
samma "gränssnitt" (samma funktioner in/ut) som deras riktiga moduler kommer
ha, så när de är klara ska vi förhoppningsvis bara kunna byta ut innehållet
i de här två filerna utan att röra resten av koden.

Blockformatet (`{ index, timestamp, previousHash, event, signature, hash }`)
är samma som Arwid använder i sin blockchain-modul, så det borde stämma
ganska bra redan.

## Tester

```bash
npm test
```

Testar bland annat inloggning, att man inte kan komma åt andras journaler
genom att peta i URL:en, och att anteckningar bara visas för rätt roller.
