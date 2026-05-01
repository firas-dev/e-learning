import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary";
import path from "path";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    const nameWithoutExt = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/\s+/g, "_");

    if (file.mimetype === "application/pdf") {
      return {
        folder: "edusmart/pdfs",
        resource_type: "raw",
        public_id: `${Date.now()}-${nameWithoutExt}.pdf`,
      };
    } else if (file.mimetype.startsWith("image/")) {
      return {
        folder: "edusmart/images",
        resource_type: "image",
        public_id: `${Date.now()}-${nameWithoutExt}`,
      };
    } else if (file.mimetype.startsWith("video/")) {
      return {
        folder: "edusmart/videos",
        resource_type: "video",
        public_id: `${Date.now()}-${nameWithoutExt}`,
        // eager forces Cloudinary to process the video synchronously,
        // which populates the duration field on the resource
        eager: [{ format: "mp4" }],
        eager_async: false,
      };
    } else {
      return {
        folder: "edusmart/files",
        resource_type: "raw",
        public_id: `${Date.now()}-${nameWithoutExt}`,
      };
    }
  },
});

const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowed = [
    "application/pdf",
    "video/mp4",
    "video/webm",
    "video/ogg",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only PDF, video, and image files are allowed."));
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 },
});