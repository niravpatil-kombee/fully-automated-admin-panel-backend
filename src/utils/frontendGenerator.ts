import fs from "fs";
import path from "path";

// Types
type Field = {
  label: string;
  fieldName: string;
  type: string;
  required: boolean;
  uiType: string;
  options?: string;
  reference?: string;
};

// Utility to convert snake_case or kebab-case to PascalCase
function pascalCase(str: string) {
  return str
    .replace(/[^a-zA-Z0-9]/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

// Utility to convert to camelCase for state
function camelCase(str: string) {
  const parts = str.replace(/[^a-zA-Z0-9]/g, " ").split(" ");
  return parts[0].toLowerCase() + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join("");
}

export function generateFrontend(sheetName: string, fields: Field[]) {
  const modelName = pascalCase(sheetName);
  const componentFolder = path.resolve(__dirname, "../../../frontend/src/generated-frontend", sheetName.toLowerCase());
  if (!fs.existsSync(componentFolder)) fs.mkdirSync(componentFolder, { recursive: true });
  else return console.log(`⚠️ Skipped: ${sheetName} already exists.`);

  // 1. Generate useState fields
  const initialState = fields.map((f) => {
    const name = camelCase(f.fieldName);
    if (f.uiType === "checkbox") return `${name}: false`;
    if (f.uiType === "file") return `${name}: null`;
    return `${name}: ""`;
  }).join(",\n    ");

  const handleChangeContent = `
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "file" ? files[0] : value
    }));
  };
  `;

  // 2. Generate form fields
  const formFields = fields.map((f) => {
    const name = camelCase(f.fieldName);
    const label = f.label;
    const required = f.required ? "required" : "";
    const stateRef = `formData.${name}`;
    switch (f.uiType) {
      case "text":
      case "number":
      case "date":
        return `<TextField fullWidth label="${label}" name="${name}" value={${stateRef}} type="${f.uiType}" onChange={handleChange} ${required} />`;

      case "textarea":
        return `<TextField fullWidth label="${label}" name="${name}" value={${stateRef}} multiline rows={4} onChange={handleChange} ${required} />`;

      case "dropdown":
        const options = f.options?.split(",").map(opt =>
          `<MenuItem value="${opt.trim()}">${opt.trim()}</MenuItem>`).join("\n          ");
        return `<FormControl fullWidth>
  <InputLabel>${label}</InputLabel>
  <Select name="${name}" value={${stateRef}} onChange={handleChange} label="${label}" ${required}>
    ${options}
  </Select>
</FormControl>`;

      case "checkbox":
        return `<FormControlLabel control={<Checkbox name="${name}" checked={${stateRef}} onChange={handleChange} />} label="${label}" />`;

      case "file":
        return `<Button variant="outlined" component="label">${label}
  <input type="file" hidden name="${name}" onChange={handleChange} />
</Button>`;

      default:
        return `<TextField fullWidth label="${label}" name="${name}" value={${stateRef}} onChange={handleChange} ${required} />`;
    }
  }).join("\n      ");

  const formCode = `
import React, { useState } from "react";
import { TextField, Button, MenuItem, FormControl, InputLabel, Select, Checkbox, FormControlLabel } from "@mui/material";

const ${modelName}Form = () => {
  const [formData, setFormData] = useState({
    ${initialState}
  });

  ${handleChangeContent}

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submitted:", formData);
    // You can call POST API here
  };

  return (
    <form onSubmit={handleSubmit}>
      ${formFields}
      <Button type="submit" variant="contained" style={{ marginTop: 16 }}>Submit</Button>
    </form>
  );
};

export default ${modelName}Form;
`;

  fs.writeFileSync(path.join(componentFolder, `${modelName}Form.tsx`), formCode);

  // 3. Generate List page
  const tableHeaders = fields.map((f) => `<th>${f.label}</th>`).join("\n            ");
  const tableCells = fields.map((f) => `<td>{item.${camelCase(f.fieldName)}}</td>`).join("\n              ");

  const listCode = `
import React, { useEffect, useState } from "react";
import axios from "axios";

const ${modelName}List = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    axios.get("/api/${sheetName.toLowerCase()}").then(res => setItems(res.data));
  }, []);

  return (
    <div>
      <h2>${modelName} List</h2>
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            ${tableHeaders}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any) => (
            <tr key={item._id}>
              ${tableCells}
              <td>
                <button>Edit</button>
                <button>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ${modelName}List;
`;

  fs.writeFileSync(path.join(componentFolder, `${modelName}List.tsx`), listCode);

  console.log(`✅ Frontend for '${sheetName}' generated at: ${componentFolder}`);
}
