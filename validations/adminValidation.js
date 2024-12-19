const Joi = require('joi');
const passwordComplexity = require('joi-password-complexity');


// Joi validation for admin login
const validateLoginForAdmin = (data) => {
    const schema = Joi.object({
        email: Joi.string().email().required().label('Email'),
        password: passwordComplexity().required().label('Password'),
    });

    return schema.validate(data);
}

// Joi validation for admin login
const validateInvitation = (data) => {
    const schema = Joi.object({
        employeeName: Joi.string().required().label('Employee Name'),
        employeeEmail: Joi.string().email().required().label('Employee Email'),
        password: Joi.string().required().label('Employee password'),

    });

    return schema.validate(data);
}

module.exports = {
    validateLoginForAdmin,
    validateInvitation,
}