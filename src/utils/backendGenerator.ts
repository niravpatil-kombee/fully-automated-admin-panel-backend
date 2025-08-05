// src/utils/backendGenerator.ts

import fs from "fs";
import path from "path";
import mongoose from "mongoose";

// The Field type your generators expect
type Field = {
  label: string;
  fieldName: string;
  type: string;
  required?: boolean;
  reference?: string;
  uiType?: string; // Add uiType for password check
  searchable?: boolean;
};

// UTILITY FUNCTION - It's good practice to have this here or in a shared file
function pascalCase(str: string): string {
  if (!str) return '';
  return str
    .replace(/[^a-zA-Z0-9]/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}


export async function generateBackend(entityName: string, fields: Field[]) {
  const modelNamePascal = pascalCase(entityName);
  const lcEntity = entityName.toLowerCase().replace(/\s/g, '-');
  const baseDir = path.resolve(__dirname, "../generated-backend");
  const folders = ["model", "controller", "routes"];

  // Create folders if not exist
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir);
  folders.forEach((folder) => {
    const dir = path.join(baseDir, folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  });

  // ------------------------
  // 1. Generate Mongoose Model
  // ------------------------
  const modelPath = path.join(baseDir, "model", `${lcEntity}.model.ts`);
  if (!fs.existsSync(modelPath)) {
    const schemaFields = fields.map((field) => {
      let tsType = "String";
      if (field.type === "number") tsType = "Number";
      else if (field.type === "boolean") tsType = "Boolean";
      else if (field.type === "date") tsType = "Date";
      else if (field.type === "ObjectId" || field.reference)
        tsType = "mongoose.Schema.Types.ObjectId";

      // A Mongoose ref should point to the PascalCase model name.
      const ref = field.reference ? `, ref: "${pascalCase(field.reference)}"` : "";
      return `  ${field.fieldName}: { type: ${tsType}, required: ${!!field.required}${ref} }`;
    });

    const modelContent = `
import mongoose from "mongoose";

const ${lcEntity}Schema = new mongoose.Schema({
${schemaFields.join(",\n")}
}, { timestamps: true });

export const ${modelNamePascal} = mongoose.model("${modelNamePascal}", ${lcEntity}Schema);
`;
    fs.writeFileSync(modelPath, modelContent.trim());
  }

  // ------------------------
  // 2. Generate Controller (with password hashing and dynamic fields)
  // ------------------------
  const controllerPath = path.join(baseDir, "controller", `${lcEntity}.controller.ts`);
  if (!fs.existsSync(controllerPath)) {
    const referenceFields = fields.filter((f) => f.reference).map((f) => f.fieldName);
    const populateString = referenceFields.length > 0 ? `.populate("${referenceFields.join(" ")}")` : "";
    const imageField = fields.find(f => f.type === 'image');
    const imageFieldName = imageField ? imageField.fieldName : 'image'; // Default to 'image' if not specified
    const passwordField = fields.find(f => f.type === 'password');

    const controllerContent = `
import { Request, Response } from "express";
${passwordField ? `import bcrypt from "bcryptjs";` : ''}
import { ${modelNamePascal} } from "../model/${lcEntity}.model";

// Create
export async function create${modelNamePascal}(req: Request, res: Response) {
  try {
    const payload = { ...req.body };
    if (req.file) {
      payload.${imageFieldName} = req.file.path;
    }

    ${passwordField ? `
    // Hash password if it exists in the payload
    if (payload.${passwordField.fieldName}) {
      const salt = await bcrypt.genSalt(10);
      payload.${passwordField.fieldName} = await bcrypt.hash(payload.${passwordField.fieldName}, salt);
    }
    ` : ''}

    const newDoc = await ${modelNamePascal}.create(payload);
    const populatedDoc = await ${modelNamePascal}.findById(newDoc._id)${populateString};
    res.status(201).json(populatedDoc);
  } catch (err: any) {
    res.status(500).json({ message: "Failed to create ${entityName}", error: err.message });
  }
}

// Get All
export async function getAll${modelNamePascal}s(req: Request, res: Response) {
  try {
    const { page = 1, limit = 10, search, ...filters } = req.query;
    const query: any = {};

    ${fields
      .filter((f) => f.searchable)
      .map((f) => `if (search) query.${f.fieldName} = { $regex: search, $options: "i" };`)
      .join("\n    ")}

    const result = await ${modelNamePascal}
      .find({ ...query, ...filters })
      .sort({ createdAt: -1 })${populateString}
      .skip((+page - 1) * +limit)
      .limit(+limit);
      
    const total = await ${modelNamePascal}.countDocuments({ ...query, ...filters });

    res.json({ data: result, total, page: +page, limit: +limit });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to get all ${entityName}s", error: err.message });
  }
}

// Get by ID
export async function get${modelNamePascal}ById(req: Request, res: Response) {
  try {
    const data = await ${modelNamePascal}.findById(req.params.id)${populateString};
    if (!data) return res.status(404).json({ message: "${entityName} not found" });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ message: "Failed to get ${entityName} by ID", error: err.message });
  }
}

// Update
export async function update${modelNamePascal}(req: Request, res: Response) {
  try {
    const payload = { ...req.body };
    if (req.file) {
      payload.${imageFieldName} = req.file.path;
    }
    
    ${passwordField ? `
    // If password is being updated, hash it. Otherwise, remove it from payload.
    if (payload.${passwordField.fieldName} && payload.${passwordField.fieldName}.length > 0) {
      const salt = await bcrypt.genSalt(10);
      payload.${passwordField.fieldName} = await bcrypt.hash(payload.${passwordField.fieldName}, salt);
    } else {
      delete payload.${passwordField.fieldName};
    }
    ` : ''}

    const data = await ${modelNamePascal}.findByIdAndUpdate(req.params.id, payload, { new: true })${populateString};
    if (!data) return res.status(404).json({ message: "${entityName} not found" });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ message: "Failed to update ${entityName}", error: err.message });
  }
}

// Delete
export async function delete${modelNamePascal}(req: Request, res: Response) {
  try {
    const deleted = await ${modelNamePascal}.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "${entityName} not found" });
    res.status(200).json({ message: "${entityName} deleted successfully."});
  } catch (err: any) {
    res.status(500).json({ message: "Failed to delete ${entityName}", error: err.message });
  }
}
`;
    fs.writeFileSync(controllerPath, controllerContent.trim());
  }

  // ------------------------
  // 3. CONDITIONALLY Generate CRUD Routes
  // ------------------------
  const routePath = path.join(baseDir, "routes", `${lcEntity}.routes.ts`);
  
  // This 'if' condition prevents the creation of standard routes for the special AuthUsers sheet
  if (entityName.toLowerCase() !== 'authusers') {
    if (!fs.existsSync(routePath)) {
      const imageFieldName = fields.find(f => f.type === 'image')?.fieldName || 'image';

      const routeContent = `
import express from "express";
import multer from "multer";
import fs from "fs";
import {
  create${modelNamePascal},
  getAll${modelNamePascal}s,
  get${modelNamePascal}ById,
  update${modelNamePascal},
  delete${modelNamePascal},
} from "../controller/${lcEntity}.controller";

const router = express.Router();
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop())
  }
})
const upload = multer({ storage: storage });

router.post("/api/${lcEntity}", upload.single("${imageFieldName}"), create${modelNamePascal});
router.get("/api/${lcEntity}", getAll${modelNamePascal}s);
router.get("/api/${lcEntity}/:id", get${modelNamePascal}ById);
router.put("/api/${lcEntity}/:id", upload.single("${imageFieldName}"), update${modelNamePascal});
router.delete("/api/${lcEntity}/:id", delete${modelNamePascal});

export default router;
`;
      fs.writeFileSync(routePath, routeContent.trim());
    }
  } else {
    // This provides helpful feedback in your server logs
    console.log(`⏩ Skipping standard CRUD route generation for special sheet: ${entityName}.`);
  }
}