/**
 * Twilio Client Configuration
 * Initializes and exports Twilio client with API credentials
 * Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID
 */

import twilio from 'twilio';

// Validate required Twilio credentials
if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  throw new Error('Twilio credentials are missing. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
}

if (!process.env.TWILIO_VERIFY_SERVICE_SID) {
  throw new Error('TWILIO_VERIFY_SERVICE_SID is missing.');
}

/**
 * Twilio client instance configured with environment credentials
 */
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export default client;
