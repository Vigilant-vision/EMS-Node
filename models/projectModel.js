const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require('mongoose-paginate-v2');


const projectSchema = new Schema({
    projectName: {
        type: String,

    },
    projectDescription: {
        type: String,

    },
    projectStartdate: {
        type: String,
   
    },
    Employeelist: [{
        employeeId: {
            type: Schema.Types.ObjectId,
            ref: 'Employee',
            required: true
        },
        employeeName: {
            type: String,
            required: true
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now,
     
    },
});

projectSchema.plugin(mongoosePaginate);
const Project = mongoose.model("Project", projectSchema);

module.exports = { Project };