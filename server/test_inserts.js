const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Starting transaction test...');
    await client.query('BEGIN');

    // Test inserting seller
    try {
      console.log('Testing seller insert...');
      const sellerRes = await client.query(
        'INSERT INTO sellers (name, email, phone) VALUES ($1, $2, $3) RETURNING id',
        ['Test Seller', 'test@example.com', '123456789']
      );
      console.log('Seller insert success! ID:', sellerRes.rows[0].id);
    } catch (err) {
      console.error('Seller insert FAILED:', err.message, '\nCode:', err.code, '\nDetail:', err.detail);
    }

    // Test inserting user
    try {
      console.log('Testing user insert...');
      const userRes = await client.query(
        'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id',
        ['testuser_temp', 'password123', 'admin']
      );
      console.log('User insert success! ID:', userRes.rows[0].id);
    } catch (err) {
      console.error('User insert FAILED:', err.message, '\nCode:', err.code, '\nDetail:', err.detail);
    }

    // Test inserting product
    try {
      console.log('Testing product insert...');
      const productRes = await client.query(
        'INSERT INTO products (sku, name, category, supplier, price, stock, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        ['TEST-SKU-999', 'Test Product', 'Test Category', 'Test Supplier', 99.99, 10, null]
      );
      console.log('Product insert success! ID:', productRes.rows[0].id);
    } catch (err) {
      console.error('Product insert FAILED:', err.message, '\nCode:', err.code, '\nDetail:', err.detail);
    }

    console.log('Rolling back transaction...');
    await client.query('ROLLBACK');
  } catch (err) {
    console.error('Transaction level error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
