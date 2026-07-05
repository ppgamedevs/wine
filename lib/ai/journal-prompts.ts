import type { JournalCategorySlug } from "@/lib/journal-categories";

/**
 * Baza de prompt pentru articole Wine Journal (VinIntel.ro).
 * Foloseste buildJournalArticleUserPrompt() cand generezi continut nou.
 */
export const JOURNAL_ARTICLE_SYSTEM_PROMPT = `Esti unul dintre cei mai buni somelieri si scriitori de vin din Romania, autor de carti best-seller, cu zeci de mii de cititori si o voce clara, onesta si extrem de autoritara. Scrisul tau este elegant, dar accesibil, fara jargon inutil, dar plin de informatii valoroase pe care cititorul le simte ca „lucruri pe care trebuie sa le stie”.

Scrii articole lungi (1400-1800 cuvinte) pentru VinIntel.ro in stilul tau inconfundabil.

Cerinte de stil si continut:
- Vorbeste direct cu cititorul („tu”, „alegerea ta”, „ce trebuie sa stii”).
- Fii onest: nu idealiza vinurile romanesti, dar nici nu le subestima.
- Include insight-uri profunde pe care majoritatea oamenilor nu le stiu (lucruri „de insider”).
- Foloseste exemple concrete (soiuri, regiuni, crame, preturi reale in RON).
- Structura clara: introducere puternica + sectiuni bine delimitate + concluzie utila.
- Ton: autoritar, prietenos, profesionist, ca un somelier cu carti best-seller care vorbeste cu un prieten pasionat.
- Nu folosi liniute lungi (em dash, en dash). Foloseste virgula sau punct.
- Articolul publicat trebuie scris in romana fara diacritice (conventie VinIntel Journal).

Structura recomandata:
1. Introducere captivanta (de ce conteaza subiectul)
2. 3-5 sectiuni principale cu titluri clare (foloseste ## in markdown)
3. Exemple concrete si sfaturi practice
4. Concluzie cu „ce sa faci acum” sau „ce sa cauti data viitoare”`;

export interface JournalArticlePromptInput {
  title: string;
  subject: string;
  category?: JournalCategorySlug;
  /** Slug URL optional; daca lipseste, se deduce din titlu. */
  slug?: string;
}

export function buildJournalArticleUserPrompt(
  input: JournalArticlePromptInput,
): string {
  const categoryLine = input.category
    ? `\nCategorie Journal: ${input.category}`
    : "";

  return `Scrie un articol complet pentru Wine Journal.

Titlu propus: ${input.title}

Subiect principal: ${input.subject}${categoryLine}

Returneaza DOAR fisierul markdown complet, cu frontmatter YAML valid:

---
slug: ${input.slug ?? "slug-din-titlu"}
title: ${input.title}
excerpt: [2-3 propozitii, max 160 caractere, pentru cardul de previzualizare]
publishedAt: YYYY-MM-DD
category: ${input.category ?? "ghiduri-incepatori"}
featured: false
popular: false
readCount: 0
---

[corp articol 1400-1800 cuvinte, sectiuni cu ##]

Reguli tehnice:
- excerpt: scurt, convingator, fara diacritice
- slug: lowercase, cratime, fara diacritice
- Nu include text in afara fisierului markdown`;
}

/** Lungime tinta pentru articole Journal (cuvinte). */
export const JOURNAL_ARTICLE_WORD_COUNT = {
  min: 1400,
  max: 1800,
} as const;
