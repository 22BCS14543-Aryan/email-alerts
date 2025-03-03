// callback-message.js
require('dotenv').config(); // Load environment variables
const twilio = require('twilio');

// Log the Twilio credentials for debugging
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID); 
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN); 

// Check if they are set
if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
   throw new Error('Twilio credentials are not set in the environment variables.');
}

const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const sendMessage = async (message, senderID) => {
   try {
        console.log("Sending message to WhatsApp:", message); // Debug log
         await client.messages.create({
            from: process.env.TWILIO_WHATSAPP_NUMBER,  // Your WhatsApp Twilio number
            body: message,
            to: senderID                              // The recipient WhatsApp number
         });
         console.log("Message sent successfully.");
   } catch (error) {
         console.log(`Error at sendMessage: ${error.message}`);
      }
};

module.exports = { sendMessage };
