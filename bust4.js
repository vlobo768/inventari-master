const fs = require('fs');
const files = ['users.html', 'suppliers.html', 'purchases.html', 'customers.html', 'categorias.html', 'cash.html', 'dashboard.html', 'sales_history.html', 'settings.html', 'index.html', 'productos.html', 'ventas.html'];
const ver = Date.now();
files.forEach(f => {
  if(!fs.existsSync(f)) return;
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/href="assets\/styles\.css\?v=[^"]*"/g, 'href="assets/styles.css?v=glass_' + ver + '"');
  fs.writeFileSync(f, c);
});
console.log('Cache bust glass_v4 aplicado');
