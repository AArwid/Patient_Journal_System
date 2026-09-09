Inl 3 - Grupparbete

Information

    Betygsskala: IG/G
    Deadline: fredagen 2 oktober 2026 kl. 11.00
    Mål från kursplanen som examineras:
        (4) Utveckla komplett blockkedje-driven programmering från grunden
        (8) Använda och koppla samman tidigare kunskaper och färdigheter i frontend och blockchain i ett Node.js-projekt
    Inlämning:
        Commit:a och pusha koden till repot på GitHub. Verifiera att det ni har på datorn även syns på GitHub.
        Se till att repot är publikt och/eller bjud in användaren postmodernistx som en "collaborator" till repot.
        Klistra in länken till repot på itslearning i inlämningsboxen, samt zippa & ladda upp koden (du får hemskt gärna exkludera node_modules-mappen)

Uppgiftsbeskrivning

GDPR-lagen kräver att patienter ska ha rätt att få veta vem som har tittat på deras (sjukvårds)journaler. Nyfiken personal tjuvkikar ibland på t.ex. kända personers eller anhörigas patientuppgifter eller raderar serverloggar för att dölja obehörig åtkomst.

Ni ska skapa ett system där de faktiska medicinska uppgifterna lagras i en SQL-databas, men varje gång en läkare, sjuksköterska, patienten själv eller någon annan tittar på uppgifterna så ska en "access log" genereras till blockkedjan.
Att göra

I projektet ska ni ha med:

    Ett front end/UI i valfritt ramverk (ej endast HTML)
    1 login-sida (inloggningssätt väljer ni själva)
    5 användarroller:
        läkare
        sjuksköterska/ambulanspersonal
        en vårdcentral
        patienten själv
        en "obehörig"
    1 patientvy, som varierar beroende på inloggad roll
    Tillhörande backend, databaser och routing

    Personen loggar in, och ska då få upp en sökruta där de kan söka efter patientens namn.
    När de har valt patient ska de få upp journalen, och även "access logs" ska visas.
    Personen ska kunna lägga till en anteckning och spara den, samt välja vem den ska vara synlig för av följande alternativ:
        Endast sig själv/den som är inloggad (privat anteckning)
        Endast sjukvårdspersonal (läkare, sjuksköterska, ambulanspersonal)
        Alla (dvs. ovanstående plus patienten)

    Personen loggar in, och ska då direkt dirigeras till sin journalsida med all data
    Personen ska inte kunna manipulera URL:en för att få upp någon annans data
    Patienten ska kunna se "access logs"
    Patienten ska endast se anteckningar som ingår i kategorin "alla", dvs. inte läkarens privata anteckningar. Däremot ska åtkomst synas.

    Det säger nog sig självt att det bara ska visas en "Åtkomst nekad"-sida.

Därutöver ska ni ha med ett P2P-nätverk:

    Ni ska ha minst 2 samtidiga servar igång, t.ex. en på port 3001 och en på port 3002. Syftet är att simulera t.ex. Sjukhus S och Ambulans A och deras samtidiga åtkomst till systemet.
    Om en person är inloggad på server 1 skriver en medicinsk anteckning, så ska den åtkomstloggen distribueras ut i blockkedjan.
    Om en person är samtidigt inloggad på server 2 och har behörighet att läsa den medicinska anteckningen, så ska den komma upp i "anteckningslistan" (använd sockets/broadcasting för detta).

Övrigt:

    Om ni vill implementera ett "passwordless login", så går det bra, men det är inget krav. Är ni uttråkade kan ni ju prova med en passkey, om det går.
    Arbeta gärna testdrivet även i detta projekt
    ⚠️ Ni ska dokumentera minst 2 st projektmöten (t.ex. daily standups) per vecka i ert repo. Det räcker med en anteckning, men det ska framgå hur ni har drivit projektet framåt och vad som ännu är kvar (så att inte allt arbete görs i sista minuten sista veckan). Använd gärna ett agilt arbetssätt från start.
    Projektet behöver inte ligga live/online, men ska fungera på era respektive datorer.

Viktigt:

    Medicinska journaler ska ALDRIG lagras på blockkedjan, vilket strider mot GDPR.
    Ni ska skriva ett gruppkontrakt.

Kravlista

    Gruppkontrakt ska skrivas innan ni sätter igång med projektet, se mall. checka in det i repot som gruppkontrakt.md.
    Fungerande flöde/demo redovisat på lektionen.
    README i repot
    Agilt arbetssätt
    Pull requests/kodgranskning: ni ska arbeta med PRs så att ni aktivt tar del av varandras kod och kvalitetssäkras den. Ingenting får committas till main utan att gå via en PR. Ni kan sätta upp regler för detta i ert repo, om ni har dålig koll på arbetsflödet.

🖥️ Redovisning

    10 min per grupp inkl. teknikstrul
    Det är OK om en person redovisar, ni delar upp redovisningen sinsemellan som ni önskar.
    Öva på presentationen; avsätt tid till detta i er projektplanering!
    I redovisningen ska ni:
        Demonstrera ett fungerande flöde i front end (se till att ha projektet igång innan det är dags för er att redovisa)
        Berätta om 4 utmaningar och hur ni löste dessa (t.ex. 1 per person)

Exempel på anvsarsfördelning & tidsplan (ej krav)

Jag ser dock gärna att ni samarbetar, parkodar och delar på uppgiftsområden så att ni får en bred uppfattning om hur ett projekt fungerar i sin helhet.

    Ansvarar för oföränderliga audit logs och säkerhet
    Block & Blockchain-kodklasserna.
    Implementation av public/private key-signering.
    Verifikationslogik för att säkerställa att hasharna matchar läkarens signatur.
    Merkle tree-implementation för batchning av accessloggar.

    Ansvarar för synkronisering mellan flera sjukhus och nätverksintegritet
    WebSocket server/klient-kommunikation mellan olika sjukhus
    Synka "audit blocks" mellan sjukhus
    Lösa "fork"-problem med "longest chain rule" om ett sjukhus t.ex. råkar gå ner/offline.

    Express routes för att skriva/läsa data.
    auditLogger middleware: avlyssnar automatiskt databas-access, signerar händelsen och utvinner ett block.
    Eventuell test coverage

    Söka efter och visa patientens journal
    Inloggning
    Live-vy över vilka som läst/öppnat/skrivit till journalen
    Kryptografisk "verification badge" om en logg ändrats

📚 Resurser

    socket.io
    Gruppkontrakt mall
    JavaScript-baserad passkey

Bedömningsexempel
För IG

    Punkterna på kravlistan uppfylls inte
    Projektet fungerar inte

För G

    Punkterna på kravlistan/i uppgiftsbeskrivningen är uppfyllda och redovisade
    Redovisning har genomförts
    I README-filen ska följande finnas:
        Beskrivning av projektet
        Skärmdumpar på det färdiga projektet
        Instruktioner för installation/hur man kommer igång (uppdatera gärna löpande under projektets gång, så blir det lättare, t.ex. en gång varje vecka)
        Beskrivning av databasens struktur och gärna ett CREATE-script så att det går att återskapa databasen
        Vilka som jobbat med det
        Använd gärna t.ex. README.so
