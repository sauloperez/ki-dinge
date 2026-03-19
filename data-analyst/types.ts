// SQLite query row shapes
export type TableRow = { name: string };
export type PragmaRow = { name: string; type: string; notnull: number };

// Tool result types
export type Column = { name: string; type: string; nullable: boolean };
export type ListTablesResult = { tables: string[] };
export type DescribeTableResult = { columns: Column[] } | { error: string };

export type Row = Record<string, unknown>;
export type RunQuerySuccess = { rows: Row[]; truncated: boolean };
export type RunQueryResult = RunQuerySuccess | { error: string };
