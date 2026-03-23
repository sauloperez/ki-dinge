import { db } from './db.ts';
import { decrementStock } from './products.ts';

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'cancelled';

export interface OrderItem {
  productId: string;
  qty: number;
  unitPriceInCents: number;
}

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: Date;
}

export async function createOrder(customerId: string, items: OrderItem[]): Promise<Order> {
  for (const item of items) {
    await decrementStock(item.productId, item.qty);
  }

  return db.query(
    'INSERT INTO orders (customer_id, items, status) VALUES ($1, $2, $3) RETURNING *',
    [customerId, JSON.stringify(items), 'pending']
  );
}

export async function updateStatus(orderId: string, status: OrderStatus): Promise<void> {
  await db.query('UPDATE orders SET status = $2 WHERE id = $1', [orderId, status]);
}

// BUG: cancelled orders do not restock inventory
export async function cancelOrder(orderId: string): Promise<void> {
  await updateStatus(orderId, 'cancelled');
}
