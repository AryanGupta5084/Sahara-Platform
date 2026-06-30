const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        unique: true, 
        sparse: true 
    },
    password: { 
        type: String 
    },
    isAdmin: { 
        type: Boolean, 
        default: false 
    },
    isGuest: { 
        type: Boolean, 
        default: false 
    },
    expireAt: { 
        type: Date, 
        default: null 
    },
    blockedSessionIds: { 
        type: [String], 
        default: [] 
    },
    termsAgreed: { 
        type: Date, 
        default: null 
    },
    journalStreak: { 
        type: Number, 
        default: 0 
    },
    lastJournalDate: { 
        type: Date 
    },
    achievements: { 
        type: [String], 
        default: [] 
    }
}, { 
    timestamps: true 
});

userSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

userSchema.pre("save", async function (next) {
    if (this.isGuest) return next();
    if (!this.isModified("password")) return next();
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    if (this.isGuest) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;