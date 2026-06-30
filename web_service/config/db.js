const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
    } catch (err) {
        console.error(`❌ DB connection error: ${err.message}`);
    }
};

module.exports = connectDB;