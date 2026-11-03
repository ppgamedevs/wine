import path from "node:path";
import sharp from "sharp";

const photos: Record<string, string> = {
  "feteasca-neagra": "tmp-feteasca-neagra-photo.jpg",
  "feteasca-alba": "tmp-feteasca-alba-photo.jpg",
  "feteasca-regala": "tmp-feteasca-regala-photo.jpg",
  "grasa-de-cotnari": "tmp-grasa-de-cotnari-photo.jpg",
  "babeasca-neagra": "tmp-babeasca-neagra-photo.jpg",
};

async function main() {
  for (const [slug, source] of Object.entries(photos)) {
    const output = path.join(process.cwd(), "public", "images", "grapes", "photos", `${slug}.webp`);
    await sharp(source)
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(output);
    console.log(`${slug}: ${output}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
