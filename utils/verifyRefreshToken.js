const jwt = require("jsonwebtoken");
const { RefreshToken } = require("../models/refreshTokenModel");

const verifyRefreshToken = async (refreshToken) => {
    const privateKey = process.env.JWT_REFRESH_TOKEN_SECRET;

    try {
        const doc = await RefreshToken.findOne({ refreshToken: refreshToken });

        if (!doc) {
            throw { error: true, message: "Invalid refresh token" };
        }

        const tokenDetails = await jwt.verify(refreshToken, privateKey);

        return {
            tokenDetails,
            error: false,
            message: "Valid refresh token",
        };
    } catch (error) {
        throw { success: false, message: "Invalid refresh token" };
    }
};

module.exports = { verifyRefreshToken };
