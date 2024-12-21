const express = require('express');
const upload = require("../middlewares/multerConfig");
const router = express.Router();
const {
    acceptInvitationAndSignup,
    employeeLogin,
    getInvitationNamAndEmail,
    addOrUpdateEmployeeDetails,
    getTaskForEmployee,
    updateTaskByIdemployee,
    employeeLogout,
    getTaskSummary,
    getTaskList,
    accessibleDocuments
    
} = require("../controllers/employeeController");
const verifyToken = require("../middlewares/verifyToken");


//Public routes
router.get('/get-invitation-name-and-email/:invitationId', getInvitationNamAndEmail);
router.post('/sign-up/:invitationId', acceptInvitationAndSignup);
router.post('/login', employeeLogin);
router.post('/logout',verifyToken, employeeLogout);

//Protected routes
router.post('/add-details', verifyToken, upload.single('image'), addOrUpdateEmployeeDetails);
router.get('/task-details', verifyToken, getTaskForEmployee);
router.put('/employee-task/:id', verifyToken,updateTaskByIdemployee);

router.get('/task-summary', verifyToken, getTaskSummary);
router.get('/task-list', verifyToken, getTaskList);
router.get('/accessible-documents', verifyToken, accessibleDocuments);


module.exports = router;
