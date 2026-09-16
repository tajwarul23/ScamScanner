import imageCompression from "browser-image-compression";

export const compressImage = async (file: File): Promise<File> => {
  if (!file.type.startsWith("image/")) return file;
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: file.type === "image/webp" ? "image/webp" : "image/jpeg",
    });
    return new File([compressed], file.name, { type: compressed.type });
  } catch (err) {
    console.error("Image compression failed, using the original file", err);
    return file;
  }
};

