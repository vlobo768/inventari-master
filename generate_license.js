/**
 * UTILIDAD PARA GENERAR LLAVES DE LICENCIA
 * Uso: node generate_license.js <MACHINE_ID> <DIAS>
 */
const licenseService = require('./services/licenseService');

const args = process.argv.slice(2);

if (args.length < 2) {
    console.log('\n❌ Error: Faltan argumentos.');
    console.log('Uso: node generate_license.js <MACHINE_ID> <DIAS>');
    console.log('Ejemplo: node generate_license.js abc-123 365\n');
    process.exit(1);
}

const mid = args[0];
const days = parseInt(args[1]);

if (isNaN(days)) {
    console.log('\n❌ Error: Los días deben ser un número.');
    process.exit(1);
}

const key = licenseService.createLicenseKey(mid, days);

console.log('\n=========================================');
console.log('   GENERADOR DE LICENCIAS VLOBO');
console.log('=========================================');
console.log(`Para la PC: ${mid}`);
console.log(`Duración:   ${days} días`);
console.log('-----------------------------------------');
console.log(`LLAVE:      ${key}`);
console.log('=========================================\n');
