/** Curated winery logos, taglines, and editorial stories for catalog pages. */
export interface WineryCatalogEnrichment {
  logoUrl: string;
  tagline: string;
  story: string;
}

export const WINERY_CATALOG: Partial<Record<string, WineryCatalogEnrichment>> = {
  "cramele-recas": {
    logoUrl:
      "https://cramelerecas.ro/wp-content/uploads/logo-Cramele-Recas-512.jpg",
    tagline:
      "Cel mai mare exportator de vin imbuteliat din Romania, cu un raport calitate-pret remarcabil.",
    story: `In Banat, langa Recas, viticultura are radacini adanci: coloniile sveste au adus aici traditii germane de crama, iar solul si soarele din podgorie au modelat generatii de vinificatori. Cramele Recas s-a nascut in 1991 din curajul unor oameni care au crezut ca vinul romanesc poate concura pe piata internationala fara sa-si trade identitatea.

Astazi, crama proceseaza recolta din mii de hectare si exporta in zeci de tari, de la game accesibile precum Schwaben Wein si Castel Huniade pana la etichete premium precum La Stejari si Selene. Vinificatorii Hartley Smithers si Nora Iriarte au adus recunoastere internationala portofoliului, iar fiecare sticla pastreaza ideea de baza: vin onest, proaspat, facut cu respect pentru soi si pentru omul care il deschide acasa.

Pe VinIntel listam vinurile Recas cu preturi in RON, scoruri de valoare si recomandari de asortare, ca sa poti alege sticla potrivita fara sa parcurgi zeci de pagini de magazin.`,
  },
  davino: {
    logoUrl: "https://davino.ro/assets/images/logo-davino.png",
    tagline:
      "Una dintre cramele de referinta din Romania, pionier al vinurilor premium din Dealu Mare.",
    story:
      "Davino a fost printre primele crame romanesti care au demonstrat ca Dealu Mare poate produce vinuri serioase, cu structura si personalitate. De la plantatiile din Ceptura pana la cuvee-urile de colectie, crama construieste un portofoliu echilibrat intre eleganta franceza si expresia locala a terroir-ului.",
  },
  serve: {
    logoUrl:
      "https://serve.ro/wp-content/uploads/2026/03/Serve-Logo-3-W-600x233.png",
    tagline:
      "Prima crama privata cu capital strain din Romania, fondata de contele Guy de Poix.",
    story:
      "SERVE a adus in Dealu Mare o viziune europeana inca din anii '90, combinand traditia viticola locala cu standarde moderne de vinificatie. Vinurile cramei sunt apreciate pentru consistenta, claritate aromatica si raportul solid calitate-pret.",
  },
  avincis: {
    logoUrl: "https://www.avincis.ro/img/Logo%20vin%20Avincis.png",
    tagline:
      "Crama boutique din Dragasani, cu accent pe soiuri autohtone si arhitectura premiata.",
    story:
      "Avincis s-a impus ca un proiect de familie in inima Dragasanilor, unde Cramposia, Novacul si Negrul de Dragasani capata expresii rafinate. Crama este la fel de cunoscuta pentru vinuri cat si pentru cladirea sa, un simbol al noii generatii viticole romanesti.",
  },
  "crama-oprisor": {
    logoUrl: "https://cramaoprisor.ro/images/logo.png",
    tagline:
      "Crama din Mehedinti cunoscuta pentru gama La Cetate si Smerenie, parte din grupul Carl Reh.",
    story:
      "Pe dealurile din Oltenia, Crama Oprisor a construit un portofoliu generos in jurul gamei La Cetate, de la vinuri accesibile la etichete care exploreaza terroir-ul mehedintean cu seriozitate si regularitate.",
  },
  liliac: {
    logoUrl: "https://liliac.com/media/254/logo-setting-image",
    tagline:
      "Crama transilvaneana din Lechinta, cu vinuri elegante si proaspete de altitudine.",
    story:
      "Liliac vinifica pe versantii Lechintei, unde altitudinea si noptile racoroase pastreaza aciditatea si finețea aromelor. Este o crama moderna, apreciata pentru albele florale si rozele delicate.",
  },
  "casa-de-vinuri-cotnari": {
    logoUrl:
      "https://casadevinuricotnari.ro/wp-content/uploads/2020/06/logo-cotnari.png",
    tagline:
      "Producator modern din Cotnari, dedicat soiurilor autohtone si vinurilor dulci.",
    story:
      "Casa de Vinuri Cotnari continua una dintre cele mai cunoscute traditii viticole ale Moldovei, cu Grasa, Feteasca si Tamaioasa in prim-plan. Crama propune atat vinuri dulci clasice, cat si interpretari mai usor de baut pentru publicul de azi.",
  },
  budureasca: {
    logoUrl:
      "https://budureasca.ro/wp-content/themes/budureasca/images/logo.png",
    tagline:
      "Crama din Valea Calugareasca, in inima podgoriei Dealu Mare, cu o gama larga premiata.",
    story:
      "Budureasca leaga Valea Calugareasca de un portofoliu amplu, de la vinuri de zi cu zi la cuvee-uri care au strans medalii internationale. Este una dintre cramele care au popularizat Dealu Mare ca destinatie viticola serioasa.",
  },
  "domeniile-coroanei-segarcea": {
    logoUrl: "https://domeniulcoroanei.ro/wp-content/uploads/logo.png",
    tagline:
      "Domeniu regal istoric din Segarcea, cu o traditie de peste un secol si vinuri premiate.",
    story:
      "La Segarcea, pe fostul domeniu al Coroanei, viticultura se leaga de o poveste regala unica in Romania. Astazi, crama produce vinuri corpolente, cu identitate olteana puternica si traditie de export.",
  },
  tohani: {
    logoUrl: "https://tohani.ro/assets/img/logo-light.png",
    tagline:
      "Una dintre cele mai cunoscute crame din Dealu Mare, cu o gama variata pentru toate gusturile.",
    story:
      "Tohani este un nume familiar pentru multi romani, cu o gama larga care acopera aproape orice ocazie. Crama combina productia de volum cu linii premium care exploreaza potentialul Dealu Mare.",
  },
  "petro-vaselo": {
    logoUrl:
      "https://petrovaselo.com/wp-content/uploads/2019/04/pv-logo-dark-1x.png",
    tagline:
      "Crama boutique din Banat, cu accent pe spumante metoda traditionala si soiuri autohtone.",
    story:
      "Petro Vaselo aduce in Banat o identitate clara: spumante lucrate cu grija, albe proaspete si roze elegante, toate ancorate in terroir-ul local si in o traditie a familiei Petro.",
  },
  "crama-girboiu": {
    logoUrl:
      "https://cramagirboiu.ro/wp-content/uploads/2023/10/logo_girboiu.svg",
    tagline:
      "Crama de familie din Vrancea, dedicata soiurilor autohtone si terroir-ului local.",
    story:
      "Crama Girboiu vinifica in Vrancea cu o filosofie simpla: soiuri autohtone, recolta atent selectionata si vinuri sincere care vorbesc despre locul din care vin.",
  },
  lacerta: {
    logoUrl:
      "https://www.lacertawinery.ro/assets/public/lacerta/images/logo.png",
    tagline:
      "Crama moderna din Dealu Mare, cu vinuri echilibrate si cuvee-uri premiate international.",
    story:
      "Lacerta s-a nascut din pasiunea familiei Baston pentru Dealu Mare. Vinurile cramei sunt echilibrate, gastronomice si constant premiate in competitii internationale.",
  },
  "crama-basilescu": {
    logoUrl:
      "https://cramabasilescu.ro/wp-content/themes/basilescu/images/logo.png",
    tagline:
      "Crama din Urlati, axata pe vinificatie sustenabila si soiuri romanesti aromate.",
    story:
      "Crama Basilescu lucreaza pe colinele din Urlati cu un accent clar pe sustenabilitate si pe expresia aromelor romanesti, de la Feteasca Regala la roze proaspete.",
  },
  jidvei: {
    logoUrl:
      "https://www.jidvei.ro/wp-content/uploads/2026/03/logo-jidvei-it-jwt-white.webp",
    tagline:
      "Cel mai mare producator de vinuri albe din Romania, in podgoria Tarnave din Transilvania.",
    story:
      "Jidvei este sinonim cu vinurile albe transilvanene, vinificate pe terasele Tarnavelor de secole. Crama produce volume mari, dar pastreaza o identitate clara in gamele clasice si moderne.",
  },
  "domeniile-samburesti": {
    logoUrl:
      "https://domeniilesamburesti.ro/wp-content/uploads/logo-samburesti.png",
    tagline:
      "Producator oltenesc renumit pentru Cabernet Sauvignon corpolent din terroir-ul Samburesti.",
    story:
      "Samburesti este una dintre podgoriile rosii de referinta ale Romaniei. Domeniile Samburesti produce vinuri corpolente, cu maturare in barrique, care au facut cunoscut Cabernet-ul oltenesc.",
  },
  "balla-geza": {
    logoUrl: "https://ballageza.ro/wp-content/uploads/logo.png",
    tagline:
      "Crama din Minis, specializata in soiul autohton Cadarca si vinuri de pe terase de piatra.",
    story:
      "In Minis-Maderat, Balla Geza lucreaza pe terase de piatra unde Cadarca si alte soiuri locale capata o expresie minerala si intensa, greu de replicat in alte regiuni.",
  },
  corcova: {
    logoUrl: "https://corcova.ro/wp-content/uploads/logo-corcova.png",
    tagline:
      "Domeniu din Mehedinti cu traditie franceza, apreciat pentru Pinot Noir si vinuri elegante.",
    story:
      "Corcova Roy si Damboviceanu aduce in Oltenia o eleganta de inspiratie franceza, cu Pinot Noir si Chardonnay care au rescris reputatia vinurilor din Mehedinti.",
  },
  "prince-stirbey": {
    logoUrl:
      "https://stirbey.com/wp-content/uploads/2018/02/Prince-Stirbey-Logo.png",
    tagline:
      "Crama aristocrata din Dragasani, pionier al soiurilor autohtone Cramposie, Novac si Negru.",
    story:
      "Prince Stirbey reinvie traditia viticola a familiei Stirbey in Dragasani, cu un portofoliu axat pe soiuri autohtone vinificate cu rafinament si claritate.",
  },
  vinarte: {
    logoUrl: "https://vinarte.ro/wp-content/uploads/2020/03/logo.png",
    tagline:
      "Producator cu domenii in mai multe podgorii, cunoscut pentru gama premium Prince Matei.",
    story:
      "Vinarte reuneste terroir-uri din mai multe regiuni romanesti sub umbrela unor branduri premium, printre care Prince Matei, un nume asociat cu vinuri de colectie.",
  },
  halewood: {
    logoUrl: "https://halewood.com.ro/wp-content/uploads/logo-halewood.png",
    tagline:
      "Crama cu capital britanic din Dealu Mare, cu vinuri accesibile si gama Hyperion premium.",
    story:
      "Halewood aduce experienta britanica in Dealu Mare, cu o gama dubla: vinuri accesibile pentru consum zilnic si linia Hyperion, orientata spre calitate superioara.",
  },
  "villa-vinea": {
    logoUrl:
      "https://villavinea.com/wp-content/uploads/2024/07/Logo-Villa-Vinea.png",
    tagline:
      "Crama transilvaneana de altitudine, cu vinuri albe si rosii rafinate de inspiratie central-europeana.",
    story:
      "Villa Vinea vinifica pe versantii Tarnavelor, unde altitudinea si clima rece produc albe elegante si rosii cu aciditate vie, in stil central-european.",
  },
};

export function getWineryCatalogEnrichment(
  slug: string,
): WineryCatalogEnrichment | null {
  return WINERY_CATALOG[slug] ?? null;
}

export function splitWineryStory(story: string): string[] {
  return story
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
