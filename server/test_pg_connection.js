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
  try {
    console.log('Connecting to:', process.env.DATABASE_URL);
    const client = await pool.connect();
    console.log('Connected successfully!');
    const res = await client.query('SELECT NOW()');
    console.log('NOW():', res.rows[0]);
    
    // Check tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public'
    `);
    console.log('Tables in public schema:', tables.rows.map(r => r.table_name));
    
    // Check schemas of users, products, sellers
    for (const table of ['users', 'products', 'sellers']) {
      try {
        const columns = await client.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = $1
        `, [table]);
        console.log(`\nColumns for ${table}:`);
        console.table(columns.rows);
        
        const count = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`Row count for ${table}:`, count.rows[0].count);
      } catch (err) {
        console.error(`Error querying schema for table ${table}:`, err.message);
      }
    }
    
    client.release();
  } catch (err) {
    console.error('Error connecting or querying:', err);
  } finally {
    await pool.end();
  }
}

main();
