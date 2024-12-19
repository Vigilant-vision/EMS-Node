const express = require('express');
const {
    adminLogin,
    inviteEmployee,
    getAllEmployees,
    getEmployeeById,
    deleteEmployee,
    searchEmployee,
    getpendingInvites,
    projectassign,
    getAllProjects,
    getprojectbyId,
    getautoemployee,
    addemployeetoproject,
    assignTask,
    getAllTasks,
    getTaskById,
    updateTaskById,
    deleteTaskById,
    refreshToken,
    logout,
    getLoggedInEmployeeDetails,
    employeeloginlogoutData
} = require("../controllers/adminController");
const verifyToken = require("../middlewares/verifyToken");
const router = express.Router();


//Public routes
router.post('/login', adminLogin);
router.get('/loginlogoutdata', employeeloginlogoutData);


//Protected routes
router.post('/invite-employee', verifyToken, inviteEmployee);
router.get('/get-pending-invite', verifyToken, getpendingInvites);
router.get('/get-all-employees', verifyToken, getAllEmployees);
router.get('/get-employee/:id', verifyToken, getEmployeeById);
router.delete('/delete-employee/:id', verifyToken, deleteEmployee);
router.get('/search-employee', verifyToken, searchEmployee);
router.post('/project-assign', verifyToken, projectassign);
router.post('/addemployeetoproject', verifyToken, addemployeetoproject);
router.get('/get-project', verifyToken, getAllProjects);
router.get('/getprojectbyId/:projectId', verifyToken, getprojectbyId);
router.get('/autoemployee', verifyToken, getautoemployee);
router.post('/assign-task', verifyToken, assignTask);
router.get('/all-task', verifyToken, getAllTasks);
router.get('/task/:id', verifyToken, getTaskById);
router.put('/task/:id', verifyToken, updateTaskById);
router.delete('/task/:id', verifyToken, deleteTaskById);
// router.post("/", refreshToken)
// router.delete("/", logout)

router.get('/employee-logged', verifyToken, getLoggedInEmployeeDetails)



module.exports = router;
