import type { GrapeGuide } from "@/lib/oenology/types";

export const INDIGENOUS_GRAPE_GUIDES: GrapeGuide[] = [
  {
    slug: "feteasca-neagra",
    color: "red",
    isIndigenous: true,
    styleProfileId: "feteasca-neagra",
    aliases: ["feteasca neagra", "fetească neagră", "feteasca negra"],
    relatedSlugs: ["babeasca-neagra", "cadarca", "pinot-noir", "merlot"],
    pairingDishSlugs: ["sarmale", "gratar", "friptura-de-porc"],
    journalSlugs: ["feteasca-neagra-pe-scurt"],
    copy: {
      ro: {
        name: "Feteasca Neagra",
        alsoKnownAs: ["Feteasca negra"],
        metaTitle: "Feteasca Neagra: profil, regiuni si cum alegi sticla",
        metaDescription:
          "Ce este Feteasca Neagra, cum variaza dupa regiune si ce sa cauti pe eticheta. Ghid VinIntel, cu vinuri din catalog cand exista.",
        answer:
          "Feteasca Neagra este soiul rosu de referinta al Romaniei: fruct rosu spre negru, aciditate adesea vie, tanin variabil. Nu e un singur stil. In Moldova poate fi elegant, in Dealu Mare mai dens. Alege dupa crama si an, nu dupa numele soiului singur.",
        intro:
          "Daca ai baut un Feteasca Neagra si ti s-a parut prea dur, prea usor sau prea dulce, n-ai gresit tu. Ai intalnit un stil. Soiul e autohton, cu identitate proprie, nu o copie cu nume romanesc. Potentialul e real. Garantia de calitate nu exista doar pentru ca scrie Feteasca Neagra pe eticheta.",
        inTheGlass:
          "In pahar apare de obicei cireasa, visina, pruna, uneori mure sau un pic de piper. Aciditatea tine vinul treaz la masa. Taninul decide totul: extras bland, e prietenos; extras agresiv, cere timp sau mancare grasa. Baricul poate adauga vanilie sau cacao. Daca le simti inaintea fructului, sticla e mai mult lemn decat soi.",
        origin:
          "Soi romanesc, cu radacini in viticultura locala, nu un import redenumit. S-a raspandit puternic dupa 1990, dar istoria lui e mai veche in Moldova si in alte podgorii. Nu confunda Feteasca Neagra cu Feteasca Alba sau Feteasca Regala. Sunt trei soiuri diferite, nu trei culori ale aceluiasi strugure.",
        inRomania:
          "In Moldova gasesti adesea fruct clar si tanin mai fin. In Dealurile Munteniei si Dealu Mare, corpul creste, fructul se inchide, iar baricul e mai frecvent. Transilvania pastreaza uneori o nota mai rece. Dobrogea poate da vinuri coapte, cu alcool mai generos, unde riscul e sa piarda prospetimea. Compara doua sticle din regiuni diferite inainte sa decizi ca „nu-ti place soiul”.",
        pairing:
          "Merge cu sarmale, tocanite, carne la cuptor, mici si branza maturata. Aciditatea taie grasimea. Un vin tanar, fructat, e mai bun langa mancare de zi cu zi. Un vin serios, cu tanin ferm, cere friptura sau o tocanita, nu o salata. Evita pestele delicat. Opreste-te la un roze sau un alb.",
        howToChoose:
          "Cauta vintage, crama si daca e monovarietal sau cupaj. Pentru invatare, ia doua monovarietale sec din regiuni diferite, intre 40 si 90 RON. Sub 30 RON, verifica Value Score-ul. Peste 120 RON, cere dovezi: originea strugurelui, maturare, nu doar o eticheta grea. Daca vrei un ghid mai lung, avem articolul Feteasca Neagra pe scurt.",
        facts: [
          { label: "Culoare", value: "Rosu" },
          { label: "Origine", value: "Romania, soi autohton" },
          { label: "Stil tipic", value: "Fruct rosu-negru, aciditate vie, tanin variabil" },
          { label: "Zone frecvente", value: "Moldova, Dealu Mare, Dobrogea" },
          { label: "La masa", value: "Sarmale, gratar, tocanite" },
        ],
        faq: [
          {
            question: "Feteasca Neagra e mereu un vin corpulent?",
            answer:
              "Nu. Poti gasi sticle usoare, fructate, si sticle dense, cu baric. Regiunea, extractia si lemnul schimba mai mult decat numele soiului.",
          },
          {
            question: "E acelasi lucru cu Feteasca Alba?",
            answer:
              "Nu. Feteasca Alba e soi alb. Feteasca Regala e alt soi alb. Feteasca Neagra e rosu. Numele comun e coincidental pentru cumparator, nu o familie de culori.",
          },
          {
            question: "Cu ce mananci Feteasca Neagra?",
            answer:
              "Cu mancare cu grasime si condiment: sarmale, porc la cuptor, gratar. Vinul tanar merge si singur. Vinul taninos cere farfurie.",
          },
        ],
        sources: [
          { label: "Observatii de stil din catalogul si ghidurile VinIntel" },
        ],
      },
      en: {
        name: "Feteasca Neagra",
        alsoKnownAs: ["Feteasca negra"],
        metaTitle: "Feteasca Neagra: style, regions and how to buy",
        metaDescription:
          "What Feteasca Neagra tastes like, how Romanian regions change it, and how to pick a bottle without guessing.",
        answer:
          "Feteasca Neagra is Romania's benchmark red grape: red to black fruit, often lively acidity, tannin that swings with the winery. Moldova tends to be finer. Dealu Mare tends to be denser. Buy the bottle, not the variety name alone.",
        intro:
          "One harsh bottle does not define the grape. Feteasca Neagra is indigenous, not a French variety with a local nickname. It can be everyday fruit or a serious cellar wine. The label is a starting point, not a quality stamp.",
        inTheGlass:
          "Expect cherry, sour cherry, plum, sometimes blackberry and a little pepper. Acidity keeps it useful at the table. Gentle extraction makes it friendly. Aggressive extraction needs food or time. Oak should sit behind the fruit. If vanilla leads, you are tasting wood more than the grape.",
        origin:
          "This is a Romanian grape with a local history, later planted widely after 1990. Do not mix it up with Feteasca Alba or Feteasca Regala. Those are separate white grapes, not color versions of the same vine.",
        inRomania:
          "Moldova often shows clearer fruit and finer tannin. Dealu Mare and Muntenia add body and more oak. Transylvania can stay cooler. Dobrogea can ripen fast, with the risk of losing freshness. Taste two regions before you decide you dislike the grape.",
        pairing:
          "It sits well with sarmale, stews, roast pork and grilled meat. Fresh, fruity bottles work on weeknights. Structured bottles want a richer plate. Skip delicate fish.",
        howToChoose:
          "Look at vintage, winery and whether it is a single variety or a blend. To learn the grape, buy two dry single-variety bottles from different regions, roughly 40 to 90 RON. Below 30 RON, check Value Score. Above 120 RON, ask what you are paying for besides a heavier bottle.",
        facts: [
          { label: "Colour", value: "Red" },
          { label: "Origin", value: "Romania, indigenous" },
          { label: "Typical style", value: "Red-black fruit, lively acidity, variable tannin" },
          { label: "Common regions", value: "Moldova, Dealu Mare, Dobrogea" },
          { label: "At the table", value: "Sarmale, grill, stews" },
        ],
        faq: [
          {
            question: "Is Feteasca Neagra always full-bodied?",
            answer:
              "No. You will find light, fruity bottles and denser oaked ones. Region and winemaking matter more than the name.",
          },
          {
            question: "Is it the same as Feteasca Alba?",
            answer:
              "No. Feteasca Alba and Feteasca Regala are white grapes. Feteasca Neagra is red.",
          },
          {
            question: "What food works with it?",
            answer:
              "Fatty, seasoned dishes: sarmale, roast pork, grill. Young fruity wines can stand alone. Tannic wines need a plate.",
          },
        ],
        sources: [{ label: "VinIntel catalog notes and tasting guides" }],
      },
    },
  },
  {
    slug: "feteasca-alba",
    color: "white",
    isIndigenous: true,
    styleProfileId: "feteasca-alba",
    aliases: ["feteasca alba", "fetească albă"],
    relatedSlugs: ["feteasca-regala", "cramposie-selectionata", "sarba"],
    pairingDishSlugs: ["peste"],
    journalSlugs: [],
    copy: {
      ro: {
        name: "Feteasca Alba",
        alsoKnownAs: [],
        metaTitle: "Feteasca Alba: soi alb autohton, de la floral la sec",
        metaDescription:
          "Profilul Feteasca Alba in Romania: arome, regiuni, asociere cu peste si cum deosebesti o sticla buna de una plata.",
        answer:
          "Feteasca Alba e un alb autohton, de obicei floral si citric, cu aciditate medie spre buna. In stil sec, e vin de masa, nu de desert. Cand e cules tarziu sau lasat dulce, schimba registrul. Citeste eticheta inainte sa o pui langa peste la gratar.",
        intro:
          "Feteasca Alba e printre cele mai vechi albe romanesti inca plantate serios. Nu e Feteasca Regala. Nu e Tamaioasa. E mai discreta decat soiurile aromate si mai putin „de concurs” decat un Sauvignon strident. Puterea ei e claritatea, nu volumul aromatic.",
        inTheGlass:
          "Caută flori albe, mar verde, gutuie, uneori fân. Corpul e usor sau mediu. Daca pare apoasa, fie a fost supra-productie, fie a stat prea cald. O sticla buna ramane vie in pahar, nu se stinge dupa doua guri.",
        origin:
          "Soi romanesc, istoric in Transilvania si Moldova. A fost baza multor vinuri albe de volum in secolul XX. Azi merita cautat la crame care limiteaza randamentul, nu la etichete care promit „premium” fara originea strugurelui.",
        inRomania:
          "In zone mai reci ramane citric si floral. In zone calde poate capata corp si o nota de fruct copt, cu riscul sa piarda tensiunea. Merge si in cupaje, unde dispare usor daca partenerul e mai aromat. Pentru a o invata, alege monovarietal sec.",
        pairing:
          "Salate, peste alb, pastrav, branza proaspata, aperitive usoare. Nu e partenerul sarmalelor. Daca gatesti cu smantana, un Chardonnay sau o Feteasca Regala mai texturata poate tine mai bine.",
        howToChoose:
          "Sec, an recent, crama cu alburi de care ai mai auzit. Evita sticle fara vintage. Daca e demisec, trateaz-o ca aperitiv, nu ca vin de peste la sare si marar.",
        facts: [
          { label: "Culoare", value: "Alb" },
          { label: "Origine", value: "Romania" },
          { label: "Stil tipic", value: "Floral-citric, corp usor-mediu" },
          { label: "La masa", value: "Peste alb, aperitive, branza proaspata" },
        ],
        faq: [
          {
            question: "Feteasca Alba e aromata ca Tamaioasa?",
            answer:
              "Nu. E mai discreta. Daca vrei parfum de tei si muscat, Tamaioasa e alta conversatie.",
          },
          {
            question: "Poate fi dulce?",
            answer:
              "Da, daca producatorul o lasa cu zahar rezidual. Majoritatea sticlelor utile la masa sunt sec.",
          },
          {
            question: "Cu ce peste merge?",
            answer:
              "Peste alb la cuptor sau pastrav, cu ierburi, nu cu sosuri grele de smantana.",
          },
        ],
        sources: [{ label: "Ghid VinIntel de soiuri si pairing" }],
      },
      en: {
        name: "Feteasca Alba",
        alsoKnownAs: [],
        metaTitle: "Feteasca Alba: a quiet Romanian white",
        metaDescription:
          "How Feteasca Alba drinks in Romania, where it grows, and which food it actually suits.",
        answer:
          "Feteasca Alba is an indigenous white, usually floral and citrus, with moderate to bright acidity. Dry bottles are table wines. Late-harvest or off-dry bottles are a different job. Read the sweetness before you pair it with grilled fish.",
        intro:
          "This is one of Romania's older whites still taken seriously. It is not Feteasca Regala and not Tamaioasa. It wins on clarity, not perfume volume.",
        inTheGlass:
          "White flowers, green apple, quince, sometimes hay. Light to medium body. If it tastes watery, yields were probably too high or storage was warm. A good bottle stays alive after the second sip.",
        origin:
          "Romanian grape, historically in Transylvania and Moldova. It spent decades in bulk white wine. Today it is worth buying from growers who limit yield.",
        inRomania:
          "Cooler sites keep citrus and flower. Warmer sites add riper fruit and can lose tension. Blends can hide it. Learn it as a dry single variety first.",
        pairing:
          "Salads, white fish, trout, fresh cheese, light starters. Not sarmale. Creamy sauces may want a more textured white.",
        howToChoose:
          "Dry, recent vintage, a winery that already makes decent whites. Skip bottles with no vintage. Treat off-dry versions as aperitif wines.",
        facts: [
          { label: "Colour", value: "White" },
          { label: "Origin", value: "Romania" },
          { label: "Typical style", value: "Floral-citrus, light to medium body" },
          { label: "At the table", value: "White fish, starters, fresh cheese" },
        ],
        faq: [
          {
            question: "Is it as aromatic as Tamaioasa?",
            answer: "No. It is quieter. Tamaioasa is the muscat-lime register.",
          },
          {
            question: "Can it be sweet?",
            answer:
              "Yes, if the producer leaves residual sugar. Most useful table bottles are dry.",
          },
          {
            question: "What fish works?",
            answer: "White fish or trout with herbs, not heavy cream sauces.",
          },
        ],
        sources: [{ label: "VinIntel grape and pairing notes" }],
      },
    },
  },
  {
    slug: "feteasca-regala",
    color: "white",
    isIndigenous: true,
    styleProfileId: "feteasca-regala",
    aliases: ["feteasca regala", "fetească regală"],
    relatedSlugs: ["feteasca-alba", "sauvignon-blanc", "cramposie-selectionata"],
    pairingDishSlugs: ["peste"],
    journalSlugs: [],
    copy: {
      ro: {
        name: "Feteasca Regala",
        alsoKnownAs: [],
        metaTitle: "Feteasca Regala: alb transilvanean pentru masa de zi cu zi",
        metaDescription:
          "De unde vine Feteasca Regala, cum gusta si de ce e adesea cel mai util alb romanesc la pret rezonabil.",
        answer:
          "Feteasca Regala e un alb romanesc de masa: mar verde, flori, aciditate crocanta, corp mediu. E mai prezenta decat Feteasca Alba si mai putin parfumata decat Tamaioasa. In Transilvania si Moldova da sticle oneste intre 25 si 70 RON, daca producatorul nu o stoarce de randament.",
        intro:
          "A aparut in Transilvania la inceputul secolului XX, dintr-o incrucisare naturala in care intra Feteasca Alba. A devenit calul de tractiune al albului romanesc. Asta inseamna doua lucruri: o gasesti usor, si o gasesti si proasta. Soiul nu e problema. Productia de masa e.",
        inTheGlass:
          "Mar, citrice, flori de camp, uneori o nota de miere usoara chiar pe sec. Aciditatea e punctul ei. Daca e moale, a fost culeasa tarziu sau tinuta cald. Pe drojdii fine capata textura, fara sa devina Chardonnay de stejar.",
        origin:
          "Soi romanesc, omologat dupa descoperirea in podgoriile transilvane. Nu e „Regal” ca marketing francez. Numele tine de originile locale. E distinct de Feteasca Alba, chiar daca ruda.",
        inRomania:
          "Jidvei, Tarnave, Transilvania in general, apoi Moldova si alte podgorii. La supermarket e adesea corect, rar memorabil. La crame care o iau in serios, tine o cina cu peste sau o placinta cu branza fara sa ceara atentie.",
        pairing:
          "Peste, placinta cu branza, ciorbe usoare, aperitive, pasare cu sos delicat. Nu e pentru desertul foarte dulce. Un demisec poate tine o placinta, un sec tine sarea si mararul.",
        howToChoose:
          "Anul cel mai recent pe care il gasesti in stare buna. Evita sticle prafuite pe raftul de jos. Daca pretul e sub 20 RON, judec-o ca vin de saptamana, nu ca revelatie.",
        facts: [
          { label: "Culoare", value: "Alb" },
          { label: "Origine", value: "Transilvania, Romania" },
          { label: "Stil tipic", value: "Mar-citric, aciditate crocanta" },
          { label: "La masa", value: "Peste, placinta, aperitive" },
        ],
        faq: [
          {
            question: "De ce e atat de frecventa la raft?",
            answer:
              "Pentru ca e productiva si se vinde. Frecventa nu inseamna automat calitate. Alege crama, nu doar soiul.",
          },
          {
            question: "E mai buna decat Feteasca Alba?",
            answer:
              "E alt profil: de obicei mai prezenta in pahar. „Mai buna” depinde de sticla, nu de ierarhia numelui.",
          },
          {
            question: "Merge la ciorba?",
            answer:
              "Da, daca ciorba nu e extrem de acra. Un sec cu aciditate buna tine borșul mai bine decat un alb moale.",
          },
        ],
        sources: [{ label: "Ghid VinIntel de soiuri" }],
      },
      en: {
        name: "Feteasca Regala",
        alsoKnownAs: [],
        metaTitle: "Feteasca Regala: Transylvania's everyday white",
        metaDescription:
          "How Feteasca Regala drinks, why it fills Romanian shelves, and how to find a bottle that is more than filler.",
        answer:
          "Feteasca Regala is a Romanian table white: green apple, flowers, crunchy acidity, medium body. It is more present than Feteasca Alba and less perfumed than Tamaioasa. Honest bottles often sit between 25 and 70 RON when yields are kept in check.",
        intro:
          "It appeared in Transylvania in the early twentieth century, related to Feteasca Alba. It became the workhorse white of Romania. That means you will find it everywhere, including bad versions. Blame the factory, not the grape.",
        inTheGlass:
          "Apple, citrus, meadow flowers, sometimes a hint of honey even when dry. Acidity is the point. If it feels flabby, it was picked late or stored warm. Lees ageing can add texture without turning it into oaked Chardonnay.",
        origin:
          "Romanian grape, identified in Transylvanian vineyards. The name is local, not a French branding exercise. It is distinct from Feteasca Alba.",
        inRomania:
          "Tarnave, Jidvei country, then Moldova and beyond. Supermarket bottles are often correct and rarely memorable. Serious growers make a weeknight fish wine that does not ask for applause.",
        pairing:
          "Fish, cheese pie, lighter soups, starters, gently sauced poultry. Not a very sweet dessert. Off-dry can handle pie. Dry handles salt and dill.",
        howToChoose:
          "Newest sound vintage. Skip dusty bottom-shelf bottles. Under 20 RON, treat it as a weekday wine, not a revelation.",
        facts: [
          { label: "Colour", value: "White" },
          { label: "Origin", value: "Transylvania, Romania" },
          { label: "Typical style", value: "Apple-citrus, crunchy acidity" },
          { label: "At the table", value: "Fish, pie, starters" },
        ],
        faq: [
          {
            question: "Why is it on every shelf?",
            answer:
              "It is productive and familiar. Common is not the same as good. Choose the winery.",
          },
          {
            question: "Is it better than Feteasca Alba?",
            answer:
              "It is usually more present in the glass. Better depends on the bottle.",
          },
          {
            question: "Does it work with sour soup?",
            answer:
              "Yes, if the soup is not extreme. A dry, bright bottle holds borscht better than a soft white.",
          },
        ],
        sources: [{ label: "VinIntel grape guide" }],
      },
    },
  },
  {
    slug: "tamaioasa-romaneasca",
    color: "white",
    isIndigenous: true,
    styleProfileId: "tamaioasa-romaneasca",
    aliases: [
      "tamaioasa romaneasca",
      "tămâioasă românească",
      "tamaioasa",
      "tamaiosa romaneasca",
    ],
    relatedSlugs: ["muscat-ottonel", "busuioaca-de-bohotin", "grasa-de-cotnari"],
    pairingDishSlugs: ["cozonac"],
    journalSlugs: ["tamaioasa-romaneasca-vs-alte-arome-florale"],
    copy: {
      ro: {
        name: "Tamaioasa Romaneasca",
        alsoKnownAs: ["Tamaioasa"],
        metaTitle: "Tamaioasa Romaneasca: soi aromat, sec sau dulce",
        metaDescription:
          "Cum gusta Tamaioasa Romaneasca, cand e de masa si cand e de desert, plus confuziile cu Muscat Ottonel.",
        answer:
          "Tamaioasa Romaneasca e soiul aromat clasic al tarii: tei, busuioc, flori, strugure de masa. Poate fi sec, demisec sau dulce. Seca, e aperitiv sau partener pentru branza proaspata. Dulce, tine cozonacul. Nu o pune automat langa peste la gratar.",
        intro:
          "Lumea o iubeste sau o evita. Parfumul e mare. Daca vrei un alb „sa nu se simta”, nu e aici. Daca vrei identitate romaneasca in pahar, e unul dintre cele mai clare semnale. Are un articol separat pe VinIntel despre cum se deosebeste de alte florale.",
        inTheGlass:
          "Tei, flori de portocal, busuioc, strugure, uneori miere. Aciditatea decide daca e racoritoare sau siropoasa. O Tamaioasa seaca buna e parfumata, nu grea. O Tamaioasa dulce buna are acid sa tina zaharul.",
        origin:
          "Soi autohton din familia aromatica, cu istorie lunga in Moldova si nu numai. Nu e Muscat Ottonel, desi se intalnesc in aceeasi conversatie. Ottonel e alt strugure, adesea mai direct muscat.",
        inRomania:
          "Cotnari, Dealurile Moldovei, Dealu Mare, Dragasani, Banat. Stilul dulce de Cotnari e o scoala. Stilul sec modern e alta. Citeste eticheta. „Tamaioasa” fara mențiunea sec/demisec/dulce e o invitatiie la surprize.",
        pairing:
          "Seca: branza proaspata, aperitive, salate cu fructe, uneori peste foarte simplu. Dulce: cozonac, prajituri cu branza, fructe. Evita sarmalele si gratarul afumat.",
        howToChoose:
          "Decide intai daca vrei sec sau dulce. Apoi crama. Daca e prima ta sticla, un sec bun te invata parfumul fara sa te inece in zahar. Peste 80 RON la dulce, intreaba daca e vorba de concentratie reala sau de marketing.",
        facts: [
          { label: "Culoare", value: "Alb (aromat)" },
          { label: "Origine", value: "Romania" },
          { label: "Stil tipic", value: "Tei, flori, muscat, de la sec la dulce" },
          { label: "La masa", value: "Aperitiv, branza, cozonac daca e dulce" },
        ],
        faq: [
          {
            question: "Tamaioasa e totuna cu Muscat?",
            answer:
              "Nu. E in registru aromatic asemanator, dar e soi romanesc distinct. Muscat Ottonel e alt strugure.",
          },
          {
            question: "Pot sa o beau la peste?",
            answer:
              "Doar daca e seaca si pestele e simplu. La gratar condimentat, alege un alb mai neutru sau un roze sec.",
          },
          {
            question: "E potrivita la cozonac?",
            answer:
              "Da, in versiune dulce sau demidulce, cu aciditate. Un sec langa cozonac pare aspru.",
          },
        ],
        sources: [{ label: "Ghidul VinIntel Tamaioasa vs alte arome florale" }],
      },
      en: {
        name: "Tamaioasa Romaneasca",
        alsoKnownAs: ["Tamaioasa"],
        metaTitle: "Tamaioasa Romaneasca: Romania's aromatic white",
        metaDescription:
          "How Tamaioasa Romaneasca drinks dry or sweet, and how it differs from Muscat Ottonel.",
        answer:
          "Tamaioasa Romaneasca is Romania's classic aromatic white: linden, basil, flowers, grape. It can be dry, off-dry or sweet. Dry is an aperitif or a fresh-cheese wine. Sweet can hold cozonac. It is not the default fish wine.",
        intro:
          "People love it or dodge it. The perfume is loud. If you want a white that disappears, skip it. If you want a Romanian signal in the glass, this is one of the clearest.",
        inTheGlass:
          "Linden, orange blossom, basil, grape, sometimes honey. Acidity decides whether it is refreshing or syrupy. A good dry bottle is perfumed, not heavy. A good sweet bottle has acid to carry the sugar.",
        origin:
          "Indigenous aromatic grape, with a long history in Moldova and beyond. It is not Muscat Ottonel. Ottonel is another vine, often more bluntly muscat.",
        inRomania:
          "Cotnari, Moldavian hills, Dealu Mare, Dragasani, Banat. Sweet Cotnari is one school. Modern dry is another. Read sweetness on the label.",
        pairing:
          "Dry: fresh cheese, starters, fruit salads, very simple fish. Sweet: cozonac, cheesecake-style pastries, fruit. Skip sarmale and smoked grill.",
        howToChoose:
          "First choose dry or sweet, then the winery. A first bottle should be dry so you learn the perfume without drowning in sugar.",
        facts: [
          { label: "Colour", value: "White, aromatic" },
          { label: "Origin", value: "Romania" },
          { label: "Typical style", value: "Linden, flowers, muscat, dry to sweet" },
          { label: "At the table", value: "Aperitif, cheese, sweet pastry if sweet" },
        ],
        faq: [
          {
            question: "Is it the same as Muscat?",
            answer:
              "No. Similar aromatic family, different grape. Muscat Ottonel is another variety.",
          },
          {
            question: "Can I drink it with fish?",
            answer:
              "Only if it is dry and the fish is simple. For a seasoned grill, pick a quieter white or a dry rose.",
          },
          {
            question: "Does it work with cozonac?",
            answer:
              "Yes, when it is sweet or medium-sweet and has acidity. Dry Tamaioasa fights the cake.",
          },
        ],
        sources: [{ label: "VinIntel guide to Tamaioasa versus other florals" }],
      },
    },
  },
  {
    slug: "grasa-de-cotnari",
    color: "white",
    isIndigenous: true,
    styleProfileId: "grasa-de-cotnari",
    aliases: ["grasa de cotnari", "grasă de cotnari", "grasa"],
    relatedSlugs: ["tamaioasa-romaneasca", "feteasca-alba", "chardonnay"],
    pairingDishSlugs: ["cozonac"],
    journalSlugs: [],
    copy: {
      ro: {
        name: "Grasa de Cotnari",
        alsoKnownAs: ["Grasa"],
        metaTitle: "Grasa de Cotnari: soi nobil, de la sec la vin de desert",
        metaDescription:
          "Ce este Grasa de Cotnari, de ce e legata de Cotnari si cand merita o sticla dulce versus una seaca.",
        answer:
          "Grasa de Cotnari e un alb romanesc cu corp, extract si vocatie pentru dulce nobil, chiar daca exista si versiuni sec. In Cotnari, botrytis si culesul tarziu au facut legenda. Nu e un Sauvignon de vara. E un vin care cere context: branza, desert, seara lenta.",
        intro:
          "Numele spune locul. Nu inseamna ca orice sticla e lichior de patrimoniu. Unele Grasă de raft sunt doar albe semi-dulci. Altele, rare, au concentratie reala. Treaba ta e sa deosebesti marketingul de mustul cules tarziu.",
        inTheGlass:
          "Caisa, miere, nuca, uneori condiment dulce. Corpul e mai plin decat la Feteasca. Aciditatea trebuie sa tina totul. Fara ea, ramane greu. Cu ea, e vin de conversatie.",
        origin:
          "Soi legat de podgoria Cotnari si de traditia vinurilor dulci moldovenesti. Face parte din conversatia despre vin nobil romanesc, alaturi de Tamaioasa, nu din raftul de alb de picnic.",
        inRomania:
          "Cotnari ramane referinta. Alte crame o vinifica sec sau demisec, cu rezultate inegale. Daca scrie Cotnari pe eticheta, intreaba totusi anul, zaharul si daca e vorba de o linie de volum.",
        pairing:
          "Foie gras nu e masa romaneasca de saptamana. La noi: branza cu nuci, cozonac, prajituri cu branza, fructe coapte. Seca, poate tine un sos cremos. Dulce, nu o pune langa mici.",
        howToChoose:
          "Citeste zaharul si pretul. O Grasa „premium” la 25 RON e probabil doar dulce. Pentru stilul nobil, pretul si crama trebuie sa spuna o poveste coerenta, nu doar un nume istoric.",
        facts: [
          { label: "Culoare", value: "Alb" },
          { label: "Origine", value: "Cotnari, Moldova" },
          { label: "Stil tipic", value: "Corp plin, miere-caisa, adesea dulce" },
          { label: "La masa", value: "Desert, branza, cina lenta" },
        ],
        faq: [
          {
            question: "Toata Grasa e dulce?",
            answer:
              "Nu. Exista si sec. Traditia care a facut numele e insa legata de cules tarziu si de vinuri cu zahar.",
          },
          {
            question: "E acelasi lucru cu Tamaioasa?",
            answer:
              "Nu. Tamaioasa e mai floral-muscat. Grasa e mai grasa in textura, cu fruct copt si miere.",
          },
          {
            question: "Merita ca vin de cadou?",
            answer:
              "Da, daca alegi o sticla cu originea si stilul clare. O sticla vaga de supermarket e un cadou slab, oricat de istoric e numele.",
          },
        ],
        sources: [{ label: "Ghid VinIntel de soiuri nobile romanesti" }],
      },
      en: {
        name: "Grasa de Cotnari",
        alsoKnownAs: ["Grasa"],
        metaTitle: "Grasa de Cotnari: from dry white to dessert wine",
        metaDescription:
          "What Grasa de Cotnari is, why Cotnari matters, and when a sweet bottle is worth it.",
        answer:
          "Grasa de Cotnari is a fuller Romanian white with a vocation for noble sweetness, though dry versions exist. Late harvest and botrytis built the legend in Cotnari. It is not a summer Sauvignon. It wants cheese, dessert or a slow evening.",
        intro:
          "The name points to a place. It does not make every bottle historic. Some supermarket Grasă is just off-sweet white. A few bottles have real concentration. Your job is to tell them apart.",
        inTheGlass:
          "Apricot, honey, walnut, sometimes sweet spice. The body is richer than Feteasca. Acidity must hold it. Without acid it is heavy. With acid it becomes a conversation wine.",
        origin:
          "Tied to Cotnari and Moldavian sweet-wine tradition. It belongs with Tamaioasa in the noble-white conversation, not on the picnic-white shelf.",
        inRomania:
          "Cotnari is the reference. Other wineries make dry or off-dry versions, unevenly. A Cotnari mention on the label still needs vintage, sugar and whether it is a volume line.",
        pairing:
          "Cheese with walnuts, cozonac, baked fruit, creamy sauces if dry. Sweet Grasă next to grilled sausages is a mismatch.",
        howToChoose:
          "Read sugar and price. A 25 RON premium story is probably just sweet. Noble style needs a coherent winery and price, not only a historic name.",
        facts: [
          { label: "Colour", value: "White" },
          { label: "Origin", value: "Cotnari, Moldova" },
          { label: "Typical style", value: "Fuller body, honey-apricot, often sweet" },
          { label: "At the table", value: "Dessert, cheese, slow dinners" },
        ],
        faq: [
          {
            question: "Is all Grasă sweet?",
            answer:
              "No. Dry bottles exist. The fame, though, comes from late harvest and residual sugar.",
          },
          {
            question: "Is it Tamaioasa under another name?",
            answer:
              "No. Tamaioasa is more floral-muscat. Grasă is about texture, ripe fruit and honey.",
          },
          {
            question: "Is it a good gift?",
            answer:
              "Yes, if origin and style are clear. A vague supermarket bottle is a weak gift, however historic the name.",
          },
        ],
        sources: [{ label: "VinIntel notes on Romanian noble whites" }],
      },
    },
  },
  {
    slug: "cramposie-selectionata",
    color: "white",
    isIndigenous: true,
    styleProfileId: "cramposie",
    aliases: [
      "cramposie",
      "crâmpoșie",
      "cramposie selectionata",
      "crâmpoșie selecționată",
    ],
    relatedSlugs: ["feteasca-alba", "sauvignon-blanc", "sarba"],
    pairingDishSlugs: ["peste"],
    journalSlugs: [],
    copy: {
      ro: {
        name: "Cramposie Selectionata",
        alsoKnownAs: ["Cramposie"],
        metaTitle: "Cramposie Selectionata: alb din Dragasani, acid si viu",
        metaDescription:
          "Ce este Cramposia din Dragasani, cum gusta in pahar si cu ce peste sau aperitive merge.",
        answer:
          "Cramposie Selectionata e un alb oltenesc, mai ales din Dragasani: aciditate tăioasa, citrice, iarba, uneori silex. E vin de vara si de peste, nu de baric dulce. Daca vrei un autohton care nu miroase a muscat, incepe aici.",
        intro:
          "A fost recuperata si selectionata in Dragasani, unde crame ca Stirbey si Avincis au tratat-o ca identitate, nu ca curiositate. Nu o vei gasi in orice supermarket. Cand o gasesti, merita o masa simpla, nu un sos greu.",
        inTheGlass:
          "Lamâie, grapefruit, verdeata, sare. Corpul e usor. Finalul trebuie sa fie uscat si lung. Daca e amara si scurta, e o sticla slaba, nu „stilul soiului”.",
        origin:
          "Soi legat de Dragasani. Selectionata indica munca de clonă si de curatare a materialului, nu un truc de eticheta. E autohton oltenesc, nu un Sauvignon redenumit.",
        inRomania:
          "Dragasani e acasa. Alte zone o planteaza rar. Productia e mica. Asta e un avantaj: mai putine sticle de umplutura, dar si mai putine ocazii sa o compari.",
        pairing:
          "Peste de Dunare, pastrav, icre, salate, zacuscă usoara, branza de vaci. Evita tocanele si desertul.",
        howToChoose:
          "An recent, crama din Dragasani daca poti. Serveste rece, nu inghetat. E un vin de sticla intreaga la masa, nu de colectionat zece ani.",
        facts: [
          { label: "Culoare", value: "Alb" },
          { label: "Origine", value: "Dragasani, Oltenia" },
          { label: "Stil tipic", value: "Citrice, aciditate vie, corp usor" },
          { label: "La masa", value: "Peste, icre, aperitive sarate" },
        ],
        faq: [
          {
            question: "E la fel ca Sauvignon Blanc?",
            answer:
              "Se pot apropia pe zona citrica si verde. Cramposia e totusi un soi local, de obicei mai slaba in corp si mai putin „fructul pasiunii”.",
          },
          {
            question: "De ce e greu de gasit?",
            answer:
              "Suprafetele sunt mici si cramele o tin in volume reduse. Nu e un soi de supermarket national.",
          },
          {
            question: "Cu ce o bei vara?",
            answer:
              "Cu peste la gratar simplu, salata si o seara calda. Nu cu desert.",
          },
        ],
        sources: [{ label: "Ghid VinIntel Dragasani si soiuri autohtone" }],
      },
      en: {
        name: "Cramposie Selectionata",
        alsoKnownAs: ["Cramposie"],
        metaTitle: "Cramposie Selectionata: Dragasani's sharp white",
        metaDescription:
          "What Cramposie from Dragasani tastes like, and which fish and starters it actually suits.",
        answer:
          "Cramposie Selectionata is an Oltenian white, especially from Dragasani: cutting acidity, citrus, herbs, sometimes flint. It is a fish and summer wine, not a sweet oak project. If you want an indigenous white without muscat perfume, start here.",
        intro:
          "It was recovered and selected in Dragasani, where estates such as Stirbey and Avincis treated it as identity, not a curiosity. You will not find it in every supermarket. When you do, keep the food simple.",
        inTheGlass:
          "Lemon, grapefruit, greens, salt. Light body. The finish should be dry and long. Bitter and short is a weak bottle, not the grape's fate.",
        origin:
          "A Dragasani grape. Selectionata points to clonal work, not a label trick. It is local, not renamed Sauvignon.",
        inRomania:
          "Dragasani is home. Other regions plant it rarely. Small production means fewer filler bottles and fewer chances to compare.",
        pairing:
          "Danube fish, trout, roe, salads, light vegetable spread, fresh cow's cheese. Skip stews and dessert.",
        howToChoose:
          "Recent vintage, a Dragasani winery if you can. Serve cold, not frozen. Drink the bottle at the table. Do not cellar it for a decade.",
        facts: [
          { label: "Colour", value: "White" },
          { label: "Origin", value: "Dragasani, Oltenia" },
          { label: "Typical style", value: "Citrus, bright acid, light body" },
          { label: "At the table", value: "Fish, roe, salty starters" },
        ],
        faq: [
          {
            question: "Is it just Sauvignon Blanc?",
            answer:
              "They can overlap on citrus and greens. Cramposie is usually lighter and less passion-fruit loud.",
          },
          {
            question: "Why is it hard to find?",
            answer:
              "Plantings are small and wineries keep volumes modest. It is not a national supermarket grape.",
          },
          {
            question: "What should I eat with it in summer?",
            answer: "Simple grilled fish, salad, a hot evening. Not dessert.",
          },
        ],
        sources: [{ label: "VinIntel notes on Dragasani grapes" }],
      },
    },
  },
  {
    slug: "negru-de-dragasani",
    color: "red",
    isIndigenous: true,
    styleProfileId: "negru-de-dragasani",
    aliases: ["negru de dragasani", "negru de drăgășani"],
    relatedSlugs: ["novac", "feteasca-neagra", "syrah"],
    pairingDishSlugs: ["gratar", "friptura-de-porc"],
    journalSlugs: [],
    copy: {
      ro: {
        name: "Negru de Dragasani",
        alsoKnownAs: [],
        metaTitle: "Negru de Dragasani: rosu oltenesc, condiment si fruct negru",
        metaDescription:
          "Profilul Negru de Dragasani: originea din Oltenia, stil in pahar si cu ce carne merge.",
        answer:
          "Negru de Dragasani e un rosu autohton oltenesc, obtinut in secolul XX, cu fruct negru, piper si tanin mai ferm decat un Merlot bland. E vin de gratar si de iarna, nu de picnic. In Dragasani, cramele serioase il arata mai clar decat cupajele in care dispare.",
        intro:
          "Numele e geografic si corect. Nu e „negru” ca sinonim pentru orice rosu romanesc. E un soi anume, creat pentru zona, cu vocatie de structura. Daca vrei doar fruct dulce, vei zice ca e dur. Daca vrei carne, are sens.",
        inTheGlass:
          "Mure, prune, piper, uneori violete. Taninul e prezent. Aciditatea tine farfuria. Stejarul trebuie sa fie sprijin, nu desert de vanilie.",
        origin:
          "Soi romanesc de cercetare, legat de Dragasani, din crucea Negru vartos x Saperavi. E tanar pe scara istoriei viticole, dar deja identitar pentru Oltenia noua.",
        inRomania:
          "Dragasani ramane centrul. Alte podgorii il testeaza. Volumele sunt mici. Asta inseamna sticle uneven: de la expresii precise la extractie prea grea. Citeste crama, nu doar soiul.",
        pairing:
          "Porc la cuptor, vita la gratar, carne afumata, branza in varsta. Evita pestele si salatele.",
        howToChoose:
          "Monovarietal, an nu prea vechi daca nu stii crama. Sub 40 RON, fii precaut cu taninul verde. Peste 100 RON, cere echilibru, nu doar culoare inchisa.",
        facts: [
          { label: "Culoare", value: "Rosu" },
          { label: "Origine", value: "Dragasani, soi romanesc de cercetare" },
          { label: "Stil tipic", value: "Fruct negru, piper, tanin ferm" },
          { label: "La masa", value: "Gratar, friptura, iarna" },
        ],
        faq: [
          {
            question: "E mai greu decat Feteasca Neagra?",
            answer:
              "Adesea da, pe tanin si pe condiment. Nu e o regula absoluta. Depinde de extractie.",
          },
          {
            question: "Pot sa-l invechiesc?",
            answer:
              "Unele sticle da. Multe nu. Fara note de crama despre maturare, bea-l in 3-5 ani, nu in 15.",
          },
          {
            question: "Merge la sarmale?",
            answer:
              "Poate, daca taninul e copt. Un Feteasca Neagra mai blanda e adesea mai sigura la sarmale.",
          },
        ],
        sources: [{ label: "Ghid VinIntel Dragasani" }],
      },
      en: {
        name: "Negru de Dragasani",
        alsoKnownAs: [],
        metaTitle: "Negru de Dragasani: Oltenian red with spice",
        metaDescription:
          "How Negru de Dragasani drinks, where it comes from, and what meat it wants.",
        answer:
          "Negru de Dragasani is an Oltenian red created in the twentieth century: black fruit, pepper, firmer tannin than a soft Merlot. It is a grill and winter wine, not a picnic red. In Dragasani, serious estates show it more clearly than blends that swallow it.",
        intro:
          "The name is geographic and specific. It is not slang for any dark Romanian red. If you want only sweet fruit, it can feel tough. If you want meat, it makes sense.",
        inTheGlass:
          "Blackberry, plum, pepper, sometimes violet. Tannin is present. Acidity holds food. Oak should support, not pour vanilla dessert into the glass.",
        origin:
          "A Romanian breeding grape from Dragasani, Negru vartos crossed with Saperavi. Young in vine history, already part of new Oltenian identity.",
        inRomania:
          "Dragasani is the centre. Other regions trial it. Volumes are small, so quality swings. Read the winery.",
        pairing:
          "Roast pork, grilled beef, smoked meat, aged cheese. Skip fish and salad.",
        howToChoose:
          "Single variety, not too old if you do not know the estate. Under 40 RON, watch for green tannin. Over 100 RON, demand balance, not only dark colour.",
        facts: [
          { label: "Colour", value: "Red" },
          { label: "Origin", value: "Dragasani, Romanian breeding" },
          { label: "Typical style", value: "Black fruit, pepper, firm tannin" },
          { label: "At the table", value: "Grill, roast, winter plates" },
        ],
        faq: [
          {
            question: "Is it heavier than Feteasca Neagra?",
            answer:
              "Often on tannin and spice. Extraction still decides more than the name.",
          },
          {
            question: "Can I cellar it?",
            answer:
              "Some bottles yes. Many no. Without ageing notes from the winery, drink it within 3 to 5 years.",
          },
          {
            question: "Does it work with sarmale?",
            answer:
              "It can if tannin is ripe. A gentler Feteasca Neagra is often the safer match.",
          },
        ],
        sources: [{ label: "VinIntel Dragasani notes" }],
      },
    },
  },
  {
    slug: "novac",
    color: "red",
    isIndigenous: true,
    styleProfileId: "novac",
    aliases: ["novac"],
    relatedSlugs: ["negru-de-dragasani", "feteasca-neagra", "merlot"],
    pairingDishSlugs: ["gratar", "sarmale"],
    journalSlugs: [],
    copy: {
      ro: {
        name: "Novac",
        alsoKnownAs: [],
        metaTitle: "Novac: rosu din Dragasani, fruct suculent si piper",
        metaDescription:
          "Ce este soiul Novac, cum se deosebeste de Negru de Dragasani si cu ce il bei.",
        answer:
          "Novac e un rosu romanesc din aceeasi scoala de cercetare ca Negru de Dragasani, de obicei mai suculent, cu mure si piper, tanin mai putin auster. E un pod de la Feteasca prietenoasa spre rosii mai ferme. In Dragasani are cel mai mult sens.",
        intro:
          "Daca Negru de Dragasani e fratele mai serios, Novac e cel care intra mai usor in conversatie. Nu e un soi de supermarket national. Cand il gasesti, merita comparat in aceeasi seara cu un Merlot local, ca sa vezi diferenta de condiment.",
        inTheGlass:
          "Mure, cirese negre, piper, uneori o nota florala. Corpul e mediu. Taninul exista, dar nu trebuie sa usuce gura. Daca usuca, extractia a fost prea ambitioasa pentru strugurele din anul acela.",
        origin:
          "Soi romanesc de cercetare, Dragasani, din crucea Negru vartos x Saperavi, ca si Negru de Dragasani, dar cu o selectie diferita. Doua soiuri, nu doua etichete ale aceluiasi vin.",
        inRomania:
          "Oltenia, in special Dragasani. Productie mica. Unele crame il tin monovarietal tocmai ca sa se vada. Altele il topesc in cupaj. Pentru ghid, monovarietalul e lectia.",
        pairing:
          "Gratar, sarmale nu prea grase, tocanita, branza semi-matura. E mai iertator la masa decat un Cabernet tare.",
        howToChoose:
          "Cauta Dragasani pe eticheta. An recent, daca nu ai incredere in crama. Nu cumpara „Novac” doar pentru ca suna exotic. Cumpara daca crama are deja alburi sau rosii pe care le respecti.",
        facts: [
          { label: "Culoare", value: "Rosu" },
          { label: "Origine", value: "Dragasani" },
          { label: "Stil tipic", value: "Mure, piper, tanin mediu" },
          { label: "La masa", value: "Gratar, tocanite, sarmale" },
        ],
        faq: [
          {
            question: "Novac si Negru de Dragasani sunt acelasi soi?",
            answer:
              "Nu. Sunt rude de cercetare, cu profiluri diferite. Novac e de obicei mai suculent.",
          },
          {
            question: "E bun pentru incepatori?",
            answer:
              "Da, mai mult decat un Cabernet extractiv. Totusi, nu e un roze. Asteapta-te la tanin.",
          },
          {
            question: "Il gasesc la pret mic?",
            answer:
              "Rareori ca oferta de masa. Volumele sunt mici. Pretul reflecta raritatea, nu automat calitatea.",
          },
        ],
        sources: [{ label: "Ghid VinIntel Dragasani" }],
      },
      en: {
        name: "Novac",
        alsoKnownAs: [],
        metaTitle: "Novac: juicy Dragasani red with pepper",
        metaDescription:
          "What Novac is, how it differs from Negru de Dragasani, and what to eat with it.",
        answer:
          "Novac is a Romanian red from the same breeding school as Negru de Dragasani, usually juicier, with blackberry and pepper, and less austere tannin. It sits between friendly Feteasca and firmer reds. Dragasani is where it makes the most sense.",
        intro:
          "If Negru de Dragasani is the stern sibling, Novac enters the conversation more easily. It is not a national supermarket grape. When you find it, compare it with a local Merlot in the same night.",
        inTheGlass:
          "Blackberry, black cherry, pepper, sometimes a floral note. Medium body. Tannin should not dry the mouth. If it does, extraction overshot the vintage.",
        origin:
          "Romanian breeding grape from Dragasani, same Negru vartos x Saperavi family as Negru de Dragasani, different selection. Two grapes, not two labels.",
        inRomania:
          "Oltenia, especially Dragasani. Small production. Some estates bottle it alone on purpose. Blends hide the lesson.",
        pairing:
          "Grill, not-too-fatty sarmale, stew, semi-aged cheese. More forgiving at the table than a hard Cabernet.",
        howToChoose:
          "Look for Dragasani. Recent vintage if you do not trust the estate. Do not buy it only because the name sounds rare.",
        facts: [
          { label: "Colour", value: "Red" },
          { label: "Origin", value: "Dragasani" },
          { label: "Typical style", value: "Blackberry, pepper, medium tannin" },
          { label: "At the table", value: "Grill, stews, sarmale" },
        ],
        faq: [
          {
            question: "Are Novac and Negru de Dragasani the same grape?",
            answer:
              "No. Related breeding, different profiles. Novac is usually juicier.",
          },
          {
            question: "Is it good for beginners?",
            answer:
              "More than an extracted Cabernet. It is still a red with tannin, not a rose.",
          },
          {
            question: "Is it cheap?",
            answer:
              "Rarely. Volumes are small. Price tracks rarity more than a guarantee of quality.",
          },
        ],
        sources: [{ label: "VinIntel Dragasani notes" }],
      },
    },
  },
  {
    slug: "busuioaca-de-bohotin",
    color: "rose",
    isIndigenous: true,
    styleProfileId: "busuioaca",
    aliases: [
      "busuioaca",
      "busuioacă",
      "busuioaca de bohotin",
      "busuioacă de bohotin",
    ],
    relatedSlugs: ["tamaioasa-romaneasca", "muscat-ottonel", "pinot-noir"],
    pairingDishSlugs: ["cozonac"],
    journalSlugs: [],
    copy: {
      ro: {
        name: "Busuioaca de Bohotin",
        alsoKnownAs: ["Busuioaca"],
        metaTitle: "Busuioaca de Bohotin: roze aromat romanesc",
        metaDescription:
          "Ce este Busuioaca de Bohotin, de ce e parfumata si cand o bei ca aperitiv, nu ca vin de gratar.",
        answer:
          "Busuioaca de Bohotin e un soi romanesc, de obicei roze sau alb aromat, cu trandafir, busuioc si strugure. E aperitiv si vin de terasa, uneori demidulce. Nu e un roze de Provence uscat si sarat. Daca vrei doar capsuni seci, vei fi surprins de parfum.",
        intro:
          "Numele spune satul Bohotin, in Moldova. Soiul e local, nu un Pinot Noir fardat. Puterea lui e aroma. Slăbiciunea lui, in sticle slabe, e zaharul care acopera totul. O Busuioaca buna miroase a flori, nu a sirop.",
        inTheGlass:
          "Trandafir, busuioc, zmeura, strugure. Corpul e usor sau mediu. Dulceata variaza. Aciditatea trebuie sa fie acolo, altfel ramane parfum de sapun ieftin. Nu e insulta la soi. E critica la vinificatie.",
        origin:
          "Soi autohton din Moldova, legat de zona Iasi / Bohotin. Face parte din familia aromatica romaneasca, alaturi de Tamaioasa, dar cu o vocatie de roze mai clara.",
        inRomania:
          "Moldova ramane referinta. Alte crame o vinifica in volume mici. Etichetele oscileaza intre sec gastronomic si demidulce de petrecere. Citeste zaharul.",
        pairing:
          "Aperitiv, branza proaspata, fructe, deserturi usoare daca e dulce. La gratar afumat pierde. Un peste simplu poate tine o versiune seaca, nu una zaharoasa.",
        howToChoose:
          "Daca vrei masa, cauta sec sau demisec cu aciditate. Daca vrei terasa si convorbire, demisec e legitim. Nu cumpara prima sticla doar pentru ca e „unica in lume”. Cumpara pentru ca miroase curat.",
        facts: [
          { label: "Culoare", value: "Roze (uneori alb)" },
          { label: "Origine", value: "Bohotin, Moldova" },
          { label: "Stil tipic", value: "Trandafir, busuioc, adesea usor dulce" },
          { label: "La masa", value: "Aperitiv, branza, desert usor" },
        ],
        faq: [
          {
            question: "Busuioaca e totuna cu Tamaioasa?",
            answer:
              "Nu. Ambele sunt aromate. Busuioaca e mai des roze si mai „trandafir”. Tamaioasa e alb de tei si muscat.",
          },
          {
            question: "E un roze sec?",
            answer:
              "Poate fi. Multe sticle nu sunt. Verifica sec/demisec pe eticheta, nu culoarea.",
          },
          {
            question: "Merge la nunta?",
            answer:
              "Da, ca aperitiv, daca nu e clisos dulce. Pentru felul principal, alege dupa meniu, nu dupa exotism.",
          },
        ],
        sources: [{ label: "Ghid VinIntel de soiuri aromate" }],
      },
      en: {
        name: "Busuioaca de Bohotin",
        alsoKnownAs: ["Busuioaca"],
        metaTitle: "Busuioaca de Bohotin: Romania's aromatic rose",
        metaDescription:
          "What Busuioaca de Bohotin smells like, when it is an aperitif, and when sugar gets in the way.",
        answer:
          "Busuioaca de Bohotin is a Romanian grape, usually an aromatic rose (sometimes white), with rose petal, basil and grape. It is a terrace and aperitif wine, sometimes off-dry. It is not a salty Provençal rose. If you want only dry strawberry, the perfume will surprise you.",
        intro:
          "The name points to Bohotin in Moldova. This is a local grape, not dressed-up Pinot Noir. Aroma is the point. In weak bottles, sugar smothers everything. A good one smells of flowers, not syrup.",
        inTheGlass:
          "Rose, basil, raspberry, grape. Light to medium body. Sweetness varies. Acidity must be there, or it turns into cheap soap perfume. That is winemaking, not destiny.",
        origin:
          "Indigenous Moldavian grape from the Iasi / Bohotin area. It sits in Romania's aromatic family next to Tamaioasa, with a clearer rose vocation.",
        inRomania:
          "Moldova is the reference. Other wineries make small lots. Labels swing from gastronomic dry to party off-dry. Read the sugar.",
        pairing:
          "Aperitif, fresh cheese, fruit, light desserts if sweet. Smoked grill flattens it. Simple fish can hold a dry version, not a sugary one.",
        howToChoose:
          "For food, seek dry or off-dry with acidity. For a terrace chat, off-dry is legitimate. Do not buy the first bottle only because it is rare.",
        facts: [
          { label: "Colour", value: "Rose, sometimes white" },
          { label: "Origin", value: "Bohotin, Moldova" },
          { label: "Typical style", value: "Rose petal, basil, often off-dry" },
          { label: "At the table", value: "Aperitif, cheese, light dessert" },
        ],
        faq: [
          {
            question: "Is it the same as Tamaioasa?",
            answer:
              "No. Both are aromatic. Busuioaca is more often rose and more rose-petal. Tamaioasa is a linden-muscat white.",
          },
          {
            question: "Is it a dry rose?",
            answer:
              "It can be. Many bottles are not. Read dryness on the label, not the colour.",
          },
          {
            question: "Is it a wedding wine?",
            answer:
              "As an aperitif, yes, if it is not cloying. For the main course, follow the menu, not the novelty.",
          },
        ],
        sources: [{ label: "VinIntel notes on aromatic Romanian grapes" }],
      },
    },
  },
  {
    slug: "cadarca",
    color: "red",
    isIndigenous: true,
    styleProfileId: "cadarca",
    aliases: ["cadarca", "cadarcă", "kadarka"],
    relatedSlugs: ["feteasca-neagra", "pinot-noir", "babeasca-neagra"],
    pairingDishSlugs: ["sarmale", "friptura-de-porc"],
    journalSlugs: [],
    copy: {
      ro: {
        name: "Cadarca",
        alsoKnownAs: ["Kadarka"],
        metaTitle: "Cadarca: rosu de Minis, intre fruct si piper",
        metaDescription:
          "Cadarca in Banat si Minis: istorie, stil in pahar si cum o deosebesti de un Pinot Noir sau o Feteasca.",
        answer:
          "Cadarca, cunoscuta si ca Kadarka in bazinul carpatic, e un rosu de corp mediu, cu fruct rosu, piper si tanin mai fin decat Cabernetul. In Minis-Maderat capata o nota de piatra si condiment. E vin de masa, nu de musculatura. Balla Geza si alte crame banatene o tin in viata pe terase.",
        intro:
          "E un soi cu pasaport mai larg decat granita. In Romania, povestea ei e banateana. Daca o judeci ca pe un Syrah de 15%, vei zice ca e slaba. Daca o judeci ca pe un rosu de farfurie, are logica.",
        inTheGlass:
          "Visina, paprika, piper, uneori fum usor. Corpul e mediu. Taninul nu trebuie sa fie dur. Daca e verde, strugurele n-a fost copt, nu „e stilul Cadarca”.",
        origin:
          "Kadarka e raspandita in Ungaria si in fostul spatiu austro-ungar. In Romania, Minis e locul unde merita cautata. Nu e un soi inventat ieri, nici un trend de eticheta.",
        inRomania:
          "Minis-Maderat, Banat, uneori alte enclave. Terasele de piatra dau vinuri mai minerale. Campia da vinuri mai moi. Cupajele o pot pierde langa Cabernet. Monovarietalul e lectia.",
        pairing:
          "Sarmale, tocane, porc, papricas, branza de munte. Un gratar foarte afumat o poate acoperi. Atunci ia un Negru de Dragasani sau un Syrah.",
        howToChoose:
          "Cauta Minis sau Banat pe eticheta. Evita sticle fara an. Daca pretul e de Cabernet premium, cere densitate reala, nu doar povestea terasei.",
        facts: [
          { label: "Culoare", value: "Rosu" },
          { label: "Origine", value: "Bazin carpatic; in RO, Minis" },
          { label: "Stil tipic", value: "Fruct rosu, piper, corp mediu" },
          { label: "La masa", value: "Sarmale, tocanite, porc" },
        ],
        faq: [
          {
            question: "Cadarca e soi romanesc?",
            answer:
              "E un soi al zonei, cu identitate puternica in Minis. Kadarka exista si peste granita. In ghidul nostru o tratam ca parte a viticulturii romanesti de Banat.",
          },
          {
            question: "Se compara cu Pinot Noir?",
            answer:
              "Pe corp, uneori. Cadarca are adesea mai mult piper si paprika. Nu e un Pinot de Burgundia cu alt nume.",
          },
          {
            question: "E buna de invechit?",
            answer:
              "Unele terase da. Multe sticle sunt de baut in 4-6 ani. Fara dovada de crama, nu o cumpara ca investitie.",
          },
        ],
        sources: [{ label: "Ghid VinIntel Minis si soiuri de Banat" }],
      },
      en: {
        name: "Cadarca",
        alsoKnownAs: ["Kadarka"],
        metaTitle: "Cadarca: Minis red with fruit and pepper",
        metaDescription:
          "Cadarca in Banat and Minis: how it drinks, and how it differs from Pinot Noir or Feteasca Neagra.",
        answer:
          "Cadarca, also called Kadarka in the Carpathian basin, is a medium-bodied red with red fruit, pepper and finer tannin than Cabernet. In Minis-Maderat it can pick up stone and spice. It is a food wine, not a muscle wine. Banat estates still farm it on terraces.",
        intro:
          "The grape has a wider passport than one border. In Romania the story is Banat. If you judge it like a 15% Syrah, it will feel slight. If you judge it as a table red, it has logic.",
        inTheGlass:
          "Sour cherry, paprika, pepper, sometimes light smoke. Medium body. Tannin should not be harsh. Green tannin means unripe fruit, not Cadarca style.",
        origin:
          "Kadarka is planted in Hungary and the old Austro-Hungarian lands. In Romania, Minis is where it is worth hunting. It is neither a new invention nor a label fad.",
        inRomania:
          "Minis-Maderat, Banat, occasional enclaves. Stone terraces give more mineral wines. Flatter sites give softer ones. Blends can lose it next to Cabernet.",
        pairing:
          "Sarmale, stews, pork, paprika dishes, mountain cheese. A very smoky grill can bury it. Then pick a firmer red.",
        howToChoose:
          "Look for Minis or Banat. Skip bottles with no vintage. If the price is premium Cabernet money, demand real density, not only terrace folklore.",
        facts: [
          { label: "Colour", value: "Red" },
          { label: "Origin", value: "Carpathian basin; in Romania, Minis" },
          { label: "Typical style", value: "Red fruit, pepper, medium body" },
          { label: "At the table", value: "Sarmale, stews, pork" },
        ],
        faq: [
          {
            question: "Is Cadarca a Romanian grape?",
            answer:
              "It is a regional grape with a strong Minis identity. Kadarka also grows across the border. We treat it as part of Banat's Romanian viticulture.",
          },
          {
            question: "Is it like Pinot Noir?",
            answer:
              "Sometimes in body. Cadarca often has more pepper and paprika. It is not Burgundy Pinot with another name.",
          },
          {
            question: "Does it age?",
            answer:
              "Some terrace wines do. Many bottles are for 4 to 6 years. Without estate evidence, do not buy it as an investment.",
          },
        ],
        sources: [{ label: "VinIntel notes on Minis and Banat grapes" }],
      },
    },
  },
  {
    slug: "sarba",
    color: "white",
    isIndigenous: true,
    styleProfileId: "sarba",
    aliases: ["sarba", "șarbă", "sarbă"],
    relatedSlugs: [
      "feteasca-regala",
      "tamaioasa-romaneasca",
      "riesling-italian",
      "muscat-ottonel",
    ],
    pairingDishSlugs: ["peste"],
    journalSlugs: [],
    copy: {
      ro: {
        name: "Sarba",
        alsoKnownAs: ["Șarba"],
        metaTitle: "Sarba: soiul din Vrancea, de la cercetare la pahar",
        metaDescription:
          "Originea soiului Sarba la Odobesti, stilul semi-aromat si cu ce il bei. Ghid VinIntel, nu un articol copiat.",
        answer:
          "Sarba e un soi alb romanesc creat la statiunea de la Odobesti si omologat in 1972, cu numele dealului Sarba. E semi-aromat: flori, citrice, uneori un muscat discret. Traieste aproape doar in Romania, mai ales in Vrancea. E vin de peste si de aperitiv, nu de baric greu.",
        intro:
          "In anii 90 a fost tratata adesea ca alb de volum. Crame din Vrancea, Girboiu intre ele, au aratat ca merita vinificatie atenta, inclusiv pe drojdii. Nu trebuie sa o mitizezi. Trebuie sa o bei alaturi de un Riesling italian si o Tamaioasa, ca sa intelegi unde sta: intre prospetime si parfum, nu in capatul niciuneia.",
        inTheGlass:
          "Flori albe, mar, citrice, uneori trandafir foarte discret. Corpul e usor sau mediu. Aciditatea tine vinul treaz. Daca pare apos, randamentul a fost prea mare. Daca pare a Muscat, fie e un clone mai aromatic, fie e un cupaj nedeclarat. Cere eticheta clara.",
        origin:
          "A fost obtinuta la Statiunea de Cercetare de la Odobesti, din seminte de Riesling italian cu polenizare libera, si a purtat un timp numele de lucru Riesling aromat. Analize moleculare ulterioare au aratat o relatie clara cu Riesling italian si cu Muscat de Hamburg, de unde muscatul din strugure. Este inregistrata in VIVC. Nu e un soi medieval redescoperit. E un soi de cercetare romaneasca din a doua jumatate a secolului XX.",
        inRomania:
          "Vrancea tine cea mai mare parte a plantatiilor, cu Odobesti, Panciu, Cotesti. Apare si in alte DOC-uri moldovene, in suprafete mici. Nu e un soi de export de masa. Daca il gasesti, e aproape sigur romanesc. Asta e rar si util.",
        pairing:
          "Peste alb, pastrav, salate, branza proaspata, aperitive, mamaliga cu branza daca vinul are textura de drojdie. Evita sarmalele. Un baric discret poate tine o tocanita de legume, nu o friptura.",
        howToChoose:
          "Cauta Vrancea sau Odobesti. An recent. Sec, daca vrei masa. Daca catalogul VinIntel are sticle, le vezi mai jos cu pret in RON. Daca nu, intreaba somelierul, nu cumpara prima eticheta doar pentru ca articolul de pe alt site a laudat clonele.",
        facts: [
          { label: "Culoare", value: "Alb semi-aromat" },
          { label: "Origine", value: "SCDVV Odobesti, omologat in 1972" },
          { label: "VIVC", value: "10738" },
          { label: "Zone", value: "Vrancea, Odobesti, Panciu, Cotesti" },
          { label: "La masa", value: "Peste, aperitive, branza proaspata" },
        ],
        faq: [
          {
            question: "Sarba e un soi vechi autohton?",
            answer:
              "E romanesc, dar nu e un soi ancestral. E creat in cercetarea de la Odobesti si omologat in 1972. Autohton in uz, nu mit fondator.",
          },
          {
            question: "De ce miroase uneori a muscat?",
            answer:
              "Pentru ca genealogia include o linie de Muscat, confirmata genetic, pe langa Riesling italian. Intensitatea variaza dupa clone si cules.",
          },
          {
            question: "Cu ce o mananci?",
            answer:
              "Cu peste, aperitive si branza proaspata. Nu cu un gratar afumat. Daca e pe drojdii, tine si o mamaliga cu branza.",
          },
        ],
        sources: [
          {
            label: "VIVC passport 10738",
            href: "https://www.vivc.de/",
          },
          {
            label:
              "Antoce, Stroe, Cojocaru, Agriculture and Agricultural Science Procedia, 2015 (nas electronic, parentaj Sarba)",
          },
          {
            label:
              "Lacombe et al., Theoretical and Applied Genetics, 2013 (analiza de parentaj la vita de vie)",
          },
        ],
      },
      en: {
        name: "Sarba",
        alsoKnownAs: ["Șarba"],
        metaTitle: "Sarba: the Vrancea white from 1972 research",
        metaDescription:
          "Where Sarba comes from, why it can smell lightly of muscat, and what to eat with it in Romania.",
        answer:
          "Sarba is a Romanian white bred at the Odobesti research station and registered in 1972, named after Dealul Sarba. It is semi-aromatic: flowers, citrus, sometimes a quiet muscat note. It is grown almost only in Romania, mainly Vrancea. Drink it with fish and starters, not with heavy oak.",
        intro:
          "In the 1990s it was often a bulk white. Vrancea estates, Girboiu among them, showed that careful winemaking, including lees work, is worth it. Do not mythologise it. Taste it next to Welschriesling and Tamaioasa to see the middle ground: freshness plus a little perfume.",
        inTheGlass:
          "White flowers, apple, citrus, sometimes a very discreet rose. Light to medium body. Acidity should keep it awake. Watery means overcropping. Loud muscat may be a more aromatic clone or an undeclared blend. Ask for a clear label.",
        origin:
          "It was raised at SCDVV Odobesti from open-pollinated Welschriesling (Riesling italian) seed, under the working name Riesling aromat. Later molecular work pointed to Welschriesling and Muscat Hamburg in its background, which explains the muscat in the grape. It is in VIVC. This is twentieth-century Romanian breeding, not a medieval revival.",
        inRomania:
          "Vrancea holds most plantings: Odobesti, Panciu, Cotesti. A few other Moldavian DOCs have tiny areas. If you find a bottle, it is almost certainly Romanian. That is rare and useful.",
        pairing:
          "White fish, trout, salads, fresh cheese, starters, polenta with cheese if the wine has lees texture. Skip sarmale. Discreet oak can hold a vegetable stew, not a steak.",
        howToChoose:
          "Look for Vrancea or Odobesti. Recent vintage. Dry for the table. If VinIntel has bottles, they appear below with prices in RON. If not, ask the sommelier. Do not buy the first label because another site listed clones.",
        facts: [
          { label: "Colour", value: "Semi-aromatic white" },
          { label: "Origin", value: "SCDVV Odobesti, registered 1972" },
          { label: "VIVC", value: "10738" },
          { label: "Regions", value: "Vrancea, Odobesti, Panciu, Cotesti" },
          { label: "At the table", value: "Fish, starters, fresh cheese" },
        ],
        faq: [
          {
            question: "Is Sarba an ancient indigenous grape?",
            answer:
              "It is Romanian, but not ancestral. It was bred in Odobesti and registered in 1972. Indigenous in use, not a foundation myth.",
          },
          {
            question: "Why does it sometimes smell of muscat?",
            answer:
              "Because its background includes a muscat line, shown in genetic work, plus Welschriesling. Intensity depends on clone and picking.",
          },
          {
            question: "What should I eat with it?",
            answer:
              "Fish, starters and fresh cheese. Not a smoked grill. Lees-aged bottles can hold polenta with cheese.",
          },
        ],
        sources: [
          { label: "VIVC passport 10738", href: "https://www.vivc.de/" },
          {
            label:
              "Antoce, Stroe, Cojocaru, Agriculture and Agricultural Science Procedia, 2015",
          },
          {
            label:
              "Lacombe et al., Theoretical and Applied Genetics, 2013",
          },
        ],
      },
    },
  },
  {
    slug: "babeasca-neagra",
    color: "red",
    isIndigenous: true,
    styleProfileId: "babeasca-neagra",
    aliases: [
      "babeasca neagra",
      "băbească neagră",
      "babeasca",
      "rara neagra",
      "rara neagră",
    ],
    relatedSlugs: ["feteasca-neagra", "cadarca", "pinot-noir"],
    pairingDishSlugs: ["sarmale", "gratar"],
    journalSlugs: [],
    copy: {
      ro: {
        name: "Babeasca Neagra",
        alsoKnownAs: ["Rara Neagra"],
        metaTitle: "Babeasca Neagra: rosu usor, acid, din Moldova",
        metaDescription:
          "Babeasca Neagra sau Rara Neagra: de ce e mai usoara decat Feteasca, unde se cultiva si cu ce o bei.",
        answer:
          "Babeasca Neagra, numita Rara Neagra in Basarabia, e un rosu autohton de corp usor spre mediu, cu visina, aciditate ridicata si tanin discret. E mai aproape de un Pinot de tara decat de un Cabernet. In Nicoresti si in Moldova are cel mai mult sens. Nu cere baric greu.",
        intro:
          "A fost soiul de sange al multor sate. Azi e mai rara pe raft decat Feteasca Neagra, tocmai pentru ca da mai putin spectacol de culoare. Daca vrei un rosu de vara sau de rata, nu un monument, e o pista buna.",
        inTheGlass:
          "Visina, merisoare, ierburi. Culoarea poate fi mai deschisa. Lumea o judeca gresit dupa asta. Aciditatea e calitatea, nu defectul. Taninul trebuie sa fie fin. Daca e aspru, e vinificatie slaba.",
        origin:
          "Soi vechi din estul Romaniei si din Basarabia. Rara Neagra e acelasi grup, cu nuante de denumire peste Prut. Nu e o Feteasca Neagra rebranduita.",
        inRomania:
          "Nicoresti e referinta clasica. Apare si in alte colturi de Moldova. Suprafetele au scazut. Sticlele bune sunt putine. Asta nu le face automat scumpe si bune. Le face usor de ratat.",
        pairing:
          "Rata, sarmale nu foarte grase, pui la cuptor, ciuperci, branza de medie. Un gratar de vita groasa o acopera. Atunci ia Feteasca sau Cabernet.",
        howToChoose:
          "Monovarietal, an nu prea vechi. Evita extractiile care vor sa o transforme in rosu inchis de concurs. Soiul nu e construit pentru asta.",
        facts: [
          { label: "Culoare", value: "Rosu deschis-mediu" },
          { label: "Origine", value: "Moldova / estul Romaniei" },
          { label: "Stil tipic", value: "Visina, aciditate, tanin fin" },
          { label: "La masa", value: "Rata, sarmale, pui, ciuperci" },
        ],
        faq: [
          {
            question: "Babeasca si Rara Neagra sunt acelasi soi?",
            answer:
              "Sunt acelasi grup de vita, cu nume diferite in Romania si in Basarabia. In pahar, cauta acelasi profil usor-acid.",
          },
          {
            question: "De ce e mai deschisa la culoare?",
            answer:
              "Asa e strugurele. Culoarea nu e nota de examen. Aciditatea si fructul sunt.",
          },
          {
            question: "E buna racita?",
            answer:
              "Usor racita, da, mai ales vara. Nu o transforma in roze. 14-16 grade, nu 6.",
          },
        ],
        sources: [{ label: "Ghid VinIntel de rosii autohtone usoare" }],
      },
      en: {
        name: "Babeasca Neagra",
        alsoKnownAs: ["Rara Neagra"],
        metaTitle: "Babeasca Neagra: a lighter Moldavian red",
        metaDescription:
          "Babeasca Neagra, also called Rara Neagra: why it is lighter than Feteasca, and what food it wants.",
        answer:
          "Babeasca Neagra, known as Rara Neagra in Bessarabia, is an indigenous red of light to medium body, with sour cherry, high acidity and discreet tannin. It sits closer to a country Pinot than to Cabernet. Nicoresti and Moldova are home. It does not want heavy oak.",
        intro:
          "It was a village blood grape. Today it is rarer on the shelf than Feteasca Neagra because it puts on less colour theatre. If you want a summer red or a duck wine, not a monument, it is a good lead.",
        inTheGlass:
          "Sour cherry, cranberry, herbs. Colour can be paler. People misjudge that. Acidity is the quality, not a flaw. Tannin should be fine. Harsh tannin is bad winemaking.",
        origin:
          "An old grape of eastern Romania and Bessarabia. Rara Neagra is the same family with a different name across the Prut. It is not rebranded Feteasca Neagra.",
        inRomania:
          "Nicoresti is the classic reference. Other Moldavian corners still grow it. Plantings shrank. Good bottles are few. That does not make them automatically expensive and good. It makes them easy to miss.",
        pairing:
          "Duck, not-too-fatty sarmale, roast chicken, mushrooms, medium cheese. A thick beef grill will bury it.",
        howToChoose:
          "Single variety, not too old. Avoid extractions that try to turn it into a dark competition red. The grape is not built for that.",
        facts: [
          { label: "Colour", value: "Light to medium red" },
          { label: "Origin", value: "Moldova / eastern Romania" },
          { label: "Typical style", value: "Sour cherry, acidity, fine tannin" },
          { label: "At the table", value: "Duck, sarmale, chicken, mushrooms" },
        ],
        faq: [
          {
            question: "Are Babeasca and Rara Neagra the same grape?",
            answer:
              "They are the same vine group with different names in Romania and Bessarabia. In the glass, look for the same light-acid profile.",
          },
          {
            question: "Why is the colour paler?",
            answer:
              "That is the grape. Colour is not an exam mark. Acidity and fruit are.",
          },
          {
            question: "Should I chill it?",
            answer:
              "Slightly, yes, especially in summer. Do not turn it into rose. About 14 to 16C, not 6C.",
          },
        ],
        sources: [{ label: "VinIntel notes on lighter indigenous reds" }],
      },
    },
  },
  {
    slug: "mustoasa-de-maderat",
    color: "white",
    isIndigenous: true,
    styleProfileId: "mustoasa",
    aliases: [
      "mustoasa",
      "mustoasă",
      "mustoasa de maderat",
      "mustoasă de măderat",
    ],
    relatedSlugs: ["cramposie-selectionata", "cadarca", "feteasca-regala"],
    pairingDishSlugs: ["peste"],
    journalSlugs: [],
    copy: {
      ro: {
        name: "Mustoasa de Maderat",
        alsoKnownAs: ["Mustoasa", "Mustoasa de Maderat"],
        metaTitle: "Mustoasa de Maderat: ghidul unui alb de Minis cu aciditate",
        metaDescription:
          "Mustoasa de Maderat, soiul alb al Minisului: stil, profil de degustare, regiune, logica asocierilor si cum alegi o sticla.",
        answer:
          "Mustoasa de Maderat este un alb autohton din zona Minis-Maderat, Arad, construit in jurul aciditatii si al texturii, nu al dulcetii. Exemplele reusite sunt uscate, citrice, cu fruct alb si o salinitate discreta; corpul ramane suplu. Este un vin de masa cu tensiune, nu un alb aromat si nici un desert.",
        intro:
          "Putine soiuri romanesti cer atat de clar o decizie de stil. Mustoasa nu castiga prin aroma spectaculoasa sau prin lemn, ci prin tensiunea dintre aciditate, extract si un fruct care nu trebuie lasat sa devina obosit. O sticla buna nu ascunde acidul sub zahar, ci il aseaza in centrul vinului. De aceea, cand este facuta cu intentie, pare mai putin o curiozitate de catalog si mai mult un vin de masa foarte precis.",
        inTheGlass:
          "Intr-un exemplu puternic, nasul sta aproape de coaja de lamie, mar verde, piersica alba si ierburi de gradina; uneori apare o nota de piatra umeda. Atacul este direct, fara grasime, mijlocul ramane suplu, iar finalul se inchide uscat si usor sarat. Aciditatea este vizibila, dar nu trebuie sa muste ca un citric nedumerit: are nevoie de extract si de un fruct matur in spate.",
        origin:
          "Soiul este asociat istoric cu podgoria Minis-Maderat, in judetul Arad, la contactul Banatului cu Crisana. Nu este un Sauvignon rebotezat si nici un soi international cu nume local. În zona, identitatea lui se leaga de un alb de casa, baut la masa, nu de un vin de concurs construit pentru note mari.",
        inRomania:
          "În catalogul romanesc, Mustoasa ramane o specialitate de nisa. Este greu de gasit in afara Minis-Maderatului, iar volumele mici fac din fiecare sticla o ocazie. Daca apare pe o eticheta din alta regiune, verifica producatorul si soiul; nu presupune ca numele este folosit cu aceeasi rigoare peste tot.",
        pairing:
          "Logica este simpla: aciditatea taie grasimea si ridica salinitatea, fara sa acopere preparatul. Functioneaza cu peste prajit, ciorba de peste, icre, branza de oaie proaspata, legume la cuptor si aperitive sarate. Nu are nevoie de salsa sau de sosuri dulci. Un desert il face sa para ascutit si gol; daca alegi o versiune demisec, duce mai bine o branza grasa decat o prajitura.",
        howToChoose:
          "Cauta un vin sec, dintr-o recolta recenta, cu indicarea Miniș-Măderat si cu un producator care stie ce face cu aciditatea. Un alcool de 11-13% este un reper rezonabil, nu o garantie. Evita sticlele in care fructul este ascuns de zahar, de lemn mult sau de o aciditate verde, necoapta. Serveste-l la 8-10 grade, nu inghetat, si lasa-l sa se incalzeasca in pahar.",
        facts: [
          { label: "Culoare", value: "Alb" },
          { label: "Origine", value: "Minis-Maderat, Arad" },
          { label: "Stil tipic", value: "Sec, acid, corp suplu" },
          { label: "Aroma", value: "Citrice, fruct alb, ierburi" },
          { label: "Textura", value: "Aciditate inalta, final sarat" },
          { label: "La masa", value: "Peste, icre, branza proaspata" },
        ],
        faq: [
          {
            question: "Mustoasa inseamna ca vinul este dulce?",
            answer:
              "Nu. Numele are legatura cu mustul strugurelui, nu cu zaharul din pahar. Stilul de referinta este sec, iar dulceata nu este o calitate implicita.",
          },
          {
            question: "Se bea tanara sau poate sta in sticla?",
            answer:
              "Majoritatea exemplelor castiga din prospetime si se bea in primii ani. Unele sticle mai extractive pot evolutiona cateva sezoane, dar nu promitem o longevitate pe care producatorul nu o sustine.",
          },
          {
            question: "Se compara cu Cramposia?",
            answer:
              "Ambele pot avea aciditate vie, dar sunt soiuri diferite, din regiuni diferite. Mustoasa este povestea Minis-Maderatului, Cramposia a Dragasanilor. Asemanarea de structura nu le face interschimbabile.",
          },
          {
            question: "De ce nu o gasesc in supermarket?",
            answer:
              "Plantatiile sunt mici si putine crame o lucreaza. Cand o gasesti, este mai probabil o sticla de producator decat un volum de raft. Verifica intotdeauna eticheta si recolta.",
          },
        ],
        sources: [
          { label: "Ghid VinIntel Minis-Maderat" },
          { label: "Note de degustare VinIntel" },
        ],
        tastingProfile: {
          aroma:
            "Coaja de lamie, mar verde, piersica alba, ierburi de gradina; uneori piatra umeda.",
          palate:
            "Fruct alb matur, dar fara dulceata; textura supla, cu o impresie de sare pe final.",
          structure:
            "Aciditate inalta, alcool moderat, corp usor spre mediu, extract discret.",
          finish:
            "Usor, curat si taios; nu trebuie sa lase amareala lunga sau zahar pe buze.",
        },
        editorialSections: [
          {
            id: "mustoasa-verified",
            title: "Ce putem afirma despre soi",
            kind: "verified",
            body:
              "Mustoasa de Maderat este un soi alb autohton romanesc, asociat cu podgoria Minis-Maderat din judetul Arad. În catalogul VinIntel este tratat ca o specialitate de nisa, cu prezenta comerciala limitata, nu ca un soi larg raspandit.",
          },
          {
            id: "mustoasa-generalization",
            title: "Tiparul stilistic",
            kind: "generalization",
            body:
              "În exemplele reusite, vinul este sec, cu aciditate inalta, corp suplu si un profil de citrice si fruct alb. Generalizarea este utila pentru a sti ce sa cauti, dar nu garanteaza stilul fiecarei sticle: anul, momentul culesului si decizia de a nu indulci conteaza.",
          },
          {
            id: "mustoasa-interpretation",
            title: "Interpretarea editoriala",
            kind: "interpretation",
            body:
              "Cheia acestui soi nu este sa produca arome spectaculoase, ci sa pastreze un echilibru intre aciditate, extract si un fruct matur. Cand acest echilibru lipseste, vinul devine fie verde si ascutit, fie plat si inutil indulcit. O sticla buna trebuie sa para simpla la prima vedere si precisa dupa al doilea pahar.",
          },
        ],
        buyingChecklist: [
          "Alege un vin sec, cu mentiunea Minis-Maderat sau un producator cunoscut din zona.",
          "Prefera o recolta recenta daca vrei prospetime; intreaba de evolutie doar daca producatorul o sustine.",
          "Verifica alcoolul si aciditatea perceputa, nu doar numarul de pe eticheta.",
          "Evita lemnul mult si zaharul care acopera fructul, daca vrei stilul de referinta.",
          "Serveste la 8-10 grade si lasa paharul sa se incalzeasca.",
        ],
        whatCanGoWrong: [
          "Aciditate verde, necoapta, care lasa o senzatie de agurida si un final amar.",
          "Zahar adaugat pentru a masca lipsa de maturitate, cu rezultatul unui vin moale si fara directie.",
          "Lemn sau oxidative prea agresive, care acopera citrusul si textura supla.",
          "Sticle vechi sau prost pastrate, in care fructul dispare si ramane doar aciditatea.",
        ],
      },
      en: {
        name: "Mustoasa de Maderat",
        alsoKnownAs: ["Mustoasa", "Mustoasa de Maderat"],
        metaTitle: "Mustoasa de Maderat: a Minis white built on acidity",
        metaDescription:
          "Mustoasa de Maderat from Minis-Maderat, Arad: style, tasting profile, regional context, food logic and how to choose a bottle.",
        answer:
          "Mustoasa de Maderat is an indigenous white from the Minis-Maderat area of Arad, built around acidity and texture rather than sweetness. Successful examples are dry, citrus-led, with white fruit and a quiet saline note; the body stays lean. It is a table wine with tension, not an aromatic white or a dessert.",
        intro:
          "Few Romanian varieties demand such a clear stylistic decision. Mustoasa does not win through a spectacular aroma or new oak; it wins through the tension between acidity, extract and fruit that has not been allowed to become tired. A good bottle does not hide acidity under sugar, it puts acidity at the centre. That is why, when made with intent, it feels less like a catalogue curiosity and more like a very precise table wine.",
        inTheGlass:
          "In a strong example, the nose sits close to lemon peel, green apple, white peach and garden herbs; a wet-stone note can appear. The attack is direct rather than creamy, the mid-palate stays lean, and the finish closes dry and lightly saline. Acidity is visible but should not bite like an unresolved citrus; it needs extract and ripe fruit behind it.",
        origin:
          "The variety is historically associated with the Minis-Maderat vineyard in Arad, where Banat meets Crisana. It is not renamed Sauvignon Blanc, nor an international variety with a local label. In the area its identity is tied to a house white drunk at the table, not to a competition wine built for high scores.",
        inRomania:
          "In the Romanian catalogue, Mustoasa remains a niche speciality. It is hard to find outside Minis-Maderat, and small volumes make every bottle an occasion. If it appears on a label from another region, check the producer and the variety; do not assume the name is used with the same rigour everywhere.",
        pairing:
          "The logic is simple: acidity cuts fat and lifts salt without covering the dish. It works with fried fish, fish soup, roe, fresh sheep cheese, roasted vegetables and salty starters. It does not need salsa or sweet sauces. Dessert makes it taste sharp and hollow; if you choose an off-dry version, it handles a rich cheese better than a cake.",
        howToChoose:
          "Look for a dry wine from a recent vintage, labelled Minis-Maderat or made by a producer who knows how to handle acidity. Alcohol around 11-13% is a useful clue, not a guarantee. Avoid bottles where fruit is hidden by sugar, heavy oak or green, unripe acidity. Serve at 8-10 degrees, not ice cold, and let it warm in the glass.",
        facts: [
          { label: "Colour", value: "White" },
          { label: "Origin", value: "Minis-Maderat, Arad" },
          { label: "Typical style", value: "Dry, acidic, lean-bodied" },
          { label: "Aroma", value: "Citrus, white fruit, herbs" },
          { label: "Texture", value: "High acidity, saline finish" },
          { label: "At the table", value: "Fish, roe, fresh cheese" },
        ],
        faq: [
          {
            question: "Does Mustoasa mean the wine is sweet?",
            answer:
              "No. The name relates to the grape's juice, not sugar in the glass. The reference style is dry, and sweetness is not an implied quality.",
          },
          {
            question: "Should it be drunk young or can it age?",
            answer:
              "Most examples gain from freshness and are best in their first years. Some more extractive bottles can evolve for a few seasons, but we do not promise longevity the producer does not support.",
          },
          {
            question: "Is it like Cramposie?",
            answer:
              "Both can show vivid acidity, but they are different varieties from different regions. Mustoasa belongs to Minis-Maderat, Cramposie to Dragasani. A structural resemblance does not make them interchangeable.",
          },
          {
            question: "Why is it hard to find?",
            answer:
              "Plantings are small and few estates work with it. When you find it, it is more likely a producer bottle than a supermarket volume. Always check the label and vintage.",
          },
        ],
        sources: [
          { label: "VinIntel guide to Minis-Maderat" },
          { label: "VinIntel tasting notes" },
        ],
        tastingProfile: {
          aroma:
            "Lemon peel, green apple, white peach and garden herbs; a wet-stone note may appear.",
          palate:
            "Ripe white fruit without sweetness; a lean texture with a saline impression on the finish.",
          structure:
            "High acidity, moderate alcohol, light to medium body, restrained extract.",
          finish:
            "Light, clean and cutting; it should not leave a long bitter or sugary trail.",
        },
        editorialSections: [
          {
            id: "mustoasa-verified",
            title: "What we can state about the variety",
            kind: "verified",
            body:
              "Mustoasa de Maderat is an indigenous Romanian white variety associated with the Minis-Maderat vineyard in Arad. In the VinIntel catalogue it is treated as a niche speciality with limited commercial presence, not as a widely planted variety.",
          },
          {
            id: "mustoasa-generalization",
            title: "The stylistic pattern",
            kind: "generalization",
            body:
              "In successful examples the wine is dry, with high acidity, a lean body and a citrus and white-fruit profile. The generalisation helps you know what to look for, but it does not guarantee every bottle: vintage, picking date and the decision not to soften it all matter.",
          },
          {
            id: "mustoasa-interpretation",
            title: "Editorial interpretation",
            kind: "interpretation",
            body:
              "The key is not spectacular aroma but a balance between acidity, extract and ripe fruit. When that balance is missing, the wine becomes either green and sharp or flat and needlessly sweet. A good bottle should look simple at first and precise after the second glass.",
          },
        ],
        buyingChecklist: [
          "Choose a dry wine labelled Minis-Maderat, or from a known producer in the area.",
          "Prefer a recent vintage for freshness; ask about evolution only when the producer supports it.",
          "Check alcohol and perceived acidity, not just the number on the label.",
          "Avoid heavy oak and sugar that cover the fruit if you want the reference style.",
          "Serve at 8-10 degrees and let it warm in the glass.",
        ],
        whatCanGoWrong: [
          "Green, unripe acidity that leaves a sour impression and a bitter finish.",
          "Sugar added to hide a lack of ripeness, producing a soft wine with no direction.",
          "Aggressive oak or oxidation that covers the citrus and the lean texture.",
          "Old or badly stored bottles where the fruit disappears and only acidity remains.",
        ],
      },
    },
  },
];
