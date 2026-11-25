import type { RequestHandler } from "express";
import { Router } from "express";
import multer from "multer";
import pdfParse from "pdf-parse";
import { removeResumeContactDetails } from "../services/privacy.js";

const MAX_PDF_SIZE = 2 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_SIZE }
});

// Extracts text from an uploaded PDF and removes detectable contact details.
export function createResumeRouter(): Router {
  const router = Router();
  const extractPdf: RequestHandler = async (request, response) => {
    if (!request.file) {
      response.status(400).json({ error: "A PDF file is required" });
      return;
    }

    if (request.file.mimetype !== "application/pdf") {
      response.status(400).json({ error: "The uploaded file must be a PDF" });
      return;
    }

    try {
      const parsedPdf = await pdfParse(request.file.buffer);
      const text = removeResumeContactDetails(parsedPdf.text);

      if (!text) {
        response.status(422).json({
          error: "The PDF contains no extractable text"
        });
        return;
      }

      response.status(200).json({ text });
    } catch {
      response.status(422).json({
        error: "The PDF contains no extractable text"
      });
    }
  };

  router.post(
    "/extract",
    (request, response, next) => {
      upload.single("pdf")(request, response, (error) => {
        if (error instanceof multer.MulterError) {
          response.status(400).json({ error: error.message });
          return;
        }
        if (error) {
          response.status(400).json({ error: "Invalid PDF upload" });
          return;
        }
        next();
      });
    },
    extractPdf
  );

  return router;
}
