// server.ts

import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

// Import ALL your generator functions
import { parseExcel } from "../src/utils/excelParser";
import { generateBackend } from "../src/utils/backendGenerator";
import { generateFrontend } from "../src/utils/frontendGenerator";
import { generateDynamicUI } from "../src/utils/generateDynamicUI";
import { generateLoginSystem } from "../src/utils/generateLoginSystem";

const app = express();
const PORT = 5000;

// --- Basic Middleware ---
app.use(cors());
app.use(express.json());
// Serve uploaded files statically from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));


// ==========================================================
// DYNAMIC ROUTE LOADING FUNCTION (IMPROVED AND ROBUST)
// ==========================================================
const loadGeneratedRoutes = () => {
  console.log("🔄 Attempting to load generated routes...");
  const routesPath = path.join(__dirname, "./generated-backend/routes");

  if (fs.existsSync(routesPath)) {
    try {
      const routeFiles = fs.readdirSync(routesPath);
      if (routeFiles.length === 0) {
        console.log("🟡 Routes directory exists but is empty. No custom routes to load.");
        return;
      }

      routeFiles.forEach((file) => {
        // Ensure we are only trying to load valid route files
        if (file.endsWith('.routes.ts') || file.endsWith('.routes.js')) {
          const routerPath = path.join(routesPath, file);
          const router = require(routerPath).default;
          
          if (router) {
            app.use(router);
            console.log(`👍 Successfully loaded routes from: ${file}`);
          } else {
            console.error(`❌ Failed to load router from ${file}. It might be missing a 'default' export.`);
          }
        }
      });
    } catch (error) {
        console.error("❌ An error occurred while loading dynamic routes:", error);
    }
  } else {
    console.log("⚠️  'generated-backend/routes' directory not found. Skipping route loading. This is normal on first run.");
  }
};


// ==========================================================
// THE MAIN GENERATOR ENDPOINT
// ==========================================================
const upload = multer({ dest: "uploads/" });

app.post("/generate", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const models = parseExcel(req.file.path);
    fs.unlinkSync(req.file.path);

    const modelNames = Object.keys(models);
    if (modelNames.length === 0) {
      return res.status(400).json({ message: "No valid sheets found" });
    }

    for (const modelName of modelNames) {
      const fields = models[modelName];
      if (!fields || fields.length === 0) continue;

      console.log(`--- Processing Sheet: "[${modelName}]" ---`);
      await generateBackend(modelName, fields);

      if (modelName.toLowerCase().trim() === 'authusers') {
        console.log(`🔒 Detected AuthUsers sheet. Calling generateLoginSystem...`);
        generateLoginSystem(modelName, fields);
      } else {
        console.log(`📄 Generating standard frontend for ${modelName}...`);
        generateFrontend(modelName, fields);
      }
    }

    const uiModelNames = modelNames.filter(
      (name) => name.toLowerCase().trim() !== 'authusers'
    );
    generateDynamicUI(uiModelNames);

    return res.status(200).json({
      message: `✅ Code generation complete. IMPORTANT: Please restart the server to load the new API routes.`,
    });
  } catch (error: any) {
    console.error("❌ Error during generation:", error);
    return res.status(500).json({ message: "Code generation failed", error: error.message });
  }
});


// ==========================================================
// SERVER STARTUP LOGIC
// ==========================================================
mongoose.connect("mongodb://localhost:27017/admin_panel_generator-12") // Updated your DB name slightly
  .then(() => {
    console.log("✅ MongoDb Connected successfully");
    
    // Load any existing generated routes BEFORE the server starts listening
    loadGeneratedRoutes();

    app.listen(PORT, () => {
      console.log(`⚙️  Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.log("❌ Error connecting to MongoDB:", err));