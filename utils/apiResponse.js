const successResponse = (res, message, data = null, statusCode = 200) => {
    const response = {
        success: true,
        message: message || 'Operation successful',
    };

    if (data) response.data = data;

    return res.status(statusCode).json(response);
};

const errorResponse = (res, message, error = null, statusCode = 500) => {
    const response = {
        success: false,
        message: message || 'An error occurred',
    };

    if (error) response.error = error;

    return res.status(statusCode).json(response);
};

module.exports = {
    successResponse,
    errorResponse,
};
