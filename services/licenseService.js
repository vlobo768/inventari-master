const { machineIdSync } = require('node-machine-id');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// IMPORTANTE: Cambia esta clave por una secreta y única para tu negocio
const SECRET_SALT = 'MI_NEGOCIO_SECRETO_2026_VLOBO';

class LicenseService {
    constructor() {
        this.licensePath = path.join(process.env.APPDATA, 'inventario-app', 'license.json');
        this.ensureDir(path.dirname(this.licensePath));
    }

    ensureDir(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    getMachineId() {
        try {
            return machineIdSync();
        } catch (e) {
            console.error("Error obteniendo Machine ID:", e);
            return 'UNKNOWN_ID';
        }
    }

    /**
     * Genera una firma para una combinación de ID y Fecha
     */
    generateSignature(mid, expiryDate) {
        return crypto.createHmac('sha256', SECRET_SALT)
                     .update(`${mid}|${expiryDate}`)
                     .digest('hex')
                     .substring(0, 16); // Usamos los primeros 16 caracteres para que la llave no sea tan larga
    }

    /**
     * Crea una llave de licencia completa
     * Formato: YYYYMMDD-SIG
     */
    createLicenseKey(mid, days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        const expiryDate = date.toISOString().split('T')[0].replace(/-/g, '');
        const sig = this.generateSignature(mid, expiryDate);
        return `${expiryDate}-${sig}`;
    }

    /**
     * Valida si una llave es correcta para esta máquina y no ha expirado
     */
    validateKey(key) {
        if (!key || !key.includes('-')) return { valid: false, message: 'Formato de llave inválido.' };

        const [expiryDateStr, providedSig] = key.split('-');
        const mid = this.getMachineId();
        
        // 1. Validar firma
        const expectedSig = this.generateSignature(mid, expiryDateStr);
        if (providedSig !== expectedSig) {
            return { valid: false, message: 'Esta llave no es válida para esta computadora.' };
        }

        // 2. Validar fecha de expiración
        const year = parseInt(expiryDateStr.substring(0, 4));
        const month = parseInt(expiryDateStr.substring(4, 6)) - 1;
        const day = parseInt(expiryDateStr.substring(6, 8));
        const expiryDate = new Date(year, month, day, 23, 59, 59);
        
        if (new Date() > expiryDate) {
            return { valid: false, message: 'La licencia ha expirado el ' + expiryDate.toLocaleDateString() };
        }

        return { valid: true, expiry: expiryDate };
    }

    saveLicense(key) {
        fs.writeFileSync(this.licensePath, JSON.stringify({ key }));
    }

    getSavedLicense() {
        if (fs.existsSync(this.licensePath)) {
            try {
                const data = JSON.parse(fs.readFileSync(this.licensePath, 'utf8'));
                return data.key;
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    checkActivation() {
        const key = this.getSavedLicense();
        if (!key) return { activated: false, message: 'No hay licencia instalada.' };
        
        const validation = this.validateKey(key);
        if (validation.valid) {
            return { activated: true, expiry: validation.expiry };
        } else {
            return { activated: false, message: validation.message };
        }
    }
}

module.exports = new LicenseService();
