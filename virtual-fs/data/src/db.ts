import { Pool } from 'pg';

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

// Thin query wrapper — returns first row for single-row queries,
// array for multi-row queries.
db.query = async (sql: string, params?: unknown[]) => {
  const result = await db.pool.query(sql, params);
  if (result.rows.length === 1) return result.rows[0];
  return result.rows;
};
