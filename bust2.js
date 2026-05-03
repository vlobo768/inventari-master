const fs = require('fs');
const files = ['users.html', 'suppliers.html', 'purchases.html', 'customers.html', 'categorias.html', 'cash.html', 'dashboard.html', 'sales_history.html', 'settings.html', 'index.html', 'productos.html', 'ventas.html'];
const ver = Date.now();
files.forEach(f => {
  if(!fs.existsSync(f)) return;
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/href="assets\/styles\.css\?v=[0-9]+"/g, 'href="assets/styles.css?v=' + ver + '"');
  fs.writeFileSync(f, c);
});
console.log('Cache bust 2 aplicado');
