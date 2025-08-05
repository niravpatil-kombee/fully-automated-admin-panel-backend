// src/routes/generator.ts (or your main router file)

import fs from "fs";
import path from "path";
import express from "express";
import multer from "multer";
import { parseExcel } from "../utils/excelParser";
import { generateBackend } from "../utils/backendGenerator";
import { generateFrontend } from "./frontendGenerator"; // Correct path as per your setup
import { generateDynamicUI } from "../utils/generateDynamicUI";
import { generateLoginSystem } from "../utils/generateLoginSystem";

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

      // For debugging, let's see exactly what the modelName is
      console.log(`--- Processing Sheet: "[${modelName}]" ---`);

      // This will correctly generate the model/controller for all sheets
      await generateBackend(modelName, fields);

      // ✅ THIS IS THE CRUCIAL LOGIC BLOCK THAT FIXES THE PROBLEM
      // It uses .trim() to handle any accidental whitespace in the Excel sheet name.
      console.log(modelName.toLowerCase());
      if (modelName.toLowerCase().trim() === 'authusers') {
        console.log(`🔒 Detected AuthUsers sheet. Calling generateLoginSystem...`);
        generateLoginSystem(modelName, fields);
      } else {
        console.log(`📄 Generating standard frontend for ${modelName}...`);
        generateFrontend(modelName, fields);
      }
    }

    console.log("🧩 Generating dynamic UI (sidebar, dashboard, routes)...");
    const uiModelNames = modelNames.filter(
      (name) => name.toLowerCase().trim() !== 'authusers' // Also add .trim() here for consistency
    );
    generateDynamicUI(uiModelNames);

    return res.status(200).json({
      message: `✅ Code generated successfully for: ${modelNames.join(", ")}`,
    });
  } catch (error: any) {
    console.error("❌ Error in /generate:", error);
    return res.status(500).json({ message: "Code generation failed", error: error.message });
  }
});

export default router;