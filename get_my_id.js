const { machineIdSync } = require('node-machine-id');

try {
    const id = machineIdSync();
    console.log('\n=========================================');
    console.log('      IDENTIFICADOR DE ESTA PC');
    console.log('=========================================');
    console.log(`ID: ${id}`);
    console.log('=========================================\n');
    console.log('Copia este ID y úsalo en generate_license.js');
} catch (e) {
    console.error('Error al obtener el ID:', e.message);
}
