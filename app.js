const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv").config();
const cors = require("cors");
const { createAdmins } = require("./controllers/adminController");
const connectToDatabase = require("./config/database");

const bodyParser = require('body-parser');
const app = express();

app.use(cors());

//middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));    


app.use(bodyParser.json());
const adminRoutes = require('./routes/adminRoutes');
const employeeRoutes = require('./routes/employeeRoutes');

app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/employee', employeeRoutes);


// Starting server after connecting to the database
async function startServer() {
    try {
        await connectToDatabase(); // Connect to MongoDB
        await createAdmins();

        const port = process.env.PORT || 8000;
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    } catch (error) {
        console.error(error);
    }
}

startServer();
