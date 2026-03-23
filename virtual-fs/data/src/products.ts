import { db } from './db.ts';

export interface Product {
  id: string;
  name: string;
  priceInCents: number;
  stock: number;
  tags: string[];
}

export async function getProduct(id: string): Promise<Product | null> {
  return db.query('SELECT * FROM products WHERE id = $1', [id]);
}

export async function listProducts(tag?: string): Promise<Product[]> {
  if (tag) {
    return db.query('SELECT * FROM products WHERE $1 = ANY(tags)', [tag]);
  }
  return db.query('SELECT * FROM products');
}

export async function decrementStock(id: string, qty: number): Promise<void> {
  await db.query(
    'UPDATE products SET stock = stock - $2 WHERE id = $1 AND stock >= $2',
    [id, qty]
  );
}
