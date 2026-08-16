import { ROMANIAN_DESSERT_KEYWORDS } from "@/lib/dessert-pairings";
import type { BudgetConstraint } from "@/lib/recommendation/types";
import type { WineWithRelations } from "@/types";

export type ColorPreference = "any" | "red" | "white" | "rose" | "sparkling";
export type SweetnessPreference = "any" | "sec" | "demisec" | "demidulce" | "dulce";

export type OccasionId =
  | "oricare"
  | "nunta"
  | "cadou"
  | "cadou-business"
  | "cina-romantica"
  | "sarmale"
  | "gratar"
  | "petrecere"
  | "sarbatori"
  | "pentru-desert";

export interface SommelierInput {
  budgetMin: number;
  budgetMax: number;
  budgetSpecified: boolean;
  occasion: OccasionId;
  color: ColorPreference;
  sweetness: SweetnessPreference;
  preferredWinerySlugs: string[];
  absurdRequest: boolean;
  budgetConstraint?: BudgetConstraint;
  dish?: string | null;
}

export interface OccasionConfig {
  id: OccasionId;
  label: string;
  description: string;
  weights: { value: number; gift: number; food: number };
  preferredTypes: WineWithRelations["type"][];
  dishKeywords: string[];
  rationale: string;
}

export const OCCASIONS: OccasionConfig[] = [
  {
    id: "oricare",
    label: "Oricare ocazie",
    description: "Recomandari echilibrate, raport calitate-pret",
    weights: { value: 0.7, gift: 0.15, food: 0.15 },
    preferredTypes: [],
    dishKeywords: [],
    rationale: "echilibru bun intre calitate si pret",
  },
  {
    id: "nunta",
    label: "Nunta",
    description: "Impresie buna, potrivit pentru multi invitati",
    weights: { value: 0.4, gift: 0.45, food: 0.15 },
    preferredTypes: ["sparkling", "white", "rose"],
    dishKeywords: [],
    rationale: "face impresie la evenimente mari",
  },
  {
    id: "cadou",
    label: "Cadou",
    description: "Vin care arata si se simte premium",
    weights: { value: 0.3, gift: 0.6, food: 0.1 },
    preferredTypes: [],
    dishKeywords: [],
    rationale: "se prezinta excelent ca dar",
  },
  {
    id: "cadou-business",
    label: "Cadou business",
    description: "Prestigiu si siguranta pentru parteneri",
    weights: { value: 0.25, gift: 0.65, food: 0.1 },
    preferredTypes: ["red"],
    dishKeywords: [],
    rationale: "transmite prestigiu intr-un context profesional",
  },
  {
    id: "cina-romantica",
    label: "Cina romantica",
    description: "Elegant, rafinat, pentru doua persoane",
    weights: { value: 0.4, gift: 0.3, food: 0.3 },
    preferredTypes: ["red", "white"],
    dishKeywords: ["peste", "paste", "branza", "somon"],
    rationale: "creeaza o atmosfera rafinata la cina in doi",
  },
  {
    id: "sarmale",
    label: "Sarmale",
    description: "Pentru masa traditionala romaneasca",
    weights: { value: 0.4, gift: 0.05, food: 0.55 },
    preferredTypes: ["red"],
    dishKeywords: ["sarmale", "mamaliga", "varza"],
    rationale: "se asociaza perfect cu sarmale",
  },
  {
    id: "gratar",
    label: "Gratar / mititei",
    description: "Pentru carne la gratar si mici",
    weights: { value: 0.45, gift: 0.05, food: 0.5 },
    preferredTypes: ["red", "rose"],
    dishKeywords: ["gratar", "mici", "mititei", "burger", "porc", "vita", "tochitura"],
    rationale: "merge excelent cu gratarul si micii",
  },
  {
    id: "petrecere",
    label: "Petrecere",
    description: "Usor de baut, placut pentru toata lumea",
    weights: { value: 0.6, gift: 0.1, food: 0.3 },
    preferredTypes: ["rose", "white", "sparkling"],
    dishKeywords: ["pizza", "paste"],
    rationale: "este accesibil si placut pentru un grup",
  },
  {
    id: "sarbatori",
    label: "Sarbatori (Craciun, Paste)",
    description: "Pentru mesele festive de sarbatori",
    weights: { value: 0.4, gift: 0.25, food: 0.35 },
    preferredTypes: ["red", "dessert"],
    dishKeywords: ["cozonac", "friptura", "rata", "curcan", "desert"],
    rationale: "completeaza mesele festive de sarbatori",
  },
  {
    id: "pentru-desert",
    label: "Pentru desert",
    description: "Cozonac, pasca, prajituri si dulciuri romanesti",
    weights: { value: 0.35, gift: 0.2, food: 0.45 },
    preferredTypes: ["dessert", "white", "sparkling"],
    dishKeywords: [...ROMANIAN_DESSERT_KEYWORDS],
    rationale: "se potriveste cu deserturile romanesti traditionale",
  },
];

export function getOccasion(id: OccasionId): OccasionConfig {
  return OCCASIONS.find((o) => o.id === id) ?? OCCASIONS[0];
}
