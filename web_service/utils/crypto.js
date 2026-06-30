const crypto = require('crypto');

const ENC_ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; 
const AUTH_TAG_LENGTH = 16; 

const CHAT_SECRET = process.env.CHAT_SECRET;
const CHAT_SALT = process.env.CHAT_SALT;

if (!CHAT_SECRET || CHAT_SECRET.length < 16 || !CHAT_SALT || CHAT_SALT.length < 16) {
    throw new Error('FATAL ERROR: CHAT_SECRET and CHAT_SALT must both be set in .env and be at least 16 characters long.');
}

const KDF_ITERATIONS = 250000;
const KEY_LENGTH_BYTES = 32;
const KDF_DIGEST = 'sha512';

const ENC_KEY = crypto.pbkdf2Sync(
    CHAT_SECRET,
    CHAT_SALT,
    KDF_ITERATIONS,
    KEY_LENGTH_BYTES,
    KDF_DIGEST
);

function encrypt(plainText) {
    if (plainText === null || plainText === undefined) return '';
    const text = typeof plainText === 'string' ? plainText : String(plainText);
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ENC_ALGO, ENC_KEY, iv, { authTagLength: AUTH_TAG_LENGTH });
    
    const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}`;
}

function decrypt(encText) {
    if (encText === null || encText === undefined || encText === '') return '';
    if (typeof encText !== 'string') {
        throw new Error('Invalid encrypted value type');
    }

    const parts = encText.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted payload format');
    }

    const [ivHex, tagHex, cipherHex] = parts;
    try {
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        const encrypted = Buffer.from(cipherHex, 'hex');
        
        const decipher = crypto.createDecipheriv(ENC_ALGO, ENC_KEY, iv, { authTagLength: AUTH_TAG_LENGTH });
        decipher.setAuthTag(tag);
        
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString('utf8');
    } catch (err) {
        throw new Error('Decryption failed');
    }
}

function looksEncrypted(value) {
    if (typeof value !== 'string') return false;
    const parts = value.split(':');
    return (
        parts.length === 3 &&
        parts.length === IV_LENGTH * 2 &&
        parts[1].length === AUTH_TAG_LENGTH * 2 &&
        /^[0-9a-f]+$/i.test(parts + parts[1] + parts[2])
    );
}

module.exports = { encrypt, decrypt, looksEncrypted };