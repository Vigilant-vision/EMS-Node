const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const refreshTokenSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    refreshToken: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 30 * 86400, // 30 days
    },
});

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

module.exports = {
    RefreshToken
}