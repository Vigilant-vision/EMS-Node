const mongoose = require('mongoose');

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
    }
});

const LoginLogout = mongoose.model('LoginLogout', loginLogoutSchema);

module.exports = LoginLogout;
