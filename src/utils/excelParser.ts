import xlsx from "xlsx";

export interface Field {
  label: string;
  fieldName: string;
  type: string;
  required: boolean; // ✅ Not optional
  options?: string;
  reference?: string;
  uiType: string;
}

export function parseExcel(filePath: string): Record<string, Field[]> {
  const workbook = xlsx.readFile(filePath);
  const models: Record<string, Field[]> = {};

  workbook.SheetNames.forEach((sheet) => {
    const rawRows = xlsx.utils.sheet_to_json<any>(workbook.Sheets[sheet]);

    const fields: Field[] = rawRows.map((row: any) => ({
      label: row.label,
      fieldName: row.fieldName,
      type: row.type,
      required: parseBoolean(row.required), // ✅ Force to boolean
      options: row.options,
      reference: row.reference,
      uiType: inferUIType(row.type),
    }));

    models[sheet] = fields;
  });

  return models;
}

function inferUIType(type: string): string {
  switch (type?.toLowerCase()) {
    case "text":
    case "email":
    case "password":
    case "number":
      return "input";
    case "textarea":
      return "textarea";
    case "select":
    case "dropdown":
      return "select";
    case "radio":
      return "radio";
    case "checkbox":
      return "checkbox";
    case "date":
      return "date";
    case "file":
    case "image":
      return "file";
    default:
      return "input";
  }
}

function parseBoolean(value: any): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false; // default to false if undefined or unknown
}
