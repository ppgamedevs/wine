# AI Sommelier customer-experience audit

## Exact reproduction

Request:

```text
zi-mi un vin bun de la mega sub 30 de lei
```

Previous production behavior:

- said no good wines exist below 30 RON;
- made an unsupported market claim;
- mocked the budget and suggested beer;
- pushed the user toward 40-45 RON;
- leaked `RECOMMENDED_SLUGS:` into visible text.

## Root causes

1. The base prompt rewarded a sarcastic, cynical persona and included a mocking
   example about cheap food and customers.
2. The model was asked to emit `RECOMMENDED_SLUGS:` as an internal transport
   marker. Recommendation cards were parsed from that marker, so the marker was
   part of the streamed user text.
3. The budget filter treats a missing verified price as ineligible under a hard
   budget. That is correct, but grounding called the result
   `budget_excludes_all`, which the model could turn into a claim about all
   wines below 30 RON.
4. There was no retailer entity, no separate retailer-availability state and no
   distinction between:
   - empty catalog;
   - no verified public price;
   - no verified retailer stock;
   - budget exclusion;
   - retrieval failure.

## New behavior

- A retailer detector recognizes Mega and Mega Image.
- Mega Image is explicitly marked as having no licensed live stock/price feed.
  The catalog is never treated as proof of store availability.
- `sub 30` remains a strict, exclusive budget.
- Availability diagnosis keeps the five cases separate.
- When there is no eligible candidate, the route returns a deterministic safe
  answer instead of calling the model. It cannot insult, upsell, invent stock or
  leak markers.
- Recommendation cards come from the structured `data-recommendations` payload
  built from validated candidates. The model no longer emits a slug marker.
- The visible-text sanitizer removes complete, empty and partial marker chunks.
- Low-quality/zero-recommendation answers are recorded with `answerQuality:
  "low"` and availability metadata for internal diagnostics. They do not count
  toward the PSEO high-quality gate.

## Exact response after the fix

```text
Catalogul are vinuri, dar niciunul nu are o ofertă Profitshare verificată și
proaspătă sub 30 lei. Nu pot verifica un preț de raft sau disponibilitatea din
asta. Pentru Mega Image, nu am date licențiate de stoc sau preț live, așa că nu
pot confirma că o sticlă este în acel magazin. Un pas util: caută un vin sec,
proaspăt, cu aciditate vie sub 30 lei, verifică eticheta pentru produsul și
volumul exact, apoi confirmă prețul pe raft în magazin. Te pot ajuta și cu
criterii de stil, fără să pretind că știu stocul live.
```

Screenshot: [`sommelier-mega-under30.png`](sommelier-mega-under30.png).

## Public price policy

Only a fresh, exact-product Profitshare offer can be displayed as a public price
or used as a purchase link. The retailer lookup is a separate availability
concern and is currently unavailable rather than silently substituted with
non-affiliate data.
