/**
 * Script para poblar la base de datos SQLite con los datos del dump MySQL (oswa_inv)
 * Borra los datos existentes y los reemplaza con los del dump.
 */
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF'); // Desactivar FK temporalmente para insertar en orden libre

console.log('🚀 Iniciando importación de datos MySQL → SQLite...');

const run = db.transaction(() => {
  // ── 1. Limpiar tablas existentes ──
  const tables = ['audit_log','cash_sessions','inventory_movements','sales_items','sales_header',
    'purchase_items','purchases','purchases_items','purchases_header','products','media',
    'categories','customers','suppliers','settings','business_config','users','user_groups'];
  tables.forEach(t => { try { db.prepare(`DELETE FROM ${t}`).run(); } catch(e){} });

  // ── 2. Crear tablas faltantes ──
  db.prepare(`CREATE TABLE IF NOT EXISTS business_config (
    config_key VARCHAR(50) PRIMARY KEY, config_value TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`).run();
  db.prepare(`CREATE TABLE IF NOT EXISTS purchases_header (
    id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INT, user_id INT,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, total DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'completed'
  )`).run();
  db.prepare(`CREATE TABLE IF NOT EXISTS purchases_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT, purchase_id INT, product_id INT,
    qty INT, unit_price DECIMAL(12,2), total DECIMAL(12,2)
  )`).run();

  // ── 3. Insertar datos ──

  // user_groups
  const insUG = db.prepare('INSERT OR REPLACE INTO user_groups (group_level, group_name, group_status) VALUES (?,?,?)');
  insUG.run(1,'ADMIN',1); insUG.run(2,'SPECIAL',1); insUG.run(3,'USER',1);
  console.log('  ✅ user_groups');

  // users
  const insU = db.prepare('INSERT OR REPLACE INTO users (id,name,username,password,user_level,status,email,phone,last_login,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)');
  insU.run(2,'Soporte Técnico','mantenimiento','0d1db72075dd1e20b06e68b7b9399f383a91f6bf',1,1,'soporte@tienda.com',null,'2026-04-26 21:21:14','2026-04-26 22:18:39');
  insU.run(3,'Administrador Maestro','admin','f865b53623b121fd34ee5426c792e5c33af8c227',1,1,'admin@tienda.com',null,'2026-04-28 18:59:43','2026-04-27 01:14:20');
  insU.run(4,'Empleado Ventas','usuario','95c946bf622ef93b0a211cd0fd028dfdfcf7e39e',3,1,'empleado@tienda.com',null,'2026-04-27 17:52:33','2026-04-27 01:14:20');
  insU.run(5,'tesorito','tesorito','9bf20dde3a7456886be436dc11dd9bb09d62574a',1,1,'tesorito@gmail.com','+58','2026-04-27 19:38:43','2026-04-27 20:56:14');
  console.log('  ✅ users');

  // categories
  const insC = db.prepare('INSERT OR REPLACE INTO categories (id,name,parent_id) VALUES (?,?,?)');
  insC.run(1,'Electrónica',null); insC.run(2,'Alimentos',null); insC.run(3,'Limpieza',null);
  insC.run(4,'Oficina',null); insC.run(5,'Farmacia',null); insC.run(6,'Varios',null);
  console.log('  ✅ categories');

  // customers
  const insCust = db.prepare('INSERT OR REPLACE INTO customers (id,name,email,phone,address,credit_limit,created_at) VALUES (?,?,?,?,?,?,?)');
  insCust.run(1,'tesorito','tesorito@gmail.com','+58','tesoritolandia',49998046.90,'2026-04-28 00:12:09');
  insCust.run(2,'gabriel','gabriel@gmail.com','+58','gabrielandia',0.40,'2026-04-28 00:19:50');
  insCust.run(3,'primo',null,'+58',null,5.00,'2026-04-28 00:20:51');
  console.log('  ✅ customers');

  // suppliers
  const insS = db.prepare('INSERT OR REPLACE INTO suppliers (id,name,contact_name,email,phone,address,created_at) VALUES (?,?,?,?,?,?,?)');
  insS.run(1,'tesorito','tesorito','tesorito@gmail.com','+58','tesoritolandia','2026-04-27 21:21:43');
  console.log('  ✅ suppliers');

  // products
  const insP = db.prepare('INSERT OR REPLACE INTO products (id,name,sku,barcode,categorie_id,media_id,buy_price,sale_price,quantity,min_stock,date,is_weighable) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  insP.run(4,'Monitor Samsung 24"','ELE-MON-001','770200000001',1,null,90.00,130.00,0.000,5.000,'2026-04-27 01:57:55',0);
  insP.run(5,'Disco SSD 480GB Kingston','ELE-SSD-002','770200000002',1,null,35.00,55.00,10.000,10.000,'2026-04-27 01:57:55',0);
  insP.run(6,'Memoria RAM 8GB DDR4','ELE-RAM-003','770200000003',1,null,20.00,35.00,57.000,15.000,'2026-04-27 01:57:55',0);
  insP.run(7,'Pasta 500g','ALI-PAS-004','770200000004',2,null,0.60,1.10,118.000,30.000,'2026-04-27 01:57:55',0);
  insP.run(8,'Café Molido 250g','ALI-CAF-005','770200000005',2,null,1.80,3.20,77.000,20.000,'2026-04-27 01:57:55',0);
  insP.run(9,'Leche Entera 1L','ALI-LEC-006','770200000006',2,null,0.90,1.50,98.000,25.000,'2026-04-27 01:57:55',0);
  insP.run(10,'Jabón Líquido Manos 500ml','LIM-JAB-007','770200000007',3,null,0.70,1.30,49.000,10.000,'2026-04-27 01:57:55',0);
  insP.run(11,'Desinfectante Multiuso 1L','LIM-DES-008','770200000008',3,null,1.10,2.00,45.000,10.000,'2026-04-27 01:57:55',0);
  insP.run(12,'Resma Papel Carta','OFI-PAP-009','770200000009',4,null,2.50,4.00,68.000,15.000,'2026-04-27 01:57:55',0);
  insP.run(13,'Carpeta Archivadora','OFI-CAR-010','770200000010',4,null,0.80,1.60,85.000,20.000,'2026-04-27 01:57:55',0);
  insP.run(14,'Ibuprofeno 400mg','FAR-IBU-011','770200000011',5,null,0.25,0.60,198.000,40.000,'2026-04-27 01:57:55',0);
  insP.run(15,'Alcohol 96% 1L','FAR-ALC-012','770200000012',5,null,1.20,2.10,7.000,15.000,'2026-04-27 01:57:55',0);
  insP.run(16,'Botella Agua 500ml','VAR-AGU-013','770200000013',6,null,0.30,0.70,301.000,50.000,'2026-04-27 01:57:55',0);
  console.log('  ✅ products');

  // settings
  const insSt = db.prepare('INSERT OR REPLACE INTO settings (id,setting_key,setting_value,description) VALUES (?,?,?,?)');
  insSt.run(1,'bcv_rate','485.23','Tasa de cambio del BCV a USD');
  insSt.run(2,'cleanup_mode','kardex_only','Modo de auto-limpieza: kardex_only o full_delete');
  insSt.run(3,'cleanup_days','10','Días de retención de historial de ventas/kardex');
  console.log('  ✅ settings');

  // business_config
  const insBC = db.prepare('INSERT OR REPLACE INTO business_config (config_key,config_value,updated_at) VALUES (?,?,?)');
  insBC.run('address','tesoritolandia','2026-04-27 21:40:28');
  insBC.run('currency','Bolivares','2026-04-27 21:50:24');
  insBC.run('store_name','Tesorito tienda','2026-04-27 21:40:13');
  insBC.run('tax_rate','15%','2026-04-26 22:04:24');
  console.log('  ✅ business_config');

  // purchases
  const insPur = db.prepare('INSERT OR REPLACE INTO purchases (id,supplier_id,user_id,date,total,status) VALUES (?,?,?,?,?,?)');
  insPur.run(1,1,3,'2026-04-27 21:22:41',3.00,'completed');
  console.log('  ✅ purchases');

  // purchase_items
  const insPI = db.prepare('INSERT OR REPLACE INTO purchase_items (id,purchase_id,product_id,qty,unit_price,total) VALUES (?,?,?,?,?,?)');
  insPI.run(1,1,16,1.000,3.00,3.00);
  console.log('  ✅ purchase_items');

  // sales_header
  const insSH = db.prepare('INSERT OR REPLACE INTO sales_header (id,customer_id,user_id,date,total,payment_method,status) VALUES (?,?,?,?,?,?,?)');
  insSH.run(12,2,3,'2026-04-28 21:47:06',1.60,'Crédito','completed');
  insSH.run(13,2,3,'2026-04-28 21:51:53',55.00,'Efectivo','completed');
  insSH.run(14,2,3,'2026-04-28 21:56:34',90.00,'Efectivo','completed');
  insSH.run(15,2,3,'2026-04-28 22:03:56',99.60,'Crédito','completed');
  insSH.run(16,1,3,'2026-04-28 22:05:59',60.10,'Efectivo','completed');
  insSH.run(18,null,3,'2026-04-28 22:11:03',1320.00,'Efectivo','completed');
  insSH.run(19,1,3,'2026-04-28 22:25:57',100.90,'Efectivo','completed');
  insSH.run(20,1,3,'2026-04-28 22:26:29',1953.10,'Crédito','completed');
  insSH.run(21,null,3,'2026-04-28 23:06:36',4.30,'Efectivo','completed');
  console.log('  ✅ sales_header');

  // sales_items
  const insSI = db.prepare('INSERT OR REPLACE INTO sales_items (id,sale_id,product_id,qty,unit_price,total) VALUES (?,?,?,?,?,?)');
  insSI.run(30,12,13,1.000,1.60,1.60);
  insSI.run(31,13,5,1.000,55.00,55.00);
  insSI.run(32,14,5,1.000,55.00,55.00);
  insSI.run(33,14,6,1.000,35.00,35.00);
  insSI.run(34,15,5,1.000,55.00,55.00);
  insSI.run(35,15,6,1.000,35.00,35.00);
  insSI.run(36,15,8,3.000,3.20,9.60);
  insSI.run(37,16,12,1.000,4.00,4.00);
  insSI.run(38,16,7,1.000,1.10,1.10);
  insSI.run(39,16,5,1.000,55.00,55.00);
  insSI.run(41,18,5,24.000,55.00,1320.00);
  insSI.run(42,19,13,1.000,1.60,1.60);
  insSI.run(43,19,14,1.000,0.60,0.60);
  insSI.run(44,19,15,47.000,2.10,98.70);
  insSI.run(45,20,13,1.000,1.60,1.60);
  insSI.run(46,20,9,1.000,1.50,1.50);
  insSI.run(47,20,4,15.000,130.00,1950.00);
  insSI.run(48,21,13,1.000,1.60,1.60);
  insSI.run(49,21,14,1.000,0.60,0.60);
  insSI.run(50,21,15,1.000,2.10,2.10);
  console.log('  ✅ sales_items');

  // inventory_movements
  const insIM = db.prepare('INSERT OR REPLACE INTO inventory_movements (id,product_id,user_id,type,qty,reference,date) VALUES (?,?,?,?,?,?,?)');
  const movements = [
    [1,13,3,'OUT',1.000,'Venta #1','2026-04-27 20:00:56'],[2,14,3,'OUT',1.000,'Venta #1','2026-04-27 20:00:56'],
    [3,15,3,'OUT',1.000,'Venta #1','2026-04-27 20:00:56'],[4,16,3,'OUT',1.000,'Venta #1','2026-04-27 20:00:56'],
    [5,13,null,'ADJUSTMENT',1.000,'Anulación Venta #1','2026-04-27 21:13:53'],[6,14,null,'ADJUSTMENT',1.000,'Anulación Venta #1','2026-04-27 21:13:53'],
    [7,15,null,'ADJUSTMENT',1.000,'Anulación Venta #1','2026-04-27 21:13:53'],[8,16,null,'ADJUSTMENT',1.000,'Anulación Venta #1','2026-04-27 21:13:53'],
    [9,16,3,'IN',1.000,'Compra #1','2026-04-27 21:22:41'],[10,15,3,'OUT',4.000,'Venta #2','2026-04-27 22:29:52'],
    [11,7,3,'OUT',1.000,'Venta #3','2026-04-27 22:30:50'],[12,10,3,'OUT',1.000,'Venta #3','2026-04-27 22:30:50'],
    [13,12,3,'OUT',1.000,'Venta #3','2026-04-27 22:30:50'],[14,5,3,'OUT',1.000,'Venta #3','2026-04-27 22:30:50'],
    [15,9,3,'OUT',1.000,'Venta #4','2026-04-27 22:31:40'],[16,13,3,'OUT',1.000,'Venta #4','2026-04-27 22:31:40'],
    [17,15,3,'OUT',1.000,'Venta #4','2026-04-27 22:31:41'],[18,13,3,'OUT',1.000,'Venta #5','2026-04-27 22:32:07'],
    [19,9,3,'OUT',1.000,'Venta #5','2026-04-27 22:32:07'],[20,14,3,'OUT',1.000,'Venta #5','2026-04-27 22:32:07'],
    [21,10,3,'OUT',1.000,'Venta #5','2026-04-27 22:32:07'],[22,13,null,'ADJUSTMENT',1.000,'Anulación Venta #5','2026-04-27 22:32:44'],
    [23,9,null,'ADJUSTMENT',1.000,'Anulación Venta #5','2026-04-27 22:32:44'],[24,14,null,'ADJUSTMENT',1.000,'Anulación Venta #5','2026-04-27 22:32:44'],
    [25,10,null,'ADJUSTMENT',1.000,'Anulación Venta #5','2026-04-27 22:32:44'],[26,9,3,'OUT',1.000,'Venta #6','2026-04-28 00:08:21'],
    [27,13,3,'OUT',1.000,'Venta #6','2026-04-28 00:08:21'],[28,14,3,'OUT',1.000,'Venta #6','2026-04-28 00:08:21'],
    [29,10,3,'OUT',1.000,'Venta #6','2026-04-28 00:08:21'],[30,9,3,'OUT',1.000,'Venta #7','2026-04-28 00:22:03'],
    [31,9,3,'OUT',1.000,'Venta #8','2026-04-28 00:24:36'],[32,9,null,'ADJUSTMENT',1.000,'Anulación Venta #8','2026-04-28 00:27:00'],
    [33,9,null,'ADJUSTMENT',1.000,'Anulación Venta #7','2026-04-28 00:27:06'],[34,9,null,'ADJUSTMENT',1.000,'Anulación Venta #6','2026-04-28 00:52:14'],
    [35,13,null,'ADJUSTMENT',1.000,'Anulación Venta #6','2026-04-28 00:52:14'],[36,14,null,'ADJUSTMENT',1.000,'Anulación Venta #6','2026-04-28 00:52:14'],
    [37,10,null,'ADJUSTMENT',1.000,'Anulación Venta #6','2026-04-28 00:52:14'],[41,5,3,'OUT',1.000,'Venta #10','2026-04-28 21:43:01'],
    [42,6,3,'OUT',1.000,'Venta #10','2026-04-28 21:43:01'],[45,13,3,'OUT',1.000,'Venta #12','2026-04-28 21:47:06'],
    [46,5,3,'OUT',1.000,'Venta #13','2026-04-28 21:51:53'],[47,5,3,'OUT',1.000,'Venta #14','2026-04-28 21:56:34'],
    [48,6,3,'OUT',1.000,'Venta #14','2026-04-28 21:56:34'],[49,5,3,'OUT',1.000,'Venta #15','2026-04-28 22:03:56'],
    [50,6,3,'OUT',1.000,'Venta #15','2026-04-28 22:03:56'],[51,8,3,'OUT',3.000,'Venta #15','2026-04-28 22:03:56'],
    [52,12,3,'OUT',1.000,'Venta #16','2026-04-28 22:05:59'],[53,7,3,'OUT',1.000,'Venta #16','2026-04-28 22:05:59'],
    [54,5,3,'OUT',1.000,'Venta #16','2026-04-28 22:05:59'],[55,5,3,'OUT',24.000,'Venta #18','2026-04-28 22:11:03'],
    [56,13,3,'OUT',1.000,'Venta #19','2026-04-28 22:25:57'],[57,14,3,'OUT',1.000,'Venta #19','2026-04-28 22:25:57'],
    [58,15,3,'OUT',47.000,'Venta #19','2026-04-28 22:25:57'],[59,13,3,'OUT',1.000,'Venta #20','2026-04-28 22:26:29'],
    [60,9,3,'OUT',1.000,'Venta #20','2026-04-28 22:26:29'],[61,4,3,'OUT',15.000,'Venta #20','2026-04-28 22:26:29'],
    [62,13,3,'OUT',1.000,'Venta #21','2026-04-28 23:06:36'],[63,14,3,'OUT',1.000,'Venta #21','2026-04-28 23:06:36'],
    [64,15,3,'OUT',1.000,'Venta #21','2026-04-28 23:06:36']
  ];
  movements.forEach(m => insIM.run(...m));
  console.log('  ✅ inventory_movements (' + movements.length + ' registros)');
});

try {
  run();
  // Verificación
  console.log('\n📊 Verificación de datos importados:');
  const counts = [
    ['user_groups', db.prepare('SELECT COUNT(*) as c FROM user_groups').get().c],
    ['users', db.prepare('SELECT COUNT(*) as c FROM users').get().c],
    ['categories', db.prepare('SELECT COUNT(*) as c FROM categories').get().c],
    ['products', db.prepare('SELECT COUNT(*) as c FROM products').get().c],
    ['customers', db.prepare('SELECT COUNT(*) as c FROM customers').get().c],
    ['suppliers', db.prepare('SELECT COUNT(*) as c FROM suppliers').get().c],
    ['sales_header', db.prepare('SELECT COUNT(*) as c FROM sales_header').get().c],
    ['sales_items', db.prepare('SELECT COUNT(*) as c FROM sales_items').get().c],
    ['inventory_movements', db.prepare('SELECT COUNT(*) as c FROM inventory_movements').get().c],
    ['purchases', db.prepare('SELECT COUNT(*) as c FROM purchases').get().c],
    ['purchase_items', db.prepare('SELECT COUNT(*) as c FROM purchase_items').get().c],
    ['settings', db.prepare('SELECT COUNT(*) as c FROM settings').get().c],
    ['business_config', db.prepare('SELECT COUNT(*) as c FROM business_config').get().c],
  ];
  counts.forEach(([t,c]) => console.log(`  ${t}: ${c} registros`));
  console.log('\n🎉 ¡Importación completada exitosamente!');
} catch(e) {
  console.error('❌ Error:', e.message);
} finally {
  db.close();
}
