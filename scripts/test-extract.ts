import { readFile } from "node:fs/promises";
import { extractEvidence } from "../src/lib/pipeline/extractEvidence";

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: npx tsx --env-file=.env.local scripts/test-extract.ts <path-to-image>");
    process.exit(1);
  }

  const imageBuffer = await readFile(path);
  const mimeType = path.endsWith(".png") ? "image/png" : "image/jpeg";

  const result = await extractEvidence({ imageBuffer, mimeType });
  console.log(JSON.stringify(result, null, 2));
}

main();
