const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    value: { type: Number, required: true }
}, { _id: false });

const questionSchema = new mongoose.Schema({
    questionNumber: { type: Number, required: true },
    text: { type: String, required: true }
}, { _id: false });

const scoringRuleSchema = new mongoose.Schema({
    minScore: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    interpretation: { type: String, required: true },
    recommendation: { type: String, required: true }
}, { _id: false });

const screeningTestSchema = new mongoose.Schema({
    testKey: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true },
    description: { type: String, required: true },
    questions: [questionSchema],
    options: [optionSchema],
    scoringRules: [scoringRuleSchema]
}, { timestamps: true });

module.exports = mongoose.model('ScreeningTest', screeningTestSchema);