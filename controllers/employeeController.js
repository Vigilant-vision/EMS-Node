const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const { Invitation } = require("../models/invitationModel");
const { Employee } = require("../models/employeeModel");
const Task = require('../models/taskModel');
const { employeeRegisterSchema, validateLoginForEmployee, detailsValidationSchema } = require("../validations/employeeValidation");
const { generateAccessToken } = require("../utils/generateToken");
const LoginLogout = require('../models/Loginlogout');

//POST: Accept invitation from admin and employee register
const getInvitationNamAndEmail = async (req, res) => {
    try {
        const { invitationId } = req.params;

        //Find invitation
        const invitation = await Invitation.findById(invitationId);
        if (!invitation) {
            return res.status(400).send({
                success: false,
                message: 'Invitation not found'
            });
        }

        return res.status(200).send({
            success: true,
            invitation: invitation
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success: false,
            message: error.message
        });
    }
};
//POST: Accept invitation from admin and employee register
const acceptInvitationAndSignup = async (req, res) => {
    try {
        const { invitationId } = req.params;

        // Validate the request body using the EmployeeValidationSchema
        const { error } = employeeRegisterSchema(req.body);
        if (error) {
            return res.status(400).send({
                success: false,
                message: error.details[0].message
            });
        }

        const { name, phone, password } = req.body;

        //Find invitation
        const invitation = await Invitation.findById(invitationId);
        if (!invitation) {
            return res.status(400).send({
                success: false,
                message: 'Invitation not found'
            });
        }

        // Check if there is an existing Employee with the same email and brokerId
        const existingEmployee = await Employee.findOne({ email: invitation.employeeEmail });
        if (existingEmployee) {
            return res.status(400).send({
                success: false,
                message: 'Employee already exists'
            });
        }

        //Hashing Employee password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create a new Employee instance with submitted details
        const newEmployee = new Employee({
            name: name,
            phone: phone,
            email: invitation.employeeEmail,
            password: hashedPassword,
        });

        // Save the new Employee details to the Employee collection
        await newEmployee.save();

        // Delete the invitation
        const invitationData = await Invitation.findByIdAndDelete(invitationId);
        if (!invitationData) {
            return res.status(400).send({
                success: false,
                message: 'Invitation could not be updated.'
            });
        }

        //Generate jwt token on successful realtor sign up
        const accessToken = generateAccessToken(newEmployee._id);

        return res.status(200).send({
            success: true,
            newEmployee: newEmployee,
            message: 'Your details submitted successfully and invitation status updated to accepted',
            accessToken: accessToken
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success: false,
            message: error.message
        });
    }
};

//POST:Add details after sign up
const addOrUpdateEmployeeDetails = async (req, res) => {
    try {

        const employeeId = req.id;
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(400).json({
                verified: false,
                message: 'Employee not found'
            });
        }
        // const { error } = detailsValidationSchema(req.body);
        // if (error) {
        //     return res.status(400).json({
        //         success: false,
        //         message: error.details[0].message
        //     });
        // }

        const {
            dateOfBirth,
            aboutMe,
            designation,
            typeOfEmployment,
            address,
            // city,
            state,
            zipCode,
            country,
        } = req.body;
        const image = req.file.filename;

        const currentDate = new Date();

        const updateFields = {
            dateOfBirth,
            aboutMe,
            image,
            'employeeInformation.dateOfJoining': currentDate,
            'employeeInformation.designation': designation,
            'employeeInformation.typeOfEmployment': typeOfEmployment,
            'contactInformation.address': address,
            // 'contactInformation.city': city,
            'contactInformation.state': state,
            'contactInformation.zipCode': zipCode,
            'contactInformation.country': country,
        };

        const options = {
            new: true, // return the modified document rather than the original
            upsert: true, // create the document if it doesn't exist
            setDefaultsOnInsert: true, // apply default values when upserting
        };

        const updatedEmployee = await Employee.findByIdAndUpdate(
            employeeId,
            { $set: updateFields },
            options
        );

        return res.status(200).json({
            success: true,
            message: 'Employee details updated successfully',
            employee: updatedEmployee
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// Login function
const employeeLogin = async (req, res) => {
    try {
        const { error } = validateLoginForEmployee(req.body);
        if (error)
            return res.status(400).send({
                success: false,
                message: error.details[0].message
            });

        const { email, password } = req.body;
        console.log(email, password);

        // Find the employee by email
        const employee = await Employee.findOne({ email: email });
        if (!employee) {
            return res.status(400).send({ message: "Invalid email" });
        }

        // Compare password with hashed password
        const comparePass = await bcrypt.compare(password, employee.password);
        if (!comparePass) {
            return res.status(400).send({ message: "Invalid password" });
        }

        // Generate JWT token on login
        const accessToken = generateAccessToken(employee._id);

        // Create a new document in LoginLogout collection for login timestamp
        const loginTime = new Date();
        const loginLogoutEntry = new LoginLogout({
            userId: employee._id,
            loginTime: loginTime
        });
        await loginLogoutEntry.save();

        // Remove password from user data before sending in response
        const { password: _, ...others } = employee._doc;

        // Sending token in response along with user data
        return res.status(200).send({
            success: true,
            user: others,
            message: "Login successful",
            accessToken: accessToken
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success: false,
            message: error.message
        });
    }
};

const employeeLogout = async (req, res) => {
    try {
        // Extract user ID from the request or JWT token
        const userId = req.id; // Assuming you have middleware to extract user details from the request

        // Find the last login entry for the user
        const lastLoginEntry = await LoginLogout.findOne({ userId }).sort({ loginTime: -1 });

        // If no login entry is found or the user is already logged out, return an error
        if (!lastLoginEntry || lastLoginEntry.logoutTime) {
            return res.status(400).send({ message: "User is not logged in" });
        }

        // Update the last login entry with the logout time
        lastLoginEntry.logoutTime = new Date();
        await lastLoginEntry.save();

        // Respond with success message
        return res.status(200).send({
            success: true,
            message: "Logout successful"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success: false,
            message: error.message
        });
    }
};




// Function to send OTP for forgot password
const sendOTPForPasswordResetForBroker = async (req, res) => {

    try {

        const email = req.body.email;

        // Define Joi schema for email validation
        const schema = Joi.object({
            email: Joi.string().email().required().label('Email'),
        });

        // Validate the request body
        const { error } = schema.validate({ email });

        if (error) {
            return res.status(400).send({
                success: false,
                message: error.details[0].message,
            });
        }

        // Check if the email exists in the database
        const user = await User.findOne({ email: email, roleType: "broker" });
        console.log(user)

        if (!user) {
            return res.status(404).send({
                success: false,
                message: 'User not found with this email',
            });
        }

        await OTPModel.deleteOne({ email: email, roleType: "broker" })

        // Generate a random OTP
        const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

        const emailContent = `<p>OTP to reset your password :</p><p><b>${generatedOTP}</b></p>`;

        //Sending email
        await sendEmail(user.email, "OTP Verify", emailContent)

        // Hash the OTP
        const hashedOTP = await bcrypt.hash(generatedOTP, 10);

        // Store the hashed OTP in the database
        await new OTPModel({
            userId: user._id,
            email: user.email,
            roleType: "broker",
            OTP: hashedOTP,
        }).save();


        return res.status(200).send({
            success: true,
            message: 'OTP sent successfully for password reset',
            email: user.email,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success: false,
            message: 'Internal server error',
        });
    }
};

//Verify otp for forgot password
const verifyOTPForPasswordResetForBroker = async (req, res) => {
    try {

        const { email, otp } = req.body;

        // Define Joi schema for OTP validation
        const schema = Joi.object({
            otp: Joi.string().required().label('OTP'),
        });

        // Validate the OTP
        const { error } = schema.validate({ otp });

        if (error) {
            return res.status(400).send({
                success: false,
                message: error.details[0].message,
            });
        }

        //Find the user
        const user = await User.findOne({ email: email, roleType: "broker" });

        console.log(user)

        if (!user) {
            return res.status(400).send({
                verified: false,
                message: 'User not found'
            });
        }

        // Find the OTP token in the database
        const otpToken = await OTPModel.findOne({ email: email, roleType: "broker" });

        console.log(otpToken)

        if (!otpToken) {
            return res.status(404).send({
                success: false,
                message: 'OTP not found or expired',
            });
        }

        // Compare the hashed OTP
        const isMatch = await bcrypt.compare(otp, otpToken.OTP);


        if (!isMatch) {
            return res.status(400).send({
                success: false,
                message: 'Invalid OTP',
            });
        }

        //Delete the otp
        await otpToken.deleteOne();

        console.log(otpToken);

        return res.status(200).send({
            success: true,
            message: 'OTP verified successfully, reset your password in next page',
            email: email,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success: false,
            message: 'Internal server error',
        });
    }
};


//Reset password
const resetPasswordForBroker = async (req, res) => {
    try {
        const { email, newPassword, confirmNewPassword } = req.body;

        const schema = Joi.object({
            newPassword: passwordComplexity().required().label('New Password'),
            confirmNewPassword: Joi.valid(Joi.ref('newPassword')).required().label('Confirm New Password')
                .messages({ 'any.only': 'New Password and Confirm New Password must be same' }),
        });

        // Validate the request body
        const { error } = schema.validate({ newPassword, confirmNewPassword });

        if (error) {
            return res.status(400).send({
                success: false,
                message: error.details[0].message,
            });
        }

        // Find the user by email
        const user = await User.findOne({ email: email, roleType: "broker" });

        if (!user) {
            return res.status(400).send({
                verified: false,
                message: 'User not found'
            });
        }

        // Reset the user's password
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        user.password = hashedPassword;
        await user.save();

        return res.status(200).send({
            success: true,
            message: 'Password reset successful',
            email: email,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success: false,
            message: 'Internal server error',
        });
    }
};

const getEmployeeByInvtationId = async (req, res) => {
    try {
        const { EmployeeByInvtationId } = req.params;

        const invitation = await Invitation.findOne({
            _id: EmployeeByInvtationId
        });

        if (!invitation) {
            return res.status(404).send({ error: 'No invitation found' });
        }


        return res.status(200).send(invitation);
    } catch (error) {

        console.error(error);
        return res.status(500).send({ error: 'Internal Server Error' });
    }
};
// Controller to get a single task by ID
const getTaskForemployee = async (req, res) => {
    try {
        // Get the employee id from the request
        const employeeId = req.id;
        
        // Check if the employee exists
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(400).send({
                success: false,
                message: 'Employee not found'
            });
        }
      
        // Find tasks assigned to the employee
        const tasks = await Task.find({ employeeId });

        if (!tasks || tasks.length === 0) {
            return res.status(404).json({ message: 'Tasks not found' });
        }
        
        // Process tasks to include the name of the admin who assigned them
        const processedTasks = [];
        for (const task of tasks) {
            let processedTask = { ...task.toObject() }; // Create a new object to avoid reassigning a constant
            try {
                const admin = await Admin.findById(task.assignedBy);
                if (admin) {
                    processedTask.assignee = admin.name;
                } else {
                    processedTask.assignee = 'Unknown';
                }
                // Format the assigned date
                processedTask.createdAt = new Date(processedTask.createdAt).toISOString().split('T')[0];
                
                // Fetch the project details
                const project = await Project.findById(task.projectId);
                if (project) {
                    processedTask.projectName = project.projectName;
                } else {
                    processedTask.projectName = 'Unknown';
                }
            } catch (error) {
                console.error('Error finding admin or project:', error);
                processedTask.assignee = 'Unknown';
                processedTask.projectName = 'Unknown';
            }
            processedTasks.push(processedTask);
        }

        res.status(200).json(processedTasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateTaskByIdemployee = async (req, res) => {
    try {
        // Get the admin id from jwt token
        const UserId = req.id;
        // Check if the user is an admin
        const employee = await Employee.findById(UserId);
        if (!employee) {
            return res.status(400).send({
                success: false,
                message: 'Not Employee'
            });
        }

        const { status } = req.body;

        const updatedTask = await Task.findByIdAndUpdate(req.params.id, { status }, { new: true });

        if (!updatedTask) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.status(200).json(updatedTask);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getInvitationNamAndEmail,
    acceptInvitationAndSignup,
    employeeLogin,
    employeeLogout,
    addOrUpdateEmployeeDetails,
    sendOTPForPasswordResetForBroker,
    verifyOTPForPasswordResetForBroker,
    resetPasswordForBroker,
    getEmployeeByInvtationId,
    getTaskForemployee,
    updateTaskByIdemployee
};
