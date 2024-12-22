const Joi = require('joi');
const passwordComplexity = require('joi-password-complexity');


// Joi validation schema for Realtor register
const employeeRegisterSchema = (data) => {

    const schema = Joi.object({
        name: Joi.string().required().label("Name"),
        phone: Joi.string().required().pattern(/^[0-9]{10}$/).label("Phone"), // Assuming 10-digit phone number
        password: passwordComplexity().required().label("Password"),
    });

    return schema.validate(data);
}

// Joi validation for broker login
const validateLoginForEmployee = (data) => {
    const schema = Joi.object({
        email: Joi.string().email().required().label('Email'),
        password: passwordComplexity().required().label('Password'),
    });

    return schema.validate(data);
}



module.exports = {
    employeeRegisterSchema,
    validateLoginForEmployee,
};
