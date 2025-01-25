const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    position: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      enum: ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'intern'],
      default: 'full-time',
    },
    active: {
      type: Boolean,
      default: true, // Default to active
    },
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt` fields
  }
);

employeeSchema.plugin(mongoosePaginate);

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee;
