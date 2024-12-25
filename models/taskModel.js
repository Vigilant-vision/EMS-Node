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
            ref: 'Project', // Assuming there's a Project model for reference
        },
        taskDetails: {
            type: String,
            required: true, // Ensure taskDetails is always provided
        },
        description: {
            type: String, // New field for task description
            required: false, // Optional field
        },
        assignedBy: {
            type: Schema.Types.ObjectId,    // Reference to the Admin model
            ref: 'Admin',
            required: true,
        },
        status: {
            type: String,
            enum: ['Not Started', 'Completed', 'In Progress'],
            default: 'Not Started', // Default status
        },
        comments: [
            {
                text: { type: String, required: true },  // Comment text
                createdAt: { type: Date, default: Date.now },  // Timestamp
                userId: { type: Schema.Types.ObjectId}, // ID of the user who commented
            }
        ]
    },
    {
        timestamps: true, // Automatically manage createdAt and updatedAt
    }
);

taskSchema.plugin(mongoosePaginate);
const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
