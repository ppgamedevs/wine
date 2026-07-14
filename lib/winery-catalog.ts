import { BALLA_GEZA_WINERY_LOGO_URL } from "@/lib/ballageza-producer";
export interface WineryCatalogEnrichment {
  logoUrl: string;
  tagline: string;
  story: string;
  /** Pagina oficiala de vizite / degustari (activa doar dupa revendicare). */
  visitUrl?: string;
}

function vinintelClosing(name: string): string {
  return `Pe VinIntel listam vinurile ${name} cu preturi in RON, scoruri de valoare si recomandari de asortare, ca sa poti alege sticla potrivita fara sa parcurgi zeci de pagini de magazin.`;
}

export const WINERY_CATALOG: Partial<Record<string, WineryCatalogEnrichment>> = {
  "cramele-recas": {
    logoUrl:
      "https://cramelerecas.ro/wp-content/uploads/logo-Cramele-Recas-512.jpg",
    visitUrl: "https://cramelerecas.ro/viziteaza/",
    tagline:
      "Cel mai mare exportator de vin imbuteliat din Romania, cu un raport calitate-pret remarcabil.",
    story: `In Banat, langa Recas, viticultura are radacini adanci: coloniile sveste au adus aici traditii germane de crama, iar solul si soarele din podgorie au modelat generatii de vinificatori. Cramele Recas s-a nascut in 1991 din curajul unor oameni care au crezut ca vinul romanesc poate concura pe piata internationala fara sa renunte la identitatea locala.

Astazi, crama proceseaza recolta din mii de hectare si exporta in zeci de tari, de la game accesibile precum Schwaben Wein si Castel Huniade pana la etichete premium precum La Stejari si Selene. Vinificatorii Hartley Smithers si Nora Iriarte au adus recunoastere internationala portofoliului, iar fiecare sticla pastreaza ideea de baza: vin onest, proaspat, facut cu respect pentru soi si pentru omul care il deschide acasa.

${vinintelClosing("Recas")}`,
  },
  davino: {
    logoUrl: "https://davino.ro/assets/images/logo-davino.png",
    visitUrl: "https://davino.ro/vizite/",
    tagline:
      "Una dintre cramele de referinta din Romania, pionier al vinurilor premium din Dealu Mare.",
    story: `Davino a fost printre primele crame romanesti care au demonstrat ca Dealu Mare poate produce vinuri serioase, cu structura si personalitate. Plantatiile din Ceptura si terroir-ul calcarean au devenit rapid un reper pentru pasionatii de vin care cauta expresii clare, fara compromisuri.

De la cuvee-urile de colectie la game mai accesibile, portofoliul Davino urmareste un echilibru intre eleganta franceza si identitatea locala. Fiecare recolta este tratata cu rigoare in crama, iar vinurile sunt apreciate pentru consistenta, claritate aromatica si potential gastronomic.

${vinintelClosing("Davino")}`,
  },
  serve: {
    logoUrl:
      "https://serve.ro/wp-content/uploads/2026/03/Serve-Logo-3-W-600x233.png",
    visitUrl: "https://serve.ro/vizite/",
    tagline:
      "Prima crama privata cu capital strain din Romania, fondata de contele Guy de Poix.",
    story: `SERVE a adus in Dealu Mare o viziune europeana inca din anii '90, combinand traditia viticola locala cu standarde moderne de vinificatie. Fondarea de catre contele Guy de Poix a marcat o schimbare de ritm in podgorie, unde calitatea a inceput sa primeze in fata productiei de masa.

Astazi, vinurile cramei sunt apreciate pentru consistenta, claritate aromatica si raportul solid calitate-pret. Portofoliul acopera atat albe proaspete, cat si rosii structurate, cu linii care reflecta atent terroir-ul din Ceptura si imprejurimi.

${vinintelClosing("SERVE")}`,
  },
  avincis: {
    logoUrl: "https://www.avincis.ro/img/Logo%20vin%20Avincis.png",
    visitUrl: "https://www.avincis.ro/ro/degustari",
    tagline:
      "Crama boutique din Dragasani, cu accent pe soiuri autohtone si arhitectura premiata.",
    story: `Avincis s-a impus ca un proiect de familie in inima Dragasanilor, unde Cramposia, Novacul si Negrul de Dragasani capata expresii rafinate. Podgoria olteana ofera conditii ideale pentru albe cu mineralitate si rosii cu personalitate, iar crama a devenit un simbol al noii generatii viticole romanesti.

Cladirea cramei, premiata pentru arhitectura, reflecta aceeasi atentie la detaliu ca si vinificatia. Vinurile sunt lucrate cu grija, in volume mici, cu accent pe claritatea aromelor si pe autenticitatea soiurilor locale.

${vinintelClosing("Avincis")}`,
  },
  "crama-oprisor": {
    logoUrl: "https://cramaoprisor.ro/images/logo.png",
    visitUrl: "https://cramaoprisor.ro/vizite",
    tagline:
      "Crama din Mehedinti cunoscuta pentru gama La Cetate si Smerenie, parte din grupul Carl Reh.",
    story: `Pe dealurile din Oltenia, Crama Oprisor a construit un portofoliu generos in jurul gamei La Cetate, de la vinuri accesibile la etichete care exploreaza terroir-ul mehedintean cu seriozitate. Solurile si expunerea dealurilor din zona Oprisor dau vinurilor o structura clara si o expresie fructata echilibrata.

Parte a grupului Carl Reh, crama combina experienta de vinificatie internationala cu resurse locale solide. Gama Smerenie si cuvee-urile premium completeaza un portofoliu gandit pentru consum zilnic, dar si pentru ocazii in care vrei un vin cu mai multa profunzime.

${vinintelClosing("Oprisor")}`,
  },
  "crama-gabai": {
    logoUrl: "https://cramagabai.ro/wp-content/uploads/2019/05/gb.png",
    visitUrl: "https://cramagabai.ro/degustare/",
    tagline:
      "Crama de familie din Dobrogea, langa Constanta, cu vinuri accesibile din soiuri romanesti si internationale.",
    story: `La Valu lui Traian, in podgoria dobrogeana de langa Murfatlar, Crama Gabai lucreaza viile cu grija de familie si transforma recolta in vinuri clare, usor de inteles la masa. Caldura si lumina din sud-estul Romaniei dau albe proaspete, roze expresive si rosii cu structura, de la sticle de zi cu zi la formaturi de colectie.

Portofoliul acopera Feteasca Regala, Riesling Italian, Cabernet Sauvignon si cupaje atent gandite, cu preturi care incep accesibil si urca spre editii limitate in magnum. Crama primeste vizitatori pentru degustari si povesteste deschis cum se nasc vinurile in vie.

${vinintelClosing("Crama Gabai")}`,
  },
  murfatlar: {
    logoUrl: "https://murfatlar-vinul.ro/wp-content/uploads/2023/03/Asset-1@2x.png",
    visitUrl: "https://murfatlar-vinul.ro/experienta/",
    tagline:
      "Cel mai vechi si mai cunoscut nume al viticulturii romanesti, cu podgoria istorica de la malul Marii Negre.",
    story: `Murfatlar este sinonim cu vinul romanesc pentru multe generatii. Podgoria dobrogeana, scaldata de soare si racorita de briza Marii Negre, ofera un microclimat aparte, cu soluri calcaroase care dau vinurilor o mineralitate distincta si o coacere generoasa a strugurilor.

Portofoliul actual imbina traditia gamelor clasice, precum Sec de Murfatlar si Lacrima lui Ovidiu, cu linii mai noi precum Sable Noble, unde soiuri romanesti si internationale sunt asamblate in cupaje accesibile. Crama pastreaza si o parte din istoria vinurilor dulci si a distilatelor, alaturi de o gama larga de vinuri de zi cu zi.

${vinintelClosing("Murfatlar")}`,
  },
  liliac: {
    logoUrl: "https://liliac.com/media/254/logo-setting-image",
    visitUrl: "https://liliac.com/ro/visit",
    tagline:
      "Crama transilvaneana din Lechinta, cu vinuri elegante si proaspete de altitudine.",
    story: `Liliac vinifica pe versantii Lechintei, unde altitudinea si noptile racoroase pastreaza aciditatea si finetea aromelor. Este o crama moderna, nascuta din dorinta de a pune Transilvania viticola pe harta vinurilor albe elegante din Europa Centrala.

Portofoliul propune albe florale, roze delicate si rosii cu structura moderata, toate cu un profil proaspat care se potriveste bucatariei de sezon. Filozofia cramei pune accent pe echilibru, nu pe exces, iar fiecare sticla vorbeste despre climatul rece al podgoriei.

${vinintelClosing("Liliac")}`,
  },
  "casa-de-vinuri-cotnari": {
    logoUrl:
      "https://casadevinuricotnari.ro/wp-content/uploads/2020/06/logo-cotnari.png",
    visitUrl: "https://casadevinuricotnari.ro/vizite",
    tagline:
      "Producator modern din Cotnari, dedicat soiurilor autohtone si vinurilor dulci.",
    story: `Casa de Vinuri Cotnari continua una dintre cele mai cunoscute traditii viticole ale Moldovei, cu Grasa, Feteasca si Tamaioasa in prim-plan. Dealurile din Cotnari, cu pantele lor generoase si microclimatul local, au produs de secole vinuri dulci care au facut faima regiunii.

Crama propune atat vinuri dulci clasice, cat si interpretari mai usor de baut pentru publicul de azi: albe aromate, roze proaspete si game seci care arata ca terroir-ul cotnarean poate fi versatil. Productia moderna respecta radacinile, dar nu se teme de stiluri noi.

${vinintelClosing("Cotnari")}`,
  },
  budureasca: {
    logoUrl: "https://www.budureasca.ro/media/logo/default/logo.jpg",
    visitUrl: "https://budureasca.ro/vizite",
    tagline:
      "Crama din Valea Calugareasca, in inima podgoriei Dealu Mare, cu o gama larga premiata.",
    story: `Budureasca leaga Valea Calugareasca de un portofoliu amplu, de la vinuri de zi cu zi la cuvee-uri care au strans medalii internationale. Terroir-ul exceptional al viilor din Dealu Mare permite recolte constante, iar crama a devenit una dintre cele mai vizibile nume ale podgoriei.

De la gama Clasic la Origini, Organic si The Sign, fiecare linie urmareste acelasi ideal: vinuri nobile din soiuri romanesti si internationale, vinificate cu pasiune. Peste 500 de medalii la concursuri internationale confirma ambitia echipei.

${vinintelClosing("Budureasca")}`,
  },
  "domeniile-coroanei-segarcea": {
    logoUrl: "https://domeniulcoroanei.ro/wp-content/uploads/logo.png",
    visitUrl: "https://domeniulcoroanei.ro/vizite",
    tagline:
      "Domeniu regal istoric din Segarcea, cu o traditie de peste un secol si vinuri premiate.",
    story: `La Segarcea, pe fostul domeniu al Coroanei, viticultura se leaga de o poveste regala unica in Romania. Fondat la inceputul secolului XX, domeniul a fost printre primele plantatii moderne ale tarii, iar traditia viticola olteana se simte in fiecare rand de vita.

Astazi, crama produce vinuri corpolente, cu identitate olteana puternica si traditie de export. Portofoliul acopera albe, roze si rosii, cu accent pe soiuri care beneficiaza de caldura Olteniei si de experienta acumulata de generatii de viticultori.

${vinintelClosing("Domeniile Coroanei Segarcea")}`,
  },
  tohani: {
    logoUrl: "https://tohani.ro/assets/img/logo-light.png",
    visitUrl: "https://tohani.ro/vizite",
    tagline:
      "Una dintre cele mai cunoscute crame din Dealu Mare, cu o gama variata pentru toate gusturile.",
    story: `Tohani este un nume familiar pentru multi romani, cu o gama larga care acopera aproape orice ocazie. Crama s-a dezvoltat pe colinele din Dealu Mare inca din anii '60, iar astazi combina productia de volum cu linii premium care exploreaza potentialul podgoriei.

Vinurile Tohani sunt gandite pentru accesibilitate: preturi corecte, stiluri clare si etichete usor de gasit in magazine. In paralel, cuvee-urile de colectie arata ca Dealu Mare poate produce vinuri cu mai multa complexitate atunci cand recolta o permite.

${vinintelClosing("Tohani")}`,
  },
  "petro-vaselo": {
    logoUrl:
      "https://petrovaselo.com/wp-content/uploads/2019/04/pv-logo-dark-1x.png",
    visitUrl: "https://petrovaselo.com/vizite/",
    tagline:
      "Crama boutique din Banat, cu accent pe spumante metoda traditionala si soiuri autohtone.",
    story: `Petro Vaselo aduce in Banat o identitate clara: spumante lucrate cu grija, albe proaspete si roze elegante, toate ancorate in terroir-ul local. Crama de familie a crescut organic, cu o reputatie construita pe consistenta si pe respectul pentru materia prima.

Spumantele metoda traditionala sunt emblema casei, dar portofoliul include si vinuri linistite expresive, vinificate cu interventie minima. Fiecare sticla reflecta filosofia unei crame mici care prefera calitatea in locul volumului.

${vinintelClosing("Petro Vaselo")}`,
  },
  "crama-girboiu": {
    logoUrl:
      "https://cramagirboiu.ro/wp-content/uploads/2023/10/logo_girboiu.svg",
    visitUrl: "https://cramagirboiu.ro/vizite",
    tagline:
      "Crama de familie din Vrancea, dedicata soiurilor autohtone si terroir-ului local.",
    story: `Crama Girboiu vinifica in Vrancea cu o filosofie simpla: soiuri autohtone, recolta atent selectionata si vinuri sincere care vorbesc despre locul din care vin. Dealurile vrancene, cu soluri diverse si climat continental, ofera un terroir ideal pentru Feteasca, Tamaioasa si alte soiuri romanesti.

Portofoliul cramei este compact, dar coerent: albe aromate, rosii cu structura moderata si cuvee-uri de ocazie. Girboiu ramane un exemplu de crama de familie care a ales claritatea identitatii in locul diversificarii excesive.

${vinintelClosing("Girboiu")}`,
  },
  lacerta: {
    logoUrl:
      "https://www.lacertawinery.ro/assets/public/lacerta/images/logo.png",
    visitUrl: "https://www.lacertawinery.ro/ro/vizite",
    tagline:
      "Crama moderna din Dealu Mare, cu vinuri echilibrate si cuvee-uri premiate international.",
    story: `Lacerta s-a nascut din pasiunea familiei Baston pentru Dealu Mare. Crama moderna, cu dotari de ultima generatie, a devenit rapid un reper pentru vinuri echilibrate, gastronomice si constant premiate in competitii internationale.

Portofoliul acopera albe, roze si rosii, cu linii premium precum Cuvee din Carti si Bisericuta care arata potentialul podgoriei la nivel inalt. Vinificatorii urmaresc echilibrul intre fruct, structura si finete, fara a pierde din vedere stilul local.

${vinintelClosing("Lacerta")}`,
  },
  "crama-basilescu": {
    logoUrl:
      "https://cramabasilescu.ro/wp-content/themes/basilescu/images/logo.png",
    visitUrl: "https://cramabasilescu.ro/vizite",
    tagline:
      "Crama din Urlati, axata pe vinificatie sustenabila si soiuri romanesti aromate.",
    story: `Crama Basilescu lucreaza pe colinele din Urlati cu un accent clar pe sustenabilitate si pe expresia aromelor romanesti. Podgoria Dealu Mare, cu solurile si expunerile variate din zona Urlati, permite vinuri cu personalitate fructata si aciditate vie.

De la Feteasca Regala la roze proaspete si rosii cu structura moderata, portofoliul urmareste un stil direct, usor de inteles, dar serios in crama. Practici viticole responsabile si investitii constante in tehnologie completeaza imaginea unei crame orientate spre viitor.

${vinintelClosing("Basilescu")}`,
  },
  jidvei: {
    logoUrl:
      "https://www.jidvei.ro/wp-content/uploads/2026/03/logo-jidvei-it-jwt-white.webp",
    visitUrl: "https://www.jidvei.ro/vizite/",
    tagline:
      "Cel mai mare producator de vinuri albe din Romania, in podgoria Tarnave din Transilvania.",
    story: `Jidvei este sinonim cu vinurile albe transilvanene, vinificate pe terasele Tarnavelor de secole. Istoria cramei se intinde mult in urma, iar podgoria de altitudine produce albe cu aciditate naturala, finete aromatica si potential gastronomic remarcabil.

Crama produce volume mari, dar pastreaza o identitate clara in gamele clasice si moderne. Fie ca alegi un vin de zi cu zi sau o selectie mai rafinata, profilul Jidvei ramane recognoscibil: prospetime, claritate si accesibilitate.

${vinintelClosing("Jidvei")}`,
  },
  "domeniile-samburesti": {
    logoUrl:
      "https://domeniilesamburesti.ro/wp-content/uploads/logo-samburesti.png",
    visitUrl: "https://domeniilesamburesti.ro/vizite",
    tagline:
      "Producator oltenesc renumit pentru Cabernet Sauvignon corpolent din terroir-ul Samburesti.",
    story: `Samburesti este una dintre podgoriile rosii de referinta ale Romaniei. Dealurile din Oltenia, cu soare generos si soluri calcaroase, au facut din Cabernet Sauvignon local un vin cu renume national, iar Domeniile Samburesti au fost printre primele care l-au valorificat la nivel premium.

Portofoliul cramei include rosii corpolente, maturate in barrique, alaturi de albe si roze care completeaza gama. Vinificatia urmareste extract, structura si potential de evolutie, cu etichete care au facut cunoscut terroir-ul oltean in tara si in strainatate.

${vinintelClosing("Samburesti")}`,
  },
  "balla-geza": {
    logoUrl: BALLA_GEZA_WINERY_LOGO_URL,
    visitUrl: "https://www.ballageza.com/ro/degustari",
    tagline:
      "Crama din Minis, specializata in soiul autohton Cadarca si vinuri de pe terase de piatra.",
    story: `In Minis-Maderat, Balla Geza lucreaza pe terase de piatra unde Cadarca si alte soiuri locale capata o expresie minerala si intensa, greu de replicat in alte regiuni. Podgoria banateana, cu traditie svesta si conditii de sol unice, a modelat identitatea cramei inca de la inceputuri.

Portofoliul include linii clasice, colectia Kolna, Stonewines de pe terase si vinuri perlante precum Frizzy si Rozzy. Fiecare eticheta urmareste sa arate o fata diferita a aceluiasi terroir: uneori directa si fructata, alteori mai serioasa si structurata.

${vinintelClosing("Balla Geza")}`,
  },
  corcova: {
    logoUrl: "https://corcova.ro/wp-content/uploads/logo-corcova.png",
    visitUrl: "https://corcova.ro/vizite/",
    tagline:
      "Domeniu din Mehedinti cu traditie franceza, apreciat pentru Pinot Noir si vinuri elegante.",
    story: `Corcova Roy si Damboviceanu aduce in Oltenia o eleganta de inspiratie franceza, cu Pinot Noir si Chardonnay care au rescris reputatia vinurilor din Mehedinti. Domeniul, cu o poveste legata de familia Roy, combina traditia viticola locala cu o viziune orientata spre finete si longevitate.

Vinurile sunt vinificate cu grija, cu accent pe echilibru si pe expresia terroir-ului din Corcova. Portofoliul propune albe rafinate, rosii cu structura fina si cuvee-uri de colectie care confirma potentialul podgoriei la standarde internationale.

${vinintelClosing("Corcova")}`,
  },
  "prince-stirbey": {
    logoUrl:
      "https://stirbey.com/wp-content/uploads/2018/02/Prince-Stirbey-Logo.png",
    visitUrl: "https://stirbey.com/visit/",
    tagline:
      "Crama aristocrata din Dragasani, pionier al soiurilor autohtone Cramposie, Novac si Negru.",
    story: `Prince Stirbey reinvie traditia viticola a familiei Stirbey in Dragasani, cu un portofoliu axat pe soiuri autohtone vinificate cu rafinament si claritate. Podgoria olteana, cu solurile si expunerile sale variate, este terenul ideal pentru Cramposie, Novac si Negrul de Dragasani.

Crama a fost pionier in recuperarea si promovarea soiurilor locale, iar vinurile sunt apreciate pentru eleganta, nu pentru forta bruta. Fiecare sticla poarta amprenta unei familii care a investit in identitatea viticola romaneasca.

${vinintelClosing("Prince Stirbey")}`,
  },
  vinarte: {
    logoUrl: "https://vinarte.ro/wp-content/uploads/2020/03/logo.png",
    visitUrl: "https://vinarte.ro/vizite",
    tagline:
      "Producator cu domenii in mai multe podgorii, cunoscut pentru gama premium Prince Matei.",
    story: `Vinarte reuneste terroir-uri din mai multe regiuni romanesti sub umbrela unor branduri premium, printre care Prince Matei, un nume asociat cu vinuri de colectie. Modelul multi-regional permite cramei sa selecteze cele mai potrivite parcele pentru fiecare stil si soi.

Portofoliul acopera albe, roze si rosii, de la vinuri accesibile la cuvee-uri de varf care au strans recunoastere la concursuri. Vinarte valorifica terroir-uri din mai multe regiuni romanesti, cu o gama coerenta si usor de parcurs.

${vinintelClosing("Vinarte")}`,
  },
  halewood: {
    logoUrl:
      "https://halewood.com.ro/wp-content/uploads/2025/10/cropped-halewood-192x192.jpg",
    visitUrl: "https://halewood.com.ro/vizite",
    tagline:
      "Crama cu capital britanic din Dealu Mare, cu vinuri accesibile si gama Hyperion premium.",
    story: `Halewood aduce experienta britanica in Dealu Mare, cu o gama dubla: vinuri accesibile pentru consum zilnic si linia Hyperion, orientata spre calitate superioara. Investitiile in podgorie si in crama au transformat Halewood intr-un nume stabil pe piata romaneasca.

Vinurile de intrare sunt gandite pentru claritate si accesibilitate, in timp ce Hyperion exploreaza extract, maturare si stiluri mai complexe. Combinatia intre volum si premium arata o strategie clara: vin pentru fiecare buzunar, fara a renunta la standarde tehnice.

${vinintelClosing("Halewood")}`,
  },
  "villa-vinea": {
    logoUrl:
      "https://villavinea.com/wp-content/uploads/2024/07/Logo-Villa-Vinea.png",
    visitUrl: "https://villavinea.com/vizite/",
    tagline:
      "Crama transilvaneana de altitudine, cu vinuri albe si rosii rafinate de inspiratie central-europeana.",
    story: `Villa Vinea vinifica pe versantii Tarnavelor, unde altitudinea si clima rece produc albe elegante si rosii cu aciditate vie, in stil central-european. Crama s-a impus rapid printre producatorii transilvaneni care pun accent pe finete, nu pe extract brut.

Portofoliul include albe florale, roze delicate si rosii cu structura moderata, toate cu un profil proaspat care se potriveste bucatariei de sezon. Filozofia cramei urmareste echilibrul intre terroir, tehnologie moderna si interventie minima in pivnita.

${vinintelClosing("Villa Vinea")}`,
  },
  purcari: {
    logoUrl:
      "https://purcariwineries.com/wp-content/uploads/2024/10/258503515_6703326329707453_7198001526931613180_n.png",
    visitUrl: "https://purcariwineries.com/ro/experiences",
    tagline:
      "Crama istorica din Stefan Voda, cunoscuta pentru vinuri elegante din Moldova.",
    story: `Purcari poarta una dintre cele mai vechi traditii viticole din regiune, cu radacini care se intind peste secole de productie in Moldova. Dealurile din Stefan Voda, cu soluri calcaroase si influenta climatica favorabila, au facut din aceasta crama un nume recunoscut atat local, cat si pe pietele externe.

Portofoliul include albe rafinate, rosii structurate si vinuri de colectie care au strans medalii internationale. Purcari a combinat traditia cu investitii moderne in plantatii si crama, pastrand in acelasi timp identitatea unei case cu istorie.

${vinintelClosing("Purcari")}`,
  },
};

export function getWineryCatalogEnrichment(
  slug: string,
): WineryCatalogEnrichment | null {
  return WINERY_CATALOG[slug] ?? null;
}

export function resolveWineryLogoUrl(
  slug: string,
  dbLogoUrl: string | null | undefined,
): string | null {
  const trimmed = dbLogoUrl?.trim();
  if (trimmed) return trimmed;
  return WINERY_CATALOG[slug]?.logoUrl?.trim() ?? null;
}

export function splitWineryStory(story: string): string[] {
  return story
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
