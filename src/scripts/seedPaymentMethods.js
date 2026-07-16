import mongoose from 'mongoose';
import User from '../models/userModel.js';
import dotenv from 'dotenv';

dotenv.config();

const seedUserProfile = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const userId = process.env.TEST_USER_ID || 'your_user_id_here';

    if (userId === 'your_user_id_here') {
      console.log('Please set TEST_USER_ID in .env file with your user MongoDB ID');
      console.log('Get it from: db.users.find() and copy the _id field');
      process.exit(1);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        loyaltyBalance: {
          points: 2450,
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
        $push: {
          savedPaymentMethods: [
            {
              cardNumber: '****-****-****-0366',
              cardLast4: '0366',
              expiryDate: '12/26',
              cardholderName: 'Visa Card',
              isDefault: true,
            },
            {
              cardNumber: '****-****-****-3442',
              cardLast4: '3442',
              expiryDate: '08/25',
              cardholderName: 'MasterCard',
              isDefault: false,
            },
          ],
        },
      },
      { new: true }
    );

    if (!user) {
      console.log('User not found with ID:', userId);
      process.exit(1);
    }

    console.log('✓ Profile data seeded successfully');
    console.log('User:', {
      name: user.name,
      phone: user.phoneNumber,
      loyaltyPoints: user.loyaltyBalance.points,
      paymentMethods: user.savedPaymentMethods.length,
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

seedUserProfile();
