import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    console.log(uri)
    console.log('Connecting to MongoDB...');
    const conn = await mongoose.connect(uri)
    console.log(`\x1b[32m%s\x1b[0m`, `MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`\x1b[31m%s\x1b[0m`, `Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
