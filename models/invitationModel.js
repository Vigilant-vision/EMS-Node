const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require('mongoose-paginate-v2');


const invitationSchema = new Schema({
    employeeEmail: {
        type: String,
        unique: true,
    },
    employeeName: {
        type: String,
        unique: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: "24h"
    },
});

invitationSchema.plugin(mongoosePaginate);
const Invitation = mongoose.model("Invitation", invitationSchema);

module.exports = { Invitation };