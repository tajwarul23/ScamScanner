import mammoth from "mammoth";
import yauzl from "yauzl";

const MAX_DOCX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024; // 50MB total decompressed
const MAX_DOCX_COMPRESSION_RATIO = 200; // flag suspiciously extreme single-entry ratios

const checkDocxForZipBomb = (buffer: Buffer): Promise<void> => {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        reject(err ?? new Error("Failed to open DOCX as a zip archive"));
        return;
      }

      let totalUncompressed = 0;

      zipfile.on("entry", (entry: yauzl.Entry) => {
        totalUncompressed += entry.uncompressedSize;

        if (totalUncompressed > MAX_DOCX_UNCOMPRESSED_BYTES) {
          zipfile.close();
          reject(new Error("DOCX rejected: decompresses to an unreasonably large size"));
          return;
        }

        if (
          entry.compressedSize > 0 &&
          entry.uncompressedSize / entry.compressedSize > MAX_DOCX_COMPRESSION_RATIO
        ) {
          zipfile.close();
          reject(new Error("DOCX rejected: suspicious compression ratio (possible zip bomb)"));
          return;
        }

        zipfile.readEntry();
      });

      zipfile.on("end", () => resolve());
      zipfile.on("error", (err) => reject(err));

      zipfile.readEntry();
    });
  });
};

export const convertDocxToText = async (buffer: Buffer): Promise<string> => {
  await checkDocxForZipBomb(buffer);

  const result = await mammoth.extractRawText({ buffer });
  return result.value;
};
