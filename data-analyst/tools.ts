import Database from "better-sqlite3";
import { tool } from "ai";
import z from "zod";
import type { TableRow, PragmaRow, Row, ListTablesResult, DescribeTableResult, RunQueryResult } from "./types.ts";

export const db = new Database(process.env.DB_PATH ?? 'data/store.db', { readonly: true });

export const listTables = tool({
  description: 'List all tables in the database',
  inputSchema: z.object({}),
  execute: async (): Promise<ListTablesResult> => {
    const rows = db.prepare<[], TableRow>(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all();
    return { tables: rows.map(r => r.name) };
  },
});

export const describeTable = tool({
  description: 'Get column names, types, and nullability for a table',
  inputSchema: z.object({ tableName: z.string() }),
  execute: async ({ tableName }): Promise<DescribeTableResult> => {
    const safeName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    if (safeName !== tableName) return { error: 'Invalid table name.' };

    const tables = db.prepare<[string], TableRow>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    ).all(tableName);
    if (tables.length === 0) return { error: 'Table not found.' };

    const info = db.prepare<[], PragmaRow>(`PRAGMA table_info("${safeName}")`).all();
    return {
      columns: info.map(col => ({
        name: col.name,
        type: col.type,
        nullable: col.notnull === 0,
      })),
    };
  },
});

const ROW_LIMIT = 100;

export const runQuery = tool({
  description: 'Run a read-only SELECT query against the database',
  inputSchema: z.object({ sql: z.string() }),
  execute: async ({ sql }): Promise<RunQueryResult> => {
    if (!sql.trim().toUpperCase().startsWith('SELECT')) {
      return { error: 'Only SELECT statements are allowed.' };
    }
    try {
      const rows = db.prepare<[], Row>(sql).all();
      const truncated = rows.length > ROW_LIMIT;
      return { rows: rows.slice(0, ROW_LIMIT), truncated };
    } catch (err) {
      return { error: (err as Error).message };
    }
  },
});
