const bcrypt = require('bcrypt');
const { Admin } = require("../models/adminModel");
const { validateLoginForAdmin, validateInvitation } = require("../validations/adminValidation");
const { Invitation } = require("../models/invitationModel");
const jwt = require('jsonwebtoken');
const sendEmail = require("../utils/sendEmail");
const getImageURL = require("../utils/imageUrl");
const { Project } = require('../models/projectModel');
const Task = require('../models/taskModel');
const { generateAccessToken, generateRefreshToken } = require("../utils/generateToken");
const LoginLogout = require('../models/Loginlogout');
const Document = require('../models/document');
const { default: mongoose } = require('mongoose');
const Employee = require('../models/employeeModel');
const ApiResponse = require('../utils/apiResponse');
const path = require('path');  // Add this line to import the 'path' module
const fs = require('fs');

const createAdmins = async () => {
    try {
        // Check if the first admin already exists
        const admin1Exists = await Admin.findOne({ email: 'subhrajeet@yopmail.com' });

        if (!admin1Exists) {
            // Create the first admin
            const admin1 = new Admin({
                name: 'SubhraJeet Swain',
                phone: '9856985698',
                email: 'subhrajeet@yopmail.com',
                password: await bcrypt.hash('Subhra@123', 12),
                isAdmin: true,
            });

            await admin1.save();
            console.log('Admin 1 created successfully.');
        } else {
            console.log('Admin 1 already exists.');
        }

        // Check if the second admin already exists
        const admin2Exists = await Admin.findOne({ email: 'chpritampatro123@gmail.com' });

        if (!admin2Exists) {
            // Create the second admin
            const admin2 = new Admin({
                name: 'Pritam Patro',
                phone: '9658965896',
                email: 'chpritampatro123@gmail.com',
                password: await bcrypt.hash('Pritamvigilantvision@123', 12),
                isAdmin: true,
            });

            await admin2.save();
            console.log('Admin 2 created successfully.');
        } else {
            console.log('Admin 2 already exists.');
        }
        const admin3Exists = await Admin.findOne({ email: 'raj80133@gmail.com' });

        if (!admin3Exists) {
            // Create the second admin
            const admin3 = new Admin({
                name: 'Raj Kumar Pal',
                phone: '9658965896',
                email: 'raj80133@gmail.com',
                password: await bcrypt.hash('Rajvigilantvision@123', 12),
                isAdmin: true,
            });

            await admin3.save();
            console.log('Admin 3 created successfully.');
        } else {
            console.log('Admin 3 already exists.');
        }
        const admin4Exists = await Admin.findOne({ email: 'srikantakumardash2001@gmail.com' });

        if (!admin4Exists) {
            // Create the second admin
            const admin4 = new Admin({
                name: 'srikanta kumar dash',
                phone: '9658965896',
                email: 'srikantakumardash2001@gmail.com',
                password: await bcrypt.hash('Srikantavigilantvision@123', 12),
                isAdmin: true,
            });

            await admin4.save();
            console.log('Admin 4 created successfully.');
        } else {
            console.log('Admin 4 already exists.');
        }

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

//Admin Login
const adminLogin = async (req, res) => {
    try {
        const { error } = validateLoginForAdmin(req.body);
        if (error)
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });

        //Find admin
        const admin = await Admin.findOne({ email: req.body.email });
        //Check if the admin exists in the database
        if (!admin) {
            return res.status(400).json({ message: "Invalid email" });
        }

        //Compare password and hashed password
        const comparePass = await bcrypt.compare(req.body.password, admin.password);
        if (!comparePass) {
            return res.status(400).json({ message: "Invalid password" });

        }

        //If not admin
        if (!admin.isAdmin) {
            return res.status(400).json({
                success: false,
                message: "You are not an admin",
            });

        }

        const { password: _, subscribed, ...others } = admin._doc;

        //Generate jwt token on login
        const accessToken = generateAccessToken(admin._id);
        // const refreshToken = await generateRefreshToken(admin._id);

        //jsoning token in response
        return res.status(200).json({
            success: true,
            admin: others,
            message: "Admin login successful",
            accessToken: accessToken
            // refreshToken: refreshToken,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const sendOTPForPasswordResetForAdmin = async (req, res) => {

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
        const admin = await Admin.findOne({ email: email });

        if (!admin) {
            return res.status(404).send({
                success: false,
                message: 'Admin not found with this email',
            });
        }

        await OTPModel.deleteOne({ email: email, roleType: 3 })

        // Generate a random OTP
        const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();


        //Email template path
        const adminResetPasswordUrl = 'https://oregonhomeseeker.com:3001/EmailTemplates/forgetPassword.html';
        const response = await axios.get(adminResetPasswordUrl);
        const adminResetPasswordHtml = response.data;

        // Here you can attach any files you want to send with the email
        const attachments = [
            {
                filename: 'Group10.png',
                path: 'https://oregonhomeseeker.com:3001/EmailTemplates/Group10.png',
                cid: 'Group10.png'
            },
            {
                filename: 'Group11.png',
                path: 'https://oregonhomeseeker.com:3001/EmailTemplates/Group11.png',
                cid: 'Group11.png'
            }
        ];

        // Construct email content
        const emailContent = {
            html: adminResetPasswordHtml
                .replace('{{generatedOTP}}', generatedOTP),
            attachments: attachments
        };


        //Sending email
        await sendEmail(admin.email, "OTP Verify", emailContent)

        // Hash the OTP
        const hashedOTP = await bcrypt.hash(generatedOTP, 10);

        // Store the hashed OTP in the database
        await new OTPModel({
            userId: admin._id,
            email: admin.email,
            roleType: 3,
            OTP: hashedOTP,
        }).save();


        return res.status(200).send({
            success: true,
            message: 'OTP sent successfully for password reset',
            email: admin.email,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success: false,
            message: 'Internal server error',
        });
    }
};

//POST: Verify otp for forgot password
const verifyOTPForPasswordResetForAdmin = async (req, res) => {
    try {

        const { email, otp } = req.body;

        // Define Joi schema for email validation
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

        //Find admin
        const admin = await Admin.findOne({ email: email });
        if (!admin) {
            return res.status(400).send({
                success: false,
                message: 'Admin not found'
            });
        }

        // Find the OTP token in the database
        const otpToken = await OTPModel.findOne({ email: email });

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

const resetPasswordForAdmin = async (req, res) => {
    try {
        const { email, newPassword, confirmNewPassword } = req.body;

        const schema = Joi.object({
            newPassword: passwordComplexity().required().label('New Password'),
            confirmNewPassword: Joi.valid(Joi.ref('newPassword')).required().label('Confirm New Password')
                .messages({ 'any.only': 'Password and Confirm Password must be same' }),
        });

        // Validate the request body
        const { error } = schema.validate({ newPassword, confirmNewPassword });
        if (error) {
            return res.status(400).send({
                success: false,
                message: error.details[0].message,
            });
        }

        //Find admin
        const admin = await Admin.findOne({ email: email });
        if (!admin) {
            return res.status(400).send({
                success: false,
                message: 'Admin not found'
            });
        }

        // Reset the user's password
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        admin.password = hashedPassword;
        await admin.save();

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

//POST:Invite Employee
const inviteEmployee = async (req, res) => {
    try {
        const adminId = req.id;

        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(400).json(ApiResponse(400, null, 'Admin not found'));
        }

        const { error } = validateInvitation(req.body);
        if (error) {
            return res.status(400).json(ApiResponse(400, error.details[0].message, "Error occured while adding employee"));
        }

        const { name, email, phone, password, position, department, startDate, type } = req.body;

        // Hashing employee password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        let employee = await Employee.findOne({ email });
        if (employee) {
            return res.status(400).json(ApiResponse(400, null, 'Employee already exists'));
        }

        const newEmployee = new Employee({
            name,
            email,
            phone,
            password: hashedPassword,
            position,
            department,
            startDate,
            type,
        });

        await newEmployee.save();

        // Send the invitation email
        const emailContent = `
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px;">
                <h2>Welcome to Our Platform!</h2>
                <p>Your account has been created by the admin. Here are your login credentials:</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Password:</strong> ${password}</p>
                <p>If you did not expect this email, please contact your admin immediately.</p>
                <p style="margin-top: 30px;">Best Regards,<br>VVS</p>
            </div>
        `;

        await sendEmail(email, 'Account Created by Admin', emailContent);

        // Remove the password from the response
        const { password: _, ...employeeData } = newEmployee._doc;

        return res
            .status(200)
            .json(ApiResponse(200, employeeData, `Invitation sent successfully to ${email}`));
    } catch (error) {
        console.error(error);
        return res.status(500).json(ApiResponse(500, error.message, 'Internal Server Error'));
    }
};

//Get all employees
const getAllEmployees = async (req, res) => {
    try {
        // Ensure the Admin ID is properly fetched from the JWT token
        const adminId = req.id;
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(400).json(ApiResponse(400, null, 'Admin not found'));
        }

        // Pagination logic
        const pageNumber = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 5;
        const skip = (pageNumber - 1) * pageSize;

        // Fetch employees
        const employees = await Employee.find({}, '-password')
            .skip(skip)
            .limit(pageSize);

        if (!employees.length) {
            return res
                .status(404)
                .json(ApiResponse(404, null, 'No employees found'));
        }

        const totalItems = await Employee.countDocuments();

        const employeesWithImageURLs = employees.map((employee) => {
            const imageURL = getImageURL(employee.image);
            return { ...employee._doc, imageURL };
        });

        const response = {
            employees: employeesWithImageURLs,
            totalItems,
            currentPage: pageNumber,
            totalPages: Math.ceil(totalItems / pageSize),
        };

        return res.status(200).json(ApiResponse(200, response, 'Employees fetched successfully'));
    } catch (error) {
        console.error('Error in getAllEmployees:', error);
        return res.status(500).json(ApiResponse(500, error.message, 'Internal Server Error'));
    }
};

// GET: Get employee details based on id
const getEmployeeById = async (req, res) => {
    try {

        //Requesting id from jwt token
        const adminId = req.id;
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(400).json({
                verified: false,
                message: 'Admin not found'
            });
        }

        const employeeId = req.params.id;
        //Find the broker
        const employee = await Employee.findById(employeeId).select('-password');
        if (!employee) {
            return res.status(400).json({
                verified: false,
                message: 'Employee not found'
            });
        }

        const imageURL = getImageURL(employee.image);
        const employeeWithImageURL = {
            ...employee._doc,
            imageURL: imageURL,
        };

        return res.status(200).json({
            success: true,
            message: 'Employee data',
            employee: employeeWithImageURL
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

}

// Delete an employee
const deleteEmployee = async (req, res) => {
    try {
        const adminId = req.id;
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(400).json(ApiResponse(400, null, 'Admin not found'));
        }

        const employeeId = req.params.id;
        // Find the employee and delete
        const employee = await Employee.findByIdAndDelete(employeeId);
        if (!employee) {
            return res.status(404).json(ApiResponse(404, null, 'Employee not found'));
        }

        return res.status(200).json(
            ApiResponse(200, { deletedEmployee: employee }, 'Employee deleted successfully')
        );
    } catch (error) {
        console.error(error);
        return res.status(500).json(ApiResponse(500, error.message, 'Internal Server Error'));
    }
};

const updateEmployeeStatus = async (req, res) => {
    try {
        const adminId = req.id;
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(400).json(ApiResponse(400, null, 'Admin not found'));
        }

        const employeeId = req.params.id;
        const { active } = req.body;

        // Validate the active status
        if (typeof active !== 'boolean') {
            return res.status(400).json(ApiResponse(400, null, 'Invalid value for active. It must be a boolean.'));
        }

        // Update employee's active status
        const employee = await Employee.findByIdAndUpdate(
            employeeId,
            { active },
            { new: true, runValidators: true }
        );

        if (!employee) {
            return res.status(404).json(ApiResponse(404, null, 'Employee not found'));
        }

        return res.status(200).json(
            ApiResponse(200, { updatedEmployee: employee }, `Employee status updated to ${active ? 'active' : 'inactive'} successfully`)
        );
    } catch (error) {
        console.error(error);
        return res.status(500).json(ApiResponse(500, error.message, 'Internal Server Error'));
    }
};

const updateEmployeeDetails = async (req, res) => {
    try {
        const adminId = req.id;
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(400).json(ApiResponse(400, null, 'Admin not found'));
        }

        const employeeId = req.params.id;
        const updateFields = req.body;
console.log(req.body)
        // Ensure that sensitive fields are not updated directly
        const restrictedFields = ['password', '_id', 'createdAt', 'updatedAt'];
        restrictedFields.forEach(field => delete updateFields[field]);

        // Update employee details
        const updatedEmployee = await Employee.findByIdAndUpdate(
            employeeId,
            updateFields,
            { new: true, runValidators: true } // `new` returns updated document, `runValidators` ensures schema validation
        );

        if (!updatedEmployee) {
            return res.status(404).json(ApiResponse(404, null, 'Employee not found'));
        }

        return res.status(200).json(
            ApiResponse(200, { updatedEmployee }, 'Employee details updated successfully')
        );
    } catch (error) {
        console.error(error);
        return res.status(500).json(ApiResponse(500, error.message, 'Internal Server Error'));
    }
};




//Search employee
const searchEmployee = async (req, res) => {
    try {

        //Requesting id from jwt token
        const adminId = req.id;
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(400).json({
                verified: false,
                message: 'Admin not found'
            });
        }

        const searchTerm = req.query.term;

        if (!searchTerm) {
            return res.status(400).json({ error: 'Search term is required' });
        }

        const pageNumber = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 12;

        const regex = new RegExp(searchTerm, 'i');

        const options = {
            page: pageNumber,
            limit: pageSize,
            select: '-password',
        };

        const result = await Employee.paginate({
            $or: [
                { name: { $regex: regex } },
            ]
        }, options);

        const employeesWithImageURLs = result.docs.map(employee => {
            const imageURL = getImageURL(employee.image);
            return { ...employee._doc, imageURL };
        });

        const response = {
            employee: employeesWithImageURLs,
            totalItems: result.totalDocs,
            currentPage: result.page,
            totalPages: result.totalPages,
        };

        return res.status(200).json(response);

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

//Project assign
const projectassign = async (req, res) => {
    try {
        const adminId = req.id;

        // Check if the user is an admin
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(400).json(ApiResponse(400, null, 'Not Admin'));
        }

        const { projectName, projectDescription } = req.body;

        // Validate required fields
        if (!projectName || !projectDescription) {
            return res.status(400).json(ApiResponse(400, null, 'Project name and description are required.'));
        }

        // Create a new project
        const project = new Project({
            projectName,
            projectDescription,
        });

        await project.save();

        return res.status(200).json(ApiResponse(200, project, 'Project created successfully.'));
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json(ApiResponse(500, error.message, 'Internal server error.'));
    }
};

//Add employee to project
const updateProject = async (req, res) => {
    try {
        const { projectId, projectName, projectDescription, employees } = req.body;

        if (!projectId) {
            return res.status(400).json(ApiResponse(400, null, 'Project ID is required for updating.'));
        }

        // Build the update object dynamically based on the provided fields
        const updateFields = {};

        if (projectName) {
            updateFields.projectName = projectName;
        }
        if (projectDescription) {
            updateFields.projectDescription = projectDescription;
        }

        if (employees && Array.isArray(employees)) {
            // Fetch the current project to manage the employees list
            const currentProject = await Project.findById(projectId);
            if (!currentProject) {
                return res.status(404).json(ApiResponse(404, null, 'Project not found.'));
            }

            // Extract employee IDs from the incoming and current lists
            const incomingEmployeeIds = employees.map(emp => emp._id.toString());
            const currentEmployeeIds = currentProject.Employeelist.map(emp => emp._id.toString());

            // Determine employees to add and remove
            const employeesToAdd = employees.filter(emp => !currentEmployeeIds.includes(emp._id));
            const employeesToRemove = currentEmployeeIds.filter(empId => !incomingEmployeeIds.includes(empId));

            // Update the project
            if (employeesToAdd.length > 0) {
                updateFields.$push = {
                    Employeelist: { $each: employeesToAdd },
                };
            }

            if (employeesToRemove.length > 0) {
                updateFields.$pull = {
                    Employeelist: { _id: { $in: employeesToRemove } },
                };
            }
        }

        // Update the project in the database
        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            updateFields,
            { new: true } // Return the updated document
        );

        if (!updatedProject) {
            return res.status(404).json(ApiResponse(404, null, 'Project not found.'));
        }

        return res.status(200).json(ApiResponse(200, updatedProject, 'Project updated successfully.'));
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json(ApiResponse(500, error.message, 'Internal server error.'));
    }
};

const deleteProject = async (req, res) => {
    try {
        // Get the admin ID from the JWT token
        const adminId = req.id;

        // Check if the user is an admin
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: Only admins can delete projects.',
            });
        }

        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: 'Project ID is required.',
            });
        }

        // Find and delete the project
        const deletedProject = await Project.findByIdAndDelete(projectId);

        if (!deletedProject) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Project deleted successfully.',
            data: deletedProject, // Optionally return the deleted project
        });
    } catch (error) {
        console.error('Error deleting project:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
            error: error.message,
        });
    }
};

const getAllProjects = async (req, res) => {
    try {
        const pageNumber = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10; // Adjust the pageSize as per your requirement

        // Fetch paginated projects
        const projects = await Project.find()
            .skip((pageNumber - 1) * pageSize)
            .limit(pageSize)
            .exec();

        const totalItems = await Project.countDocuments();

        // Process each project to calculate the number of employees and tasks
        const formattedProjects = await Promise.all(
            projects.map(async (project) => {
                const taskCount = await Task.countDocuments({ projectId: project._id });
                return {
                    ...project.toObject(),
                    Employees: project.Employeelist.length,
                    Tasks: taskCount, // Add the task count here
                };
            })
        );

        res.status(200).json(ApiResponse(200, {
            projects: formattedProjects,
            totalItems,
            currentPage: pageNumber,
            totalPages: Math.ceil(totalItems / pageSize),
        }, 'Projects fetched successfully.'));
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json(ApiResponse(500, error.message, 'Internal server error.'));
    }
};


const getAutoEmployee = async (req, res) => {
    const query = req.query.q; // Get the input query from the request query parameters
    if (!query) {
        return res.status(400).json(ApiResponse(400, 'Query parameter "q" is required', 'Query parameter "q" is required.'));
    }

    try {
        // Find employees whose names contain the input query
        const filteredEmployees = await Employee.find({
            name: { $regex: query, $options: 'i' } // 'i' for case-insensitive matching
        });

        // Map the filtered employees to send name and id with different keys
        const formattedEmployees = filteredEmployees.map(employee => ({
            id: employee._id,
            employeeName: employee.name
        }));

        res.json(ApiResponse(200, formattedEmployees, 'Employees fetched successfully.'));
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json(ApiResponse(500, error.message, 'Internal server error.'));
    }
};

const getAllEmployeesList = async (req, res) => {
    try {
        // Fetch all employees from the database
        const allEmployees = await Employee.find();

        // Map employees to return only id and employeeName
        const formattedEmployees = allEmployees.map(employee => ({
            _id: employee._id,
            employeeName: employee.name
        }));

        // Return the list of formatted employees
        res.json(ApiResponse(200, formattedEmployees, 'Employees fetched successfully.'));
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json(ApiResponse(500, error.message, 'Internal server error.'));
    }
};

// Controller to create a new task
const assignTask = async (req, res) => {
    try {
        const { employeeId, projectId, taskDetails, description } = req.body;

        // Get the admin id from jwt token
        const adminId = req.id;
        // Check if the user is an admin
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(400).send({
                success: false,
                message: 'Not Admin'
            });
        }

        // Create the new task with the description
        const newTask = new Task({
            employeeId: employeeId,
            projectId: projectId,
            taskDetails: taskDetails,
            description: description || '', // Add description or default to an empty string
            assignedBy: admin._id,
        });

        const savedTask = await newTask.save();

        // Populate employee details (name) and comments with user name in the saved task
        const populatedTask = await Task.findById(savedTask._id)
            .populate({
                path: 'employeeId',
                select: 'name', // Only fetch the name field for employee
            })
            .populate({
                path: 'comments.userId', // Populate the userId of the comment
                select: 'name', // Only fetch the name field for the user
            });

        // Check if the employeeId is populated correctly
        if (populatedTask && populatedTask.employeeId) {
            // Add the employeeName field manually from the populated employeeId
            populatedTask.employeeName = populatedTask.employeeId.name;
        }

        // Send the response with the additional employeeName field
        return res.status(200).send({
            success: true,
            savedTask: populatedTask
        });
    } catch (error) {
        console.log(error)
        return res.status(500).send({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
};


// Controller to get all tasks
const getAllTasks = async (req, res) => {
    try {
        // Get the admin id from jwt token
        const adminId = req.id;
        // Check if the user is an admin
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(400).send(
                ApiResponse(400, null, 'Not Admin') // Using ApiResponse
            );
        }

        const { projectId } = req.query;  // Get projectId from query parameters

        // Ensure projectId is provided
        if (!projectId) {
            return res.status(400).send(
                ApiResponse(400, null, 'Project ID is required') // Using ApiResponse
            );
        }

        // Fetch tasks for the given projectId
        const tasks = await Task.find({ projectId: projectId });

        // Extract employee and admin details from the comments
        const commentUserIds = tasks.flatMap(task => task.comments.map(comment => comment.userId));
        const uniqueUserIds = [...new Set(commentUserIds)];  // Remove duplicate userIds

        // Fetch employees and admins by their ids
        const employees = await Employee.find({ _id: { $in: uniqueUserIds } });
        const admins = await Admin.find({ _id: { $in: uniqueUserIds } });

        // Create a map for quick lookup of user names (from both Employee and Admin collections)
        const userNameMap = {};

        employees.forEach(employee => {
            userNameMap[employee._id.toString()] = employee.name;
        });

        admins.forEach(admin => {
            userNameMap[admin._id.toString()] = admin.name;
        });

        // Format tasks with populated comment details
        const tasksWithDetails = await Promise.all(tasks.map(async (task) => {
            const taskObject = task.toObject(); // Convert task to a plain object

            // Fetch employee name from Employee collection
            const employee = task.employeeId ? await Employee.findById(task.employeeId) : null;
            taskObject.employeeName = employee ? employee.name : 'Unknown Employee';

            // Fetch admin name from Admin collection
            const assignedByAdmin = task.assignedBy ? await Admin.findById(task.assignedBy) : null;
            taskObject.assignedByName = assignedByAdmin ? assignedByAdmin.name : 'Unknown Admin';

            // Add names to each comment in the task
            taskObject.comments = task.comments.map(comment => {
                const commentObject = { ...comment.toObject() };

                // Check if the userId exists in the userNameMap and add the name to the comment
                commentObject.userName = userNameMap[comment.userId.toString()] || 'Unknown User';

                return commentObject;
            });

            // Ensure IDs are in string format
            taskObject._id = task._id.toString();
            taskObject.projectId = task.projectId.toString();
            taskObject.employeeId = task.employeeId ? task.employeeId.toString() : null;

            return taskObject;
        }));

        return res.status(200).json(
            ApiResponse(200, tasksWithDetails, 'Tasks fetched successfully') // Using ApiResponse
        );
    } catch (error) {
        console.log(error);
        return res.status(500).json(
            ApiResponse(500, error.message, 'Internal server error') // Using ApiResponse
        );
    }
};


// Controller to get a single task by ID
const getTaskById = async (req, res) => {
    try {

        // Get the admin id from jwt token
        const adminId = req.id;
        // Check if the user is an admin
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(400).send({
                success: false,
                message: 'Not Admin'
            });
        }
        console.log(req.params.id)
        const task = await Task.find({ employeeId: req.params.id });

console.log(task)
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.status(200).json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Controller to update a task by ID
const updateTaskById = async (req, res) => {
    try {
        // Get the admin ID from JWT token
        const adminId = req.id;

        // Check if the user is an admin
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(400).send({
                success: false,
                message: 'Not Admin',
            });
        }

        const { status, comment } = req.body; // Get status and comment from the request body

        // Find the task by ID
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found',
            });
        }

        // Update the status if provided
        if (status) {
            if (!['Not Started', 'In Progress', 'Completed'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status value',
                });
            }
            task.status = status;
        }

        // Add a comment if provided
        if (comment) {
            task.comments.push({
                text: comment,
                userId: admin._id, // Use the admin's ID for now
            });
        }

        // Save the updated task
        const updatedTask = await task.save();

        res.status(200).json({
            success: true,
            message: 'Task updated successfully',
            data: updatedTask,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// Controller to delete a task by ID
const deleteTaskById = async (req, res) => {
    try {

        // Get the admin id from jwt token
        const adminId = req.id;
        // Check if the user is an admin
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(400).send({
                success: false,
                message: 'Not Admin'
            });
        }

        const deletedTask = await Task.findByIdAndDelete(req.params.id);

        if (!deletedTask) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getLoggedInEmployeeDetails = async (req, res) => {
    try {
        const adminId = req.id;
        // Check if the user is an admin
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(400).send({
                success: false,
                message: 'Not Admin'
            });
        }

        // Find login records where logoutTime is null
        const loggedInEmployees = await LoginLogout.find({ logoutTime: { $eq: null } })
            .populate('userId', 'name')  // Populate the userId field to get employee details like name
            .exec();

        // If no logged-in employees are found, return a response indicating no records
        if (loggedInEmployees.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No employees are currently logged in'
            });
        }

        // Group the login records by userId and keep the latest login record for each employee
        const latestLoginRecords = {};

        loggedInEmployees.forEach(record => {
            // If the employee is not in the object or if the current login is more recent, update the record
            if (!latestLoginRecords[record.userId._id] || record.loginTime > latestLoginRecords[record.userId._id].loginTime) {
                latestLoginRecords[record.userId._id] = {
                    employeeId: record.userId._id,
                    name: record.userId.name,
                    loginTime: record.loginTime,
                };
            }
        });

        // Convert the grouped object into an array of employee details
        const employeeDetails = Object.values(latestLoginRecords);

        // Return the list of logged-in employees (latest only)
        return res.status(200).json({
            success: true,
            data: employeeDetails
        });
    } catch (error) {
        console.error('Error fetching logged-in employee details:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching employee details',
            error: error.message
        });
    }
};

const getEmployeeWorkSessions = async (req, res) => {
    const { month, year } = req.body;

    // Validate input
    if (!month || !year) {
        return res.status(400).json(ApiResponse(400, null, 'Please provide month and year.'));
    }

    try {
        // Convert month and year to a start and end date
        const startDate = new Date(year, month - 1, 1); // Month is 0-indexed in JavaScript (January is 0)
        const endDate = new Date(year, month, 0); // Last day of the given month

        // Query to find all login/logout records for all employees within the given month
        const workSessions = await LoginLogout.find({
            loginTime: { $gte: startDate, $lte: endDate }
        }).populate('userId').exec(); // Populating employee details

        // If no records found, return an appropriate message
        if (workSessions.length === 0) {
            return res.status(404).json(ApiResponse(404, null, 'No work sessions found for employees in the specified month.'));
        }

        // Initialize total work duration
        let totalWorkDuration = 0;

        // Create an array to store work session details grouped by employee
        const employeesWorkSessions = [];

        // Group work sessions by employee and calculate work duration
        workSessions.forEach(session => {
            const loginTime = session.loginTime;
            const logoutTime = session.logoutTime ? session.logoutTime : 'Not Logged Out';
            const duration = session.logoutTime ? (new Date(session.logoutTime) - new Date(session.loginTime)) : null;

            // Calculate the total work duration for each employee
            if (duration) {
                totalWorkDuration += duration;
            }

            const employeeIndex = employeesWorkSessions.findIndex(emp => emp.employeeName === session.userId.name);

            if (employeeIndex >= 0) {
                // Add session data for existing employee
                employeesWorkSessions[employeeIndex].sessions.push({
                    loginTime,
                    logoutTime,
                    duration: duration ? `${Math.floor(duration / 3600000)} hours ${Math.floor((duration % 3600000) / 60000)} minutes` : null
                });
                // Add duration to total work time for that employee
                employeesWorkSessions[employeeIndex].totalWorkDuration += duration;
            } else {
                // Add new employee with initial session data
                employeesWorkSessions.push({
                    employeeName: session.userId.name,
                    sessions: [{
                        loginTime,
                        logoutTime,
                        duration: duration ? `${Math.floor(duration / 3600000)} hours ${Math.floor((duration % 3600000) / 60000)} minutes` : null
                    }],
                    totalWorkDuration: duration || 0
                });
            }
        });

        // Add total work time for each employee in hours and minutes
        employeesWorkSessions.forEach(emp => {
            const totalEmpWorkHours = Math.floor(emp.totalWorkDuration / 3600000);
            const totalEmpWorkMinutes = Math.floor((emp.totalWorkDuration % 3600000) / 60000);
            emp.totalWorkTime = `${totalEmpWorkHours} hours ${totalEmpWorkMinutes} minutes`;
        });

        // Convert total work duration into hours and minutes for all employees
        const totalWorkHours = Math.floor(totalWorkDuration / 3600000);
        const totalWorkMinutes = Math.floor((totalWorkDuration % 3600000) / 60000);

        // Return the work sessions with durations and total work time for each employee and overall
        return res.status(200).json(ApiResponse(200, {
            employeesWorkSessions,
            totalWorkDone: `${totalWorkHours} hours ${totalWorkMinutes} minutes`
        }, 'Work sessions fetched successfully.'));

    } catch (error) {
        console.error('Error fetching work sessions:', error);
        return res.status(500).json(ApiResponse(500, error.message, 'An error occurred while fetching work sessions.'));
    }
};

module.exports = getEmployeeWorkSessions;

const employeeloginlogoutData = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = 12;

    try {
        // Count the total number of records
        const totalRecords = await LoginLogout.countDocuments();

        // Fetch login/logout data with pagination
        const loginLogoutData = await LoginLogout.find()
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .sort({ createdAt: -1 });

        // Fetch employee details for each record
        const userIds = loginLogoutData.map(record => record.userId);
        const employees = await Employee.find({ _id: { $in: userIds } });

        // Create a map for quick employee lookups
        const employeeMap = employees.reduce((map, employee) => {
            map[employee._id] = employee;
            return map;
        }, {});

        // Transform the data
        const transformedData = loginLogoutData.map(record => {
            const employee = employeeMap[record.userId] || {};
            const durationMilliseconds = record.logoutTime ? record.logoutTime - record.loginTime : 0;
            const durationHours = Math.floor(durationMilliseconds / 3600000);
            const durationMinutes = Math.floor((durationMilliseconds % 3600000) / 60000);
            const durationSeconds = Math.floor((durationMilliseconds % 60000) / 1000);

            const formatTime = time => (time <= 9 ? `0${time}` : time);

            return {
                employeeId: record.userId,
                name: employee.name || 'Unknown',
                date: record.createdAt.toISOString().slice(0, 10).split('-').reverse().join('-'), // Format as DD-MM-YYYY
                istLoginTime: record.loginTime,
                istLogoutTime: record.logoutTime
                    ? record.logoutTime
                    : 'Not Logged Out',
                duration: record.logoutTime
                    ? `${durationHours}:${formatTime(durationMinutes)}:${formatTime(durationSeconds)}`
                    : 'N/A'
            };
        });

        // Calculate total pages
        const totalPages = Math.ceil(totalRecords / pageSize);

        // Send response with pagination metadata
        return res.status(200).json(
            ApiResponse(200, {
                data: transformedData,
                pagination: {
                    totalRecords,
                    currentPage: page,
                    pageSize,
                    totalPages
                }
            }, 'Login/logout data fetched successfully')
        );
    } catch (error) {
        console.error('Error fetching login/logout data:', error);
        return res.status(500).json(ApiResponse(500, error.message, 'Internal server error'));
    }
};



const employeeusagetime = async (req, res) => {
    const employeeId = req.params.employeeId; // Get the employee ID from request params
    try {
        const loginLogoutData = await LoginLogout.aggregate([
            { $match: { userId: employeeId } },
            { $addFields: { durationMilliseconds: { $subtract: ['$logoutTime', '$loginTime'] } } },
            { $addFields: { durationHours: { $divide: ['$durationMilliseconds', 3600000] } } },
            {
                $group: {
                    _id: null,
                    totalExploringHours: { $sum: '$durationHours' }
                }
            },
            { $project: { _id: 0, totalExploringHours: 1 } }
        ]);

        if (loginLogoutData.length === 0) {
            return res.status(404).json(ApiResponse(404, null, 'No login/logout data found for the specified employee'));
        }

        const totalExploringHours = loginLogoutData[0].totalExploringHours;
        return res.status(200).json(ApiResponse(200, { totalExploringHours }, 'Total exploring hours fetched successfully'));
    } catch (error) {
        console.error('Error fetching login/logout data:', error);
        return res.status(500).json(ApiResponse(500, error.message, 'Internal server error'));
    }
};


const uploadFile = async (req, res) => {
    try {
        const adminId = req.id;

        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(400).send({
                success: false,
                message: 'Not Admin'
            });
        }

        if (!req.file) {
            return res.status(400).json(
                ApiResponse(400, null, 'No file uploaded or incorrect file format.')
            );
        }

        const { accessibleEmployees, documentTitle } = req.body;

        let accessibleList = [];

        if (accessibleEmployees === 'all') {
            const allEmployees = await Employee.find({});
            accessibleList = allEmployees.map(emp => emp._id);
        } else {
            const departmentEmployees = await Employee.find({ department: accessibleEmployees });
            if (departmentEmployees.length === 0) {
                return res.status(400).json(
                    ApiResponse(400, null, `No employees found in the department '${accessibleEmployees}'.`)
                );
            }
            accessibleList = departmentEmployees.map(emp => emp._id);
        }

        const file = req.file;
        if (!file.filename || !file.mimetype || !file.path) {
            return res.status(400).json(
                ApiResponse(400, null, 'File information is incomplete.')
            );
        }

        const filePath = `/uploads/${file.filename}`;
        const downloadUrl = `${req.protocol}://${req.get('host')}${filePath}`; // Construct the download URL

        const newDocument = new Document({
            filename: file.filename,
            fileType: file.mimetype,
            filePath,
            uploadedBy: adminId,
            accessibleBy: accessibleList,
            documentTitle,
        });

        await newDocument.save();

        return res.status(200).json(
            ApiResponse(200, { ...newDocument.toObject(), downloadUrl }, 'File uploaded successfully!')
        );
    } catch (error) {
        console.error('Error uploading file:', error);
        return res.status(500).json(
            ApiResponse(500, error.message, 'An error occurred while uploading the file.')
        );
    }
};



const getAllDocuments = async (req, res) => {
    try {
        const adminId = req.id;

        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(400).send({
                success: false,
                message: 'Not Admin'
            });
        }

        // Fetch all documents from the database
        const documents = await Document.find({}).populate('uploadedBy', 'name email').populate('accessibleBy', 'name email');

        // If no documents are found
        if (documents.length === 0) {
            return res.status(404).json(
                ApiResponse(404, null, 'No documents found.')
            );
        }

        // Construct the server base URL
        const serverBaseUrl = `${req.protocol}://${req.get('host')}`;

        // Add the full URL for each document
        const documentsWithFullPath = documents.map((doc) => {
            return {
                ...doc.toObject(),
                downloadUrl: `${serverBaseUrl}/uploads/${doc.filename}`, // Adjust according to your file storage setup
            };
        });

        // Return the list of documents with the download URL
        return res.status(200).json(
            ApiResponse(200, documentsWithFullPath, 'Documents retrieved successfully!')
        );
    } catch (error) {
        console.error('Error retrieving documents:', error);
        // Return a response with ApiResponse for failure
        return res.status(500).json(
            ApiResponse(500, error.message, 'An error occurred while retrieving the documents.')
        );
    }
};


const deleteDocument = async (req, res) => {
    try {
        const adminId = req.id;

        // Check if the user is an admin
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(400).send({
                success: false,
                message: 'Not Admin'
            });
        }

        const { documentId } = req.params;

        // Find and delete the document by its ID
        const document = await Document.findByIdAndDelete(documentId);

        // If document not found
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        // Optional: Delete the physical file from the server (if needed)
        const filePath = path.join(__dirname, '..', 'uploads', document.filename);
        fs.unlinkSync(filePath); // Delete the file from the filesystem

        return res.status(200).json({
            success: true,
            message: 'Document deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting document:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while deleting the document'
        });
    }
};

const getStatistics = async (req, res) => {
    try {
        // Get total employees count
        const totalEmployees = await Employee.countDocuments();

        // Get total tasks count and pending tasks count
        const totalTasks = await Task.countDocuments();
        const pendingTasks = await Task.countDocuments({ status: 'Not Started' });

        // Calculate overall performance (assuming performance is based on the ratio of completed tasks)
        const completedTasks = await Task.countDocuments({ status: 'Completed' });
        const performance = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0;

        // Get the last 3 employees
        const lastEmployees = await Employee.find().sort({ createdAt: -1 }).limit(3);

        // Get the last 2 or 3 projects (adjust the number based on need)
        const lastProjects = await Project.find().sort({ createdAt: -1 }).limit(3); // You can change to 2 if needed

        // Structure the response data
        const stats = {
            totalEmployees,
            totalTasks,
            pendingTasks,
            completedTasks,
            performance: `${performance}%`,
            lastEmployees: lastEmployees.map(emp => ({
                id: emp._id,
                name: emp.name,
                position:emp.position,
                department:emp.department,
                email: emp.email,
                createdAt: new Date(emp.createdAt).toISOString().split('T')[0], // Format the date
            })),
            lastProjects: lastProjects.map(proj => ({
                id: proj._id,
                name: proj.projectName,
                createdAt: new Date(proj.createdAt).toISOString().split('T')[0], // Format the date
            }))
        };

        // Send success response
        return res.status(200).json(ApiResponse(200, stats, 'Statistics fetched successfully'));
    } catch (error) {
        console.error('Error fetching statistics:', error);
        return res.status(500).json(ApiResponse(500, error.message, 'Internal server error'));
    }
};


module.exports = {
    createAdmins,
    adminLogin,
    inviteEmployee,
    getAllEmployees,
    getEmployeeById,
    deleteEmployee,
    searchEmployee,
    projectassign,
    updateProject,
    deleteProject,
    getAllProjects,
    getAutoEmployee,
    assignTask,
    getAllTasks,
    getTaskById,
    updateTaskById,
    deleteTaskById,
    getLoggedInEmployeeDetails,
    employeeloginlogoutData,
    employeeusagetime,
    uploadFile,
    getAllDocuments,
    deleteDocument,
    getAllEmployeesList,
    getStatistics,
    getEmployeeWorkSessions,
    updateEmployeeStatus,
    updateEmployeeDetails
};


