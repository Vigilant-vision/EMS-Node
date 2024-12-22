const ApiResponse = (statusCode, payload, message) => {
    const success = statusCode >= 200 && statusCode < 300;
    return {
        statusCode,
        message,
        success,
        data: success ? payload : null,
        error: success ? null : payload
    };
}

module.exports = ApiResponse;