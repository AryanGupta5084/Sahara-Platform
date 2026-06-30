const translate = require('@vitalets/google-translate-api');

const DEFAULT_TARGET = 'en';

async function translateText(text, targetLang = DEFAULT_TARGET) {
    try {
        if (text === null || text === undefined) {
            return { success: false, text: '', detectedLang: null, target: targetLang, error: 'No text provided' };
        }
        
        const input = String(text).trim();
        if (!input) {
            return { success: true, text: '', detectedLang: null, target: targetLang };
        }
        
        if (targetLang === 'en' && /^[\x00-\x7F]+$/.test(input)) {
            return { success: true, text: input, detectedLang: 'en', target: 'en' };
        }

        const result = await translate(input, { to: targetLang });
        const detected = result?.from?.language?.iso || null;

        return {
            success: true,
            text: result?.text ?? input,
            detectedLang: detected,
            target: targetLang,
        };
    } catch (err) {
        console.error("Translation API error:", err.message);
        return {
            success: false,
            text: String(text ?? ''),
            detectedLang: null,
            target: targetLang,
            error: 'Translation failed',
        };
    }
}

module.exports = { translateText };