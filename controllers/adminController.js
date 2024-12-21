const bcrypt = require('bcrypt');
const { Admin } = require("../models/adminModel");
const { validateLoginForAdmin, validateInvitation } = require("../validations/adminValidation");
const { Invitation } = require("../models/invitationModel");
const jwt = require('jsonwebtoken');
const sendEmail = require("../utils/sendEmail");
const { Employee } = require("../models/employeeModel");
const getImageURL = require("../utils/imageUrl");
const { Project } = require('../models/projectModel');
const Task = require('../models/taskModel');
const { generateAccessToken, generateRefreshToken } = require("../utils/generateToken");
const { verifyRefreshToken } = require("../utils/verifyRefreshToken");
const { RefreshToken } = require("../models/refreshTokenModel");
const LoginLogout = require('../models/Loginlogout');
const Document = require('../models/document');
const { default: mongoose } = require('mongoose');

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
        const admin2Exists = await Admin.findOne({ email: 'pritampatro@gmail.com' });

        if (!admin2Exists) {
            // Create the second admin
            const admin2 = new Admin({
                name: 'Pritam Patro',
                phone: '9658965896',
                email: 'pritampatro@yopmail.com',
                password: await bcrypt.hash('Pritam@123', 12),
                isAdmin: true,
            });

            await admin2.save();
            console.log('Admin 2 created successfully.');
        } else {
            console.log('Admin 2 already exists.');
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
            return res.status(400).json({
                verified: false,
                message: 'Admin not found'
            });
        }

        const { error } = validateInvitation(req.body);
        if (error)
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });

        const { employeeName, employeeEmail, password } = req.body;
        //Hashing Employee password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        let employee = await Employee.findOne({ email: employeeEmail });
        if (employee) {
            return res.status(400).json({
                success: false,
                message: `Employee already exists`
            });
        }

        let invitation = await Invitation.findOne({ employeeEmail: employeeEmail });
        if (invitation) {
            // If an invitation already exists, delete the existing invitation
            await Invitation.findByIdAndDelete(invitation._id);
        }

        invitation = new Employee({
            name:employeeName,
            email:employeeEmail,
            password:hashedPassword
        });

        await invitation.save();

        // Include email and password in the invitation email
        const emailContent = `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px;">
            <h2>Welcome to Our Platform!</h2>
            <p>Your account has been created by the admin. Here are your login credentials:</p>
            <p><strong>Email:</strong> ${employeeEmail}</p>
            <p><strong>Password:</strong> ${password}</p>
        
            <p>If you did not expect this email, please contact your admin immediately.</p>
            <p style="margin-top: 30px;">Best Regards,<br>VVS</p>
        </div>
        `;

        await sendEmail(employeeEmail, "Account Created by Admin", emailContent);

        return res.status(200).json({
            success: true,
            message: `Invitation sent successfully to ${employeeEmail}`,
            employeename: employeeName,
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


//Get all employees
const getAllEmployees = async (req, res) => {
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
        const pageNumber = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 5;
        const options = {
            page: pageNumber,
            limit: pageSize,
            select: '-password',
        };

        // Use the `paginate` method directly on the model
        const result = await Employee.paginate({}, options);

        const employeesWithImageURLs = result.docs.map(employee => {
            const imageURL = getImageURL(employee.image);
            return { ...employee._doc, imageURL };
        });

        const response = {
            employees: employeesWithImageURLs,
            totalItems: result.totalDocs,
            currentPage: result.page,
            totalPages: result.totalPages,
        };

        return res.status(200).json(response);
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
//

const getpendingInvites = async (req, res) => {
    try {
        // Requesting id from jwt token
        const adminId = req.id;
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(400).json({
                verified: false,
                message: 'Admin not found'
            });
        }

        const pageNumber = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 5;
        const options = {
            page: pageNumber,
            limit: pageSize,
            select: '-password',
        };

        // Use the `paginate` method directly on the model
        const employeeResult = await Employee.paginate({}, options);
        const invitationResult = await Invitation.paginate({}, options);

        const employeesWithImageURLs = employeeResult.docs.map(employee => {
            const imageURL = getImageURL(employee.image);
            return { ...employee._doc, imageURL, status: 'accepted' }; // Add status field for accepted employees
        });

        const invitationsWithStatus = invitationResult.docs.map(invitation => {
            return { ...invitation._doc, status: 'pending' }; // Add status field for pending invitations
        });

        const response = {
            employees: employeesWithImageURLs.concat(invitationsWithStatus), // Combine employees and invitations
            totalItems: employeeResult.totalDocs + invitationResult.totalDocs,
            currentPage: employeeResult.page,
            totalPages: employeeResult.totalPages + invitationResult.totalPages,
        };

        return res.status(200).json(response);
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
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
        //Find the broker and delete
        const employee = await Employee.findByIdAndDelete(employeeId);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Employee deleted successfully',
            deleteEmployee: employee
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
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
        const { projectName, startDate, assignedTo, deleteProject } = req.body;

        if (deleteProject) {
            // If deleteProject key is provided, delete the project based on the project ID
            const projectId = req.body.projectId;
            const deletedProject = await Project.findByIdAndDelete(projectId);

            if (!deletedProject) {
                return res.status(404).json({ error: 'Project not found' });
            }

            return res.status(200).json({ message: 'Project deleted successfully', project: deletedProject });
        }

        // If deleteProject key is not provided, proceed with assigning/updating the project
        if (!req.body.projectId) {
            // If project ID is not provided, create a new project
            const project = new Project({
                projectName: projectName,
                projectStartdate: startDate,
                Employeelist: assignedTo,
            });

            await project.save();
            return res.status(200).json({ message: 'Project assigned successfully', project });
        } else {
            // If project ID is provided, update the existing project
            const projectId = req.body.projectId;
            const updatedProject = await Project.findByIdAndUpdate(projectId, {
                projectName: projectName,
                projectStartdate: startDate,
                Employeelist: assignedTo,
            }, { new: true });

            if (!updatedProject) {
                return res.status(404).json({ error: 'Project not found' });
            }

            return res.status(200).json({ message: 'Project updated successfully', project: updatedProject });
        }
    } catch (error) {
        console.error('Error assigning/updating project:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
//Add employee to project
const addemployeetoproject = async (req, res) => {
    try {
        const { employeeId, employeeName, projectId } = req.body;

        if (!projectId) {
            return res.status(400).json({ error: 'Project ID is required for updating' });
        }

        const updatedProject = await Project.findByIdAndUpdate(projectId, {
            $push: { Employeelist: { employeeId: employeeId, employeeName: employeeName } }
        }, { new: true });

        if (!updatedProject) {
            return res.status(404).json({ error: 'Project not found' });
        }

        return res.status(200).json({ message: 'Employee added to project successfully', project: updatedProject });
    } catch (error) {
        console.error('Error adding employee to project:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};




const getAllProjects = async (req, res) => {
    try {
        const pageNumber = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10; // Adjust the pageSize as per your requirement

        const projects = await Project.find()
            .skip((pageNumber - 1) * pageSize)
            .limit(pageSize)
            .exec();

        const totalItems = await Project.countDocuments();

        // Calculate the number of employees for each project
        for (let i = 0; i < projects.length; i++) {
            const project = projects[i];
            const employeeCount = project.Employeelist.length;
            project.Employes = employeeCount;
            // Remove the Employeelist field from the project object
            delete project.Employeelist;
        }

        res.status(200).json({
            projects,
            totalItems,
            currentPage: pageNumber,
            totalPages: Math.ceil(totalItems / pageSize)
        });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getAllProjects
};


const getprojectbyId = async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.status(200).json(project);
    } catch (error) {
        console.error('Error fetching project details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const getautoemployee = async (req, res) => {
    console.log(req.query.q);
    const query = req.query.q; // Get the input query from the request query parameters
    if (!query) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    try {
        // Find employees whose names contain the input query
        const filteredEmployees = await Employee.find({
            name: { $regex: query, $options: 'i' } // 'i' for case-insensitive matching
        });
        console.log(filteredEmployees)
        // Map the filtered employees to send name and id with different keys
        const formattedEmployees = filteredEmployees.map(employee => ({
            id: employee._id,
            employeeName: employee.name
        }));

        res.json(formattedEmployees);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
// Controller to create a new task
const assignTask = async (req, res) => {
    try {
        const { employeeId, projectId, taskDetails } = req.body;

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

        const newTask = new Task({
            employeeId: employeeId,
            projectId: projectId,
            taskDetails: taskDetails,
            assignedBy: admin._id,
        });

        const savedTask = await newTask.save();

        return res.status(200).send({
            success: true,
            savedTask: savedTask
        });
    } catch (error) {
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
            return res.status(400).send({
                success: false,
                message: 'Not Admin'
            });
        }

        const tasks = await Task.find();

        return res.status(200).json({
            success: true,
            tasks: tasks
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
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
        console.log(req.id)
        const { id } = req;
        const employee = await Employee.findById(id);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        res.status(200).json(employee);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
const employeeloginlogoutData = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = 12;

  try {
    // Aggregate query to fetch login/logout data for all employees
    const loginLogoutData = await LoginLogout.aggregate([
      {
        $lookup: {
          from: 'employees', // Assuming your employees collection is named 'employees'
          localField: 'userId',
          foreignField: '_id',
          as: 'employee'
        }
      },
      {
        $unwind: '$employee'
      },
      {
        $addFields: {
          istLoginTime: {
            $dateToString: {
              format: '%Y-%m-%dT%H:%M:%S.%L%z',
              date: { $add: ['$loginTime', 19800000] } // Adding 5 hours and 30 minutes (19800000 milliseconds) to convert from UTC to IST
            }
          },
          istLogoutTime: {
            $dateToString: {
              format: '%Y-%m-%dT%H:%M:%S.%L%z',
              date: { $add: ['$logoutTime', 19800000] } // Adding 5 hours and 30 minutes (19800000 milliseconds) to convert from UTC to IST
            }
          },
          durationMilliseconds: { $subtract: ['$logoutTime', '$loginTime'] } // Calculate the duration in milliseconds
        }
      },
      {
        $addFields: {
          durationHours: { $floor: { $divide: ['$durationMilliseconds', 3600000] } }, // Calculate the duration in hours
          durationMinutes: { $floor: { $divide: [{ $subtract: ['$durationMilliseconds', { $multiply: [{ $floor: { $divide: ['$durationMilliseconds', 3600000] } }, 3600000] }] }, 60000] } }, // Calculate the remaining minutes
          durationSeconds: { $floor: { $divide: [{ $subtract: ['$durationMilliseconds', { $multiply: [{ $floor: { $divide: ['$durationMilliseconds', 60000] } }, 60000] }] }, 1000] } } // Calculate the remaining seconds
        }
      },
      {
        $project: {
          _id: 0,
          employeeId: '$userId',
          name: '$employee.name',
          date: { $dateToString: { format: '%d-%m-%Y', date: '$loginTime' } },
          istLoginTime: {
            $substr: ['$istLoginTime', 11, 8] // Extracting the time portion (HH:mm:ss) from the IST login time
          },
          istLogoutTime: {
            $substr: ['$istLogoutTime', 11, 8] // Extracting the time portion (HH:mm:ss) from the IST logout time
          },
          duration: {
            $concat: [
              { $toString: '$durationHours' },
              ':',
              { $toString: { $cond: [{ $lte: ['$durationMinutes', 9] }, { $concat: ['0', { $toString: '$durationMinutes' }] }, { $toString: '$durationMinutes' }] } },
              ':',
              { $toString: { $cond: [{ $lte: ['$durationSeconds', 9] }, { $concat: ['0', { $toString: '$durationSeconds' }] }, { $toString: '$durationSeconds' }] } }
            ]
          }
        }
      },
      {
        $skip: (page - 1) * pageSize
      },
      {
        $limit: pageSize
      }
    ]);

    res.status(200).json({ success: true, data: loginLogoutData });
  } catch (error) {
    console.error('Error fetching login/logout data:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


const employeeusagetime = async (req, res) => {
  const employeeId = req.params.employeeId; // Get the employee ID from request params
  try {
    // Aggregate query to fetch login/logout data for the specified employee ID
    const loginLogoutData = await LoginLogout.aggregate([
      {
        $match: { userId: employeeId } // Filter login/logout data for the specified employee ID
      },
      {
        $addFields: {
          durationMilliseconds: { $subtract: ['$logoutTime', '$loginTime'] } // Calculate the duration in milliseconds
        }
      },
      {
        $addFields: {
          durationHours: { $divide: ['$durationMilliseconds', 3600000] } // Calculate the duration in hours
        }
      },
      {
        $group: {
          _id: null,
          totalExploringHours: { $sum: '$durationHours' } // Calculate the total exploring hours for the employee
        }
      },
      {
        $project: {
          _id: 0,
          totalExploringHours: 1 // Include only the total exploring hours in the response
        }
      }
    ]);

    if (loginLogoutData.length === 0) {
      res.status(404).json({ success: false, message: 'No login/logout data found for the specified employee' });
      return;
    }

    const totalExploringHours = loginLogoutData[0].totalExploringHours;
    res.status(200).json({ success: true, totalExploringHours: totalExploringHours });
  } catch (error) {
    console.error('Error fetching login/logout data:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send({
                success: false,
                message: 'No file uploaded or incorrect file format.',
            });
        }

        const { accessibleEmployees, documentTitle } = req.body; // Get data from request body
        const adminId = req.id;

        // Parse accessibleEmployees to ensure it's an array
        let parsedEmployees = JSON.parse(accessibleEmployees);

        // If accessibleEmployees is an array of arrays, flatten it
        if (Array.isArray(parsedEmployees) && Array.isArray(parsedEmployees[0])) {
            parsedEmployees = parsedEmployees.flat();  // Flatten the nested array
        }

        // Ensure accessibleEmployees is a flat array
        if (!Array.isArray(parsedEmployees)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid accessibleEmployees format. Expected an array.',
            });
        }

        // Check if the user is an admin
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(400).send({
                success: false,
                message: 'Not Admin',
            });
        }

        const file = req.file; // The uploaded file
        if (!file.filename || !file.mimetype || !file.path) {
            return res.status(400).send({
                success: false,
                message: 'File information is incomplete.',
            });
        }

        // Save the file to the database (Document model)
        const filePath = `/uploads/${file.filename}`; // Adjust the path as needed

        const newDocument = new Document({
            filename: file.filename,
            fileType: file.mimetype,
            filePath,
            uploadedBy: adminId,
            accessibleBy: parsedEmployees, // Store parsed employees (flat array)
            documentTitle,
        });

        await newDocument.save();

        res.status(200).json({
            success: true,
            message: 'File uploaded successfully!',
            document: newDocument,
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
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
    getpendingInvites,
    projectassign,
    addemployeetoproject,
    getAllProjects,
    getprojectbyId,
    getautoemployee,
    assignTask,
    getAllTasks,
    getTaskById,
    updateTaskById,
    deleteTaskById,
    getLoggedInEmployeeDetails,
    employeeloginlogoutData,
    employeeusagetime,
    uploadFile
};

