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
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { Admin } = require('../models/adminModel');
const { Project } = require('../models/projectModel');
const Document = require('../models/document');

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
const getTaskForEmployee = async (req, res) => {
    try {
        // Get the employee id from the request
        const employeeId = req.id;

        // Check if the employee exists
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return errorResponse(res, 'Employee not found', null, 400);
        }

        // Get status filter from the query parameters
        const { status } = req.query;

        // Build the query object dynamically
        const query = { employeeId };
        if (status && status !== 'all') {
            query.status = status; // Add status filter only if it's not 'all'
        }

        // Find tasks based on the query
        const tasks = await Task.find(query);
        if (!tasks || tasks.length === 0) {
            return errorResponse(res, 'No tasks found', null, 404);
        }

        // Process tasks to include admin name and project details
        const processedTasks = await Promise.all(
            tasks.map(async (task) => {
                const processedTask = { ...task.toObject() }; // Create a new object to avoid reassigning a constant
                try {
                    const admin = await Admin.findById(task.assignedBy);
                    processedTask.assignee = admin ? admin.name : 'Unknown';

                    // Format the assigned date
                    processedTask.createdAt = new Date(processedTask.createdAt)
                        .toISOString()
                        .split('T')[0];

                    // Fetch the project details
                    const project = await Project.findById(task.projectId);
                    processedTask.projectName = project ? project.projectName : 'Unknown';
                } catch (error) {
                    console.error('Error finding admin or project:', error);
                    processedTask.assignee = 'Unknown';
                    processedTask.projectName = 'Unknown';
                }
                return processedTask;
            })
        );

        // Send success response
        return successResponse(res, 'Tasks fetched successfully', processedTasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return errorResponse(res, 'Internal server error', error.message);
    }
};


const updateTaskByIdemployee = async (req, res) => {
    try {
        // Get the employee ID from the JWT token
        const userId = req.id;

        // Check if the user is an employee
        const employee = await Employee.findById(userId);
        if (!employee) {
            return res.status(400).send({
                success: false,
                message: 'Not an Employee'
            });
        }

        const { status, comment } = req.body;

        // Find the task by ID and update the status and comments
        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id,
            {
                $set: { status }, // Update the status
                $push: {
                    comments: { text: comment }, // Add a new comment
                }
            },
            { new: true }
        );

        if (!updatedTask) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Task updated successfully',
            task: updatedTask
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const getTaskSummary = async (req, res) => {
    try {
        const employeeId = req.id;

        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return errorResponse(res, 'Employee not found', null, 400);
        }

        const tasks = await Task.find({ employeeId });

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.status === 'Completed').length;
        const pendingTasks = tasks.filter(task => task.status === 'Pending').length;
        const performance = totalTasks > 0
            ? ((completedTasks / totalTasks) * 100).toFixed(2)
            : 0;

        return successResponse(res, 'Task summary fetched successfully', {
            totalTasks,
            completedTasks,
            pendingTasks,
            performance: `${performance}%`,
        });
    } catch (error) {
        return errorResponse(res, 'Failed to fetch task summary', error.message);
    }
};


const getTaskList = async (req, res) => {
    try {
        // Get the employee ID from the request
        const employeeId = req.id;

        // Check if the employee exists
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return errorResponse(res, 'Employee not found', null, 404);
        }

        // Fetch the top 3 tasks for the employee, sorted by severity and creation date
        const tasks = await Task.find({ employeeId })
            .sort({ severity: -1, createdAt: -1 }) // Sort by severity (highest first) and then by creation date
            .limit(3);

        if (!tasks || tasks.length === 0) {
            return errorResponse(res, 'No tasks found', null, 404);
        }

        // Map over tasks to include admin name
        const taskList = await Promise.all(
            tasks.map(async (task) => {
                let adminName = 'Unknown';
                if (task.assignedBy) {
                    const admin = await Admin.findById(task.assignedBy);
                    adminName = admin ? admin.name : 'Unknown';
                }

                return {
                    taskId: task._id,
                    taskDetails: task.taskDetails,
                    assignedBy: adminName,
                    status: task.status,
                    date: new Date(task.createdAt).toISOString().split('T')[0], // Format the date
                };
            })
        );

        return successResponse(res, 'Task list fetched successfully', taskList);
    } catch (error) {
        return errorResponse(res, 'Failed to fetch task list', error.message, 500);
    }
};

const accessibleDocuments = async (req, res) => {
    try {
        // Extract user ID from the request (populated by authentication middleware)
        const employeeId = req.id;

        // Find the employee by their ID
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(400).json({
                success: false,
                message: 'Employee not found',
            });
        }

        // Find documents accessible by the user
        const accessibleDocuments = await Document.find({
            accessibleBy: { $elemMatch: { $in: [employeeId] } },
        });

        console.log("employeeId", employeeId);
        console.log("accessibleDocuments", accessibleDocuments);

        // Handle the case where no documents are found
        if (accessibleDocuments.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No accessible documents found.',
            });
        }

        // Base URL of the server (adjust as needed)
        const serverBaseUrl = `${req.protocol}://${req.get('host')}`;

        // Fetch the admin's name for each document and include the full file path
        const documentsWithDetails = await Promise.all(
            accessibleDocuments.map(async (doc) => {
                // Fetch the admin details using the uploadedBy field
                const admin = await Admin.findById(doc.uploadedBy);

                // Construct the full file path for downloading
                const fullFilePath = `${serverBaseUrl}${doc.filePath}`;

                // Add the admin's name and full file path to the document
                return {
                    ...doc.toObject(),
                    uploadedBy: admin ? admin.name : null,  // Admin's name or null if not found
                    downloadUrl: fullFilePath,             // Full file path for download
                };
            })
        );

        // Return the documents with admin names and download URLs
        return res.status(200).json({
            success: true,
            documents: documentsWithDetails,
        });
    } catch (error) {
        console.error('Error fetching accessible documents:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching accessible documents.',
        });
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
    getTaskForEmployee,
    updateTaskByIdemployee,
    getTaskSummary,
    getTaskList,
    accessibleDocuments
};
