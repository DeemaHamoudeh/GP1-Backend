require('dotenv').config(); 
console.log('Loaded Environment Variables:', process.env);
const http = require('http');
const app = require('./app'); // Import the app
const connectDB = require('./db'); // Import the DB connection function

//const PORT = 3000;

const secretKey = process.env.JWT_SECRET;
const PORT = process.env.PORT || 3000; // Default to 3000 if PORT is not set in .env

const mongoUri = process.env.MONGO_URI;

console.log('JWT Secret:', secretKey);
console.log('App running on port:', PORT);
console.log('MongoDB URI:', mongoUri);
// Connect to the database
connectDB();
console.log("hii");
// Start the server
const server = http.createServer(app);
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
