import { db } from './db.ts';
import { redis } from './cache.ts';

export interface Customer {
  id: string;
  email: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  country: string;
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const cached = await redis.get(`customer:${id}`);
  if (cached) return JSON.parse(cached);

  const customer = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
  if (customer) await redis.set(`customer:${id}`, JSON.stringify(customer), 'EX', 300);
  return customer;
}

export async function createCustomer(data: Omit<Customer, 'id'>): Promise<Customer> {
  return db.query(
    'INSERT INTO customers (email, name, address_line1, address_line2, city, country) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [data.email, data.name, data.addressLine1, data.addressLine2 ?? null, data.city, data.country]
  );
}
