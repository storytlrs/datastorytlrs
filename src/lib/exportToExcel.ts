import * as XLSX from "xlsx";
import { ColumnDef } from "@/components/reports/EditableDataTable";

interface ExportSheet {
  name: string;
  columns: ColumnDef[];
  data: any[];
}

/**
 * Export one or more data sheets to an .xlsx file.
 * Uses column definitions to format headers and resolve calculated/formatted values.
 */
export const exportToExcel = (sheets: ExportSheet[], fileName: string) => {
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const headers = sheet.columns.map((col) => col.label);

    const rows = sheet.data.map((row) =>
      sheet.columns.map((col) => {
        const rawValue = row[col.key];

        // For calculated fields, try to compute a raw numeric value
        if (col.calculated && col.format) {
          const formatted = col.format(rawValue, row);
          // Try to parse back to number for Excel
          const num = parseFloat(String(formatted).replace(/[^0-9.-]/g, ""));
          return isNaN(num) ? formatted : num;
        }

        // For nested objects like creators.handle
        if (rawValue && typeof rawValue === "object" && "handle" in rawValue) {
          return rawValue.handle || "-";
        }

        // Return raw value for numbers/strings so Excel can handle them natively
        if (rawValue === null || rawValue === undefined) return "";
        return rawValue;
      })
    );

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto-width columns
    ws["!cols"] = headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...rows.map((r) => String(r[i] ?? "").length)
      );
      return { wch: Math.min(maxLen + 2, 40) };
    });

    // Sanitize sheet name (max 31 chars, no special chars)
    const safeName = sheet.name.replace(/[\\/*?[\]:]/g, "").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  }

  XLSX.writeFile(wb, `${fileName}.xlsx`);
};
