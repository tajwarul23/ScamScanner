import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface UploadOptions {
  folder?: string;
  publicId?: string;
}

export function uploadEvidenceFile(
  buffer: Buffer,
  options: UploadOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder ?? "scam-scanner/evidence",
        public_id: options.publicId,
        resource_type: "auto",
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed with no result"));
          return;
        }
        resolve(result.secure_url);
      }
    );

    uploadStream.end(buffer);
  });
}
