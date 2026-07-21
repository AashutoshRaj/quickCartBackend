import 'dotenv/config';
import app from './app.ts';
import connectDB from './config/db.ts';

const port = process.env.PORT || 5000;

/**
 * Start the Express server
 * Connects to MongoDB and handles uncaught exceptions
 */
const startServer = async (): Promise<void> => {
  try {
    await connectDB();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('MongoDB connection failed, continuing without database for now.', errorMessage);
  }

  const server = app.listen(port, () => {
    console.log(`\x1b[36m%s\x1b[0m`, `Server is running on port ${port}...`);
  });

  process.on('uncaughtException', (err: Error) => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    server.close(() => process.exit(1));
  });

  process.on('unhandledRejection', (err: Error) => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    server.close(() => process.exit(1));
  });
};

startServer();
