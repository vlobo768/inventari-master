const fs = require('fs'); 
const files = fs.readdirSync('.').filter(f => f.endsWith('.html')); 

const btnNavCSS = `.btn-nav { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; transition: all 0.3s ease; } .btn-nav:hover { background: #00d2ff; color: #000; box-shadow: 0 0 15px rgba(0, 210, 255, 0.4); }`; 
const btnActionCSS = `.btn-action { padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: transparent; color: #fff; cursor: pointer; font-size: 11px; transition: all 0.2s; } .btn-edit:hover { background: #3498db; border-color: #3498db; } .btn-delete:hover { background: #e74c3c; border-color: #e74c3c; } .btn-status:hover { background: #f39c12; border-color: #f39c12; }`; 

files.forEach(f => { 
  let content = fs.readFileSync(f, 'utf8'); 
  content = content.replace(/\.nav-buttons\s*\{\s*display:\s*flex;\s*gap:\s*\d+px;\s*\}/, '.nav-buttons { display: flex; gap: 10px; }\n' + btnNavCSS); 
  content = content.replace(/\.actions\s*\{\s*display:\s*flex;\s*gap:\s*\d+px;\s*\}/, '.actions { display: flex; gap: 10px; }\n' + btnActionCSS); 
  fs.writeFileSync(f, content); 
});
