import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../models/orderModel.js';
import User from '../models/userModel.js';

dotenv.config();

const MOCK_ORDERS = (customerId) => [
  {
    customerId,
    sessionId: `session-${Date.now()}-1`,
    storeName: 'FreshMart Central',
    storeAddress: '123 Main Street, Downtown, City, State 12345',
    items: [
      {
        productId: 'prod-1',
        name: 'Organic Avocado',
        quantity: 3,
        price: 3.99,
        unitPrice: 3.99,
        subtotal: 11.97,
      },
      {
        productId: 'prod-2',
        name: 'Whole Grain Bread',
        quantity: 2,
        price: 4.50,
        unitPrice: 4.50,
        subtotal: 9.00,
      },
      {
        productId: 'prod-3',
        name: 'Premium Arabica Coffee',
        quantity: 1,
        price: 12.99,
        unitPrice: 12.99,
        subtotal: 12.99,
      },
      {
        productId: 'prod-4',
        name: 'Almond Milk 1L',
        quantity: 2,
        price: 5.99,
        unitPrice: 5.99,
        subtotal: 11.98,
      },
    ],
    subtotal: 45.94,
    tax: 4.59,
    discount: 2.0,
    total: 48.53,
    status: 'completed',
    paymentMethod: 'card',
    paymentStatus: 'completed',
    completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    customerId,
    sessionId: `session-${Date.now()}-2`,
    storeName: 'Organic Oasis',
    storeAddress: '456 Green Avenue, Wellness District, City, State 54321',
    items: [
      {
        productId: 'prod-5',
        name: 'Organic Spinach',
        quantity: 1,
        price: 3.50,
        unitPrice: 3.50,
        subtotal: 3.50,
      },
      {
        productId: 'prod-6',
        name: 'Free-Range Eggs (Dozen)',
        quantity: 2,
        price: 8.99,
        unitPrice: 8.99,
        subtotal: 17.98,
      },
      {
        productId: 'prod-7',
        name: 'Greek Yogurt',
        quantity: 3,
        price: 6.50,
        unitPrice: 6.50,
        subtotal: 19.50,
      },
    ],
    subtotal: 40.98,
    tax: 4.10,
    discount: 0,
    total: 45.08,
    status: 'completed',
    paymentMethod: 'upi',
    paymentStatus: 'completed',
    completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    customerId,
    sessionId: `session-${Date.now()}-3`,
    storeName: 'Daily Grocer',
    storeAddress: '789 Market Lane, Shopping District, City, State 98765',
    items: [
      {
        productId: 'prod-8',
        name: 'Milk 2L',
        quantity: 2,
        price: 4.99,
        unitPrice: 4.99,
        subtotal: 9.98,
      },
      {
        productId: 'prod-9',
        name: 'Butter 200g',
        quantity: 1,
        price: 5.99,
        unitPrice: 5.99,
        subtotal: 5.99,
      },
    ],
    subtotal: 15.97,
    tax: 1.60,
    discount: 0,
    total: 17.57,
    status: 'completed',
    paymentMethod: 'card',
    paymentStatus: 'completed',
    completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
  },
  {
    customerId,
    sessionId: `session-${Date.now()}-4`,
    storeName: 'FreshMart East',
    storeAddress: '321 East Boulevard, East Side, City, State 11111',
    items: [
      {
        productId: 'prod-10',
        name: 'Tomatoes (1kg)',
        quantity: 2,
        price: 2.99,
        unitPrice: 2.99,
        subtotal: 5.98,
      },
      {
        productId: 'prod-11',
        name: 'Onions (1kg)',
        quantity: 3,
        price: 1.99,
        unitPrice: 1.99,
        subtotal: 5.97,
      },
      {
        productId: 'prod-12',
        name: 'Potatoes (2kg)',
        quantity: 2,
        price: 3.49,
        unitPrice: 3.49,
        subtotal: 6.98,
      },
      {
        productId: 'prod-13',
        name: 'Carrots (1kg)',
        quantity: 1,
        price: 2.49,
        unitPrice: 2.49,
        subtotal: 2.49,
      },
      {
        productId: 'prod-14',
        name: 'Broccoli',
        quantity: 2,
        price: 3.99,
        unitPrice: 3.99,
        subtotal: 7.98,
      },
    ],
    subtotal: 29.40,
    tax: 2.94,
    discount: 1.50,
    total: 30.84,
    status: 'completed',
    paymentMethod: 'wallet',
    paymentStatus: 'completed',
    completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
  },
  {
    customerId,
    sessionId: `session-${Date.now()}-5`,
    storeName: 'Premium Store',
    storeAddress: '555 Luxury Lane, Premium District, City, State 77777',
    items: [
      {
        productId: 'prod-15',
        name: 'Imported Cheese',
        quantity: 1,
        price: 15.99,
        unitPrice: 15.99,
        subtotal: 15.99,
      },
      {
        productId: 'prod-16',
        name: 'Organic Honey (500g)',
        quantity: 1,
        price: 12.50,
        unitPrice: 12.50,
        subtotal: 12.50,
      },
      {
        productId: 'prod-17',
        name: 'Premium Olive Oil',
        quantity: 1,
        price: 18.99,
        unitPrice: 18.99,
        subtotal: 18.99,
      },
    ],
    subtotal: 47.48,
    tax: 4.75,
    discount: 5.00,
    total: 47.23,
    status: 'completed',
    paymentMethod: 'card',
    paymentStatus: 'completed',
    completedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  },
];

async function seedOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quickcart');
    console.log('Connected to MongoDB');

    // Find or create a test user
    let user = await User.findOne({ phoneNumber: '+919999999999' });

    if (!user) {
      user = await User.create({
        phoneNumber: '+919999999999',
        name: 'Test User',
        isPhoneVerified: true,
      });
      console.log('Created test user:', user._id);
    } else {
      console.log('Using existing test user:', user._id);
    }

    // Clear existing orders for this user
    await Order.deleteMany({ customerId: user._id });
    console.log('Cleared existing orders');

    // Seed orders
    const orders = MOCK_ORDERS(user._id);
    const createdOrders = await Order.insertMany(orders);
    console.log(`Seeded ${createdOrders.length} orders`);

    // Print order IDs for testing
    console.log('\nOrder IDs for testing:');
    createdOrders.forEach((order, idx) => {
      console.log(`${idx + 1}. ${order._id} - ${order.storeName}`);
    });

    console.log('\nTest user phone: +919999999999');
    console.log('Orders seeded successfully!');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error.message);
    process.exit(1);
  }
}

seedOrders();
