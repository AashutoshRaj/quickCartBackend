import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';
dotenv.config();

// Handle Uncaught Exceptions
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});


// Connect to Database
connectDB();

const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`\x1b[36m%s\x1b[0m`, `Server is running on port ${port}...`);
});

// Handle Unhandled Rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
