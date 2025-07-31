// server.ts

import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";

import { parseExcel } from "../src/utils/excelParser";
import { generateBackend } from "../src/utils/backendGenerator";
import { generateFrontend } from "../src/utils/frontendGenerator";
import mongoose from "mongoose";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

//Routes automation
const routesPath = path.join(__dirname, "./generated-backend/routes");
if (fs.existsSync(routesPath)) {
  fs.readdirSync(routesPath).forEach((file) => {
    const router = require(path.join(routesPath, file)).default;
    app.use(router);
  });
} else {
  console.log("⚠️  No generated backend routes found. Skipping dynamic routing.");
}

// Setup multer for Excel uploads
const upload = multer({ dest: "uploads/" });

/**
 * POST /generate
 * Upload Excel file and generate backend + frontend code
 */
app.post("/generate", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const models = parseExcel(req.file.path);

    // Cleanup uploaded file
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

    return res.status(200).json({
      message: `✅ Code generated for: ${modelNames.join(", ")}`,
    });
  } catch (error) {
    console.error("❌ Error in /generate:", error);
    return res.status(500).json({ message: "Code generation failed", error });
  }
});

// mongodb connection 
mongoose.connect("mongodb://localhost:27017/admin_panel_generator").then(() => console.log("MongoDb Connected successfully")).catch((err) => console.log("Error connecting mongoDB"))

app.listen(PORT, () => {
  console.log(`⚙️  Server running at http://localhost:${PORT}`);
});
