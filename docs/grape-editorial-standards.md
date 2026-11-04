# Grape variety editorial standards

## Template contract

Every variety page can now carry:

- `answer`: the short, useful summary used in the hero and cards;
- `facts`: compact, scannable facts;
- `intro`, `inTheGlass`, `origin`, `inRomania`, `pairing`, `howToChoose`: the
  long-form editorial body;
- `tastingProfile`: aroma, palate, structure and finish;
- `editorialSections`: structured sections explicitly typed as `verified`,
  `generalization` or `interpretation`;
- `buyingChecklist`: what to inspect on the shelf;
- `whatCanGoWrong`: realistic stylistic faults;
- `faq` and `sources`.

All fields are optional except the existing copy, so older guides remain valid
and can be upgraded incrementally.

## Voice rules

1. **Lead with a point of view.** Explain why the variety is interesting or
   difficult, not merely that it exists.
2. **Be precise.** Name the style, the structural reason and the condition under
   which it works. Avoid “good for fish” without explaining acidity, salt or fat.
3. **Qualify honestly.** Use “in successful examples”, “often”, “can” and
   “depends on”. Do not turn a regional pattern into a guarantee for every bottle.
4. **Stay grounded in Romanian wine reality.** Reference real regions and
   producers only when supported. Do not import a foreign benchmark as a fact.
5. **Keep the three epistemic layers separate.** Mark verified statements,
   stylistic generalisations and editorial interpretation explicitly.
6. **No numeric quality score without a published, evidence-backed method.**
7. **No invented tasting notes, awards, prices or bottle condition.**
8. **No em or en dashes.** Use commas, colons and full stops.

## Editorial sequence

1. Short summary: what the wine is and why it matters.
2. Useful facts.
3. Tasting profile.
4. What a strong example tastes like.
5. Origin and regional context.
6. Where it matters in Romania.
7. Food-pairing logic.
8. Buying guidance.
9. What can go wrong stylistically.
10. Sources and confidence.

## Localisation

RO and EN are authored independently: the English version should read as an
English wine article, not a literal translation. Protected variety and place
names stay unchanged. The epistemic labels are localised too.

## Current exemplar

The Mustoasa de Maderat page is the first exemplar:

```bash
/soiuri/mustoasa-de-maderat
```

Preview:
- [Editorial desktop](mustoasa-editorial-desktop.png)
- [Editorial mobile](mustoasa-editorial-mobile.png)
- [Hero and image credit](mustoasa-hero-desktop.png)

## Rollout recommendations

- Upgrade the highest-search indigenous varieties first: Feteasca Neagra,
  Feteasca Regala, Feteasca Alba, Grasa de Cotnari, Busuioaca de Bohotin,
  Cadarca, Sarba and Babeasca Neagra.
- Do not batch-generate prose. Each page needs at least one genuine editorial
  angle and one realistic limitation.
- Keep `sources` close to the claims they support; split “producer claim” from
  independent assessment when that distinction matters.
- Add a structured tasting profile only when there is enough stylistic evidence;
  otherwise leave it absent rather than invent descriptors.
- Pair each upgrade with a Mustoasa-style browser check for the new sections.
