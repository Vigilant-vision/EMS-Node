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

//Joi validation for employee add details
const detailsValidationSchema = (data) => {
    const schema = Joi.object({
        // dateOfBirth: Joi.string().required().label("Date Of Birth"),
        // designation: Joi.string().required().label("Designation"),
        // typeOfEmployment: Joi.string().required().valid('Full-time', 'Part-time', 'Internship').label("Type Of Employment"),
        address: Joi.string().required().label("Address"),
        city: Joi.string().required().label("City"),
        state: Joi.string().required().label("State"),
        zipCode: Joi.number().required().label("Zip Code"),
        country: Joi.string().required().label("Country"),
    });

    return schema.validate(data);
}

module.exports = {
    employeeRegisterSchema,
    validateLoginForEmployee,
    detailsValidationSchema,
};
