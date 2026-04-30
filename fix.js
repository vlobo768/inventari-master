const fs = require('fs');
const files = [
  'productos.html', 'categorias.html', 'users.html', 
  'customers.html', 'suppliers.html', 'purchases.html', 
  'sales_history.html', 'ventas.html', 'dashboard.html'
];
let fixes = 0;
files.forEach(f => {
  if(fs.existsSync(f)){
    let c = fs.readFileSync(f, 'utf8');
    if(c.includes('\\`') || c.includes('\\${')){
      c = c.replace(/\\\`/g, '`').replace(/\\\${/g, '${');
      fs.writeFileSync(f, c);
      fixes++;
      console.log('Fixed', f);
    }
  }
});
console.log('Total fixed:', fixes);
