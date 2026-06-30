const ScreeningTest = require('../models/ScreeningTest');

const phq9 = {
    testKey: 'phq-9',
    fullName: 'Patient Health Questionnaire (PHQ-9)',
    description: 'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
    questions: [
        { questionNumber: 1, text: 'Little interest or pleasure in doing things' },
        { questionNumber: 2, text: 'Feeling down, depressed, or hopeless' },
        { questionNumber: 3, text: 'Trouble falling or staying asleep, or sleeping too much' },
        { questionNumber: 4, text: 'Feeling tired or having little energy' },
        { questionNumber: 5, text: 'Poor appetite or overeating' },
        { questionNumber: 6, text: 'Feeling bad about yourself—or that you are a failure or have let yourself or your family down' },
        { questionNumber: 7, text: 'Trouble concentrating on things, such as reading the newspaper or watching television' },
        { questionNumber: 8, text: 'Moving or speaking so slowly that other people could have noticed? Or the opposite—being so fidgety or restless that you have been moving around a lot more than usual' },
        { questionNumber: 9, text: 'Thoughts that you would be better off dead, or of hurting yourself in some way' }
    ],
    options: [
        { text: 'Not at all', value: 0 },
        { text: 'Several days', value: 1 },
        { text: 'More than half the days', value: 2 },
        { text: 'Nearly every day', value: 3 }
    ],
    scoringRules: [
        { minScore: 0, maxScore: 4, interpretation: 'None-Minimal', recommendation: 'Your responses suggest minimal or no signs of depression. Continue monitoring your mood.' },
        { minScore: 5, maxScore: 9, interpretation: 'Mild', recommendation: 'Your responses suggest you may be experiencing mild depression. It can be helpful to discuss these feelings with someone you trust.' },
        { minScore: 10, maxScore: 14, interpretation: 'Moderate', recommendation: 'Your responses suggest you may be experiencing moderate depression. We strongly recommend speaking with a wellness professional or counselor.' },
        { minScore: 15, maxScore: 19, interpretation: 'Moderately Severe', recommendation: 'Your responses suggest moderately severe depression. Please book a session with a counselor soon to discuss these feelings.' },
        { minScore: 20, maxScore: 27, interpretation: 'Severe', recommendation: 'Your responses suggest severe depression. It is very important that you seek help. Please contact a professional or a crisis helpline immediately.' }
    ]
};

const gad7 = {
    testKey: 'gad-7',
    fullName: 'Generalized Anxiety Disorder (GAD-7)',
    description: 'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
    questions: [
        { questionNumber: 1, text: 'Feeling nervous, anxious, or on edge' },
        { questionNumber: 2, text: 'Not being able to stop or control worrying' },
        { questionNumber: 3, text: 'Worrying too much about different things' },
        { questionNumber: 4, text: 'Trouble relaxing' },
        { questionNumber: 5, text: 'Being so restless that it is hard to sit still' },
        { questionNumber: 6, text: 'Becoming easily annoyed or irritable' },
        { questionNumber: 7, text: 'Feeling afraid as if something awful might happen' }
    ],
    options: [
        { text: 'Not at all', value: 0 },
        { text: 'Several days', value: 1 },
        { text: 'More than half the days', value: 2 },
        { text: 'Nearly every day', value: 3 }
    ],
    scoringRules: [
        { minScore: 0, maxScore: 4, interpretation: 'Minimal Anxiety', recommendation: 'Your responses suggest minimal or no signs of anxiety.' },
        { minScore: 5, maxScore: 9, interpretation: 'Mild Anxiety', recommendation: 'Your responses suggest you may be experiencing mild anxiety. These feelings are common and often manageable.' },
        { minScore: 10, maxScore: 14, interpretation: 'Moderate Anxiety', recommendation: 'Your responses suggest you may be experiencing moderate anxiety. We recommend discussing these feelings with a professional.' },
        { minScore: 15, maxScore: 21, interpretation: 'Severe Anxiety', recommendation: 'Your responses suggest severe anxiety. Please seek help from a professional or counselor to manage these symptoms.' }
    ]
};

const seedTests = async () => {
    try {
        await ScreeningTest.updateOne({ testKey: phq9.testKey }, phq9, { upsert: true });
        await ScreeningTest.updateOne({ testKey: gad7.testKey }, gad7, { upsert: true });
        console.log('✅ Screening tests (PHQ-9, GAD-7) seeded successfully.');
    } catch (error) {
        console.error('❌ Error seeding screening tests:', error.message);
    }
};

module.exports = seedTests;