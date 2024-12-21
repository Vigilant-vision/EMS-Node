const multer = require('multer');

// Multer configuration for file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');  // Set upload directory
    },
    filename: function (req, file, cb) {
        const fileName = Date.now() + '_' + file.originalname.replace(/\s+/g, '_');
        cb(null, fileName);  // Set unique file name
    }
});

const upload = multer({ storage: storage });

// Export the upload middleware
module.exports = upload;
