const jwt = require("jsonwebtoken")

const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.get('Authorization');

        if (!authHeader) {
            throw {
                status: 403,
                message: 'Not authorized. No token'
            };
        }

        if (authHeader && authHeader.startsWith("Bearer ")) {
            const accessToken = authHeader.split(' ')[1];

            try {
                const decodedToken = jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET);
                if (!decodedToken) {
                    throw {
                        status: 401,
                        message: 'Not authenticated'
                    };
                }

                req.id = decodedToken.id;
                next();
            } catch (err) {
                throw {
                    status: 401,
                    message: 'Not authenticated'
                };
            }
        } else {
            throw {
                status: 403,
                message: 'Invalid token format'
            };
        }
    } catch (error) {

        console.log("error",error);

        let status = error.status || 500;
        let message = error.message || 'Internal server error';

        return res.status(status).send({
            success: false,
            message: message
        });
    }
}

module.exports = verifyToken 