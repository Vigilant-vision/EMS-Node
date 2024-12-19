const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const Schema = mongoose.Schema;

const taskSchema = new Schema(
    {
        employeeId: {
            type: Schema.Types.ObjectId,  // Reference to the Employee model
            ref: 'Employee',
            required: true,
        },
        projectId: {
            type: Schema.Types.ObjectId,
            // required: true
        },
        taskDetails: {
            type: String,
            // required: true
        },
        assignedBy: {
            type: Schema.Types.ObjectId,    // Reference to the Admin model
            ref: 'Admin',
            required: true
        },
        status: {
            type: String,
            enum: ['Not Started', 'Completed', 'In Progress'],
            default: 'Not Started' // Set default status to 'Pending'
        },
    },
    {
        timestamps: true,
    }
);

taskSchema.plugin(mongoosePaginate);
const Task = mongoose.model('Task', taskSchema);


module.exports = Task;