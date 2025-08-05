// src/utils/excelParser.ts

import xlsx from "xlsx";

export interface Field {
  label: string;
  fieldName: string;
  type: string;
  required: boolean;
  options?: string;
  reference?: string;
  uiType: string;
  searchable?: boolean;
}

export function parseExcel(filePath: string): Record<string, Field[]> {
  const workbook = xlsx.readFile(filePath);
  const models: Record<string, Field[]> = {};

  workbook.SheetNames.forEach((sheetName) => {
    const trimmedSheetName = sheetName.trim();
    if (!trimmedSheetName) return;

    const worksheet = workbook.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json<any>(worksheet);

    const fields: Field[] = rawRows
      .filter(row => row.fieldName) // ✅ First, filter out any completely empty rows
      .map((row: any) => {
        // ✅ CRITICAL FIX: The `type` from Excel is the source of truth.
        // The `uiType` is for display hints.
        const typeFromExcel = row.type || "string";
        const uiTypeFromExcel = row.uiType;

        return {
          label: row.label || "",
          fieldName: row.fieldName || "",
          // Use the type directly from the Excel column
          type: typeFromExcel,
          required: parseBoolean(row.required),
          options: row.options,
          reference: row.reference,
          // Use the uiType from Excel first, only infer if it's missing
          uiType: uiTypeFromExcel || inferUIType(typeFromExcel),
          searchable: parseBoolean(row.searchable),
        };
      });

    models[trimmedSheetName] = fields;
  });

  return models;
}

function inferUIType(type: string): string {
  if (!type) return 'input';
  switch (type.toLowerCase()) {
    case "textarea": return "textarea";
    case "boolean": return "checkbox";
    case "date": return "date";
    case "file": case "image": return "file";
    // We let 'password' and 'email' fall through to the default
    // because their primary identifier is their 'type', not 'uiType'.
    default: return "input";
  }
}

function parseBoolean(value: any): boolean {
  if (typeof value === "boolean") return value;
  if (!value) return false;
  const strValue = String(value).toLowerCase().trim();
  return strValue === "true" || strValue === "yes" || strValue === "1" || strValue === "*";
}