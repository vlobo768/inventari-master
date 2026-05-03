const fs = require('fs');
const files = ['categorias.html', 'cash.html', 'customers.html', 'purchases.html', 'sales_history.html', 'productos.html', 'ventas.html', 'suppliers.html', 'users.html', 'settings.html'];

files.forEach(f => {
  if(!fs.existsSync(f)) return;
  let c = fs.readFileSync(f, 'utf8');
  // Reemplazar el texto "Dashboard" por "Atrás" en los botones que redirigen a dashboard.html
  c = c.replace(/(<button[^>]*onclick="window\.location\.href='dashboard\.html'"[^>]*>)Dashboard(<\/button>)/g, '$1Atrás$2');
  
  // Cache bust
  const ver = Date.now();
  c = c.replace(/href="assets\/styles\.css\?v=[^"]*"/g, 'href="assets/styles.css?v=glass_' + ver + '"');
  
  fs.writeFileSync(f, c);
});
console.log('Botones renombrados a Atrás con éxito');
