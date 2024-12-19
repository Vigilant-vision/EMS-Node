const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    isAdmin: {
        type: Boolean,
        required: true,
        default: true,
    }
});


const Admin = mongoose.model('Admin', adminSchema, "Admin");


module.exports = { Admin }