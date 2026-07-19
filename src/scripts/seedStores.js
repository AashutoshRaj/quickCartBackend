import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Store from '../models/storeModel.js';

dotenv.config();

const MOCK_STORES = [
  {
    storeId: '683f8c8f2d1b4c8a9d123456',
    name: 'FreshMart Central',
    logo: 'https://via.placeholder.com/200x200?text=FreshMart',
    address: '123 Main Street, Downtown, City, State 12345',
    phoneNumber: '+1-800-FRESH-123',
    currency: 'USD',
    timezone: 'America/New_York',
    status: 'active',
  },
  {
    storeId: 'a1b2c3d4e5f6g7h8i9j0k1l2',
    name: 'Organic Oasis',
    logo: 'https://via.placeholder.com/200x200?text=Organic+Oasis',
    address: '456 Green Avenue, Eco District, City, State 54321',
    phoneNumber: '+1-800-ORGANIC-1',
    currency: 'USD',
    timezone: 'America/Los_Angeles',
    status: 'active',
  },
  {
    storeId: 'm3n4o5p6q7r8s9t0u1v2w3x4',
    name: 'Green Basket',
    logo: 'https://via.placeholder.com/200x200?text=Green+Basket',
    address: '789 Health Street, Wellness Center, City, State 98765',
    phoneNumber: '+1-800-GREEN-BASKET',
    currency: 'USD',
    timezone: 'America/Chicago',
    status: 'active',
  },
  {
    storeId: 'y5z6a7b8c9d0e1f2g3h4i5j6',
    name: 'Metro Market',
    logo: 'https://via.placeholder.com/200x200?text=Metro+Market',
    address: '321 Urban Plaza, City Center, City, State 45678',
    phoneNumber: '+1-800-METRO-MKT',
    currency: 'USD',
    timezone: 'America/Denver',
    status: 'active',
  },
  {
    storeId: 'k7l8m9n0o1p2q3r4s5t6u7v8',
    name: 'Village Grocers',
    logo: 'https://via.placeholder.com/200x200?text=Village+Grocers',
    address: '555 Community Lane, Suburban Area, City, State 23456',
    phoneNumber: '+1-800-VILLAGE-GRO',
    currency: 'USD',
    timezone: 'America/Phoenix',
    status: 'inactive',
  },
];

async function seedStores() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing stores
    await Store.deleteMany({});
    console.log('Cleared existing stores');

    // Insert mock stores
    const createdStores = await Store.insertMany(MOCK_STORES);
    console.log(`✓ Successfully seeded ${createdStores.length} stores`);

    // Display created stores
    createdStores.forEach((store) => {
      console.log(`  - ${store.name} (ID: ${store.storeId})`);
    });

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding stores:', error);
    process.exit(1);
  }
}

seedStores();
