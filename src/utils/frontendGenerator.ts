// import fs from "fs";
// import path from "path";

// // Types
// type Field = {
//   label: string;
//   fieldName: string;
//   type: string;
//   required: boolean;
//   uiType: string;
//   options?: string;
//   reference?: string;
// };

// // Utilities
// function pascalCase(str: string) {
//   return str
//     .replace(/[^a-zA-Z0-9]/g, " ")
//     .split(" ")
//     .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
//     .join("");
// }

// function camelCase(str: string) {
//   const parts = str.replace(/[^a-zA-Z0-9]/g, " ").split(" ");
//   return parts[0].toLowerCase() + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join("");
// }

// export function generateFrontend(sheetName: string, fields: Field[]) {
//   console.log(fields);
//   const modelName = pascalCase(sheetName);
//   const componentFolder = path.resolve(__dirname, "../../../frontend/src/generated-frontend", sheetName.toLowerCase());

//   if (!fs.existsSync(componentFolder)) fs.mkdirSync(componentFolder, { recursive: true });
//   else return console.log(`⚠️ Skipped: ${sheetName} already exists.`);

//   // 1. Generate initial state
//   const initialState = fields.map((f) => {
//     const name = camelCase(f.fieldName);
//     if (f.type === "boolean") return `${name}: false`;
//     if (f.type === "image" || f.uiType === "file") return `${name}: null`;
//     return `${name}: ""`;
//   }).join(",\n    ");

//   // 2. handleChange function
//   const handleChangeContent = `
//   const handleChange = (e: any) => {
//     const { name, value, type, checked, files } = e.target;
//     setFormData(prev => ({
//       ...prev,
//       [name]: type === "checkbox" ? checked : type === "file" ? files?.[0] : value
//     }));
//   };
//   `;

//   // 3. Generate form fields
//   const formFields = fields.map((f) => {
//     const name = camelCase(f.fieldName);
//     const label = f.label;
//     const required = f.required ? "required" : "";
//     const stateRef = `formData.${name}`;

//     // ✅ Boolean -> checkbox
//     if (f.type === "boolean") {
//       return `<FormControlLabel control={<Checkbox name="${name}" checked={${stateRef}} onChange={handleChange} />} label="${label}" />`;
//     }

//     // ✅ Date -> shrink label
//     if (f.type === "date") {
//       return `<TextField
//   fullWidth
//   label="${label}"
//   name="${name}"
//   type="date"
//   value={${stateRef}}
//   onChange={handleChange}
//   InputLabelProps={{ shrink: true }}
//   ${required}
// />`;
//     }

//     switch (f.uiType) {
//       case "input":
//         return `<TextField fullWidth label="${label}" name="${name}" value={${stateRef}} type="${f.type}" onChange={handleChange} ${required} />`;

//       case "select":
//         const options = f.options?.split(",").map(opt =>
//           `<MenuItem value="${opt.trim()}">${opt.trim()}</MenuItem>`).join("\n          ") || "";
//         return `<FormControl fullWidth>
//   <InputLabel>${label}</InputLabel>
//   <Select name="${name}" value={${stateRef}} onChange={handleChange} label="${label}" ${required}>
//     ${options}
//   </Select>
// </FormControl>`;

//       case "file":
//         return `<Button variant="outlined" component="label">${label}
//   <input type="file" hidden name="${name}" onChange={handleChange} />
// </Button>`;

//       case "radio":
//         const radioOptions = f.options?.split(",").map(opt =>
//           `<FormControlLabel value="${opt.trim()}" control={<Radio />} label="${opt.trim()}" />`
//         ).join("\n        ") || "";
//         return `<FormControl>
//   <label>${label}</label>
//   <RadioGroup row name="${name}" value={${stateRef}} onChange={handleChange}>
//     ${radioOptions}
//   </RadioGroup>
// </FormControl>`;

//       default:
//         return `<TextField fullWidth label="${label}" name="${name}" value={${stateRef}} onChange={handleChange} ${required} />`;
//     }
//   }).join("\n      ");

//   // 4. Full Form Component
//   const formCode = `
// import React, { useState } from "react";
// import { TextField, Button, MenuItem, FormControl, InputLabel, Select, Checkbox, FormControlLabel, Radio, RadioGroup } from "@mui/material";

// const ${modelName}Form = () => {
//   const [formData, setFormData] = useState({
//     ${initialState}
//   });

//   ${handleChangeContent}

//   const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     console.log("Submitted:", formData);
//     // You can call POST API here
//   };

//   return (
//     <form onSubmit={handleSubmit}>
//       ${formFields}
//       <Button type="submit" variant="contained" style={{ marginTop: 16 }}>Submit</Button>
//     </form>
//   );
// };

// export default ${modelName}Form;
// `;

//   fs.writeFileSync(path.join(componentFolder, `${modelName}Form.tsx`), formCode);

//   // 5. Generate List Page
//   const tableHeaders = fields.map((f) => `<th>${f.label}</th>`).join("\n            ");
//   const tableCells = fields.map((f) => `<td>{item.${camelCase(f.fieldName)}}</td>`).join("\n              ");

//   const listCode = `
// import React, { useEffect, useState } from "react";
// import axios from "axios";

// const ${modelName}List = () => {
//   const [items, setItems] = useState([]);

//   useEffect(() => {
//     axios.get("/api/${sheetName.toLowerCase()}").then(res => setItems(res.data));
//   }, []);

//   return (
//     <div>
//       <h2>${modelName} List</h2>
//       <table border={1} cellPadding={8}>
//         <thead>
//           <tr>
//             ${tableHeaders}
//             <th>Actions</th>
//           </tr>
//         </thead>
//         <tbody>
//           {items.map((item: any) => (
//             <tr key={item._id}>
//               ${tableCells}
//               <td>
//                 <button>Edit</button>
//                 <button>Delete</button>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// };

// export default ${modelName}List;
// `;

//   fs.writeFileSync(path.join(componentFolder, `${modelName}List.tsx`), listCode);

//   console.log(`✅ Frontend for '${sheetName}' generated at: ${componentFolder}`);
// }

// Imports
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

// Utilities
function pascalCase(str: string) {
  return str
    .replace(/[^a-zA-Z0-9]/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

function getReferenceStateName(ref: string | undefined): string {
  if (!ref) return "";
  return ref.charAt(0).toLowerCase() + ref.slice(1) + "Options";
}

export function generateFrontend(sheetName: string, fields: Field[]) {
  const modelName = pascalCase(sheetName);
  const componentFolder = path.resolve(
    __dirname,
    "../../../frontend/src/generated-frontend",
    sheetName.toLowerCase()
  );

  if (!fs.existsSync(componentFolder)) fs.mkdirSync(componentFolder, { recursive: true });
  else return console.log(`⚠️ Skipped: ${sheetName} already exists.`);

  const initialState = fields
    .map((f) => {
      const name = f.fieldName;
      if (f.type === "boolean") return `${name}: false`;
      if (f.type === "image" || f.uiType === "file") return `${name}: null`;
      return `${name}: ""`;
    })
    .join(",\n    ");

  const referenceStatesInit = fields
    .filter((f) => f.reference)
    .map(
      (f) =>
        `const [${getReferenceStateName(f.reference)}, set${pascalCase(
          getReferenceStateName(f.reference)
        )}] = React.useState<any[]>([]);`
    )
    .join("\n  ");

  const referenceUseEffects = fields
    .filter((f) => f.reference)
    .map((f) => {
      const refState = getReferenceStateName(f.reference);
      const refApi = `http://localhost:5000/api/${f.reference?.toLowerCase()}`;
      return `axios.get("${refApi}").then(res => set${pascalCase(refState)}(res.data)).catch(console.error);`;
    })
    .join("\n    ");

  const handleChangeContent = `
  const handleChange = (e: any) => {
    const { name, value, type, checked, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "file" ? files?.[0] : value
    }));
  };`;

  const formFields = fields
    .map((f) => {
      const name = f.fieldName;
      const label = f.label;
      const required = f.required ? "required" : "";
      const stateRef = `formData.${name}`;

      if (f.type === "boolean") {
        return `<FormControlLabel control={<Checkbox name=\"${name}\" checked={${stateRef}} onChange={handleChange} />} label=\"${label}\" />`;
      }

      if (f.type === "date") {
        return `<TextField fullWidth label=\"${label}\" name=\"${name}\" type=\"date\" value={${stateRef}} onChange={handleChange} InputLabelProps={{ shrink: true }} ${required} />`;
      }

      if (f.reference) {
        const refState = getReferenceStateName(f.reference);
        const noneOption = f.required ? "" : `<MenuItem value=\"\"><em>None</em></MenuItem>`;
        return `<FormControl fullWidth>
  <InputLabel>${label}</InputLabel>
  <Select name=\"${name}\" value={${stateRef}} onChange={handleChange} label=\"${label}\" ${required}>
    ${noneOption}
    {Array.isArray(${refState}) && ${refState}.map((option: any) => (
      <MenuItem key={option._id} value={option._id}>
        {option.name || option.title || option._id}
      </MenuItem>
    ))}
  </Select>
</FormControl>`;
      }

      if (f.uiType === "select" && f.options) {
        const options = f.options
          .split(",")
          .map((opt) => `<MenuItem value=\"${opt.trim()}\">${opt.trim()}</MenuItem>`) 
          .join("\n          ");
        return `<FormControl fullWidth>
  <InputLabel>${label}</InputLabel>
  <Select name=\"${name}\" value={${stateRef}} onChange={handleChange} label=\"${label}\" ${required}>
    ${options}
  </Select>
</FormControl>`;
      }

      if (f.uiType === "file") {
        return `<Button variant=\"outlined\" component=\"label\">${label}<input type=\"file\" hidden name=\"${name}\" onChange={handleChange} /></Button>`;
      }

      if (f.uiType === "radio") {
        const radioOptions = f.options
          ?.split(",")
          .map((opt) => `<FormControlLabel value=\"${opt.trim()}\" control={<Radio />} label=\"${opt.trim()}\" />`)
          .join("\n        ") || "";
        return `<FormControl>
  <label>${label}</label>
  <RadioGroup row name=\"${name}\" value={${stateRef}} onChange={handleChange}>
    ${radioOptions}
  </RadioGroup>
</FormControl>`;
      }

      return `<TextField fullWidth label=\"${label}\" name=\"${name}\" value={${stateRef}} onChange={handleChange} ${required} />`;
    })
    .join("\n      ");

  const formCode = `
import React, { useState } from "react";
import axios from "axios";
import { TextField, Button, MenuItem, FormControl, InputLabel, Select, Checkbox, FormControlLabel, Radio, RadioGroup } from "@mui/material";

const ${modelName}Form = () => {
  const [formData, setFormData] = useState({
    ${initialState}
  });

  ${referenceStatesInit}

  React.useEffect(() => {
    ${referenceUseEffects}
  }, []);

  ${handleChangeContent}

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/${sheetName.toLowerCase()}", formData);
      alert("Form submitted successfully!");
    } catch (error) {
      console.error("Submit failed:", error);
    }
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

  const tableHeaders = fields.map((f) => `<th>${f.label}</th>`).join("\n            ");
  const tableCells = fields
    .map((f) => {
      const fieldName = f.fieldName;
      if (f.reference) {
        return `<td>{item.${fieldName} ? (item.${fieldName}.name || item.${fieldName}.title || item.${fieldName}._id) : ""}</td>`;
      }
      return `<td>{item.${fieldName}}</td>`;
    })
    .join("\n              ");

  const listCode = `
import React, { useEffect, useState } from "react";
import axios from "axios";

const ${modelName}List = () => {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    axios.get("http://localhost:5000/api/${sheetName.toLowerCase()}").then(res => setItems(res.data));
  }, []);

  return (
    <div>
      <h2>${modelName} List</h2>
      <table border={1} cellPadding={8}>
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


