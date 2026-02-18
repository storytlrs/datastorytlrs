import { MappingFieldSelect } from "./MappingFieldSelect";
import type { ParsedColumn } from "./fileParser";
import type { TargetTable } from "./mappingConfig";

interface ColumnMappingRowProps {
  column: ParsedColumn;
  mapping: string | null;
  onChange: (value: string | null) => void;
  filterTable?: TargetTable;
}

export const ColumnMappingRow = ({ column, mapping, onChange, filterTable }: ColumnMappingRowProps) => {
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
          filterTable={filterTable}
        />
      </td>
    </tr>
  );
};
