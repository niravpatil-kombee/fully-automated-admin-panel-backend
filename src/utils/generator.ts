// ✅ Update your Express route to also generate the dynamic UI after backend & frontend code generation

import fs from "fs";
import path from "path";
import express from "express";
import multer from "multer";
import { parseExcel } from "../utils/excelParser";
import { generateBackend } from "../utils/backendGenerator";
import { generateFrontend } from "./frontendGenerator";
import { generateDynamicUI } from "../utils/generateDynamicUI";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/generate", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const models = parseExcel(req.file.path);
    fs.unlinkSync(req.file.path);

    const modelNames = Object.keys(models);
    if (modelNames.length === 0) {
      return res.status(400).json({ message: "No valid sheets found in Excel file" });
    }

    for (const modelName of modelNames) {
      const fields = models[modelName];
      if (!fields || fields.length === 0) continue;

      await generateBackend(modelName, fields);
      await generateFrontend(modelName, fields);
    }

    // ✅ Step: Generate Sidebar, Dashboard, and Routes after all models
    console.log("🧩 Generating dynamic UI (sidebar, dashboard, routes)...");
    generateDynamicUI(modelNames);

    return res.status(200).json({
      message: `✅ Code generated for: ${modelNames.join(", ")}`,
    });
  } catch (error) {
    console.error("❌ Error in /generate:", error);
    return res.status(500).json({ message: "Code generation failed", error });
  }
});

export default router;
