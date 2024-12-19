const mongoose = require("mongoose");

// Connect to MongoDB
async function connectToDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        // Handle connected event
        mongoose.connection.on('connected', () => {
            console.log('MongoDB connected');
        });

        // Handle error event
        mongoose.connection.on('error', (error) => {
            console.error('MongoDB connection error:', error);
        });
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        throw error; // Re-throw the error to handle it in the caller function
    }
}

module.exports = connectToDatabase;
