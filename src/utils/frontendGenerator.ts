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
  if (!ref) {
    return "";
  }
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

  // =================================================================
  // YOUR EXISTING FORM GENERATION LOGIC - UNCHANGED AS REQUESTED
  // =================================================================
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
        )}] = useState<any[]>([]);`
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
    setFormData((prev: any) => ({
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
        return `<FormControlLabel control={<Checkbox name="${name}" checked={!!${stateRef}} onChange={handleChange} />} label="${label}" />`;
      }
      if (f.type === "date") {
        const dateValue = `formData.${name} ? new Date(formData.${name}).toISOString().split('T')[0] : ''`;
        return `<TextField fullWidth label="${label}" name="${name}" type="date" value={${dateValue}} onChange={handleChange} InputLabelProps={{ shrink: true }} ${required} />`;
      }
      if (f.reference) {
        const refState = getReferenceStateName(f.reference);
        const noneOption = f.required ? "" : `<MenuItem value=""><em>None</em></MenuItem>`;
        return `<FormControl fullWidth>
  <InputLabel>${label}</InputLabel>
  <Select name="${name}" value={${stateRef} || ''} onChange={handleChange} label="${label}" ${required}>
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
        const options = f.options.split(",").map((opt) => `<MenuItem value="${opt.trim()}">${opt.trim()}</MenuItem>`).join("\n          ");
        return `<FormControl fullWidth>
  <InputLabel>${label}</InputLabel>
  <Select name="${name}" value={${stateRef}} onChange={handleChange} label="${label}" ${required}>
    ${options}
  </Select>
</FormControl>`;
      }
      if (f.uiType === "file") {
        return `<Button variant="outlined" component="label">${label}<input type="file" hidden name="${name}" onChange={handleChange} /></Button>`;
      }
      if (f.uiType === "radio") {
        const radioOptions = f.options?.split(",").map((opt) => `<FormControlLabel value="${opt.trim()}" control={<Radio />} label="${opt.trim()}" />`).join("\n        ") || "";
        return `<FormControl>
  <label>${label}</label>
  <RadioGroup row name="${name}" value={${stateRef}} onChange={handleChange}>
    ${radioOptions}
  </RadioGroup>
</FormControl>`;
      }
      return `<TextField fullWidth label="${label}" name="${name}" value={${stateRef} || ''} onChange={handleChange} ${required} />`;
    })
    .join("\n      ");

  const formCode = `
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { TextField, Button, MenuItem, FormControl, InputLabel, Select, Checkbox, FormControlLabel, Radio, RadioGroup, Box } from "@mui/material";

const ${modelName}Form = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState<any>({ ${initialState} });
  ${referenceStatesInit}

  useEffect(() => {
    if (id && id !== 'new') {
      axios.get("http://localhost:5000/api/${sheetName.toLowerCase()}/" + id)
        .then((res) => setFormData(res.data))
        .catch((err) => console.error("Failed to fetch for edit:", err));
    }
    ${referenceUseEffects}
  }, [id]);

  ${handleChangeContent}

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (id && id !== 'new') {
        await axios.put("http://localhost:5000/api/${sheetName.toLowerCase()}/" + id, formData);
        alert("Updated successfully");
      } else {
        await axios.post("http://localhost:5000/api/${sheetName.toLowerCase()}", formData);
        alert("Created successfully");
      }
      navigate("/${sheetName.toLowerCase()}s");
    } catch (error) {
      console.error("Submit failed:", error);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
      ${formFields}
      <Button type="submit" variant="contained" sx={{ mt: 2, gridColumn: 'span 2' }}>
        {id && id !== 'new' ? "Update" : "Create"}
      </Button>
    </Box>
  );
};
export default ${modelName}Form;
`;

  fs.writeFileSync(path.join(componentFolder, `${modelName}Form.tsx`), formCode);

  // =================================================================
  // NEW LIST COMPONENT GENERATION LOGIC - REPLACES THE OLD ONE
  // =================================================================
  const tableHeaders = fields
    .map((f) => `<TableCell key="${f.fieldName}" align="left" sx={{ fontWeight: 600 }}>${f.label}</TableCell>`)
    .join("\n                  ");

  const tableCells = fields
    .map((f) => {
      const fieldName = f.fieldName;
      if (f.reference) {
        return `<TableCell>{item.${fieldName} ? (item.${fieldName}.name || item.${fieldName}.title || "N/A") : "N/A"}</TableCell>`;
      }
      if (f.type === "boolean") {
        return `<TableCell>{item.${fieldName} ? "Yes" : "No"}</TableCell>`;
      }
      if (f.type === 'date') {
        return `<TableCell>{item.${fieldName} ? new Date(item.${fieldName}).toLocaleDateString() : "N/A"}</TableCell>`;
      }
      // Truncate long text for display
      return `<TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.${fieldName}}</TableCell>`;
    })
    .join("\n                  ");

  const listCode = `
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Box, Paper, Toolbar, Typography, Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Checkbox, IconButton, Tooltip, TablePagination, Button } from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Visibility as VisibilityIcon } from "@mui/icons-material";

const ${modelName}List = () => {
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get("http://localhost:5000/api/${sheetName.toLowerCase()}")
      .then(res => setItems(res.data))
      .catch(err => console.error("Failed to fetch items:", err));
  }, []);

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelecteds = items.map((n) => n._id);
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event: React.MouseEvent<unknown>, id: string) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: string[] = [];

    if (selectedIndex === -1) newSelected = newSelected.concat(selected, id);
    else if (selectedIndex === 0) newSelected = newSelected.concat(selected.slice(1));
    else if (selectedIndex === selected.length - 1) newSelected = newSelected.concat(selected.slice(0, -1));
    else if (selectedIndex > 0) newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1));
    
    setSelected(newSelected);
  };

  const handleChangePage = (event: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure? This action cannot be undone.")) {
      try {
        await axios.delete("http://localhost:5000/api/${sheetName.toLowerCase()}/" + id);
        setItems(prev => prev.filter(item => item._id !== id));
        setSelected(prev => prev.filter(selId => selId !== id));
      } catch (err) {
        alert("Failed to delete item.");
      }
    }
  };
  
  const handleAddNew = () => navigate("/${sheetName.toLowerCase()}s/new");
  const handleEdit = (id: string) => navigate(\`/${sheetName.toLowerCase()}s/\${id}/edit\`);

  const isSelected = (id: string) => selected.indexOf(id) !== -1;
  const paginatedItems = items.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Paper sx={{ width: '100%', mb: 2, borderRadius: 3, boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}>
      <Toolbar>
        <Typography sx={{ flex: '1 1 100%' }} variant="h6" component="div">${modelName}s</Typography>
        <Button variant="contained" onClick={handleAddNew} startIcon={<AddIcon />}>Add New</Button>
      </Toolbar>
      <TableContainer>
        <Table>
          <TableHead sx={{ bgcolor: '#f8f9fa' }}>
            <TableRow>
              <TableCell padding="checkbox"><Checkbox color="primary" indeterminate={selected.length > 0 && selected.length < items.length} checked={items.length > 0 && selected.length === items.length} onChange={handleSelectAllClick} /></TableCell>
              ${tableHeaders}
              <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedItems.map((item) => {
              const isItemSelected = isSelected(item._id);
              return (
                <TableRow hover role="checkbox" aria-checked={isItemSelected} tabIndex={-1} key={item._id} selected={isItemSelected} sx={{ cursor: 'pointer' }}>
                  <TableCell padding="checkbox" onClick={(event) => handleClick(event, item._id)}><Checkbox color="primary" checked={isItemSelected} /></TableCell>
                  ${tableCells}
                  <TableCell align="right">
                    <Tooltip title="View"><IconButton onClick={(e) => { e.stopPropagation(); /* Implement View Logic */ }}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Edit"><IconButton onClick={(e) => { e.stopPropagation(); handleEdit(item._id); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton onClick={(e) => { e.stopPropagation(); handleDelete(item._id); }} sx={{ color: 'error.main' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={items.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default ${modelName}List;
`;

  fs.writeFileSync(path.join(componentFolder, `${modelName}List.tsx`), listCode);

  console.log(`✅ MODERNIZED Frontend for '${sheetName}' generated at: ${componentFolder}`);
}