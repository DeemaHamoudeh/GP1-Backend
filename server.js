const http = require('http');
const app = require('./app'); // Import the app
const connectDB = require('./db'); // Import the DB connection function

const PORT = 3000;

// Connect to the database
connectDB();

// Start the server
const server = http.createServer(app);
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
