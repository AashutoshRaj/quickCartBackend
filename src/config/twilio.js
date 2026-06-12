// config/twilio.js

import twilio from 'twilio';

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  throw new Error('Twilio credentials are missing. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
}

if (!process.env.TWILIO_VERIFY_SERVICE_SID) {
  throw new Error('TWILIO_VERIFY_SERVICE_SID is missing.');
}

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export default client;
