import * as XLSX from "xlsx";
import { suggestMapping } from "./mappingConfig";

export interface ParsedColumn {
  name: string;
  sampleValues: string[];
  suggestedMapping: string | null;
}

export interface ParsedFile {
  columns: ParsedColumn[];
  rows: Record<string, any>[];
  totalRows: number;
  fileName: string;
  sheetNames?: string[];
  selectedSheet?: string;
}

// Parse XLSX or CSV file
export const parseFile = async (file: File, sheetName?: string, skipFirstRow = false, skipLastRow = false): Promise<ParsedFile> => {
  const fileName = file.name;
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    return parseCSV(file, skipFirstRow, skipLastRow);
  } else if (extension === "xlsx" || extension === "xls") {
    return parseXLSX(file, sheetName, skipFirstRow, skipLastRow);
  } else {
    throw new Error("Unsupported file format. Please upload XLSX, XLS, or CSV file.");
  }
};

// Get sheet names from an XLSX file
export const getSheetNames = async (file: File): Promise<string[]> => {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv") return [];
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  return workbook.SheetNames;
};

// Parse CSV file
const parseCSV = async (file: File, skipFirstRow = false, skipLastRow = false): Promise<ParsedFile> => {
  const text = await file.text();
  
  // Detect delimiter (comma, semicolon, or tab)
  const firstLine = text.split("\n")[0];
  let delimiter = ",";
  if (firstLine.includes(";") && !firstLine.includes(",")) {
    delimiter = ";";
  } else if (firstLine.includes("\t") && !firstLine.includes(",") && !firstLine.includes(";")) {
    delimiter = "\t";
  }

  // Parse using xlsx library for consistency
  const workbook = XLSX.read(text, { type: "string", FS: delimiter });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  return parseSheet(sheet, file.name, skipFirstRow, skipLastRow);
};

// Parse XLSX file
const parseXLSX = async (file: File, targetSheet?: string, skipFirstRow = false, skipLastRow = false): Promise<ParsedFile> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  
  // If a specific sheet is requested, use that
  if (targetSheet && workbook.SheetNames.includes(targetSheet)) {
    const sheet = workbook.Sheets[targetSheet];
    const result = parseSheet(sheet, file.name, skipFirstRow, skipLastRow);
    result.sheetNames = workbook.SheetNames;
    result.selectedSheet = targetSheet;
    return result;
  }

  // Find the first sheet with actual data
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: null });
    
    // Skip empty sheets or sheets with less than 1 row
    if (data.length >= 1) {
      const result = parseSheet(sheet, file.name, skipFirstRow, skipLastRow);
      result.sheetNames = workbook.SheetNames;
      result.selectedSheet = sheetName;
      return result;
    }
  }
  
  throw new Error("No valid data found in the file");
};

// Parse a sheet into our format
const parseSheet = (sheet: XLSX.WorkSheet, fileName: string, skipFirstRow = false, skipLastRow = false): ParsedFile => {
  if (skipFirstRow) {
    // When skipping the first row (title row), we need to use the second row as headers
    // Read all rows as arrays (no header detection)
    const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    if (rawData.length < 2) {
      throw new Error("Not enough data in the file");
    }

    // Row 0 is the title row (skip it), row 1 is the actual header row
    const headerRow = rawData[1];
    const columnNames = headerRow.map((h: any, i: number) => 
      h !== null && h !== undefined ? String(h).trim() : `Column ${i + 1}`
    );

    // Data starts from row 2
    let dataRows = rawData.slice(2);
    
    // Skip last row if requested (e.g. "Results" totals row)
    if (skipLastRow && dataRows.length > 0) {
      dataRows = dataRows.slice(0, -1);
    }

    // Filter out completely empty rows
    dataRows = dataRows.filter(row => row.some((cell: any) => cell !== null && cell !== undefined && cell !== ""));

    // Convert arrays to objects using header names
    const rows = dataRows.map((row) => {
      const obj: Record<string, any> = {};
      columnNames.forEach((col, i) => {
        obj[col] = row[i] !== undefined ? row[i] : null;
      });
      return obj;
    });

    // Build columns with sample values and suggestions
    const columns: ParsedColumn[] = columnNames.map((name) => {
      const sampleValues = rows
        .slice(0, 3)
        .map((row) => formatSampleValue(row[name]))
        .filter((v) => v !== "" && v !== null);
      
      const suggestedMapping = suggestMapping(name);
      
      return { name, sampleValues, suggestedMapping };
    });

    return {
      columns,
      rows,
      totalRows: rows.length,
      fileName,
    };
  }

  // Standard parsing (no skip)
  const data: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });
  
  if (data.length === 0) {
    throw new Error("No data found in the file");
  }

  // Get column names from first row keys
  const columnNames = Object.keys(data[0]);

  let rows = data;
  // Skip last row if requested
  if (skipLastRow && rows.length > 0) {
    rows = rows.slice(0, -1);
  }
  
  // Build columns with sample values and suggestions
  const columns: ParsedColumn[] = columnNames.map((name) => {
    // Get up to 3 sample values
    const sampleValues = rows
      .slice(0, 3)
      .map((row) => formatSampleValue(row[name]))
      .filter((v) => v !== "" && v !== null);
    
    // Suggest mapping based on column name
    const suggestedMapping = suggestMapping(name);
    
    return {
      name,
      sampleValues,
      suggestedMapping,
    };
  });

  // Clean up rows - convert to consistent format
  const cleanRows = rows.map((row) => {
    const cleanRow: Record<string, any> = {};
    columnNames.forEach((col) => {
      cleanRow[col] = row[col];
    });
    return cleanRow;
  });

  return {
    columns,
    rows: cleanRows,
    totalRows: cleanRows.length,
    fileName,
  };
};

// Format a value for sample display
const formatSampleValue = (value: any): string => {
  if (value === null || value === undefined) {
    return "";
  }
  
  if (typeof value === "number") {
    // Format large numbers with thousands separator
    if (value >= 1000) {
      return value.toLocaleString();
    }
    return value.toString();
  }
  
  if (typeof value === "string") {
    // Truncate long strings
    if (value.length > 30) {
      return value.substring(0, 27) + "...";
    }
    return value;
  }
  
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  
  return String(value);
};

// Extract value from a cell, handling markdown links etc.
export const extractValue = (value: any, fieldType: string): any => {
  if (value === null || value === undefined) {
    return null;
  }

  // Handle markdown links like [handle](url)
  if (typeof value === "string") {
    const markdownMatch = value.match(/\[([^\]]+)\]/);
    if (markdownMatch) {
      value = markdownMatch[1];
    }
  }

  switch (fieldType) {
    case "number":
      if (typeof value === "number") return value;
      if (typeof value === "string") {
        // Remove non-numeric characters except decimal point and minus
        const cleaned = value.replace(/[^0-9.-]/g, "");
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
      }
      return null;

    case "date":
      if (value instanceof Date) return value.toISOString();
      if (typeof value === "string") {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date.toISOString();
      }
      if (typeof value === "number") {
        // Excel date serial number
        const date = XLSX.SSF.parse_date_code(value);
        if (date) {
          return new Date(date.y, date.m - 1, date.d).toISOString();
        }
      }
      return null;

    case "enum":
      return value ? String(value).toLowerCase().trim() : null;

    case "text":
    default:
      return value ? String(value).trim() : null;
  }
};

// Infer platform from URL
export const inferPlatformFromUrl = (url: string): string | null => {
  if (!url) return null;
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("instagram.com")) return "instagram";
  if (lowerUrl.includes("tiktok.com")) return "tiktok";
  if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) return "youtube";
  if (lowerUrl.includes("facebook.com")) return "facebook";
  if (lowerUrl.includes("twitter.com") || lowerUrl.includes("x.com")) return "twitter";
  return null;
};

// Infer content type from URL or text
export const inferContentType = (value: string): string | null => {
  if (!value) return null;
  const lower = value.toLowerCase();
  
  if (lower.includes("reel") || lower.includes("/reel/")) return "reel";
  if (lower.includes("story") || lower.includes("stories")) return "story";
  if (lower.includes("short")) return "short";
  if (lower.includes("video")) return "video";
  if (lower.includes("post") || lower.includes("/p/")) return "post";
  
  return null;
};
