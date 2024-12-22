const express = require('express');
const {
    adminLogin,
    inviteEmployee,
    getAllEmployees,
    getEmployeeById,
    deleteEmployee,
    searchEmployee,
    projectassign,
    getAllProjects,
    getAutoEmployee,
    updateProject,
    assignTask,
    getAllEmployeesList,
    getAllTasks,
    getTaskById,
    updateTaskById,
    deleteTaskById,
    refreshToken,
    logout,
    getLoggedInEmployeeDetails,
    employeeloginlogoutData,
    uploadFile,
    getAllDocuments,
    deleteDocument,
    getStatistics
} = require("../controllers/adminController");
const verifyToken = require("../middlewares/verifyToken");
const upload = require('../middlewares/multerConfig');
const router = express.Router();


//Public routes
router.post('/login', adminLogin);


//Protected routes
router.post('/invite-employee', verifyToken, inviteEmployee);
router.get('/get-all-employees', verifyToken, getAllEmployees);
router.get('/get-employee/:id', verifyToken, getEmployeeById);
router.delete('/delete-employee/:id', verifyToken, deleteEmployee);
router.get('/search-employee', verifyToken, searchEmployee);
router.get('/employee-lists', verifyToken, getAllEmployeesList);


router.post('/project-assign', verifyToken, projectassign);
router.post('/update-project', verifyToken, updateProject);
router.get('/get-project', verifyToken, getAllProjects);
router.get('/autoemployee', verifyToken, getAutoEmployee);
router.post('/assign-task', verifyToken, assignTask);
router.get('/all-task', verifyToken, getAllTasks);
router.get('/task/:id', verifyToken, getTaskById);
router.put('/task/:id', verifyToken, updateTaskById);
router.delete('/task/:id', verifyToken, deleteTaskById);
// router.post("/", refreshToken)
// router.delete("/", logout)

router.get('/employee-logged', verifyToken, getLoggedInEmployeeDetails)
router.get('/loginlogoutdata', employeeloginlogoutData);

router.post('/upload', verifyToken, upload.single('file'), uploadFile);
router.get('/document-list', verifyToken, getAllDocuments)
router.post('/delete-document/:documentId', verifyToken, deleteDocument)

router.get('/admin-stats', verifyToken,getStatistics );

module.exports = router;
