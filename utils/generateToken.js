const jwt = require('jsonwebtoken');
const { RefreshToken } = require("../models/refreshTokenModel");

// Function to generate access token
const generateAccessToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: '12h' });
};

// Function to generate refresh token
const generateRefreshToken = async (userId) => {
    try {
        const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_TOKEN_SECRET, { expiresIn: '30d' });

        // Find and delete any existing refresh token for the user
        await RefreshToken.findOneAndDelete({ userId });

        // Save the new refresh token in the database
        await new RefreshToken({ userId, refreshToken: refreshToken }).save();

        return refreshToken;
    } catch (error) {
        // Handle any errors
        console.error('Error generating refresh token:', error);
        throw new Error('Unable to generate refresh token');
    }
};

module.exports = {
    generateAccessToken,
    generateRefreshToken
}