// src/utils/frontendGenerator.ts

import fs from "fs";
import path from "path";
import { Field } from "./excelParser";

function pascalCase(str: string): string { if (!str) return ''; return str.replace(/[^a-zA-Z0-9]/g, " ").split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(""); }
function toTitle(sheet: string): string { return sheet.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()); }
function getReferenceStateName(ref: string | undefined): string { if (!ref) return ""; return ref.charAt(0).toLowerCase() + ref.slice(1) + "Options"; }

export function generateFrontend(sheetName: string, fields: Field[]) {
  const modelName = pascalCase(sheetName);
  const lcEntity = sheetName.toLowerCase().replace(/\s/g, '-');
  const componentFolder = path.resolve(__dirname, "../../../frontend/src/generated-frontend", lcEntity);

  if (!fs.existsSync(componentFolder)) {
    fs.mkdirSync(componentFolder, { recursive: true });
  }

  const initialState = fields.map(f => `${f.fieldName}: ${f.type === 'boolean' ? 'false' : `''`}`).join(",\n    ");
  const referenceStatesInit = fields.filter(f => f.reference).map(f => `const [${getReferenceStateName(f.reference)}, set${pascalCase(getReferenceStateName(f.reference))}] = useState([]);`).join("\n  ");
  const referenceUseEffects = fields.filter(f => f.reference).map(f => `axios.get(\`http://localhost:5000/api/${f.reference?.toLowerCase().replace(/\s/g, '-')}\`).then(res => set${pascalCase(getReferenceStateName(f.reference))}(res.data.data || res.data)).catch(console.error);`).join("\n    ");
  
  const formFields = fields.map((f) => {
    const name = f.fieldName;
    const label = f.label;
    const required = !!f.required;
    const stateRef = `formData.${name}`;
    const placeholder = `${label}...`;

    const commonFieldWrapperStart = `<div style={{gridColumn: '${f.type === 'textarea' || f.uiType === 'file' ? 'span 2' : 'span 1'}'}}>
      <Form.Field name="${name}">
        <Form.Label style={labelStyle}>${label}${required ? '<span style={{color: "red"}}> *</span>' : ''}</Form.Label>`;
    const commonFieldWrapperEnd = `</Form.Field></div>`;

    if (f.uiType === "radio" && f.options) {
      const radioOptions = f.options.split(',').map(opt => `
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <RadioGroup.Item value="${opt.trim()}" id="${name}-${opt.trim()}" style={{ all: 'unset', backgroundColor: 'white', width: '20px', height: '20px', borderRadius: '100%', boxShadow: '0 0 0 1px #d1d5db', cursor: 'pointer', position: 'relative' }}>
              <RadioGroup.Indicator style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', position: 'relative', '::after': { content: '""', display: 'block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#16a34a' } }} />
            </RadioGroup.Item>
            <label htmlFor="${name}-${opt.trim()}" style={{ color: '#374151', fontSize: '14px', paddingLeft: '12px', userSelect: 'none' }}>${opt.trim()}</label>
          </div>`).join('');
      return `${commonFieldWrapperStart}
        <Form.Control asChild>
          <RadioGroup.Root value={${stateRef}} onValueChange={(value) => handleFormChange("${name}", value)} required={${required}} style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
            ${radioOptions}
          </RadioGroup.Root>
        </Form.Control>
      ${commonFieldWrapperEnd}`;
    }
    
    if (f.uiType === "file") {
      return `${commonFieldWrapperStart}
        <div 
          onClick={() => document.getElementById('${name}-file-input')?.click()} 
          style={{ cursor: 'pointer', border: '2px dashed #d1d5db', borderRadius: '8px', padding: '24px', textAlign: 'center', backgroundColor: '#fafafa', marginTop: '8px' }}
        >
          <UploadCloud style={{ height: '32px', width: '32px', color: '#6b7280', margin: '0 auto 8px' }} />
          <p style={{ fontSize: '14px', fontWeight: 500, color: '#16a34a' }}>Drop files here or click to upload.</p>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>Upload Image (Max: 5MB)</p>
          {formData.${name} && <p style={{ fontSize: '12px', color: '#374151', marginTop: '8px', fontWeight: 500 }}>Selected: {formData.${name}.name}</p>}
        </div>
        <input type="file" id="${name}-file-input" name="${name}" onChange={handleFileChange} style={{ display: 'none' }} />
      ${commonFieldWrapperEnd}`;
    }

    if (f.reference) {
        const refState = getReferenceStateName(f.reference);
        return `${commonFieldWrapperStart}
        <Select.Root value={${stateRef} || ''} onValueChange={(value) => handleFormChange("${name}", value)} required={${required}}>
          <Form.Control asChild>
              <Select.Trigger style={{...inputStyle, justifyContent: 'space-between'}}>
                <Select.Value placeholder="Select ${label}" />
                <Select.Icon><ChevronDown /></Select.Icon>
              </Select.Trigger>
          </Form.Control>
          <Select.Portal>
            <Select.Content style={{ zIndex: 10, overflow: 'hidden', backgroundColor: 'white', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
              <Select.Viewport style={{ padding: '5px' }}>
                {Array.isArray(${refState}) && ${refState}.map((option) => (
                  <Select.Item key={option._id} value={option._id} style={selectItemStyle}>
                    <Select.ItemText>{option.name || option.title || option._id}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      ${commonFieldWrapperEnd}`;
    }
    
    if (f.type === "textarea") {
        return `${commonFieldWrapperStart}
        <Form.Control asChild>
            <textarea value={${stateRef} || ''} onChange={(e) => handleFormChange("${name}", e.target.value)} required={${required}} style={{ ...inputStyle, height: '120px', resize: 'vertical', paddingTop: '8px' }} placeholder="${placeholder}"/>
        </Form.Control>
        ${commonFieldWrapperEnd}`;
    }
    
    return `${commonFieldWrapperStart}
      <Form.Control asChild>
        <input type="text" value={${stateRef} || ''} placeholder="${placeholder}" onChange={(e) => handleFormChange("${name}", e.target.value)} required={${required}} style={inputStyle} />
      </Form.Control>
    ${commonFieldWrapperEnd}`;
  }).join('');

  const formCode = `
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import * as Form from "@radix-ui/react-form";
import * as Select from "@radix-ui/react-select";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { ChevronDown, UploadCloud } from "lucide-react";

const ${modelName}Form = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({ ${initialState} });
  ${referenceStatesInit}

  const fields = ${JSON.stringify(fields)};

  useEffect(() => {
    ${referenceUseEffects}
    if (id && id !== 'new') {
      axios.get(\`http://localhost:5000/api/${lcEntity}/\${id}\`).then(res => {
        let d = { ...res.data };
        fields.forEach(f => { if (f.type === 'date' && d[f.fieldName]) d[f.fieldName] = new Date(d[f.fieldName]).toISOString().split('T')[0]; if (d[f.fieldName]?._id) d[f.fieldName] = d[f.fieldName]._id; });
        setFormData(d);
      }).catch(err => console.error("Failed to fetch:", err));
    }
  }, [id]);

  const handleFormChange = (name, value) => setFormData(prev => ({ ...prev, [name]: value }));
  const handleFileChange = (e) => { const { name, files } = e.target; if (files) handleFormChange(name, files[0]); };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const dataToSend = new FormData();
    for (const key in formData) { dataToSend.append(key, formData[key] ?? ''); }

    try {
      if (id && id !== 'new') await axios.put(\`http://localhost:5000/api/${lcEntity}/\${id}\`, dataToSend);
      else await axios.post("http://localhost:5000/api/${lcEntity}", dataToSend);
      navigate(\`/${lcEntity}\`);
    } catch (error) { console.error("Submit failed:", error); alert("Operation failed."); }
  };

  const inputStyle = { all: 'unset', boxSizing: 'border-box', width: '100%', display: 'inline-flex', alignItems: 'center', borderRadius: '6px', padding: '0 12px', fontSize: 14, lineHeight: 1, color: '#111827', boxShadow: '0 0 0 1px #d1d5db', height: '44px', marginTop: '8px' };
  const labelStyle = { fontSize: '14px', fontWeight: 500, color: '#374151', display: 'block' };
  const selectItemStyle = { all: 'unset', fontSize: 14, lineHeight: 1, color: '#111827', borderRadius: 3, display: 'flex', alignItems: 'center', height: 35, padding: '0 35px 0 25px', position: 'relative', userSelect: 'none', cursor: 'pointer' };

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '32px' }}>
      <Form.Root onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 32px' }}>
          ${formFields}
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
          <Form.Submit asChild>
            <button style={{ all: 'unset', cursor: 'pointer', padding: '10px 20px', backgroundColor: '#16a34a', color: 'white', borderRadius: '6px', fontWeight: 500 }}>
              Submit
            </button>
          </Form.Submit>
          <button type="button" onClick={() => navigate(-1)} style={{ all: 'unset', cursor: 'pointer', padding: '10px 20px', backgroundColor: '#f3f4f6', color: '#374151', borderRadius: '6px', fontWeight: 500, border: '1px solid #e5e7eb' }}>
            Cancel
          </button>
        </div>
      </Form.Root>
    </div>
  );
};
export default ${modelName}Form;`;
  fs.writeFileSync(path.join(componentFolder, `${modelName}Form.tsx`), formCode);

  // --- LIST COMPONENT (TABLE VIEW) ---
  const tableHeaders = fields.map((f) => `<th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#4b5563', whiteSpace: 'nowrap' }}><div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}><span>${f.label}</span><ChevronsUpDown style={{ height: '14px', width: '14px', color: '#9ca3af' }} /></div></th>`).join("\n");
  const tableCells = fields.map((f) => { const fieldName = f.fieldName; if (f.type === "boolean") return `<td style={cellStyle}>{item.${fieldName} ? "Yes" : "No"}</td>`; if (f.type === 'date') return `<td style={cellStyle}>{item.${fieldName} ? new Date(item.${fieldName}).toLocaleDateString() : "N/A"}</td>`; if (f.reference) return `<td style={truncatedCellStyle}>{item.${fieldName} ? (item.${fieldName}.name || item.${fieldName}.title || "N/A") : "N/A"}</td>`; return `<td style={truncatedCellStyle}>{item.${fieldName}}</td>`; }).join("\n");
  
  const listCode = `
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import * as Checkbox from '@radix-ui/react-checkbox';
import { Plus, ChevronsUpDown, Check, Eye, Edit } from "lucide-react";
import { Link as LinkIcon } from "lucide-react";

const ${modelName}List = () => {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const navigate = useNavigate();

  const fetchItems = useCallback(() => {
    const apiUrl = \`http://localhost:5000/api/${lcEntity}?page=\${page + 1}&limit=\${rowsPerPage}\`;
    axios.get(apiUrl).then(res => { setItems(res.data.data || []); setTotalItems(res.data.total || 0); }).catch(err => console.error("Failed to fetch items:", err));
  }, [page, rowsPerPage]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSelectAllClick = (checked) => { setSelected(checked ? items.map((n) => n._id) : []); };
  const handleClick = (id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];
    if (selectedIndex === -1) { newSelected = newSelected.concat(selected, id); }
    else { newSelected = selected.filter(selId => selId !== id); }
    setSelected(newSelected);
  };

  const handleAddNew = () => navigate(\`/${lcEntity}/new\`);
  const handleEdit = (id) => navigate(\`/${lcEntity}/\${id}/edit\`);
  
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const checkboxRootStyle = { all: 'unset', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16px', width: '16px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' };
  const checkboxIndicatorStyle = { color: '#16a34a' };
  const cellStyle = { padding: '12px 16px', fontSize: '14px', color: '#374151', borderTop: '1px solid #f3f4f6' };
  const truncatedCellStyle = {...cellStyle, maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'};
  
  return (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#111827' }}>${toTitle(sheetName)}</h1>
        <button onClick={handleAddNew} style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#16a34a', color: 'white', borderRadius: '6px', fontWeight: 500, fontSize: '14px' }}>
          <Plus style={{ height: '16px', width: '16px' }} /> Add New
        </button>
      </div>
      
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb' }}>
            <tr>
              <th style={{ padding: '12px 16px' }}>
                <Checkbox.Root
                    checked={selected.length > 0 && selected.length === items.length}
                    onCheckedChange={handleSelectAllClick}
                    style={checkboxRootStyle}
                >
                    <Checkbox.Indicator style={checkboxIndicatorStyle}><Check /></Checkbox.Indicator>
                </Checkbox.Root>
              </th>
              ${tableHeaders}
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Quick Links</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const isItemSelected = selected.indexOf(item._id) !== -1;
              return (
                <tr key={item._id} style={{ backgroundColor: isItemSelected ? '#f9fafb' : 'white' }}>
                  <td style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6' }}>
                    <Checkbox.Root checked={isItemSelected} onCheckedChange={() => handleClick(item._id)} style={checkboxRootStyle}>
                        <Checkbox.Indicator style={checkboxIndicatorStyle}><Check /></Checkbox.Indicator>
                    </Checkbox.Root>
                  </td>
                  ${tableCells}
                  <td style={{ ...cellStyle, borderTop: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <button style={{ all: 'unset', cursor: 'pointer' }}><LinkIcon style={{ height: '16px', width: '16px', color: '#4b5563' }} /></button>
                        <button style={{ all: 'unset', cursor: 'pointer' }}><Eye style={{ height: '16px', width: '16px', color: '#4b5563' }} /></button>
                        <button onClick={() => handleEdit(item._id)} style={{ all: 'unset', cursor: 'pointer' }}><Edit style={{ height: '16px', width: '16px', color: '#4b5563' }} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select value={rowsPerPage} onChange={e => setRowsPerPage(Number(e.target.value))} style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 8px', fontSize: '14px' }}>
                <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
            </select>
            <span style={{ fontSize: '14px', color: '#4b5563' }}>Records per page</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '14px', color: '#4b5563' }}>
                Showing {totalItems > 0 ? page * rowsPerPage + 1 : 0} to {Math.min((page + 1) * rowsPerPage, totalItems)} of {totalItems} Results
            </span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ all: 'unset', cursor: 'pointer', padding: '6px', opacity: page === 0 ? 0.5 : 1 }}>&lt;</button>
                {Array.from({ length: totalPages }, (_, i) => i).map(p => (
                    <button key={p} onClick={() => setPage(p)} style={{ all: 'unset', cursor: 'pointer', padding: '4px 10px', margin: '0 2px', borderRadius: '4px', fontSize: '14px', backgroundColor: p === page ? '#16a34a' : 'transparent', color: p === page ? 'white' : '#374151' }}>{p + 1}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{ all: 'unset', cursor: 'pointer', padding: '6px', opacity: page >= totalPages - 1 ? 0.5 : 1 }}>&gt;</button>
            </div>
        </div>
      </div>
    </div>
  );
};
export default ${modelName}List;`;
  fs.writeFileSync(path.join(componentFolder, `${modelName}List.tsx`), listCode);
  console.log(`✅ Table view and Form for '${sheetName}' generated with all fixes at: ${componentFolder}`);
}