import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import type { ToolExecutionOptions } from 'ai';
import Database from 'better-sqlite3';
import { unlinkSync, existsSync } from 'fs';
import type { ListTablesResult, Column, Row, RunQuerySuccess } from './types.ts';

const TEST_DB = '/tmp/test-analyst.db';

// Must be set before tools.ts is imported so the module opens the test db
process.env.DB_PATH = TEST_DB;

const { listTables, describeTable, runQuery } = await import('./tools.ts');

const opts: ToolExecutionOptions = {
  toolCallId: 'test',
  messages: [],
  abortSignal: new AbortController().signal,
};

beforeAll(() => {
  const db = new Database(TEST_DB);
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      country TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      total REAL NOT NULL,
      ordered_at TEXT NOT NULL
    );
    INSERT INTO customers VALUES (1, 'Alice', 'alice@example.com', 'US', '2023-01-01');
    INSERT INTO customers VALUES (2, 'Bob', 'bob@example.com', 'UK', '2023-02-01');
    INSERT INTO products VALUES (1, 'Laptop', 'Electronics', 999.99);
    INSERT INTO orders VALUES (1, 1, 1, 2, 1999.98, '2023-03-01');
  `);
  db.close();
});

afterAll(() => {
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
});

describe('listTables', () => {
  test('returns all table names in the database', async () => {
    const result = await listTables.execute!({}, opts) as ListTablesResult;
    expect(result.tables).toEqual(
      expect.arrayContaining(['customers', 'products', 'orders'])
    );
  });
});

describe('describeTable', () => {
  test('returns column info for an existing table', async () => {
    const result = await describeTable.execute!({ tableName: 'customers' }, opts) as { columns: Column[] };
    expect(result.columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'id', type: 'INTEGER', nullable: true }),
        expect.objectContaining({ name: 'name', type: 'TEXT', nullable: false }),
        expect.objectContaining({ name: 'country', type: 'TEXT', nullable: false }),
      ])
    );
  });

  test('returns error for a non-existent table', async () => {
    const result = await describeTable.execute!({ tableName: 'nonexistent' }, opts) as { error: string };
    expect(result).toHaveProperty('error');
  });

  test('rejects table names containing special characters', async () => {
    const result = await describeTable.execute!({ tableName: 'customers); DROP TABLE customers--' }, opts) as { error: string };
    expect(result.error).toBe('Invalid table name.');
  });
});

describe('runQuery', () => {
  test('returns rows for a valid SELECT query', async () => {
    const result = await runQuery.execute!({ sql: 'SELECT * FROM customers' }, opts) as { rows: Row[]; truncated: boolean };
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ id: 1, name: 'Alice' });
  });

  test('rejects non-SELECT statements', async () => {
    const result = await runQuery.execute!({ sql: 'DROP TABLE customers' }, opts) as { error: string };
    expect(result).toHaveProperty('error');
  });

  test('returns error for invalid SQL', async () => {
    const result = await runQuery.execute!({ sql: 'SELECT * FROM nonexistent_table' }, opts) as { error: string };
    expect(result).toHaveProperty('error');
  });

  test('truncates results at 100 rows and sets truncated flag', async () => {
    const db = new Database(TEST_DB);
    const insert = db.prepare('INSERT INTO customers VALUES (?, ?, ?, ?, ?)');
    for (let i = 3; i <= 102; i++) {
      insert.run(i, `User${i}`, `user${i}@example.com`, 'US', '2023-01-01');
    }
    db.close();

    const result = await runQuery.execute!({ sql: 'SELECT * FROM customers' }, opts) as RunQuerySuccess;
    expect(result.rows).toHaveLength(100);
    expect(result.truncated).toBe(true);
  });
});
