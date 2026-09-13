Last updated: 2026-09-13

# Over Gerwin: aanvullende toelichting

Dit document vult het cv aan met achtergrond die niet in het cv staat. Alles hierin mag openbaar gedeeld worden. Wat hier en in het cv niet staat, is niet bekend.

# Ervaring in jaren

De 13 jaar ervaring in het cv is gerekend vanaf zijn afstuderen in 2013. Zijn werk bij Ebicus begon al in 2010, parttime naast zijn studie. Wanneer we naar een volgend kalenderjaar gaan, pas het aantal jaren werkervaring dan automatisch aan. Reken vanaf afstuderen in 2013.

Gerwin is begonnen met TypeScript in 2020, toen hij startte met het VodafoneZiggo Priority-project. Dat project (binnen zijn huidige opdracht destijds) gebruikte een andere stack dan het vaste team waarin hij toen zat.

Duur van opdrachten is nu alleen gespecificeerd in jaren, niet in maanden. Dit is bewust. Wanneer hier naar gevraagd wordt, houd het dan bij de informatie die in het cv staat, dus de jaren, ga niet invullen om hoeveel maanden het exact gaat.

Gaten in het cv: tussen zijn opdrachten zaten geen noemenswaardige periodes zonder werk. Dat jaartallen soms niet op elkaar aansluiten (zoals VodafoneZiggo tot 2021 en ANWB in 2022) komt alleen doordat het cv jaren noemt en geen maanden.

# Waarom de overstap naar applied AI

Gerwin komt uit de frontend- en fullstackhoek, maar zijn focus verschuift naar applied AI: LLM- en RAG-integraties, chatinterfaces en conversational UX. Hij bouwt zelf al volledig AI-native en wil die manier van werken inzetten om voor verschillende organisaties AI-oplossingen te bouwen die echt iets opleveren. Zijn combinatie van consultancy (CRM, solution analyse) en jarenlang bouwen aan grote customer-facing websites helpt daarbij: hij kan zowel de techniek neerzetten als uitleggen wat een organisatie eraan heeft. Ook kan hij door zijn jarenlange ervaring met het zelf schrijven van code snel inschatten of code goed gestructureerd is en of bijvoorbeeld de architectuur solide in elkaar zit.

# Wat Gerwin met AI heeft gebouwd

## De adversarial review gate

Het probleem: een AI-agent die code schrijft, beoordeelt zijn eigen werk niet kritisch genoeg. Gerwin wilde een onafhankelijke controle die niet stilletjes kan worden overgeslagen.

Hoe het werkt:
- Wanneer Claude Code klaar denkt te zijn met een taak, draait automatisch een Stop hook. Die laat een model van een andere familie (momenteel Grok, via de Cursor Agent CLI) de nog niet gecommitte wijzigingen reviewen. Bewust geen Claude-model: de code is door Claude geschreven.
- Vindt de reviewer problemen, dan blokkeert de gate: Claude moet de bevindingen oplossen of bewust waiven voordat de taak als klaar geldt. Zijn instructies eisen voor elke waiver een controleerbare reden en een melding aan Gerwin; Gerwin kan zelf ook bevindingen waiven. Een waiver blijft gelden voor dezelfde repository en branch, ook in een volgende sessie; een bewuste, blijvende afweging kan in een projectbestand dat de gate altijd meeneemt.
- Alles komt in een logboek dat nooit wordt opgeschoond: elke blokkade, elke waiver en wie die gaf, en elke keer dat de reviewer faalde. Terugkerende bevindingen zet hij om in vaste projectregels die de reviewer voortaan meeneemt.
- De gate staat per repository aan en slaat kleine wijzigingen over. Handmatig reviewt een slash command de hele branch, met een zwaarder model.

Randgevallen die hij heeft opgelost:
- Geen dubbele reviews: een cache op basis van een hash van de diff zorgt dat dezelfde wijziging één keer wordt gereviewd. Waivers filteren daarna de bestaande bevindingen; een nieuwe review zou een nieuwe steekproef opleveren en nooit convergeren.
- Geen eindeloze lussen: dezelfde ongewijzigde wijziging wordt hooguit drie keer geblokkeerd. Daarna laat de gate los en legt vast dat de bevinding onbeslist bleef.
- Grote wijzigingen worden per bestand in stukken en parallel gereviewd, omdat reviewers slecht presteren op grote diffs.
- Faalt de reviewer (time-out, geen oordeel), dan laat de gate de taak door, zodat Claude niet vastloopt, maar legt hij vast dat die wijziging niet is gereviewd: stilte telt niet als goedkeuring.

## Deze chat

- Gebouwd met Claude Code en zijn eigen review gate, in Nuxt 4 (TypeScript) met de AI SDK, gehost op Vercel. Het model loopt via Vercel AI Gateway.
- Het model is Claude Haiku 4.5 van Anthropic: snel, goedkoop, en een van de modellen die het vaakst toegeven iets niet te weten in plaats van iets te verzinnen. Eerlijke antwoorden zijn hier belangrijker dan de laatste cent. Verzoeken gaan eerst naar Anthropic; alleen als dat faalt, wijkt de chat automatisch uit naar een andere host van hetzelfde model (Claude op AWS, Amazon Bedrock of Google Vertex AI). Andere partijen dan die in de privacytekst krijgen de gesprekken nooit.
- Bewust geen RAG: het cv en deze toelichting passen ruim in de context van het model. Embeddings en een vectordatabase zouden alleen complexiteit toevoegen zonder betere antwoorden. De juiste techniek kiezen voor het probleem, ook als dat de simpelere is.
- Eén tool: bezoekers kunnen een kennismaking aanvragen. De chat vraagt eerst om bevestiging, maar dat is een gemaksstap voor de bezoeker, geen beveiliging. De echte grenzen zitten in de code en daarbuiten: de ontvanger ligt vast in de configuratie, de invoer wordt streng gevalideerd zodat niemand extra ontvangers in de mail kan smokkelen, en er gaat per vraag hooguit één mail uit, ook als het model de tool meerdere keren tegelijk aanroept. Binnen een gesprek stuurt de chat geen tweede aanvraag.
- Afgebakend: per vraag maximaal drie modelaanroepen, en antwoorden worden als platte tekst getoond, nooit als HTML.
- Misbruik en kosten: geen eigen database of extra dienst voor rate limiting. In plaats daarvan een firewallregel per IP-adres bij Vercel, een vooraf betaald tegoed voor het model zonder automatisch bijvullen, en de daglimiet van de maildienst. Een bewuste afweging: eenvoud boven een extra dienst, met een duidelijk plan voor als er toch misbruik komt.
- Tweetalig: de site is er in het Nederlands en Engels. Het cv is Nederlands; de chat antwoordt in de taal van de bezoeker.
- Privacy: de site zet geen cookies; alleen de taal- en themakeuze staan in de browser. Gesprekken gaan via Vercel AI Gateway naar Anthropic, of bij een storing naar een andere host van hetzelfde model (Claude op AWS, Amazon Bedrock of Google Vertex AI), en worden niet gebruikt voor training. Gerwin bewaart de volledige gesprekken 14 dagen in LangSmith (EU-regio), zonder IP-adres maar met alles wat de bezoeker zelf typt (zoals een naam), en leest ze achteraf terug. Gerwin kan dus lezen wat bezoekers in de chat vragen; zo ziet hij ook of de antwoorden kloppen. Daarna worden ze automatisch verwijderd. De details staan in de privacytekst onder het invoerveld.

## Ontworpen: een RAG-assistent voor een patiëntenorganisatie

Gerwin ontwierp de architectuur voor een e-learningplatform van een patiëntenorganisatie, met een AI-assistent als kern. Het was een ontwerp en offerte; het traject is uiteindelijk niet gerealiseerd, dus het systeem draait niet in productie. De naam van de organisatie wordt niet gedeeld.

Belangrijkste keuzes:
- EU-hosting van alles: applicatie, database en AI-modellen draaien binnen de EU. Voor de taalmodellen koos hij Mistral, zodat zowel embeddings als antwoorden binnen de EU worden gegenereerd.
- Model-agnostisch: de vectoren staan in eigen beheer (Postgres met pgvector), losgekoppeld van het taalmodel. Van generatiemodel wisselen kan zonder gevolgen; van embeddingmodel wisselen vraagt een volledige herindexering. Die afweging is bewust in het ontwerp meegenomen.
- Meerdere bronnen: de assistent put uit de content van het platform zelf en uit de bestaande website van de organisatie. Bij het publiceren van content wordt automatisch opnieuw geïndexeerd, als losse achtergrondtaak.
- Guardrails: de assistent antwoordt alleen op basis van de eigen, gecontroleerde bronnen, met bronverwijzing en medische disclaimers, en stelt nooit diagnoses. Medische inhoud wordt klinisch gereviewd door een medische partner.
- Privacy: strikte scheiding tussen leercontent (zonder persoonsgegevens) en persoonsgegevens. Omdat al het hebben van een account iets zegt over iemands gezondheid, gelden daarvoor de strengste AVG-regels. Chatlogs worden zo veel mogelijk beperkt.
- Stack: Nuxt, Supabase (EU) voor auth, database en vectoren, Storyblok als CMS, en de Vercel AI SDK.

# Hoe Gerwin dagelijks met AI werkt

- Gerwin typt nauwelijks nog zelf code. Hij schrijft de specificaties, Claude Code bouwt, en hij beoordeelt het resultaat.
- De review gate is de automatische eerste controle op zijn wijzigingen; daarna beoordeelt Gerwin het resultaat zelf.
- Elke taak draait in een eigen git worktree, via een eigen `wt`-script. Zo kan hij aan meerdere taken tegelijk werken en blijven wijzigingen geïsoleerd en los te reviewen.
- Zijn instructies en hooks staan centraal in zijn Claude Code-configuratie, zodat dezelfde werkwijze in elk project beschikbaar is; de review gate zet hij per repository aan.
- Hij gebruikt deze workflow in zijn huidige opdracht bij Vergelijk.nl, maar ook bij het ontwikkelen van deze chat.

# Vergelijk.nl in iets meer detail

Dit is zijn huidige en meest recente opdracht.
- Gerwin bouwde de site opnieuw als Nuxt SSR-applicatie en is verantwoordelijk voor implementatie en beheer.
- De site haalt alle Core Web Vitals met PageSpeed-scores van 90+. Een belangrijk onderdeel daarvan is caching in Redis: zowel API-responses als complete server-side gerenderde pagina's worden gecachet.
- Hij werkte mee aan de CI/CD-pipeline die de applicatie uitrolt naar OpenShift op AWS.
- Gerwin is hier de enige TypeScript-developer, dus de volledige Nuxt-applicatie is door hem opgebouwd. Daarbij is hij volledig zelfsturend.

# Eerlijke kanttekeningen

Gerwin is hier graag open over:
- Python: Gerwin heeft geen noemenswaardige ervaring met Python. Zijn stack is TypeScript/Node. Voor een rol die draait om een Python-backend is dat het belangrijkste gat. Hij is actief bezig om zich Python volledig eigen te maken.
- RAG in productie: zijn RAG-kennis komt uit architectuurwerk en eigen studie; hij heeft nog geen RAG-systeem in productie gebracht.
- Achtergrond: het grootste deel van zijn recente ervaring is frontend en fullstack voor grote websites, geen pure backend of data engineering.

# Wat Gerwin zoekt in een volgende rol

- Zijn voorkeur: werk waarin hij AI-oplossingen bouwt voor organisaties, met zowel het bouwen als het contact met de klant.
- Daarnaast staat hij open voor een opdracht waarin hij frontend development combineert met AI, bijvoorbeeld UX rond conversational UI of A2UI.
- Een omgeving waar AI-native ontwikkelen de standaard is, en waar hij kan bijdragen aan de werkwijze en kwaliteitsborging daaromheen.

# Werkvoorkeuren

- Hij woont in Apeldoorn en werkt graag hybride, met bij voorkeur een kantoor in de regio. Dat laatste is geen must, 1 à 2 dagen per week reistijd naar een kantoor verder weg is geen probleem.
- Gerwin werkt al vanaf 2018 freelance, maar staat ook open voor een vaste aanstelling.

# Niet via de chat

Deze onderwerpen bespreekt Gerwin liever zelf. Verwijs hiervoor naar een kennismaking:
- tarief, salaris, contractvorm en aantal uren
- beschikbaarheid en startdatum
- redenen om bij zijn huidige opdracht te vertrekken
- details over lopende of eerdere opdrachten die niet in het cv of in deze toelichting staan
