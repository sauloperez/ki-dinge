import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';

mkdirSync('data', { recursive: true });

const db = new Database('data/store.db');

db.exec(`
  DROP TABLE IF EXISTS orders;
  DROP TABLE IF EXISTS products;
  DROP TABLE IF EXISTS customers;

  CREATE TABLE customers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    country TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL
  );

  CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    total REAL NOT NULL,
    ordered_at TEXT NOT NULL
  );
`);

const insertCustomer = db.prepare(
  'INSERT INTO customers (id, name, email, country, created_at) VALUES (?, ?, ?, ?, ?)'
);

const customers = [
  [1,  'Alice Johnson',  'alice@example.com',   'US',      '2023-01-10'],
  [2,  'Bob Smith',      'bob@example.com',      'UK',      '2023-02-14'],
  [3,  'Clara Müller',   'clara@example.com',    'Germany', '2023-03-05'],
  [4,  'David Dupont',   'david@example.com',    'France',  '2023-04-20'],
  [5,  'Emi Tanaka',     'emi@example.com',      'Japan',   '2023-05-11'],
  [6,  'Fernando Silva', 'fernando@example.com', 'Brazil',  '2023-06-30'],
  [7,  'Grace Kim',      'grace@example.com',    'Canada',  '2023-07-22'],
  [8,  'Hans Weber',     'hans@example.com',     'Germany', '2023-08-08'],
  [9,  'Isabella Costa', 'isabella@example.com', 'Brazil',  '2023-09-17'],
  [10, 'James Carter',   'james@example.com',    'US',      '2023-10-03'],
];

for (const c of customers) insertCustomer.run(...c);

const insertProduct = db.prepare(
  'INSERT INTO products (id, name, category, price) VALUES (?, ?, ?, ?)'
);

const products = [
  [1,  'Wireless Headphones',   'Electronics', 79.99],
  [2,  'Bluetooth Speaker',     'Electronics', 49.99],
  [3,  'USB-C Hub',             'Electronics', 34.99],
  [4,  'Mechanical Keyboard',   'Electronics', 129.99],
  [5,  'Running Shoes',         'Sports',      89.99],
  [6,  'Yoga Mat',              'Sports',      29.99],
  [7,  'Water Bottle',          'Sports',      19.99],
  [8,  'Cotton T-Shirt',        'Clothing',    24.99],
  [9,  'Denim Jeans',           'Clothing',    59.99],
  [10, 'Winter Jacket',         'Clothing',    149.99],
  [11, 'The Pragmatic Programmer', 'Books',    39.99],
  [12, 'Clean Code',            'Books',       34.99],
  [13, 'Desk Lamp',             'Home',        44.99],
  [14, 'Coffee Maker',          'Home',        89.99],
  [15, 'Throw Pillow Set',      'Home',        39.99],
];

for (const p of products) insertProduct.run(...p);

const insertOrder = db.prepare(
  'INSERT INTO orders (id, customer_id, product_id, quantity, total, ordered_at) VALUES (?, ?, ?, ?, ?, ?)'
);

function order(id: number, customerId: number, productId: number, quantity: number, date: string) {
  const price = (products[productId - 1] as [number, string, string, number])[3];
  return [id, customerId, productId, quantity, price * quantity, date];
}

const orders = [
  order(1,  1,  1, 1, '2023-02-01'),
  order(2,  1,  11,1, '2023-03-15'),
  order(3,  2,  4, 1, '2023-03-20'),
  order(4,  2,  8, 2, '2023-04-10'),
  order(5,  3,  2, 1, '2023-04-25'),
  order(6,  3,  13,1, '2023-05-05'),
  order(7,  4,  10,1, '2023-05-18'),
  order(8,  4,  9, 1, '2023-06-01'),
  order(9,  5,  5, 1, '2023-06-14'),
  order(10, 5,  6, 1, '2023-07-02'),
  order(11, 6,  14,1, '2023-07-19'),
  order(12, 6,  3, 2, '2023-08-05'),
  order(13, 7,  12,1, '2023-08-22'),
  order(14, 7,  7, 3, '2023-09-10'),
  order(15, 8,  1, 2, '2023-09-28'),
  order(16, 8,  4, 1, '2023-10-15'),
  order(17, 9,  15,2, '2023-10-30'),
  order(18, 9,  8, 3, '2023-11-12'),
  order(19, 10, 5, 1, '2023-11-25'),
  order(20, 10, 11,2, '2023-12-08'),
  order(21, 1,  14,1, '2023-12-20'),
  order(22, 2,  6, 2, '2024-01-05'),
  order(23, 3,  9, 1, '2024-01-18'),
  order(24, 4,  1, 1, '2024-02-02'),
  order(25, 5,  12,1, '2024-02-15'),
  order(26, 6,  4, 1, '2024-02-28'),
  order(27, 7,  10,1, '2024-03-10'),
  order(28, 8,  2, 1, '2024-03-22'),
  order(29, 9,  5, 2, '2024-04-05'),
  order(30, 10, 13,1, '2024-04-18'),
  order(31, 1,  7, 4, '2024-05-01'),
  order(32, 2,  15,1, '2024-05-14'),
  order(33, 3,  3, 3, '2024-05-27'),
  order(34, 4,  11,1, '2024-06-09'),
  order(35, 5,  8, 2, '2024-06-22'),
  order(36, 6,  14,1, '2024-07-05'),
  order(37, 7,  1, 1, '2024-07-18'),
  order(38, 8,  9, 2, '2024-07-31'),
  order(39, 9,  12,2, '2024-08-13'),
  order(40, 10, 6, 1, '2024-08-26'),
  order(41, 1,  4, 1, '2024-09-08'),
  order(42, 2,  10,1, '2024-09-21'),
  order(43, 3,  7, 2, '2024-10-04'),
  order(44, 4,  2, 2, '2024-10-17'),
  order(45, 5,  13,1, '2024-10-30'),
  order(46, 6,  8, 1, '2024-11-12'),
  order(47, 7,  11,1, '2024-11-25'),
  order(48, 8,  5, 1, '2024-12-08'),
  order(49, 9,  3, 1, '2024-12-15'),
  order(50, 10, 15,3, '2024-12-28'),
  order(51, 1,  9, 1, '2024-01-30'),
  order(52, 3,  14,1, '2024-03-05'),
  order(53, 5,  4, 1, '2024-04-22'),
  order(54, 7,  2, 1, '2024-06-03'),
  order(55, 9,  1, 1, '2024-08-09'),
  order(56, 2,  12,1, '2024-09-30'),
  order(57, 4,  6, 2, '2024-11-01'),
  order(58, 6,  7, 1, '2024-07-25'),
  order(59, 8,  13,2, '2024-05-10'),
  order(60, 10, 4, 1, '2024-02-14'),
];

for (const o of orders) insertOrder.run(...o);

const customerCount = (db.prepare('SELECT COUNT(*) as n FROM customers').get() as { n: number }).n;
const productCount  = (db.prepare('SELECT COUNT(*) as n FROM products').get()  as { n: number }).n;
const orderCount    = (db.prepare('SELECT COUNT(*) as n FROM orders').get()    as { n: number }).n;

console.log(`Seeded: ${customerCount} customers, ${productCount} products, ${orderCount} orders`);
console.log('Database ready at data/store.db');

db.close();
