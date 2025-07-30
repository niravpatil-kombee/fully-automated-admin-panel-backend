import fs from "fs";
import path from "path";
import mongoose from "mongoose";

type Field = {
  label: string;
  fieldName: string;
  type: string;
  required?: boolean;
  reference?: string;
  searchable?: boolean;
};

export async function generateBackend(entityName: string, fields: Field[]) {
  const lcEntity = entityName.toLowerCase();
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

      return `  ${field.fieldName}: { type: ${tsType}, required: ${!!field.required} }`;
    });

    const modelContent = `
import mongoose from "mongoose";

const ${lcEntity}Schema = new mongoose.Schema({
${schemaFields.join(",\n")}
}, { timestamps: true });

export const ${entityName} = mongoose.model("${entityName}", ${lcEntity}Schema);
`;
    fs.writeFileSync(modelPath, modelContent.trim());
  }

  // ------------------------
  // 2. Generate Controller
  // ------------------------
  const controllerPath = path.join(baseDir, "controller", `${lcEntity}.controller.ts`);
  if (!fs.existsSync(controllerPath)) {
    const controllerContent = `
import { Request, Response } from "express";
import { ${entityName} } from "../model/${lcEntity}.model";

// Create
export async function create${entityName}(req: Request, res: Response) {
  try {
    const payload = { ...req.body };

    // Handle file upload if image exists
    if (req.file) {
      payload.image = req.file.filename;
    }

    const data = await ${entityName}.create(payload);
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err });
  }
}

// Get All
export async function getAll${entityName}s(req: Request, res: Response) {
  try {
    const { page = 1, limit = 10, search, ...filters } = req.query;
    const query: any = {};

    ${fields
      .filter((f) => f.searchable)
      .map((f) => `if (search) query.${f.fieldName} = { $regex: search, $options: "i" };`)
      .join("\n    ")}

    const result = await ${entityName}
      .find({ ...query, ...filters })
      .skip((+page - 1) * +limit)
      .limit(+limit);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err });
  }
}

// Get by ID
export async function get${entityName}ById(req: Request, res: Response) {
  try {
    const data = await ${entityName}.findById(req.params.id);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err });
  }
}

// Update
export async function update${entityName}(req: Request, res: Response) {
  try {
    const payload = { ...req.body };
    if (req.file) {
      payload.image = req.file.filename;
    }

    const data = await ${entityName}.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err });
  }
}

// Delete
export async function delete${entityName}(req: Request, res: Response) {
  try {
    await ${entityName}.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err });
  }
}
`;
    fs.writeFileSync(controllerPath, controllerContent.trim());
  }

  // ------------------------
  // 3. Generate Routes
  // ------------------------
  const routePath = path.join(baseDir, "routes", `${lcEntity}.routes.ts`);
  if (!fs.existsSync(routePath)) {
    const routeContent = `
import express from "express";
import multer from "multer";
import {
  create${entityName},
  getAll${entityName}s,
  get${entityName}ById,
  update${entityName},
  delete${entityName},
} from "../controller/${lcEntity}.controller";

const router = express.Router();
const upload = multer({ dest: "uploads/" }); // basic multer config

router.post("/", upload.single("image"), create${entityName});
router.get("/", getAll${entityName}s);
router.get("/:id", get${entityName}ById);
router.put("/:id", upload.single("image"), update${entityName});
router.delete("/:id", delete${entityName});

export default router;
`;
    fs.writeFileSync(routePath, routeContent.trim());
  }
}
