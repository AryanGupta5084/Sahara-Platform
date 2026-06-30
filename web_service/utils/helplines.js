const DEFAULT_EMERGENCY_NOTE = 'If you are in immediate danger, call your local emergency number (112 in India).';

const HELPLINES = {
    en: [
        '📞 **KIRAN (Govt. of India 24/7):** 1800-599-0019',
        '📞 **Vandrevala Foundation (24/7):** 9999666555 (Phone or WhatsApp)',
        '📞 **Fortis Stress Helpline (24/7):** +91-8376804102',
        '📞 **Sneha Foundation (Tamil Nadu):** 044-24640050',
    ],
    hi: [
        '📞 **किरण हेल्पलाइन (भारत सरकार 24/7):** 1800-599-0019',
        '📞 **वंद्रेवाला फाउंडेशन (24/7):** 9999666555 (फोन या व्हाट्सएप)',
        '📞 **आसरा (24/7):** 9820466726',
    ],
    ta: [
        '📞 **கிரண் ஹெல்ப்லைன் (24/7):** 1800-599-0019',
        '📞 **ஸ்நேஹா ஃபவுண்டேஷன் (தமிழ்நாடு):** 044-24640050',
    ],
    te: [
        '📞 **కిరణ్ హెల్ప్‌లైన్ (24/7):** 1800-599-0019',
        '📞 **రోష్ని ట్రస్ట్ (హైదరాబాద్):** 040-66202000',
    ],
    pa: [
        '📞 **ਕਿਰਨ ਹੈਲਪਲਾਈਨ (24/7):** 1800-599-0019',
        '📞 **ਵੰਦ੍ਰੇਵਾਲਾ ਫਾਊਂਡੇਸ਼ਨ (24/7):** 9999666555',
    ],
    bn: [
        '📞 **কিরণ হেল্পলাইন (২৪/৭):** 1800-599-0019',
        '📞 **ভান্দ্রেওয়ালা ফাউন্ডেশন (24/7):** 9999666555',
    ],
    ml: [
        '📞 **കിരൺ ഹെൽപ്‌ലൈൻ (24/7):** 1800-599-0019',
        '📞 **മൈത്രി (കൊച്ചി):** 0484-2540530',
    ],
    kn: [
        '📞 **ಕಿರಣ್ ಸಹಾಯವಾಣಿ (24/7):** 1800-599-0019',
        '📞 **ವಂದ್ರೆವಾಲಾ ಫೌಂಡೇಶನ್ (24/7):** 9999666555',
    ],
    mr: [
        '📞 **किरण हेल्पलाइन (२४/७):** 1800-599-0019',
        '📞 **आसरा (24/7):** 9820466726',
    ],
    gu: [
        '📞 **કિરણ હેલ્પલાઇન (24/7):** 1800-599-0019',
        '📞 **લાઇફ હોપ હેલ્પલાઇન:** 1800-233-3330',
    ],
};

function getHelplines(locale = 'en') {
    const lang = (locale || 'en').toLowerCase().split('-');
    const lines = HELPLINES[lang] || HELPLINES.en;
    return [...lines, `⚠️ ${DEFAULT_EMERGENCY_NOTE}`];
}

function setHelplines(lang, lines) {
    if (!lang || !Array.isArray(lines) || !lines.length) return;
    HELPLINES[lang.toLowerCase()] = lines;
}

module.exports = { getHelplines, setHelplines };