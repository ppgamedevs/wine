# Romanian sommelier comparison engine

## Architecture

The comparison path is deterministic first and language-model second:

1. `parseComparisonIntent()` detects a style comparison and extracts the
   reference, claimed origin and claimed vintage.
2. The route loads the public catalog, optional structured claim evidence and
   optional bottle-specific vintage evidence.
3. `findClosestRomanianWines()` builds a style vector for every eligible wine,
   scores it against the reference and returns one best match plus 2-3
   alternatives.
4. `formatComparisonContext()` writes a grounded evidence block into the chat
   system prompt. The model narrates that block; it does not choose the wines
   or invent facts.
5. Recommendation cards are limited to the returned catalog slugs; a comparison
   may return four bottles, while normal chat remains at three.

The pure engine can be tested without a database or model.

## Similarity dimensions

| Dimension | Weight | Source |
|---|---:|---|
| Colour | 16 | catalog wine type |
| Body | 11 | catalogue technical/style data plus variety/notes |
| Acidity | 12 | published acidity when present, otherwise style inference |
| Tannin | 9 | red type plus tasting notes/variety |
| Alcohol | 6 | published alcohol when present |
| Sweetness | 6 | catalog sweetness |
| Aromatic profile | 12 | variety knowledge plus tasting notes |
| Oak | 6 | variety style plus tasting notes |
| Freshness | 8 | acidity and style |
| Ageability | 5 | cellar potential and structure |
| Food affinity | 6 | curated pairings plus variety knowledge |
| Climate cue | 3 | Romanian region cue |

The score is a weighted average over dimensions that have evidence. Missing
dimensions are excluded rather than filled with zero. A colour mismatch is
penalised. Confidence reflects dimension coverage and missing data, not a claim
of objective quality.

## Evidence separation

Each match carries:

- **Confirmed VinIntel facts**: colour, sweetness, alcohol, acidity, vintage,
  winery, region, grapes, cellar potential, and verified/corroborated claims.
- **Evidence-based interpretation**: body, tannin, oak, aromatic profile,
  freshness and climate inferred from variety knowledge, tasting notes or
  region. The interpolation is labelled.
- **Uncertainty**: missing acidity, alcohol, tasting notes, climate cue or
  structured vintage assessment.

The prompt requires the same three labels in the final answer. Awards, vintages,
winery facts and tasting notes are never created to fill a gap.

## Incorrect premises

The reference registry records origin and grape. A comparison such as
"Chianti from Sicily 2007" produces:

- a correction that Chianti is Tuscan, not Sicilian;
- preservation of the intended Sangiovese/Chianti style request;
- the claimed vintage recorded as a user premise, not as a quality rating;
- a normal Romanian match result.

Unknown references do not silently become a Romanian grape.

## Romanian reference knowledge

The engine contains structured style notes for Romanian varieties including
Feteasca Neagra, Cadarca, Negru de Dragasani, Novac, Babeasca Neagra, Feteasca
Alba, Feteasca Regala, Cramposie, Mustoasa de Maderat, Grasa de Cotnari,
Tamaioasa Romaneasca and Busuioaca de Bohotin. These are variety-level
generalizations, not bottle facts. They are combined with each bottle's own
catalog fields and notes.

## Family and vintage links

A read-time family key uses winery plus the product name with vintage and bottle
format removed. The top matches expose other releases in the same family as
`familyLinks`; bottles are never merged.

Bottle-specific vintage evidence is read only when a `vintage_evidence` table
with `scope = 'wine'` is present. The query is fail-closed: absent table,
incompatible schema or a network error means "vintage evidence unavailable". A
regional or national vintage classification is never copied onto a bottle.

## Example QA outputs

These examples use a small test catalog. Real scores change with the catalog.

### Chianti

**Question:** What Romanian wine is closest to Chianti?

**Answer shape:** best match Cadarca Minis 2020, with Feteasca Neagra Dealu Mare
2021 and Negru de Dragasani 2021 as alternatives. Reasons: similar red colour,
medium body and firm tannin. Differences: Cadarca has its own aromatic profile,
higher acidity and a different food affinity. Confirmed facts are limited to
catalog fields; climate is listed as an uncertainty where it is not explicit.

### Sangiovese

**Question:** I like Sangiovese. What Romanian wine should I try?

**Answer shape:** Cadarca is the closest structural bridge, with Feteasca Neagra
and Negru de Dragasani as alternatives. The answer explicitly says no
Sangiovese bottle is being passed off as Romanian.

### Dry Riesling

**Question:** If I enjoy dry Riesling, what Romanian wine is the nearest
equivalent?

**Answer shape:** Mustoasa de Maderat is the closest high-acid white, with
Feteasca Regala as the fresher alternative. The answer says the match is
structural, not a claim that Mustoasa smells like Riesling.

### False premise

**Question:** What Romanian wine is closest to Chianti from Sicily 2007?

**Answer shape:** first corrects that Chianti is Tuscan, not Sicilian; then
answers the intended style question. The year is retained as a user premise, not
turned into an invented vintage rating.

## Guardrails

- The model receives only catalog candidates selected by the engine.
- Exact slugs are extracted from the response; unknown slugs are discarded.
- Four recommendation cards are allowed only in comparison mode.
- The prompt forbids invented awards, vintages, prices, winery facts and tasting
  notes.
- If no eligible Romanian bottle exists, the comparison returns no result and
  the normal honest grounding path applies.
