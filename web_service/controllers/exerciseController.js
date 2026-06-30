const GuidedExercise = require('../models/GuidedExercise');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

exports.getExercises = async (req, res) => {
    try {
        const exercises = await GuidedExercise.find().select('title description category');
        res.status(200).json({ success: true, data: exercises, error: null });
    } catch (error) {
        console.error("Failed to fetch exercises:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error fetching exercises.' });
    }
};

exports.startOrContinueExercise = async (req, res) => {
    try {
        const { exerciseId, userResponse, currentStep } = req.body;
        const exercise = await GuidedExercise.findById(exerciseId);
        
        if (!exercise) {
            return res.status(404).json({ success: false, data: null, error: 'Exercise not found.' });
        }

        const stepIndex = currentStep || 0;
        
        if (stepIndex >= exercise.steps.length) {
            return res.status(200).json({ success: true, data: { completed: true, message: 'Exercise complete.' }, error: null });
        }

        let aiFeedback = null;
        if (userResponse && stepIndex > 0) {
            const previousStep = exercise.steps[stepIndex - 1];
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const prompt = `As a mental health companion, briefly and empathetically respond in 1 to 2 sentences to the user's input during a ${exercise.category} exercise.\nExercise Prompt: "${previousStep.prompt}"\nUser Response: "${userResponse}"`;
            const result = await model.generateContent(prompt);
            aiFeedback = result.response.text();
        }

        const nextStep = exercise.steps[stepIndex];

        res.status(200).json({ 
            success: true, 
            data: { 
                step: nextStep, 
                nextStepIndex: stepIndex + 1, 
                feedback: aiFeedback,
                isLastStep: stepIndex === exercise.steps.length - 1
            }, 
            error: null 
        });
    } catch (error) {
        console.error("Exercise processing error:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error processing exercise step.' });
    }
};