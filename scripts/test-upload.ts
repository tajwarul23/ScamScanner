import { readFile } from "node:fs/promises";
import { uploadEvidenceFile } from "../src/lib/pipeline/uploadEvidence";

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: npx tsx --env-file=.env.local scripts/test-upload.ts <path-to-file>");
    process.exit(1);
  }

  const buffer = await readFile(path);
  const url = await uploadEvidenceFile(buffer, {
    folder: "scam-scanner/test",
  });

  console.log("Uploaded successfully:");
  console.log(url);
}

main().catch((err) => {
  console.error("Upload failed:", err);
  process.exit(1);
});
