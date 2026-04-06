import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    let resourceType: string;
    let folder: string;

    if (file.mimetype === "application/pdf") {
      resourceType = "raw";
      folder = "edusmart/pdfs";
    } else if (file.mimetype.startsWith("image/")) {
      resourceType = "image";
      folder = "edusmart/images";
    } else if (file.mimetype.startsWith("video/")) {
      resourceType = "video";
      folder = "edusmart/videos";
    } else {
      resourceType = "raw";
      folder = "edusmart/files";
    }

    return {
      folder,
      resource_type: resourceType,
      public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`,
    };
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