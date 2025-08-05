// src/utils/frontendGenerator.ts

import fs from "fs";
import path from "path";
import { Field } from "./excelParser"; // Ensure your Field type is exported from excelParser.ts

// UTILITY FUNCTIONS
function pascalCase(str: string): string {
  if (!str) return '';
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
  const lcEntity = sheetName.toLowerCase().replace(/\s/g, '-');
  const componentFolder = path.resolve(
    __dirname,
    "../../../frontend/src/generated-frontend",
    lcEntity
  );

  if (!fs.existsSync(componentFolder)) {
    fs.mkdirSync(componentFolder, { recursive: true });
  } else {
    console.log(`⏩ Frontend for '${sheetName}' already exists. Skipping.`);
    return;
  }

  // =================================================================
  // PART 1: FORM COMPONENT GENERATION
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
      const refApi = `http://localhost:5000/api/${f.reference?.toLowerCase().replace(/\s/g, '-')}`;
      return `axios.get("${refApi}").then(res => set${pascalCase(refState)}(res.data.data || res.data)).catch(console.error);`;
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
        return `<FormControlLabel control={<Checkbox name="${name}" checked={!!${stateRef}} onChange={handleChange} />} label="${label}" sx={{ gridColumn: 'span 2' }} />`;
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
  <Select name="${name}" value={${stateRef} || ''} onChange={handleChange} label="${label}" ${required}>
    ${options}
  </Select>
</FormControl>`;
      }
      if (f.uiType === "file") {
        return `<Box sx={{ gridColumn: 'span 2' }}><Button variant="outlined" component="label">${label}<input type="file" hidden name="${name}" onChange={handleChange} /></Button></Box>`;
      }
      if (f.uiType === "radio") {
        const radioOptions = f.options?.split(",").map((opt) => `<FormControlLabel value="${opt.trim()}" control={<Radio />} label="${opt.trim()}" />`).join("\n        ") || "";
        return `<FormControl sx={{ gridColumn: 'span 2' }}>
  <FormLabel>${label}</FormLabel>
  <RadioGroup row name="${name}" value={${stateRef} || ''} onChange={handleChange}>
    ${radioOptions}
  </RadioGroup>
</FormControl>`;
      }
      if (f.type === "textarea") {
        return `<TextField fullWidth label="${label}" name="${name}" value={${stateRef} || ''} onChange={handleChange} ${required} multiline rows={4} sx={{ gridColumn: 'span 2' }} />`;
      }
      return `<TextField fullWidth label="${label}" name="${name}" value={${stateRef} || ''} onChange={handleChange} ${required} />`;
    })
    .join("\n      ");

  const formCode = `
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { Paper, Typography, TextField, Button, MenuItem, FormControl, InputLabel, Select, Checkbox, FormControlLabel, Radio, RadioGroup, Box, FormLabel } from "@mui/material";

const ${modelName}Form = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState<any>({ ${initialState} });
  ${referenceStatesInit}

  useEffect(() => {
    // This fetches the options for all reference dropdowns
    ${referenceUseEffects}

    // This fetches the specific item data for editing
    if (id && id !== 'new') {
      axios.get("http://localhost:5000/api/${lcEntity}/" + id)
        .then((res) => {
          const fetchedData = res.data;
          const flattenedData = { ...fetchedData };
          Object.keys(flattenedData).forEach(key => {
            if (flattenedData[key] && typeof flattenedData[key] === 'object' && flattenedData[key]._id) {
              flattenedData[key] = flattenedData[key]._id;
            }
          });
          setFormData(flattenedData);
        })
        .catch((err) => console.error("Failed to fetch for edit:", err));
    }
  }, [id]);

  ${handleChangeContent}

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (id && id !== 'new') {
        await axios.put("http://localhost:5000/api/${lcEntity}/" + id, formData);
        alert("Updated successfully");
      } else {
        await axios.post("http://localhost:5000/api/${lcEntity}", formData);
        alert("Created successfully");
      }
      navigate("/${lcEntity}s");
    } catch (error) {
      console.error("Submit failed:", error);
      alert("Operation failed. See console for details.");
    }
  };

  return (
    <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}>
      <Typography variant="h5" sx={{ mb: 3 }}>{id && id !== 'new' ? 'Edit ${modelName}' : 'Create New ${modelName}'}</Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gridTemplateColumns: { sm: '1fr 1fr' }, gap: 2 }}>
        ${formFields}
        <Button type="submit" variant="contained" sx={{ mt: 2, gridColumn: { sm: 'span 2' } }}>
          {id && id !== 'new' ? "Update" : "Create"}
        </Button>
      </Box>
    </Paper>
  );
};
export default ${modelName}Form;
`;

  fs.writeFileSync(path.join(componentFolder, `${modelName}Form.tsx`), formCode);
  
  // =================================================================
  // PART 2: LIST COMPONENT GENERATION (with server-side pagination)
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
      return `<TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.${fieldName}}</TableCell>`;
    })
    .join("\n                  ");

  const listCode = `
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Paper, Toolbar, Typography, Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Checkbox, IconButton, Tooltip, TablePagination, Button } from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Visibility as VisibilityIcon } from "@mui/icons-material";

const ${modelName}List = () => {
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const navigate = useNavigate();

  const fetchItems = useCallback(() => {
    const apiUrl = \`http://localhost:5000/api/${lcEntity}?page=\${page + 1}&limit=\${rowsPerPage}\`;
    axios.get(apiUrl)
      .then(res => {
        setItems(res.data.data || []);
        setTotalItems(res.data.total || 0);
      })
      .catch(err => console.error("Failed to fetch items:", err));
  }, [page, rowsPerPage]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

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
        await axios.delete("http://localhost:5000/api/${lcEntity}/" + id);
        fetchItems();
        setSelected(prev => prev.filter(selId => selId !== id));
      } catch (err) { alert("Failed to delete item."); }
    }
  };
  
  const handleAddNew = () => navigate("/${lcEntity}s/new");
  const handleEdit = (id: string) => navigate(\`/${lcEntity}s/\${id}/edit\`);
  const isSelected = (id: string) => selected.indexOf(id) !== -1;

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
            {items.map((item) => {
              const isItemSelected = isSelected(item._id);
              return (
                <TableRow hover role="checkbox" aria-checked={isItemSelected} tabIndex={-1} key={item._id} selected={isItemSelected} sx={{ cursor: 'pointer' }}>
                  <TableCell padding="checkbox" onClick={(event) => handleClick(event, item._id)}><Checkbox color="primary" checked={isItemSelected} /></TableCell>
                  ${tableCells}
                  <TableCell align="right">
                    <Tooltip title="View"><IconButton onClick={(e) => { e.stopPropagation(); }}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
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
        count={totalItems}
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