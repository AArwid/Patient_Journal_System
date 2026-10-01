# Express API - Patient Journal System

Det här är min (Fredriks) del av gruppuppgiften. Jag har byggt backend-API:et
i Express: routes för att söka patienter, läsa journaler, skriva anteckningar,
och en middleware (`auditLogger`) som ser till att allt som läses/skrivs
loggas, så vi kan visa vem som tittat på vad.

## Mappstruktur

- `database/schema.sql` - SQL-schemat för backend
- `src/server/db/` - SQLite-koppling + repositories för patients/users/notes
- `src/server/middleware/` - requireAuth, requireRole, requirePatientAccess, auditLogger
- `src/server/routes/` - auth-routes och patient/notes-routes
- `src/server/services/` - auditChainClient, broadcastClient och P2P-runtime
- `tests/server/` - servertester (Jest + Supertest)

Viktig grej: journaler och anteckningar ligger BARA i SQL. Access-loggarna
(vem har kollat vad) hamnar aldrig i SQL utan skickas vidare till
blockkedjan istället, enligt GDPR-kravet i uppgiften.

## Komma igång

```bash
cd backend
npm install
cp .env.example .env
npm run seed
npm run dev
```

Seed-scriptet skapar en testpatient och en inloggning för varje roll.
Lösenordet för alla test-konton är `password123`.

API:et kör då på `http://localhost:3001` (eller vad du satt PORT till i .env).

**Om `npm install` klagar med en gyp/node-gyp/Python-felmeddelande:**
`better-sqlite3` försöker då kompilera om sig själv istället för att hitta en
färdigbyggd binär (kan bero på Node-version/plattform). Antingen installerar
du Python 3, eller kör `npm install better-sqlite3@11.10.0` manuellt efteråt
- den versionen har en färdigbyggd binär för fler plattformar.

### Två servrar samtidigt (för P2P-grejen)

Eftersom uppgiften vill att vi ska ha två servrar igång samtidigt (typ
sjukhus + ambulans):

```bash
# terminal 1
PORT=3001 SERVER_ID=hospital-1 npm run dev

# terminal 2
PORT=3002 SERVER_ID=hospital-2 npm run dev
```

Om du kör på Windows i PowerShell blir det istället:
`$env:PORT=3001; $env:SERVER_ID="hospital-1"; npm run dev`

Första gången du kör detta, lämna `PEER_PUBLIC_KEYS` tomt i båda `.env` -
varje server skapar då sitt eget nyckelpar under `BLOCKCHAIN_KEY_DIRECTORY`.
Stoppa sedan båda, fyll i varandras publika nyckel i respektive `.env`
(`PEER_PUBLIC_KEYS=hospital-2=./keys/hospital-2.public.pem` på server 1, och
omvänt på server 2), och starta om. Loggen ska visa `peer authenticated` på
båda. Är `PEER_PUBLIC_KEYS` ifylld men filen inte finns än startar servern
ändå - den peern räknas bara som opålitlig tills nyckeln finns.

Peka båda servrarna på samma `DB_PATH` (samma SQLite-fil) så de ser samma
journaldata, precis som två verkliga vårdinstanser mot en gemensam
patientdatabas. Sessionerna är separata - den som är inloggad på server 1 är
inte automatiskt inloggad på server 2 - men en ny anteckning som skapas på
den ena servern dyker upp live (via Server-Sent Events + P2P-synken) hos en
behörig användare som redan har patientens journal öppen på den andra.

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
- `GET /api/patients/:id/notes/stream` - Server-Sent Events-ström, pushar en ny anteckning live (samma synlighetsregler som ovan) så länge anslutningen är öppen
- `POST /api/patients/:id/notes` - lägg till anteckning, `{ content, visibility }` där visibility är private/staff/all
- `GET /api/patients/:id/access-logs` - se vem som kollat på journalen

En patient kommer bara åt sitt eget `:id` - testar man ändra id:t i URL:en
för att kika på någon annans journal blir det 403. Rollen `unauthorized`
kommer aldrig in någonstans, den får 403 på allt. Det här är testat i
`tests/server/access-control.test.js`.

## Om blockkedjan och P2P-delen

`src/server/services/auditChainClient.js` använder den gemensamma
blockchain-modulen i `src/blockchain/`. P2P-runtime använder WebSocket och
ansluter till peers
via `PEER_URLS`.

Audit-block sparas i `BLOCKCHAIN_PATH` och laddas tillbaka vid serverstart.
Filen skrivs atomiskt och hela kedjan valideras innan den används.

Varje server skapar automatiskt ett Ed25519-nyckelpar i
`BLOCKCHAIN_KEY_DIRECTORY`. Ange peer-servrarnas publika nycklar med
`PEER_PUBLIC_KEYS`, till exempel `hospital-2=./keys/hospital-2.public.pem`.

Blockformatet (`{ index, timestamp, previousHash, event, signature, hash }`)
är samma som Arwid använder i sin blockchain-modul, så det borde stämma
ganska bra redan.

## Tester

```bash
npm test
```

Kör både blockkedje-/P2P-testerna (Nodes inbyggda testrunner,
`tests/blockchain.test.js` och `tests/p2p.test.js`) och API-testerna (Jest,
`tests/server/`). Vill du köra dem var för sig: `npm run test:unit`
respektive `npm run test:server`.

Testar bland annat inloggning, att man inte kan komma åt andras journaler
genom att peta i URL:en, att anteckningar bara visas för rätt roller, och att
en manipulerad eller omkastad blockkedja upptäcks vid validering.
