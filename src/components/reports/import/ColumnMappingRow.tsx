import { MappingFieldSelect } from "./MappingFieldSelect";
import type { ParsedColumn } from "./fileParser";

interface ColumnMappingRowProps {
  column: ParsedColumn;
  mapping: string | null;
  onChange: (value: string | null) => void;
}

export const ColumnMappingRow = ({ column, mapping, onChange }: ColumnMappingRowProps) => {
  return (
    <tr className="border-b border-border">
      <td className="py-3 px-4">
        <span className="font-medium">{column.name}</span>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm text-muted-foreground">
          {column.sampleValues.length > 0
            ? column.sampleValues.join(", ")
            : "—"}
        </span>
      </td>
      <td className="py-3 px-4">
        <MappingFieldSelect
          value={mapping}
          onChange={onChange}
        />
      </td>
    </tr>
  );
};
