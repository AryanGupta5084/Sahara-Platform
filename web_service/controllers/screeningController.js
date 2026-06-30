const ScreeningTest = require('../models/ScreeningTest');
const ScreeningResult = require('../models/ScreeningResult');

exports.getAvailableTests = async (req, res) => {
    try {
        const tests = await ScreeningTest.find().select('testKey fullName description');
        res.status(200).json({ success: true, data: tests, error: null });
    } catch (error) {
        console.error("Error fetching available tests:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error fetching tests.' });
    }
};

exports.getTestByKey = async (req, res) => {
    try {
        const test = await ScreeningTest.findOne({ testKey: req.params.testKey });
        if (!test) {
            return res.status(404).json({ success: false, data: null, error: 'Test not found.' });
        }
        res.status(200).json({ success: true, data: test, error: null });
    } catch (error) {
        console.error("Error fetching test by key:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error fetching test.' });
    }
};

exports.submitTest = async (req, res) => {
    try {
        const { answers } = req.body;
        const test = await ScreeningTest.findOne({ testKey: req.params.testKey });
        
        if (!test) {
            return res.status(404).json({ success: false, data: null, error: 'Test not found.' });
        }

        if (!answers || !Array.isArray(answers) || answers.length !== test.questions.length) {
            return res.status(400).json({ success: false, data: null, error: 'Invalid answers submitted.' });
        }

        const totalScore = answers.reduce((acc, curr) => acc + curr, 0);
        
        let matchedRule = test.scoringRules[test.scoringRules.length - 1];
        for (const rule of test.scoringRules) {
            if (totalScore >= rule.minScore && totalScore <= rule.maxScore) {
                matchedRule = rule;
                break;
            }
        }

        const isEscalated = totalScore >= 15; 

        await ScreeningResult.create({
            user: req.user.id,
            test: test._id,
            answers,
            totalScore,
            riskLevel: matchedRule.interpretation,
            isEscalated
        });

        res.status(201).json({ 
            success: true, 
            data: {
                score: totalScore,
                interpretation: matchedRule.interpretation,
                recommendation: matchedRule.recommendation,
                isEscalated
            }, 
            error: null 
        });
    } catch (error) {
        console.error("Error submitting test:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error processing test results.' });
    }
};