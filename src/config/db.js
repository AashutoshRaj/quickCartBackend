import mongoose from 'mongoose';
import dns from 'node:dns';

const configureDns = () => {
  const dnsServers = process.env.DNS_SERVERS?.split(',')
    .map((server) => server.trim())
    .filter(Boolean) || ['8.8.8.8', '1.1.1.1'];

  dns.setServers(dnsServers);
};

const getMongoErrorMessage = (error) => {
  if (error.message?.includes('querySrv ECONNREFUSED')) {
    return 'MongoDB SRV DNS lookup failed. Check DNS_SERVERS, internet connection, VPN/firewall, or use a non-SRV Atlas connection string.';
  }

  if (error.message?.includes('bad auth') || error.message?.includes('Authentication failed')) {
    return 'MongoDB authentication failed. Check the username/password in MONGODB_URI and confirm the Atlas database user exists.';
  }

  if (error.message?.includes('IP that isn\'t whitelisted')) {
    return 'MongoDB connection blocked by Atlas network access. Add your current IP address in Atlas Network Access.';
  }

  return error.message;
};

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      console.warn('MONGODB_URI is missing. Continuing without database connection.');
      return null;
    }

    configureDns();
    console.log('Connecting to MongoDB...');
    const conn = await mongoose.connect(uri);
    console.log(`\x1b[32m%s\x1b[0m`, `MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`\x1b[31m%s\x1b[0m`, `Error: ${getMongoErrorMessage(error)}`);
    console.warn('Continuing without database connection.');
    return null;
  }
};

export default connectDB;
