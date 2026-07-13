import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';

const port = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
  } catch (error) {
    console.warn('MongoDB connection failed, continuing without database for now.', error.message);
  }

  const server = app.listen(port, () => {
    console.log(`\x1b[36m%s\x1b[0m`, `Server is running on port ${port}...`);
  });

  process.on('uncaughtException', (err) => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    server.close(() => process.exit(1));
  });

  process.on('unhandledRejection', (err) => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    server.close(() => process.exit(1));
  });
};

startServer();
