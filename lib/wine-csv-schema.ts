import { z } from "zod";
import type { GrapeVarietyShare } from "@/lib/schema";
import type { WineType } from "@/types";

function normalizeCategory(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const csvCategorySchema = z.preprocess(
  normalizeCategory,
  z.enum([
    "rosu",
    "red",
    "alb",
    "white",
    "rose",
    "roz",
    "spumant",
    "sparkling",
    "orange",
    "desert",
    "dessert",
  ]),
);

export const wineCsvRowSchema = z.object({
  slug: z.string().trim().optional(),
  name: z.string().trim().min(2),
  producer: z.string().trim().min(2),
  producer_slug: z.string().trim().optional(),
  winery_slug: z.string().trim().optional(),
  region: z.string().trim().min(2),
  region_slug: z.string().trim().optional(),
  vintage: z.coerce.number().int().min(1900).max(2030),
  price: z.coerce.number().positive(),
  category: csvCategorySchema,
  grape_varieties: z.string().trim().optional(),
  soiuri: z.string().trim().optional(),
  source_url: z.string().trim().url(),
  availability: z.string().trim().optional(),
  sweetness: z.string().trim().optional(),
  dulceata: z.string().trim().optional(),
  tasting_notes: z.string().trim().optional(),
  note_degustare: z.string().trim().optional(),
  alcohol: z.coerce.number().positive().optional(),
  alcool: z.coerce.number().positive().optional(),
  sugar: z.coerce.number().nonnegative().optional(),
  zahar: z.coerce.number().nonnegative().optional(),
  acidity: z.coerce.number().nonnegative().optional(),
  aciditate: z.coerce.number().nonnegative().optional(),
});

export type WineCsvRow = z.infer<typeof wineCsvRowSchema>;

export function mapCsvCategoryToWineType(category: string): WineType {
  const normalized = normalizeCategory(category) as string;
  const map: Record<string, WineType> = {
    rosu: "red",
    red: "red",
    alb: "white",
    white: "white",
    rose: "rose",
    roz: "rose",
    roze: "rose",
    spumant: "sparkling",
    sparkling: "sparkling",
    orange: "orange",
    desert: "dessert",
    dessert: "dessert",
  };
  const type = map[normalized];
  if (!type) {
    throw new Error(`Categorie necunoscuta: ${category}`);
  }
  return type;
}

export function mapWineCsvRowToType(category: WineCsvRow["category"]) {
  return mapCsvCategoryToWineType(category);
}

export function parseCsvGrapeVarieties(
  raw: string | undefined,
): GrapeVarietyShare[] {
  if (!raw?.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      if (parsed.every((item) => typeof item === "string")) {
        return parsed.map((name) => ({ name: String(name) }));
      }
      return parsed
        .filter((item): item is GrapeVarietyShare => {
          return (
            typeof item === "object" &&
            item !== null &&
            "name" in item &&
            typeof (item as GrapeVarietyShare).name === "string"
          );
        })
        .map((item) => ({
          name: item.name,
          slug: item.slug,
          percentage: item.percentage,
        }));
    }
  } catch {
    // fall through to delimiter split
  }

  return raw
    .split(/[;,|]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((name) => ({ name }));
}

export function grapeVarietiesFromCsvRow(row: WineCsvRow) {
  return parseCsvGrapeVarieties(row.grape_varieties ?? row.soiuri);
}
