import type { GrapeGuide } from "@/lib/oenology/types";

export const INTERNATIONAL_GRAPE_GUIDES: GrapeGuide[] = [
  {
    slug: "cabernet-sauvignon",
    color: "red",
    isIndigenous: false,
    styleProfileId: "cabernet-sauvignon",
    aliases: ["cabernet sauvignon", "cabernet"],
    relatedSlugs: ["cabernet-franc", "merlot", "feteasca-neagra"],
    pairingDishSlugs: ["gratar", "friptura-de-porc"],
    journalSlugs: [],
    copy: {
      ro: {
        name: "Cabernet Sauvignon",
        alsoKnownAs: ["Cabernet"],
        metaTitle: "Cabernet Sauvignon in Romania: corp, tanin, gratar",
        metaDescription:
          "Cum se comporta Cabernet Sauvignon in podgoriile romanesti si cand merita in locul unei Feteasca Neagra.",
        answer:
          "Cabernet Sauvignon e un rosu international cu tanin ferm, coacaze negre si piper. In Romania, in Dealu Mare si Dobrogea, poate fi copt si dens. In zone mai reci ramane vegetal daca e cules devreme. E vin de gratar. Nu e automat „mai bun” decat un autohton. E alt instrument.",
        intro:
          "Il stii din Bordeaux si din Noul Lume. In Romania umple raftul pentru ca se vinde. Unele sticle sunt oneste. Altele sunt extractie si stejar pe un strugure care n-a avut vreme. Soiul iarta putin randamentul. Nu iarta graba.",
        inTheGlass:
          "Coacaze, grafit, ardei gras copt cand e copt, ardei verde cand nu e. Taninul trebuie sa fie copt, nu nisipos. Baricul se simte des. Daca vanilia e primul lucru, platesti lemnul.",
        origin:
          "Bordelais, azi peste tot. In Romania e oaspete de zeci de ani, nu o noutate.",
        inRomania:
          "Dealu Mare, Dobrogea, Banat, Transilvania in stiluri diferite. Cupajul cu Merlot e frecvent si adesea mai bun la masa decat un Cabernet solo verde.",
        pairing:
          "Vita la gratar, miel, tocanite, branza in varsta. Sarmalele merg daca taninul e copt. Un Cabernet verde le usuca.",
        howToChoose:
          "An cald, crama cu rosii deja bune. Evita „Grand Reserve” sub 30 RON. Daca vrei identitate locala, compara cu o Feteasca Neagra din aceeasi zona si acelasi pret.",
        facts: [
          { label: "Culoare", value: "Rosu" },
          { label: "Origine", value: "Bordeaux; oaspete in Romania" },
          { label: "Stil tipic", value: "Tanin ferm, fruct negru, piper" },
          { label: "La masa", value: "Gratar, miel, tocanite" },
        ],
        faq: [
          {
            question: "Cabernet e mai bun decat Feteasca Neagra?",
            answer:
              "Nu prin definitie. E alt profil. La acelasi pret, alege sticla cu Value Score, nu pasaportul soiului.",
          },
          {
            question: "De ce miroase a ardei verde?",
            answer:
              "Strugurele n-a ajuns la coacere fenolica. In ani reci e frecvent. Nu e un defect „de terroir” de laudat.",
          },
          {
            question: "Il invechiesc?",
            answer:
              "Doar sticle cu tanin copt si echilibru. Majoritatea Cabernetelor de supermarket se beau in 5 ani.",
          },
        ],
        sources: [{ label: "Ghid VinIntel de rosii internationale in Romania" }],
      },
      en: {
        name: "Cabernet Sauvignon",
        alsoKnownAs: ["Cabernet"],
        metaTitle: "Cabernet Sauvignon in Romania: tannin and grill",
        metaDescription:
          "How Cabernet Sauvignon behaves in Romanian vineyards, and when to pick it over Feteasca Neagra.",
        answer:
          "Cabernet Sauvignon is an international red with firm tannin, blackcurrant and pepper. In Dealu Mare and Dobrogea it can be ripe and dense. In cooler sites it stays green if picked early. It is a grill wine. It is not automatically better than an indigenous red. It is a different tool.",
        intro:
          "You know it from Bordeaux and the New World. In Romania it fills shelves because it sells. Some bottles are honest. Others are extraction and oak on fruit that had no time.",
        inTheGlass:
          "Blackcurrant, graphite, roasted pepper when ripe, green pepper when not. Tannin should be ripe, not sandy. Oak is common. If vanilla leads, you are paying for wood.",
        origin: "Bordeaux, now everywhere. A long-term guest in Romania.",
        inRomania:
          "Dealu Mare, Dobrogea, Banat, Transylvania in different keys. Merlot blends are common and often better at the table than a green solo Cabernet.",
        pairing:
          "Grilled beef, lamb, stews, aged cheese. Sarmale work if tannin is ripe. Green Cabernet dries them out.",
        howToChoose:
          "A warm vintage, a winery that already makes decent reds. Avoid Grand Reserve under 30 RON. If you want local identity, compare it with Feteasca Neagra at the same price.",
        facts: [
          { label: "Colour", value: "Red" },
          { label: "Origin", value: "Bordeaux; planted in Romania" },
          { label: "Typical style", value: "Firm tannin, black fruit, pepper" },
          { label: "At the table", value: "Grill, lamb, stews" },
        ],
        faq: [
          {
            question: "Is Cabernet better than Feteasca Neagra?",
            answer:
              "Not by default. Different profile. At the same price, follow Value Score, not the passport.",
          },
          {
            question: "Why the green pepper smell?",
            answer:
              "The grapes did not reach phenolic ripeness. Common in cool years. Not a terroir badge.",
          },
          {
            question: "Should I cellar it?",
            answer:
              "Only balanced bottles with ripe tannin. Most supermarket Cabernets are for five years, not fifteen.",
          },
        ],
        sources: [{ label: "VinIntel notes on international reds in Romania" }],
      },
    },
  },
  {
    slug: "cabernet-franc",
    color: "red",
    isIndigenous: false,
    styleProfileId: "cabernet-franc",
    aliases: ["cabernet franc"],
    relatedSlugs: ["cabernet-sauvignon", "cadarca", "merlot"],
    pairingDishSlugs: ["sarmale", "gratar"],
    journalSlugs: [],
    copy: {
      ro: {
        name: "Cabernet Franc",
        alsoKnownAs: [],
        metaTitle: "Cabernet Franc in Romania: piper, fruct, masa",
        metaDescription:
          "Cabernet Franc fata de Cabernet Sauvignon in podgoriile romanesti: cand e mai bun la masa.",
        answer:
          "Cabernet Franc e un rosu cu piper, zmeura si tanin mai putin dur decat Sauvignon. In Romania, in Banat si in zone nu prea calde, poate fi mai gastronomic decat un Cabernet gros. E o alegere buna langa sarmale, daca nu e vegetal.",
        intro:
          "E parintele, alaturi de Sauvignon Blanc, al Cabernet Sauvignon. In pahar e adesea mai iertator. In sticle slabe, ardeiul verde e acelasi avertisment: cules prea devreme.",
        inTheGlass:
          "Fruct rosu, grafit, piper, uneori violete. Corpul e mediu. Taninul trebuie sa fie copt. Vegetalul puternic nu e „typicite”, e graba.",
        origin: "Valea Loarei si Bordeaux. In Romania, oaspete util, nu vedeta de raft.",
        inRomania:
          "Banat, Dealu Mare, Transilvania. Uneori in cupaj, unde rotunjeste Sauvignon. Monovarietalul te invata piperul.",
        pairing:
          "Sarmale, miel, tocanite, ciuperci. Un gratar usor merge. Un steak foarte gras cere adesea Sauvignon sau Syrah.",
        howToChoose:
          "Cauta crame care il imbuteliaza singur, nu doar in blend anonim. Anul conteaza. Evita sticlele ieftine cu „Franc” scris mare si vinul verde.",
        facts: [
          { label: "Culoare", value: "Rosu" },
          { label: "Origine", value: "Franta; plantat in Romania" },
          { label: "Stil tipic", value: "Piper, fruct rosu, tanin mediu" },
          { label: "La masa", value: "Sarmale, miel, tocanite" },
        ],
        faq: [
          {
            question: "E mai usor decat Cabernet Sauvignon?",
            answer:
              "De obicei da, pe tanin. Nu e un roze. Tot e rosu de masa.",
          },
          {
            question: "Merge racit?",
            answer:
              "Usor, da, 15-16 grade, mai ales daca e un an mai usor.",
          },
          {
            question: "De ce e mai rar pe eticheta?",
            answer:
              "Se vinde mai greu decat Sauvignon. Multe crame il ascund in cupaj.",
          },
        ],
        sources: [{ label: "Ghid VinIntel de rosii internationale" }],
      },
      en: {
        name: "Cabernet Franc",
        alsoKnownAs: [],
        metaTitle: "Cabernet Franc in Romania: pepper and food",
        metaDescription:
          "How Cabernet Franc differs from Cabernet Sauvignon in Romanian vineyards.",
        answer:
          "Cabernet Franc is a red with pepper, raspberry and less brutal tannin than Cabernet Sauvignon. In Banat and cooler Romanian sites it can be more gastronomic than a thick Cabernet. It is a good sarmale wine when it is not green.",
        intro:
          "With Sauvignon Blanc, it is a parent of Cabernet Sauvignon. In the glass it is often more forgiving. In weak bottles, green pepper is the same warning: picked too early.",
        inTheGlass:
          "Red fruit, graphite, pepper, sometimes violet. Medium body. Tannin should be ripe. Loud green notes are haste, not typicity.",
        origin: "Loire and Bordeaux. In Romania, a useful guest, not a shelf star.",
        inRomania:
          "Banat, Dealu Mare, Transylvania. Often in blends, rounding Sauvignon. Single variety teaches the pepper.",
        pairing:
          "Sarmale, lamb, stews, mushrooms. A lighter grill works. A very fatty steak often wants Sauvignon or Syrah.",
        howToChoose:
          "Look for estates that bottle it alone. Vintage matters. Skip cheap bottles with Franc in huge type and green wine inside.",
        facts: [
          { label: "Colour", value: "Red" },
          { label: "Origin", value: "France; planted in Romania" },
          { label: "Typical style", value: "Pepper, red fruit, medium tannin" },
          { label: "At the table", value: "Sarmale, lamb, stews" },
        ],
        faq: [
          {
            question: "Is it lighter than Cabernet Sauvignon?",
            answer: "Usually on tannin. It is still a table red, not a rose.",
          },
          {
            question: "Can I serve it cooler?",
            answer: "Slightly, yes, about 15 to 16C, especially in a lighter vintage.",
          },
          {
            question: "Why is it rarer on labels?",
            answer:
              "It is harder to sell than Sauvignon. Many wineries hide it in blends.",
          },
        ],
        sources: [{ label: "VinIntel notes on international reds" }],
      },
    },
  },
  {
    slug: "merlot",
    color: "red",
    isIndigenous: false,
    styleProfileId: "merlot",
    aliases: ["merlot"],
    relatedSlugs: ["cabernet-sauvignon", "feteasca-neagra", "novac"],
    pairingDishSlugs: ["sarmale", "gratar"],
    journalSlugs: [],
    copy: {
      ro: {
        name: "Merlot",
        alsoKnownAs: [],
        metaTitle: "Merlot in Romania: fruct, rotund, usor de baut",
        metaDescription:
          "De ce Merlot umple rafturile romanesti si cand e o alegere onesta la sarmale sau gratar.",
        answer:
          "Merlot e un rosu cu prune, ciocolata usoara si tanin mai rotund decat Cabernet. In Romania e pretutindeni, de la 20 RON la etichete de crama. Poate fi cel mai iertator rosu de masa. Poate fi si un vin moale, dulceag, facut sa nu deranjeze pe nimeni.",
        intro:
          "Daca Feteasca Neagra e identitate, Merlot e diplomatia. Functioneaza la cina cu oaspeti care „nu beau rosu taninos”. Pretul scazut nu e un defect. Lipsa de caracter, da.",
        inTheGlass:
          "Pruna, cireasa, ciocolata, uneori eucalipt daca e copt. Taninul trebuie sa fie catifelat, nu absent. Un Merlot apos e randament, nu stil.",
        origin: "Bordeaux, azi universal. In Romania e plantat masiv dupa 1990.",
        inRomania:
          "Toate regiunile mari. Dealu Mare da adesea corp. Transilvania pastreaza mai multa aciditate. Cupajele cu Feteasca sau Cabernet sunt frecvente. Citeste procentele daca exista.",
        pairing:
          "Sarmale, paste cu sos, gratar nu foarte afumat, branza. E mai sigur la masa mixta decat un Syrah de 14.5%.",
        howToChoose:
          "Value Score te ajuta mai mult la Merlot decat la soiurile rare. Sub 25 RON, cauta un an recent si o crama cunoscuta. Peste 80 RON, cere originea strugurelui, nu doar sticla grea.",
        facts: [
          { label: "Culoare", value: "Rosu" },
          { label: "Origine", value: "Bordeaux; foarte plantat in Romania" },
          { label: "Stil tipic", value: "Pruna, tanin rotund, corp mediu" },
          { label: "La masa", value: "Sarmale, cina mixta, gratar bland" },
        ],
        faq: [
          {
            question: "Merlot e „vin de incepatori”?",
            answer:
              "E mai usor de baut. Asta nu inseamna prost. Inseamna ca trebuie sa fii atent sa nu cumperi o sticla fara coloana.",
          },
          {
            question: "E mai bun in cupaj?",
            answer:
              "Adesea da, cu Cabernet sau Feteasca. Un Merlot bun solo exista. Un Merlot slab solo e plictisitor.",
          },
          {
            question: "Il pun la pui?",
            answer:
              "Da, daca puiul e gatit cu sos sau la cuptor. Un piept uscat cere mai degraba un alb.",
          },
        ],
        sources: [{ label: "Ghid VinIntel de rosii de masa" }],
      },
      en: {
        name: "Merlot",
        alsoKnownAs: [],
        metaTitle: "Merlot in Romania: round fruit for the table",
        metaDescription:
          "Why Merlot fills Romanian shelves, and when it is an honest bottle for sarmale or grill.",
        answer:
          "Merlot is a red with plum, light chocolate and rounder tannin than Cabernet. In Romania it is everywhere, from 20 RON to estate labels. It can be the most forgiving table red. It can also be a soft, slightly sweet wine made to offend no one.",
        intro:
          "If Feteasca Neagra is identity, Merlot is diplomacy. It works at dinners with guests who „do not drink tannic red”. Low price is not a flaw. No character is.",
        inTheGlass:
          "Plum, cherry, chocolate, sometimes eucalyptus when ripe. Tannin should be velvety, not absent. Watery Merlot is yield, not style.",
        origin: "Bordeaux, now universal. Planted heavily in Romania after 1990.",
        inRomania:
          "Every major region. Dealu Mare often adds body. Transylvania keeps more acid. Blends with Feteasca or Cabernet are common.",
        pairing:
          "Sarmale, sauced pasta, a not-too-smoky grill, cheese. Safer at mixed tables than a 14.5% Syrah.",
        howToChoose:
          "Value Score helps more here than with rare grapes. Under 25 RON, take a recent vintage and a known winery. Over 80 RON, ask where the fruit grew.",
        facts: [
          { label: "Colour", value: "Red" },
          { label: "Origin", value: "Bordeaux; widely planted in Romania" },
          { label: "Typical style", value: "Plum, round tannin, medium body" },
          { label: "At the table", value: "Sarmale, mixed dinners, gentle grill" },
        ],
        faq: [
          {
            question: "Is Merlot a beginner wine?",
            answer:
              "It is easier to drink. That is not the same as poor. It means you should still avoid bottles with no spine.",
          },
          {
            question: "Is it better in a blend?",
            answer:
              "Often, with Cabernet or Feteasca. Good solo Merlot exists. Weak solo Merlot is dull.",
          },
          {
            question: "With chicken?",
            answer:
              "Yes, if the chicken is sauced or roasted. Dry breast wants a white.",
          },
        ],
        sources: [{ label: "VinIntel notes on table reds" }],
      },
    },
  },
  {
    slug: "pinot-noir",
    color: "red",
    isIndigenous: false,
    styleProfileId: "pinot-noir",
    aliases: ["pinot noir", "pinot negru"],
    relatedSlugs: ["babeasca-neagra", "feteasca-neagra", "cadarca"],
    pairingDishSlugs: ["sarmale"],
    journalSlugs: [],
    copy: {
      ro: {
        name: "Pinot Noir",
        alsoKnownAs: ["Pinot negru"],
        metaTitle: "Pinot Noir in Romania: greu de facut, usor de iubit",
        metaDescription:
          "De ce Pinot Noir romanesc dezamageste des si cand o sticla merita banii.",
        answer:
          "Pinot Noir e un rosu fin, cu visina, pamant si tanin delicat. In Romania reuseste in zone mai racoroase si in maini rabdatoare. Multe sticle sunt fie prea diluate, fie forțate sa para Cabernet. Cand e bun, e vin de rata si de masa, nu de concurs de culoare.",
        intro:
          "E soiul care umileste cramele. Randamentul trebuie mic. Culoarea nu trebuie fortata. Daca vezi un Pinot negru ca cerneala la 25 RON, fii sceptic.",
        inTheGlass:
          "Visina, zmeura, ceai, uneori ciuperca. Corpul e usor-mediu. Taninul e fin. Daca e dur si opace, nu e Pinot. E altceva cu numele furat.",
        origin: "Burgundia. Plantat cu ambitie in Romania, cu rezultate inegale.",
        inRomania:
          "Transilvania, colturi mai inalte din Dealu Mare, Banat, uneori Dobrogea pe stil copt. Compara-l cu Babeasca daca vrei un autohton in acelasi registru de greutate.",
        pairing:
          "Rata, ciuperci, sarmale nu foarte grase, pui la cuptor. Vita groasa il acopera.",
        howToChoose:
          "Crama, nu soiul. Pretul sub 40 RON e un semnal de risc. Peste 120 RON, cere originea parcelei, nu doar sticla grea.",
        facts: [
          { label: "Culoare", value: "Rosu deschis-mediu" },
          { label: "Origine", value: "Burgundia; plantat in Romania" },
          { label: "Stil tipic", value: "Visina, tanin fin, corp usor" },
          { label: "La masa", value: "Rata, ciuperci, sarmale" },
        ],
        faq: [
          {
            question: "De ce e scump?",
            answer:
              "Pentru ca da putin si cere grija. Scump nu inseamna bun. Inseamna ca soiul nu e de volum.",
          },
          {
            question: "E mai bun decat Feteasca Neagra?",
            answer:
              "E alt limbaj. Feteasca e mai romaneasca si adesea mai clara la pret. Pinot e o ambitie, nu o ierarhie.",
          },
          {
            question: "Il racoresc?",
            answer: "Da, usor. 14-16 grade. Prea cald, pare alcoolic. Prea rece, dispare.",
          },
        ],
        sources: [{ label: "Ghid VinIntel de rosii fine" }],
      },
      en: {
        name: "Pinot Noir",
        alsoKnownAs: ["Pinot negru"],
        metaTitle: "Pinot Noir in Romania: hard to grow, easy to love",
        metaDescription:
          "Why Romanian Pinot Noir often disappoints, and when a bottle is worth the money.",
        answer:
          "Pinot Noir is a fine red with sour cherry, earth and delicate tannin. In Romania it works in cooler sites and patient hands. Many bottles are either thin or forced to look like Cabernet. When it is good, it is a duck and table wine, not a colour contest.",
        intro:
          "The grape humbles wineries. Yields must stay low. Colour should not be forced. A 25 RON ink-black Pinot deserves scepticism.",
        inTheGlass:
          "Cherry, raspberry, tea, sometimes mushroom. Light to medium body. Fine tannin. Harsh and opaque is not Pinot. It is something else wearing the name.",
        origin: "Burgundy. Planted ambitiously in Romania, unevenly.",
        inRomania:
          "Transylvania, higher Dealu Mare, Banat, sometimes warmer Dobrogea. Compare it with Babeasca if you want an indigenous grape in a similar weight class.",
        pairing:
          "Duck, mushrooms, not-too-fatty sarmale, roast chicken. Thick beef buries it.",
        howToChoose:
          "The estate, not the grape name. Under 40 RON is a risk flag. Over 120 RON, ask for the parcel, not only a heavy bottle.",
        facts: [
          { label: "Colour", value: "Light to medium red" },
          { label: "Origin", value: "Burgundy; planted in Romania" },
          { label: "Typical style", value: "Cherry, fine tannin, light body" },
          { label: "At the table", value: "Duck, mushrooms, sarmale" },
        ],
        faq: [
          {
            question: "Why is it expensive?",
            answer:
              "Because it yields little and needs care. Expensive is not the same as good. It means the grape is not a bulk crop.",
          },
          {
            question: "Is it better than Feteasca Neagra?",
            answer:
              "Different language. Feteasca is more Romanian and often clearer at the price. Pinot is an ambition, not a ranking.",
          },
          {
            question: "Should I chill it?",
            answer:
              "Slightly. About 14 to 16C. Too warm it feels alcoholic. Too cold it disappears.",
          },
        ],
        sources: [{ label: "VinIntel notes on finer reds" }],
      },
    },
  },
  {
    slug: "syrah",
    color: "red",
    isIndigenous: false,
    styleProfileId: "syrah",
    aliases: ["syrah", "shiraz"],
    relatedSlugs: ["negru-de-dragasani", "cabernet-sauvignon", "merlot"],
    pairingDishSlugs: ["gratar", "friptura-de-porc"],
    journalSlugs: [],
    copy: {
      ro: {
        name: "Syrah",
        alsoKnownAs: ["Shiraz"],
        metaTitle: "Syrah in Romania: piper, carne, caldura",
        metaDescription:
          "Cum arata Syrah-ul romanesc in zone calde si cu ce il pui la masa.",
        answer:
          "Syrah, uneori etichetat Shiraz, e un rosu cu mure, piper negru si fum. In Dobrogea si in veri fierbinti din Dealu Mare poate fi copt si alcoolic. E vin de carne. Daca e verde, e cules prea devreme. Daca e dulceag la 15%, e un spectacol, nu o cina.",
        intro:
          "Soiul iubeste soarele, nu neglijenta. In Romania e mai rar decat Merlot, deci mai putine sticle de umplutura, dar si mai putine referinte. Compara-l cu Negru de Dragasani daca vrei un autohton pe condiment.",
        inTheGlass:
          "Mure, masline negre, piper, bacon. Corpul e mediu-plin. Taninul e prezent. Alcoolul trebuie sa fie dus de fruct, nu sa arda.",
        origin: "Ron. Shiraz e acelasi soi in multe etichetari din Noul Lume.",
        inRomania:
          "Dobrogea, Dealu Mare, Banat. Anii calzi il ajuta. Anii reci il lasa vegetal. Cupajele cu Cabernet sunt frecvente.",
        pairing:
          "Gratar, miel, carnati, tocanite condimentate. Sarmalele merg daca vinul nu e un bloc de 15%.",
        howToChoose:
          "Cauta piper si fruct, nu doar culoare. Evita sticlele fara an. Daca scrie Shiraz si e foarte dulce, trateaz-o ca vin de petrecere, nu de friptura fina.",
        facts: [
          { label: "Culoare", value: "Rosu" },
          { label: "Origine", value: "Ron; plantat in Romania" },
          { label: "Stil tipic", value: "Mure, piper, fum, corp plin" },
          { label: "La masa", value: "Gratar, miel, carnati" },
        ],
        faq: [
          {
            question: "Syrah si Shiraz sunt soiuri diferite?",
            answer:
              "Nu. E acelasi strugure, cu stiluri de eticheta diferite. In Romania, citeste totusi zaharul si alcoolul.",
          },
          {
            question: "E prea greu pentru vara?",
            answer:
              "Adesea da. Iarna si gratarul il cer. Un an mai usor, usor racit, poate tine o seara calda.",
          },
          {
            question: "Merge cu mici?",
            answer: "Da, daca taninul e copt. Un Syrah verde cu mici e o lupta.",
          },
        ],
        sources: [{ label: "Ghid VinIntel de rosii condimentate" }],
      },
      en: {
        name: "Syrah",
        alsoKnownAs: ["Shiraz"],
        metaTitle: "Syrah in Romania: pepper, meat, heat",
        metaDescription:
          "How Romanian Syrah drinks in warm sites, and what to eat with it.",
        answer:
          "Syrah, sometimes labelled Shiraz, is a red with blackberry, black pepper and smoke. In Dobrogea and hot Dealu Mare vintages it can be ripe and alcoholic. It is a meat wine. Green means picked early. Sweet at 15% is a show, not a dinner.",
        intro:
          "The grape loves sun, not neglect. In Romania it is rarer than Merlot, so fewer filler bottles and fewer references. Compare it with Negru de Dragasani if you want an indigenous peppery red.",
        inTheGlass:
          "Blackberry, black olive, pepper, bacon. Medium to full body. Tannin is present. Alcohol should be carried by fruit, not burn.",
        origin: "The Rhone. Shiraz is the same grape in many New World labels.",
        inRomania:
          "Dobrogea, Dealu Mare, Banat. Warm years help. Cool years stay green. Cabernet blends are common.",
        pairing:
          "Grill, lamb, sausages, spiced stews. Sarmale work if the wine is not a 15% block.",
        howToChoose:
          "Look for pepper and fruit, not only colour. Skip bottles with no vintage. If it says Shiraz and tastes sweet, treat it as a party wine.",
        facts: [
          { label: "Colour", value: "Red" },
          { label: "Origin", value: "Rhone; planted in Romania" },
          { label: "Typical style", value: "Blackberry, pepper, smoke, full body" },
          { label: "At the table", value: "Grill, lamb, sausages" },
        ],
        faq: [
          {
            question: "Are Syrah and Shiraz different grapes?",
            answer:
              "No. Same vine, different labelling habits. In Romania, still read sugar and alcohol.",
          },
          {
            question: "Is it too heavy for summer?",
            answer:
              "Often. Winter and grill want it. A lighter vintage, slightly cool, can hold a warm evening.",
          },
          {
            question: "With mici?",
            answer: "Yes if tannin is ripe. Green Syrah with mici is a fight.",
          },
        ],
        sources: [{ label: "VinIntel notes on spicy reds" }],
      },
    },
  },
  {
    slug: "sauvignon-blanc",
    color: "white",
    isIndigenous: false,
    styleProfileId: "sauvignon-blanc",
    aliases: ["sauvignon blanc", "sauvignon"],
    relatedSlugs: ["cramposie-selectionata", "feteasca-regala", "riesling-italian"],
    pairingDishSlugs: ["peste"],
    journalSlugs: [],
    copy: {
      ro: {
        name: "Sauvignon Blanc",
        alsoKnownAs: ["Sauvignon"],
        metaTitle: "Sauvignon Blanc in Romania: citrice, verde, peste",
        metaDescription:
          "Cum gusta Sauvignon-ul romanesc si cand e mai bun decat o Feteasca Regala la peste.",
        answer:
          "Sauvignon Blanc e un alb cu agrise, citrice si uneori fructul pasiunii. In Transilvania ramane verde si taios. In Dobrogea poate fi mai tropic. E vin de peste si de aperitiv. Daca e dulceag, e facut pentru raft, nu pentru pastrav cu marar.",
        intro:
          "E soiul pe care il recunosti din Noua Zeelanda. In Romania, cele mai bune sticle nu copiaza Marlborough. Pastreaza aciditatea si sareaza farfuria. Cele slabe miros a iarbă taiata si se opresc acolo.",
        inTheGlass:
          "Lamâie, agrise, soc, uneori piper verde. Corpul e usor-mediu. Finalul trebuie uscat. Un Sauvignon moale e cules tarziu sau tinut cald.",
        origin: "Loara si Bordeaux. Universal.",
        inRomania:
          "Tarnave, Transilvania, Dealu Mare, Dobrogea. Compara-l cu Cramposia daca vrei un autohton in acelasi registru acid.",
        pairing:
          "Peste, icre, salate, capră proaspata, sparanghel daca gasesti. Evita sosurile cremoase grele si desertul.",
        howToChoose:
          "Anul cel mai recent. Sticla cu dop sau screwcap nu decide calitatea. Evita sticlele de doi ani tinute in vitrina la soare.",
        facts: [
          { label: "Culoare", value: "Alb" },
          { label: "Origine", value: "Franta; foarte plantat in Romania" },
          { label: "Stil tipic", value: "Agrise, citrice, aciditate vie" },
          { label: "La masa", value: "Peste, icre, salate" },
        ],
        faq: [
          {
            question: "E totuna cu Riesling italian?",
            answer:
              "Nu. Riesling italian e Welschriesling, alt soi, adesea mai discret. Sauvignon e mai strident pe aromă verde.",
          },
          {
            question: "Merge cu sarmale?",
            answer: "Nu. Ia un rosu. Sauvignon-ul e pentru sarea si pestele.",
          },
          {
            question: "Il tin un an?",
            answer:
              "Majoritatea, nu. E vin de baut tanar. Exceptiile sunt rare si trebuie spuse de crama.",
          },
        ],
        sources: [{ label: "Ghid VinIntel de albe pentru peste" }],
      },
      en: {
        name: "Sauvignon Blanc",
        alsoKnownAs: ["Sauvignon"],
        metaTitle: "Sauvignon Blanc in Romania: citrus and fish",
        metaDescription:
          "How Romanian Sauvignon Blanc drinks, and when it beats Feteasca Regala with fish.",
        answer:
          "Sauvignon Blanc is a white with gooseberry, citrus and sometimes passion fruit. In Transylvania it stays green and sharp. In Dobrogea it can turn more tropical. It is a fish and aperitif wine. If it is sweetish, it was built for the shelf, not for trout with dill.",
        intro:
          "You know it from New Zealand. The best Romanian bottles do not copy Marlborough. They keep acidity and salt the plate. Weak ones smell of cut grass and stop there.",
        inTheGlass:
          "Lemon, gooseberry, elderflower, sometimes green pepper. Light to medium body. The finish should be dry. Soft Sauvignon was picked late or stored warm.",
        origin: "Loire and Bordeaux. Universal.",
        inRomania:
          "Tarnave, Transylvania, Dealu Mare, Dobrogea. Compare it with Cramposie if you want an indigenous grape in the same acid register.",
        pairing:
          "Fish, roe, salads, fresh goat cheese, asparagus if you find it. Skip heavy cream sauces and dessert.",
        howToChoose:
          "Newest vintage. Cork or screwcap does not decide quality. Skip two-year-old bottles from a sunny shop window.",
        facts: [
          { label: "Colour", value: "White" },
          { label: "Origin", value: "France; widely planted in Romania" },
          { label: "Typical style", value: "Gooseberry, citrus, bright acid" },
          { label: "At the table", value: "Fish, roe, salads" },
        ],
        faq: [
          {
            question: "Is it the same as Riesling italian?",
            answer:
              "No. Riesling italian is Welschriesling, another grape, usually quieter. Sauvignon is louder on green aroma.",
          },
          {
            question: "With sarmale?",
            answer: "No. Take a red. Sauvignon is for salt and fish.",
          },
          {
            question: "Can I keep it a year?",
            answer:
              "Most bottles no. Drink it young. Exceptions are rare and should be claimed by the winery.",
          },
        ],
        sources: [{ label: "VinIntel notes on whites for fish" }],
      },
    },
  },
  {
    slug: "chardonnay",
    color: "white",
    isIndigenous: false,
    styleProfileId: "chardonnay",
    aliases: ["chardonnay"],
    relatedSlugs: ["pinot-gris", "feteasca-alba", "grasa-de-cotnari"],
    pairingDishSlugs: ["peste"],
    journalSlugs: [],
    copy: {
      ro: {
        name: "Chardonnay",
        alsoKnownAs: [],
        metaTitle: "Chardonnay in Romania: de la inox la baric",
        metaDescription:
          "Doua fete ale Chardonnay-ului romanesc: citric de inox si untos de stejar, si cu ce le bei.",
        answer:
          "Chardonnay e un alb versatil: in inox e mar si citrice, in baric e unt, alune, vanilie. In Romania gasesti ambele, plus sticle care vor sa fie Burgundia la pret de supermarket. Alege textura dupa farfurie, nu dupa prestigiu.",
        intro:
          "Soiul nu are un singur gust. Are o crama. Daca „nu-ti place Chardonnay”, probabil nu-ti place stejarul dulce. Un Chardonnay de inox din Transilvania e alta bautura.",
        inTheGlass:
          "Mar, lamaie, piersica. Baricul adauga unt si fum dulce. Aciditatea trebuie sa ramana. Fara ea, e cocktail.",
        origin: "Burgundia. Azi peste tot, inclusiv in spumante romanesti.",
        inRomania:
          "Transilvania pastreaza tensiune. Dealu Mare si Dobrogea dau corp. Recas, Jidvei, Dealu Mare, Banat: stiluri diferite. Citeste daca a vazut lemn.",
        pairing:
          "Inox: peste, salate, pui. Baric: peste la cuptor, pui cu smantana, branza. Desertul cere un Chardonnay dulce, nu unul sec baricat.",
        howToChoose:
          "Decide inox sau baric inainte sa platesti. „Barrel fermented” sub 30 RON e adesea așchii, nu butoi. Value Score ajuta cand raftul e plin de acelasi nume.",
        facts: [
          { label: "Culoare", value: "Alb" },
          { label: "Origine", value: "Burgundia; foarte plantat in Romania" },
          { label: "Stil tipic", value: "Mar-citric sau unt-alune, dupa vinificatie" },
          { label: "La masa", value: "Peste, pui, sosuri cremoase daca e baricat" },
        ],
        faq: [
          {
            question: "Chardonnay e totdeauna cu stejar?",
            answer:
              "Nu. Multe sticle romanesti sunt de inox. Stejarul e o alegere, nu soarta soiului.",
          },
          {
            question: "E bun la peste?",
            answer:
              "Da, mai ales inox. Un baric greu langa pastrav simplu e prea mult.",
          },
          {
            question: "Il invechiesc?",
            answer:
              "Doar sticle cu aciditate si originea clara. Majoritatea, in 2-4 ani.",
          },
        ],
        sources: [{ label: "Ghid VinIntel de albe versatile" }],
      },
      en: {
        name: "Chardonnay",
        alsoKnownAs: [],
        metaTitle: "Chardonnay in Romania: steel or oak",
        metaDescription:
          "The two faces of Romanian Chardonnay, citrus steel and buttery oak, and what to eat with each.",
        answer:
          "Chardonnay is a versatile white: in steel it is apple and citrus, in oak it is butter, nuts, vanilla. Romania has both, plus bottles that want to be Burgundy at supermarket money. Choose texture for the plate, not prestige.",
        intro:
          "The grape has no single taste. It has a winery. If you „hate Chardonnay”, you probably hate sweet oak. A Transylvanian steel Chardonnay is another drink.",
        inTheGlass:
          "Apple, lemon, peach. Oak adds butter and sweet smoke. Acidity must remain. Without it, it is a cocktail.",
        origin: "Burgundy. Now everywhere, including Romanian sparkling.",
        inRomania:
          "Transylvania keeps tension. Dealu Mare and Dobrogea add body. Recas, Jidvei, Dealu Mare, Banat: different schools. Read whether it saw wood.",
        pairing:
          "Steel: fish, salads, chicken. Oak: baked fish, creamy chicken, cheese. Dessert wants a sweet Chardonnay, not a dry oaked one.",
        howToChoose:
          "Decide steel or oak before you pay. Barrel fermented under 30 RON is often chips, not a barrel. Value Score helps when the shelf is full of the same name.",
        facts: [
          { label: "Colour", value: "White" },
          { label: "Origin", value: "Burgundy; widely planted in Romania" },
          { label: "Typical style", value: "Apple-citrus or butter-nuts, by winemaking" },
          { label: "At the table", value: "Fish, chicken, creamy sauces if oaked" },
        ],
        faq: [
          {
            question: "Is Chardonnay always oaked?",
            answer:
              "No. Many Romanian bottles are steel. Oak is a choice, not the grape's fate.",
          },
          {
            question: "Is it good with fish?",
            answer:
              "Yes, especially steel. Heavy oak next to simple trout is too much.",
          },
          {
            question: "Should I cellar it?",
            answer:
              "Only bottles with acidity and a clear origin. Most are for 2 to 4 years.",
          },
        ],
        sources: [{ label: "VinIntel notes on versatile whites" }],
      },
    },
  },
  {
    slug: "riesling",
    color: "white",
    isIndigenous: false,
    styleProfileId: "riesling",
    aliases: ["riesling de rijn", "rhine riesling", "riesling weiss"],
    relatedSlugs: ["riesling-italian", "sarba", "feteasca-regala"],
    pairingDishSlugs: ["peste"],
    journalSlugs: [],
    copy: {
      ro: {
        name: "Riesling",
        alsoKnownAs: ["Riesling de Rin"],
        metaTitle: "Riesling (de Rin) in Romania: nu e Riesling italian",
        metaDescription:
          "Diferenta dintre Riesling de Rin si Riesling italian, si cum recunosti o sticla reala pe raftul romanesc.",
        answer:
          "Riesling-ul de Rin e un alb nobil, cu aciditate inalta, piersica, citrice si uneori petrol cu anii. In Romania e rar fata de Riesling italian (Welschriesling), care e alt soi. Daca eticheta zice doar „Riesling”, verifica. De multe ori bei italian, nu de Rin.",
        intro:
          "Confuzia e veche si costa bani. Cramele oneste scriu Riesling de Rin sau Rhine Riesling. Cele grabite scriu Riesling pe un Welschriesling. Nu e frauda in fiecare caz. E o lene de vocabular care te duce la alt gust.",
        inTheGlass:
          "Piersica, lamaie, flori, mineral. Aciditatea e nerv. Dulceata poate exista, dar trebuie tinuta de acid. Petrolul apare la sticle mai vechi, nu la un tânar de supermarket.",
        origin: "Germania / Alsacia. In Romania, oaspete pretentios.",
        inRomania:
          "Transilvania si colturi mai reci. Volume mici. Daca vrei soiul pe care il bei de fapt in majoritatea „Rieslingelor” locale, vezi pagina Riesling italian.",
        pairing:
          "Peste, bucatarie asiatica usoara, salate, carne alba. Un demisec tine bucate picante. Un sec tine sarea.",
        howToChoose:
          "Cauta „de Rin” sau „Rhine”. An recent, daca nu stii crama. Pretul de Welschriesling pentru un pretins Rin e un semnal.",
        facts: [
          { label: "Culoare", value: "Alb" },
          { label: "Origine", value: "Germania; rar in Romania" },
          { label: "Stil tipic", value: "Piersica, aciditate inalta, mineral" },
          { label: "Atentie", value: "Nu confunda cu Riesling italian" },
        ],
        faq: [
          {
            question: "Riesling si Riesling italian sunt acelasi soi?",
            answer:
              "Nu. Italianul e Welschriesling. De Rin e Riesling. In Romania, italianul e mult mai plantat.",
          },
          {
            question: "De ce miroase a petrol?",
            answer:
              "E un caracter de invechire la Riesling de Rin, nu o regula pentru sticle tinere.",
          },
          {
            question: "E totuna cu Sarba?",
            answer:
              "Nu. Sarba vine, printre altele, din linia de Riesling italian. E un soi romanesc separat.",
          },
        ],
        sources: [{ label: "Ghid VinIntel despre confuzia Riesling in Romania" }],
      },
      en: {
        name: "Riesling",
        alsoKnownAs: ["Rhine Riesling"],
        metaTitle: "Riesling in Romania: not Riesling italian",
        metaDescription:
          "The difference between Rhine Riesling and Welschriesling on Romanian labels.",
        answer:
          "Rhine Riesling is a noble white with high acidity, peach, citrus and, with age, petrol. In Romania it is rare next to Riesling italian (Welschriesling), another grape. If the label only says Riesling, check. You are often drinking the italian one.",
        intro:
          "The mix-up is old and costs money. Honest wineries write Rhine Riesling. Hasty ones write Riesling on Welschriesling. It is not always fraud. It is lazy vocabulary that lands you in another taste.",
        inTheGlass:
          "Peach, lemon, flowers, mineral. Acidity is the nerve. Sweetness can exist but must be held by acid. Petrol is for older bottles, not a young supermarket white.",
        origin: "Germany / Alsace. A demanding guest in Romania.",
        inRomania:
          "Transylvania and cooler corners. Small volumes. If you want the grape you actually drink in most local „Riesling” bottles, see Riesling italian.",
        pairing:
          "Fish, lighter Asian food, salads, white meat. Off-dry holds spice. Dry holds salt.",
        howToChoose:
          "Look for Rhine. Recent vintage if you do not know the estate. Welschriesling money for a claimed Rhine is a signal.",
        facts: [
          { label: "Colour", value: "White" },
          { label: "Origin", value: "Germany; rare in Romania" },
          { label: "Typical style", value: "Peach, high acid, mineral" },
          { label: "Watch-out", value: "Not the same as Riesling italian" },
        ],
        faq: [
          {
            question: "Are Riesling and Riesling italian the same grape?",
            answer:
              "No. The italian one is Welschriesling. Rhine Riesling is Riesling. In Romania the italian one is far more planted.",
          },
          {
            question: "Why the petrol smell?",
            answer:
              "It is an ageing character of Rhine Riesling, not a rule for young bottles.",
          },
          {
            question: "Is it the same as Sarba?",
            answer:
              "No. Sarba comes, in part, from the Welschriesling line. It is a separate Romanian grape.",
          },
        ],
        sources: [{ label: "VinIntel note on the Riesling mix-up in Romania" }],
      },
    },
  },
  {
    slug: "riesling-italian",
    color: "white",
    isIndigenous: false,
    styleProfileId: "riesling",
    aliases: [
      "riesling italian",
      "welschriesling",
      "olasz rizling",
      "riesling italico",
    ],
    relatedSlugs: ["riesling", "sarba", "feteasca-regala", "sauvignon-blanc"],
    pairingDishSlugs: ["peste"],
    journalSlugs: [],
    copy: {
      ro: {
        name: "Riesling italian",
        alsoKnownAs: ["Welschriesling"],
        metaTitle: "Riesling italian (Welschriesling): alb de masa in Romania",
        metaDescription:
          "Ce este Riesling italian, de ce nu e Riesling de Rin, si de ce umple podgoriile romanesti.",
        answer:
          "Riesling italian, Welschriesling, e un alb de masa cu mar, citrice si aciditate buna. Nu e Riesling de Rin. In Transilvania, Banat si Moldova e printre cele mai plantate albe. Da vinuri oneste de peste si de saptamana. Rareori da vinuri de contemplatie.",
        intro:
          "Numele insala. „Italian” nu inseamna un Riesling din Italia. Inseamna alt soi, raspandit in Europa Centrala. In Romania a fost calul de tractiune al albului de volum, alaturi de Feteasca Regala. Asta explica si sticlele slabe, si potentialul cand randamentul e tinut.",
        inTheGlass:
          "Mar verde, lamaie, flori discrete. Corpul e usor. Finalul trebuie uscat. Un italian moale e supra-productie.",
        origin:
          "Europa Centrala (Welschriesling). In Romania e oaspete vechi, nu un experiment.",
        inRomania:
          "Tarnave, Banat, Moldova, Oltenia. Jidvei si alte crame transilvane il stiu bine. Sarba, soiul de Odobesti, pleaca inclusiv din aceasta linie. Daca vrei parfum de muscat, nu e aici. Vezi Tamaioasa.",
        pairing:
          "Peste, ciorbe usoare, aperitive, pui simplu. Nu desert. Nu sarmale.",
        howToChoose:
          "An recent, pret onest. Nu plati pret de Rin pentru un italian. Daca crama scrie clar Welschriesling, e un semn de respect fata de tine.",
        facts: [
          { label: "Culoare", value: "Alb" },
          { label: "Origine", value: "Europa Centrala; foarte plantat in RO" },
          { label: "Stil tipic", value: "Mar, citrice, aciditate, corp usor" },
          { label: "La masa", value: "Peste, aperitive, saptamana" },
        ],
        faq: [
          {
            question: "De ce se cheama italian daca nu e din Italia?",
            answer:
              "E o denumire istorica din Europa Centrala. Soiul e Welschriesling. Nu e Riesling de Rin si nu e neaparat „din Italia”.",
          },
          {
            question: "E mai bun Feteasca Regala?",
            answer:
              "Adesea e mai prezentă. Italianul bun e mai discret. Alege dupa sticla, nu dupa prestigiu.",
          },
          {
            question: "Sarba e Riesling italian?",
            answer:
              "Nu. Sarba e un soi romanesc care are Riesling italian in genealogie. E o ruda de cercetare, nu acelasi strugure.",
          },
        ],
        sources: [{ label: "Ghid VinIntel despre albe de masa romanesti" }],
      },
      en: {
        name: "Riesling italian",
        alsoKnownAs: ["Welschriesling"],
        metaTitle: "Riesling italian (Welschriesling) in Romania",
        metaDescription:
          "What Riesling italian is, why it is not Rhine Riesling, and why it fills Romanian vineyards.",
        answer:
          "Riesling italian, Welschriesling, is a table white with apple, citrus and decent acidity. It is not Rhine Riesling. In Transylvania, Banat and Moldova it is among the most planted whites. It makes honest fish and weekday wines. It rarely makes contemplation wines.",
        intro:
          "The name misleads. Italian does not mean a Riesling from Italy. It is another grape of Central Europe. In Romania it was a workhorse of bulk white, next to Feteasca Regala. That explains weak bottles and the potential when yields are kept down.",
        inTheGlass:
          "Green apple, lemon, quiet flowers. Light body. The finish should be dry. Soft italian is overcropping.",
        origin: "Central Europe (Welschriesling). An old guest in Romania.",
        inRomania:
          "Tarnave, Banat, Moldova, Oltenia. Jidvei and other Transylvanian estates know it well. Sarba, the Odobesti grape, comes partly from this line. If you want muscat perfume, this is not it.",
        pairing: "Fish, lighter soups, starters, simple chicken. Not dessert. Not sarmale.",
        howToChoose:
          "Recent vintage, honest price. Do not pay Rhine money for italian. If the winery writes Welschriesling clearly, it is respect for the buyer.",
        facts: [
          { label: "Colour", value: "White" },
          { label: "Origin", value: "Central Europe; widely planted in Romania" },
          { label: "Typical style", value: "Apple, citrus, acid, light body" },
          { label: "At the table", value: "Fish, starters, weeknights" },
        ],
        faq: [
          {
            question: "Why is it called italian if it is not from Italy?",
            answer:
              "It is a Central European name. The grape is Welschriesling. It is not Rhine Riesling and not necessarily „from Italy”.",
          },
          {
            question: "Is Feteasca Regala better?",
            answer:
              "It is often more present. Good italian is quieter. Choose the bottle, not the prestige.",
          },
          {
            question: "Is Sarba Riesling italian?",
            answer:
              "No. Sarba is a Romanian grape with Welschriesling in its background. Related by breeding, not the same vine.",
          },
        ],
        sources: [{ label: "VinIntel notes on Romanian table whites" }],
      },
    },
  },
  {
    slug: "pinot-gris",
    color: "white",
    isIndigenous: false,
    styleProfileId: "default-white",
    aliases: ["pinot gris", "pinot grigio", "pinot gri"],
    relatedSlugs: ["chardonnay", "pinot-noir", "feteasca-alba"],
    pairingDishSlugs: ["peste"],
    journalSlugs: [],
    copy: {
      ro: {
        name: "Pinot Gris",
        alsoKnownAs: ["Pinot Grigio"],
        metaTitle: "Pinot Gris in Romania: corp mediu, nu doar apa aromata",
        metaDescription:
          "Pinot Gris versus Grigio pe etichetele romanesti: cand e un alb de masa serios si cand e umplutura.",
        answer:
          "Pinot Gris e un alb de corp mediu, cu par, miere usoara si textura. Pinot Grigio, pe etichete, e adesea acelasi soi vinificat mai sec si mai slab. In Romania poti gasi de la apa cu parfum pana la vinuri cu greutate. Citeste crama, nu doar numele italian.",
        intro:
          "Soiul e Pinot Gris, ruda cu Pinot Noir. Stilul „Grigio” de supermarket e o alegere de piata. Nu e o varietate separata magica.",
        inTheGlass:
          "Par, mar, miere, uneori fum. Corpul e cheia. Daca e apos, e randament. Un Gris bun are textura, chiar sec.",
        origin: "Familia Pinot, Alsacia / Italia de nord ca scoli de stil.",
        inRomania:
          "Banat, Transilvania, Dealu Mare. Recas si alte crame de volum il fac accesibil. Cramele mici il pot tine pe drojdii, mai serios.",
        pairing:
          "Peste la cuptor, pui, quiche, branza semi-matura. Un Grigio foarte slab tine doar aperitivul.",
        howToChoose:
          "Daca vrei textura, cauta Gris sau mentiune de drojdii. Daca vrei doar rece si ieftin, Grigio de an recent. Nu plati pret de Alsacia pentru o sticla de umplutura.",
        facts: [
          { label: "Culoare", value: "Alb (uneori cupru pal)" },
          { label: "Origine", value: "Familia Pinot; plantat in Romania" },
          { label: "Stil tipic", value: "Par, textura, corp mediu" },
          { label: "La masa", value: "Peste la cuptor, pui, branza" },
        ],
        faq: [
          {
            question: "Gris si Grigio sunt soiuri diferite?",
            answer:
              "Nu. E acelasi strugure, scoli de vinificatie diferite. Grigio e de obicei mai sec si mai usor.",
          },
          {
            question: "E aromat ca Tamaioasa?",
            answer: "Nu. E despre textura, nu despre tei si muscat.",
          },
          {
            question: "Merge la gratar de peste?",
            answer:
              "Da, daca are corp. Un Grigio apos dispare langa piele rumenita.",
          },
        ],
        sources: [{ label: "Ghid VinIntel de albe cu textura" }],
      },
      en: {
        name: "Pinot Gris",
        alsoKnownAs: ["Pinot Grigio"],
        metaTitle: "Pinot Gris in Romania: medium body, not scented water",
        metaDescription:
          "Pinot Gris versus Grigio on Romanian labels, and when it is a serious table white.",
        answer:
          "Pinot Gris is a medium-bodied white with pear, light honey and texture. Pinot Grigio on labels is often the same grape, vinified drier and thinner. In Romania you can find anything from scented water to wines with weight. Read the winery, not only the Italian name.",
        intro:
          "The grape is Pinot Gris, related to Pinot Noir. Supermarket Grigio is a market choice, not a magic separate variety.",
        inTheGlass:
          "Pear, apple, honey, sometimes smoke. Body is the key. Watery means yield. A good Gris has texture even when dry.",
        origin: "The Pinot family. Alsace and northern Italy as style schools.",
        inRomania:
          "Banat, Transylvania, Dealu Mare. Volume wineries make it affordable. Smaller estates can keep it on lees, more serious.",
        pairing:
          "Baked fish, chicken, quiche, semi-aged cheese. A very thin Grigio only holds an aperitif.",
        howToChoose:
          "If you want texture, look for Gris or lees notes. If you want cheap and cold, a recent Grigio. Do not pay Alsace money for filler.",
        facts: [
          { label: "Colour", value: "White, sometimes pale copper" },
          { label: "Origin", value: "Pinot family; planted in Romania" },
          { label: "Typical style", value: "Pear, texture, medium body" },
          { label: "At the table", value: "Baked fish, chicken, cheese" },
        ],
        faq: [
          {
            question: "Are Gris and Grigio different grapes?",
            answer:
              "No. Same vine, different schools. Grigio is usually drier and lighter.",
          },
          {
            question: "Is it as aromatic as Tamaioasa?",
            answer: "No. It is about texture, not linden and muscat.",
          },
          {
            question: "With grilled fish?",
            answer:
              "Yes if it has body. Watery Grigio vanishes next to crisp skin.",
          },
        ],
        sources: [{ label: "VinIntel notes on textured whites" }],
      },
    },
  },
  {
    slug: "muscat-ottonel",
    color: "white",
    isIndigenous: false,
    styleProfileId: "muscat-ottonel",
    aliases: ["muscat ottonel", "muscat", "ottone"],
    relatedSlugs: ["tamaioasa-romaneasca", "busuioaca-de-bohotin", "sarba"],
    pairingDishSlugs: ["cozonac"],
    journalSlugs: ["tamaioasa-romaneasca-vs-alte-arome-florale"],
    copy: {
      ro: {
        name: "Muscat Ottonel",
        alsoKnownAs: ["Muscat"],
        metaTitle: "Muscat Ottonel in Romania: parfum direct, nu Tamaioasa",
        metaDescription:
          "Cum se deosebeste Muscat Ottonel de Tamaioasa Romaneasca si cand e aperitiv sau desert.",
        answer:
          "Muscat Ottonel e un alb aromat international, cu strugure, flori si muscat evident. In Romania e confuzat cu Tamaioasa. Ottonel e de obicei mai direct, mai „strugure de masa”. Poate fi sec sau dulce. Sec, e aperitiv. Dulce, tine prajitura. Nu e vin de sarmale.",
        intro:
          "E soiul pe care il recunosti din prima gura. Daca vrei subtilitate, Tamaioasa seaca de crama buna sau o Feteasca pot fi mai interesante. Daca vrei semnal aromatic clar, Ottonel isi face treaba.",
        inTheGlass:
          "Strugure, flori de portocal, muscat. Corpul e usor-mediu. Zaharul variaza. Fara aciditate, e parfum ieftin.",
        origin: "Familia Muscat, Ottonel e o selectie din secolul XIX, azi in Europa Centrala si in Romania.",
        inRomania:
          "Transilvania, Moldova, Banat. Adesea in linii de volum. Cramele bune il tin sec si curat. Cele slabe adauga zahar ca sa para „premium”.",
        pairing:
          "Aperitiv, fructe, cozonac daca e dulce, branza proaspata. Pestele la gratar cere altceva, in afara de un Ottonel foarte sec si un peste foarte simplu.",
        howToChoose:
          "Citeste sec/demisec. Compara cu o Tamaioasa din acelasi pret. Daca sunt identice, una dintre crame n-are ce spune.",
        facts: [
          { label: "Culoare", value: "Alb aromat" },
          { label: "Origine", value: "Familia Muscat; plantat in Romania" },
          { label: "Stil tipic", value: "Strugure, flori, muscat direct" },
          { label: "La masa", value: "Aperitiv, desert daca e dulce" },
        ],
        faq: [
          {
            question: "E acelasi lucru cu Tamaioasa?",
            answer:
              "Nu. Registru asemanator, soiuri diferite. Tamaioasa e autohtona. Ottonel e Muscat.",
          },
          {
            question: "De ce e atat de parfumat?",
            answer:
              "Asa e familia Muscat. Daca te deranjeaza, alege Feteasca sau Cramposie.",
          },
          {
            question: "Il pun la nunta?",
            answer:
              "Ca aperitiv, da, daca e sec sau usor demisec. La felul principal, urmeaza meniul.",
          },
        ],
        sources: [{ label: "Ghid VinIntel Tamaioasa vs florale" }],
      },
      en: {
        name: "Muscat Ottonel",
        alsoKnownAs: ["Muscat"],
        metaTitle: "Muscat Ottonel in Romania: louder than Tamaioasa",
        metaDescription:
          "How Muscat Ottonel differs from Tamaioasa Romaneasca, and when it is aperitif or dessert.",
        answer:
          "Muscat Ottonel is an international aromatic white: grape, flowers, obvious muscat. In Romania it is mixed up with Tamaioasa. Ottonel is usually more direct, more table-grape. It can be dry or sweet. Dry is an aperitif. Sweet holds pastry. It is not a sarmale wine.",
        intro:
          "You recognise it on the first sip. If you want subtlety, a good dry Tamaioasa or a Feteasca may be more interesting. If you want a clear aromatic signal, Ottonel does the job.",
        inTheGlass:
          "Grape, orange blossom, muscat. Light to medium body. Sugar varies. Without acidity it is cheap perfume.",
        origin:
          "The Muscat family. Ottonel is a nineteenth-century selection, now in Central Europe and Romania.",
        inRomania:
          "Transylvania, Moldova, Banat. Often a volume line. Good estates keep it dry and clean. Weak ones add sugar to look premium.",
        pairing:
          "Aperitif, fruit, cozonac if sweet, fresh cheese. Grilled fish wants something else, unless the Ottonel is very dry and the fish is very simple.",
        howToChoose:
          "Read dryness. Compare it with a Tamaioasa at the same price. If they taste identical, one winery has nothing to say.",
        facts: [
          { label: "Colour", value: "Aromatic white" },
          { label: "Origin", value: "Muscat family; planted in Romania" },
          { label: "Typical style", value: "Grape, flowers, direct muscat" },
          { label: "At the table", value: "Aperitif, dessert if sweet" },
        ],
        faq: [
          {
            question: "Is it the same as Tamaioasa?",
            answer:
              "No. Similar register, different grapes. Tamaioasa is indigenous. Ottonel is Muscat.",
          },
          {
            question: "Why is it so perfumed?",
            answer:
              "That is the Muscat family. If it bothers you, pick Feteasca or Cramposie.",
          },
          {
            question: "For a wedding?",
            answer:
              "As an aperitif, yes, if dry or lightly off-dry. For the main course, follow the menu.",
          },
        ],
        sources: [{ label: "VinIntel guide to Tamaioasa versus florals" }],
      },
    },
  },
  {
    slug: "traminer",
    color: "white",
    isIndigenous: false,
    styleProfileId: "traminer",
    aliases: [
      "traminer",
      "gewurztraminer",
      "gewürztraminer",
      "traminer roz",
      "traminer aromatic",
    ],
    relatedSlugs: ["tamaioasa-romaneasca", "muscat-ottonel", "pinot-gris"],
    pairingDishSlugs: ["cozonac"],
    journalSlugs: [],
    copy: {
      ro: {
        name: "Traminer",
        alsoKnownAs: ["Gewurztraminer", "Traminer roz"],
        metaTitle: "Traminer in Romania: lychee, trandafir, atentie la zahar",
        metaDescription:
          "Traminer si Gewurztraminer pe etichetele romanesti: parfum, corp si cand zaharul strange capcana.",
        answer:
          "Traminer, adesea Gewurztraminer sau Traminer roz, e un alb (uneori roz pal) cu lychee, trandafir si condiment. Are corp. Are alcool. Are parfum. In Romania e mai rar. Cand e sec, tine bucate condimentate. Cand e dulce fara acid, e greu. Nu e un Sauvignon de vara.",
        intro:
          "E soiul care umple camera. Daca Tamaioasa e tei, Traminer e trandafir si litchi. Confuzia de nume pe eticheta (Traminer / Gewurz / roz) cere un ochi. Cere si o gura inainte sa cumperi sase sticle pentru nunta.",
        inTheGlass:
          "Lychee, trandafir, ghimbir, grapefruit roz. Corpul e mediu-plin. Aciditatea e adesea mai joasa. De-aia zaharul e periculos. Fara nerv, ramane parfum de sapun scump.",
        origin: "Familia Traminer, Alsacia ca scoala de referinta pentru Gewurztraminer.",
        inRomania:
          "Transilvania, Banat, cateva enclave. Volume mici. Unele crame il lasa demisec ca sa fie „usor de vandut”. Citeste eticheta.",
        pairing:
          "Bucate condimentate, branza tare, cozonac daca e dulce, rata daca e sec si are corp. Pestele delicat dispare.",
        howToChoose:
          "Sec sau demisec cu acid, nu dulce clisos. O sticla e destul ca sa stii daca iti place soiul. Nu e un vin de baut in fiecare seara pentru toata lumea.",
        facts: [
          { label: "Culoare", value: "Alb sau roz pal, aromat" },
          { label: "Origine", value: "Familia Traminer; rar in Romania" },
          { label: "Stil tipic", value: "Lychee, trandafir, corp, alcool" },
          { label: "La masa", value: "Condimente, branza, desert daca e dulce" },
        ],
        faq: [
          {
            question: "Traminer e Gewurztraminer?",
            answer:
              "Gewurztraminer e un membru aromatic al familiei. Pe etichetele romanesti, numele se suprapun. Citeste stilul, nu doar cuvantul.",
          },
          {
            question: "E mai bun decat Tamaioasa?",
            answer:
              "E mai corpulent si adesea mai condimentat. Tamaioasa e mai locala. Alege dupa farfurie.",
          },
          {
            question: "Il pun la mici?",
            answer:
              "Nu. Prea parfumat, prea putina aciditate pentru fum si grasime. Ia un rosu.",
          },
        ],
        sources: [{ label: "Ghid VinIntel de soiuri aromate" }],
      },
      en: {
        name: "Traminer",
        alsoKnownAs: ["Gewurztraminer", "Traminer roz"],
        metaTitle: "Traminer in Romania: lychee, rose, watch the sugar",
        metaDescription:
          "Traminer and Gewurztraminer on Romanian labels: perfume, body, and when sugar becomes a trap.",
        answer:
          "Traminer, often Gewurztraminer or Traminer roz, is a white (sometimes pale rose) with lychee, rose and spice. It has body, alcohol and perfume. In Romania it is uncommon. Dry, it can hold spiced food. Sweet without acid is heavy. It is not a summer Sauvignon.",
        intro:
          "The grape fills the room. If Tamaioasa is linden, Traminer is rose and lychee. Label names overlap. Taste one bottle before you buy six for a wedding.",
        inTheGlass:
          "Lychee, rose, ginger, pink grapefruit. Medium to full body. Acidity is often lower. That is why sugar is dangerous. Without nerve it is expensive soap.",
        origin: "The Traminer family. Alsace is the reference school for Gewurztraminer.",
        inRomania:
          "Transylvania, Banat, a few enclaves. Small volumes. Some estates leave it off-dry to sell easier. Read the label.",
        pairing:
          "Spiced food, hard cheese, cozonac if sweet, duck if dry and bodied. Delicate fish vanishes.",
        howToChoose:
          "Dry or off-dry with acid, not cloying sweet. One bottle tells you if you like the grape. It is not everyone's Tuesday wine.",
        facts: [
          { label: "Colour", value: "White or pale rose, aromatic" },
          { label: "Origin", value: "Traminer family; uncommon in Romania" },
          { label: "Typical style", value: "Lychee, rose, body, alcohol" },
          { label: "At the table", value: "Spice, cheese, dessert if sweet" },
        ],
        faq: [
          {
            question: "Is Traminer Gewurztraminer?",
            answer:
              "Gewurztraminer is the aromatic member of the family. On Romanian labels the names overlap. Read the style, not only the word.",
          },
          {
            question: "Is it better than Tamaioasa?",
            answer:
              "It is fuller and often spicier. Tamaioasa is more local. Choose for the plate.",
          },
          {
            question: "With mici?",
            answer:
              "No. Too much perfume, not enough acid for smoke and fat. Take a red.",
          },
        ],
        sources: [{ label: "VinIntel notes on aromatic grapes" }],
      },
    },
  },
];
