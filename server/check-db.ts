import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(__dirname, 'data/ir_assistencia.db');
const db = new Database(dbPath);

console.log('--- Verificando Tabelas ---');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tabelas encontradas:', tables.map((t: any) => t.name).join(', '));

tables.forEach((t: any) => {
    const info = db.prepare(`PRAGMA table_info(${t.name})`).all();
    console.log(`\nEsquema de ${t.name}:`);
    console.table(info);
});

console.log('\n--- Verificando Registros ---');
const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
const productsCount = db.prepare('SELECT COUNT(*) as count FROM products').get() as any;
const salesCount = db.prepare('SELECT COUNT(*) as count FROM sales').get() as any;

console.log(`Usuários: ${usersCount.count}`);
console.log(`Produtos: ${productsCount.count}`);
console.log(`Vendas: ${salesCount.count}`);

db.close();
