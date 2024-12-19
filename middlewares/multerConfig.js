const multer = require('multer');

// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const fileName = Date.now() + '_' + file.originalname.replace(/\s+/g, '_');
        cb(null, fileName);
    }
});

const upload = multer({ storage: storage });

module.exports = upload;
