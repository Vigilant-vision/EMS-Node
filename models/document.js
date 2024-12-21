// models/Document.js
const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  fileType: { type: String, required: true },
  filePath: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  accessibleBy: [{ type: String }],  // Ensure this is an array of strings (employee IDs)
  documentTitle: { type: String, required: true },
  createdAt: {
    type: Date,
    default: Date.now,
 
},
});

module.exports = mongoose.model('Document', DocumentSchema);
