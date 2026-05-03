const fs = require('fs');
const files = ['users.html', 'suppliers.html', 'purchases.html', 'customers.html', 'categorias.html', 'cash.html', 'dashboard.html', 'sales_history.html', 'settings.html', 'index.html', 'productos.html', 'ventas.html'];
files.forEach(f => {
  if(!fs.existsSync(f)) return;
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/href="assets\/styles\.css\?v=[^"]*"/g, 'href="assets/styles.css?v=glass_v2"');
  fs.writeFileSync(f, c);
});
console.log('Cache bust glass_v2 aplicado');
