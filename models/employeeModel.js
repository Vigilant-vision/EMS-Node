const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const employeeSchema = new mongoose.Schema(
    {
        name: {
            type: String
        },
        phone: {
            type: String,
        },
        email: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
        },
        dateOfBirth: {
            type: Date,
        },
        image: {
            type: String,
        },
        aboutMe: {
            type: String,
        },
        employeeInformation: {
            employeeId: {
                type: String,
            },
            dateOfJoining: {
                type: String,
            },
            designation: {
                type: String,
            },
            typeOfEmployment: {
                type: String,
                enum: ['Full-time', 'Part-time', 'Internship'],
            },
        },
        contactInformation: {
            address: {
                type: String,
            },
            state: {
                type: String,
            },
            zipCode: {
                type: Number,
            },
            country: {
                type: String,
            },
        },
    },
    {
        timestamps: true,
    }
);

employeeSchema.plugin(mongoosePaginate);
const Employee = mongoose.model('Employee', employeeSchema);


module.exports = { Employee }