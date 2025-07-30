import fs from "fs";
import path from "path";
import { parseExcel } from "../utils/excelParser";
import { generateBackend } from "../utils/backendGenerator";
import { generateFrontend } from "./frontendGenerator";

const excelPath = "excel-samples/product.xlsx";

// Step 1: Parse models from the Excel file
const models = parseExcel(excelPath);

if (!models || Object.keys(models).length === 0) {
  console.error("❌ No models found in the Excel file.");
  process.exit(1);
}

console.log(`📦 Parsed models: ${Object.keys(models).join(", ")}`);

// Step 2: Loop through each parsed model
Object.entries(models).forEach(([modelName, fields], index) => {
  console.log(`\n🔧 Generating ${index + 1}/${Object.keys(models).length}: ${modelName}`);

  try {
    generateBackend(modelName, fields); // ✅ Fixed: pass modelName and fields
    generateFrontend(modelName, fields);
    console.log(`✅ Done: ${modelName}`);
  } catch (err) {
    console.error(`❌ Error generating model: ${modelName}`);
    console.error(err);
  }
});

console.log("\n🚀 Full generation complete.");
