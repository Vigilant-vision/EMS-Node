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
      name: Joi.string().min(3).max(50).required().label('Employee Name'),
      email: Joi.string().email().required().label('Employee Email'),
      phone: Joi.string().required().label('Mobile no'),
      password: Joi.string()
      .pattern(new RegExp("^(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*])[A-Za-z\\d!@#$%^&*]{8,}$"))
      .required()
      .label('Password')
      .messages({
        "string.pattern.base": "Password must have at least one uppercase letter, one integer, one special character, and be at least 8 characters long.",
      }),
      position: Joi.string().min(2).max(50).required().label('Position'),
      department: Joi.string()
        .valid('Engineering', 'Marketing', 'Sales', 'HR', 'Finance')
        .required()
        .label('Department'),
      startDate: Joi.date().required().label('Start Date'),
      type: Joi.string()
        .valid('full-time', 'part-time', 'contract', 'intern')
        .default('full-time')
        .label('Employment Type'),
        active: Joi.boolean().default(true).label('Active Status'),

    });
  
    return schema.validate(data);
  };

module.exports = {
    validateLoginForAdmin,
    validateInvitation,
}