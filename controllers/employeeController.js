const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const { Invitation } = require("../models/invitationModel");
const Task = require('../models/taskModel');
const { employeeRegisterSchema, validateLoginForEmployee, detailsValidationSchema } = require("../validations/employeeValidation");
const { generateAccessToken } = require("../utils/generateToken");
const LoginLogout = require('../models/Loginlogout');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { Admin } = require('../models/adminModel');
const { Project } = require('../models/projectModel');
const Document = require('../models/document');
const Employee = require('../models/employeeModel');
const ApiResponse = require('../utils/apiResponse');

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

        // Find the employee by email
        const employee = await Employee.findOne({ email: email });
        if (!employee) {
            return res.status(400).send({ message: "Invalid email" });
        }

        // Check if the employee is active
        if (!employee.active) {
            return res.status(403).send({
                success: false,
                message: "Your account has been restricted by the admin."
            });
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
            return res.status(400).send(ApiResponse(400, null, "User is not logged in"));
        }

        // Update the last login entry with the logout time
        lastLoginEntry.logoutTime = new Date();
        await lastLoginEntry.save();

        // Respond with success message using ApiResponse
        return res.status(200).send(ApiResponse(200, null, "Logout successful"));
    } catch (error) {
        console.log(error);
        return res.status(500).send(ApiResponse(500, error.message, "Internal server error"));
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
        const employeeId = req.id;

        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(400).json(ApiResponse(400, null, 'Employee not found'));
        }

        const { status } = req.query;

        const query = { employeeId };
        if (status && status !== 'all') {
            query.status = status; // Add status filter if it's not 'all'
        }

        const tasks = await Task.find(query);
        if (!tasks || tasks.length === 0) {
            return res.status(404).json(ApiResponse(404, null, 'No tasks found'));
        }

        const processedTasks = await Promise.all(
            tasks.map(async (task) => {
                const processedTask = { ...task.toObject() }; // Avoid mutating the original task object

                try {
                    // Find assignedBy (Admin) name
                    const admin = await Admin.findById(task.assignedBy);
                    processedTask.assignee = admin ? admin.name : 'Unknown';

                    // Format createdAt date
                    processedTask.createdAt = new Date(processedTask.createdAt).toISOString().split('T')[0];

                    // Find project name
                    const project = await Project.findById(task.projectId);
                    processedTask.projectName = project ? project.projectName : 'Unknown';

                    // Process comments to include names
                    processedTask.comments = await Promise.all(
                        task.comments.map(async (comment) => {
                            const user = 
                                await Admin.findById(comment.userId) || 
                                await Employee.findById(comment.userId);
                            
                            return {
                                ...comment.toObject(),
                                userName: user ? user.name : 'Unknown', // Add userName from Admin or Employee
                            };
                        })
                    );
                } catch (error) {
                    console.error('Error processing task:', error);
                    processedTask.assignee = 'Unknown';
                    processedTask.projectName = 'Unknown';
                }

                return processedTask;
            })
        );

        return res.status(200).json(ApiResponse(200, processedTasks, 'Tasks fetched successfully'));
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return res.status(500).json(ApiResponse(500, error.message, 'Internal server error'));
    }
};



const updateTaskByIdemployee = async (req, res) => {
    try {
        const userId = req.id; // Get the ID of the logged-in user (who is adding the comment)

        // Check if the employee exists based on the userId
        const employee = await Employee.findById(userId);
        if (!employee) {
            return res.status(400).json(ApiResponse(400, null, 'Not an Employee'));
        }

        // Destructure status and comment from the request body
        const { status, comment } = req.body;

        // Update the task with the new status and push the comment along with the userId
        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id,
            {
                $set: { status }, // Update the status of the task
                $push: { comments: { text: comment, userId: userId } }, // Add the comment with userId
            },
            { new: true } // Return the updated task
        );

        // If task not found, return a 404 error
        if (!updatedTask) {
            return res.status(404).json(ApiResponse(404, null, 'Task not found'));
        }

        // Return the updated task details
        return res.status(200).json(ApiResponse(200, updatedTask, 'Task updated successfully'));
    } catch (error) {
        // Handle any errors
        console.error('Error updating task:', error);
        return res.status(500).json(ApiResponse(500, error.message, 'Internal server error'));
    }
};


const getTaskSummary = async (req, res) => {
    try {
        const employeeId = req.id;

        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(400).json(ApiResponse(400, null, 'Employee not found'));
        }

        const tasks = await Task.find({ employeeId });

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.status === 'Completed').length;
        const pendingTasks = tasks.filter(task => task.status === 'Not Started').length;
        const performance = totalTasks > 0
            ? ((completedTasks / totalTasks) * 100).toFixed(2)
            : 0;

        return res.status(200).json(ApiResponse(200, {
            totalTasks,
            completedTasks,
            pendingTasks,
            performance: `${performance}%`,
        }, 'Task summary fetched successfully'));
    } catch (error) {
        return res.status(500).json(ApiResponse(500, error.message, 'Failed to fetch task summary'));
    }
};

const getTaskList = async (req, res) => {
    try {
        const employeeId = req.id;

        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json(ApiResponse(404, null, 'Employee not found'));
        }

        const tasks = await Task.find({ employeeId })
            .sort({ severity: -1, createdAt: -1 })
            .limit(3);

        if (!tasks || tasks.length === 0) {
            return res.status(404).json(ApiResponse(404, null, 'No tasks found'));
        }

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
                    date: new Date(task.createdAt).toISOString().split('T')[0],
                };
            })
        );

        return res.status(200).json(ApiResponse(200, taskList, 'Task list fetched successfully'));
    } catch (error) {
        return res.status(500).json(ApiResponse(500, error.message, 'Failed to fetch task list'));
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

        // Get the department of the employee
        const employeeDepartment = employee.department;

        // Find documents accessible by employees in the same department
        const departmentDocuments = await Document.find({
            accessibleBy: { $in: [employeeId, employeeDepartment] },
        }).sort({ createdAt: -1 }); // Sort by createdAt in descending order

        console.log("employeeId", employeeId);
        console.log("employeeDepartment", employeeDepartment);
        console.log("departmentDocuments", departmentDocuments);

        // Handle the case where no documents are found
        if (departmentDocuments.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No accessible documents found.',
            });
        }

        // Base URL of the server (adjust as needed)
        const serverBaseUrl = `${req.protocol}://${req.get('host')}`;

        // Fetch the admin's name for each document and include the full file path
        const documentsWithDetails = await Promise.all(
            departmentDocuments.map(async (doc) => {
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
    accessibleDocuments,
};
