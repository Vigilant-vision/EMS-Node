const mongoose = require('mongoose');

// Schema definition for login and logout times
const loginLogoutSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    loginTime: {
        type: Date,
        required: true
    },
    logoutTime: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Static method to auto logout users who have been logged in for more than 9 hours
loginLogoutSchema.statics.autoLogoutUsers = async function() {
    const now = new Date();
    const nineHoursAgo = new Date(now.getTime() - 9 * 60 * 60 * 1000); // 9 hours in milliseconds

    try {
        const loggedInUsers = await this.find({ logoutTime: null, loginTime: { $lte: nineHoursAgo } });

        loggedInUsers.forEach(async (user) => {
            user.logoutTime = now; // Set logout time to current time
            await user.save();
            console.log(`User ${user.userId} auto-logged out after 9 hours`);
        });
    } catch (err) {
        console.error('Error auto-logging out users:', err);
    }
};

// Create the model
const LoginLogout = mongoose.model('LoginLogout', loginLogoutSchema);

module.exports = LoginLogout;
