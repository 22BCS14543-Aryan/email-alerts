import express from 'express';
import bodyParser from 'body-parser';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import twilio from 'twilio';
import { promises as fs } from 'fs'; // Use promises to work with fs
import path from 'path';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// File path for storing the last processed email ID
const lastProcessedEmailIdPath = path.join(process.cwd(), 'lastProcessedEmailId.txt');

// Function to read the last processed email ID
const getLastProcessedEmailId = async () => {
    try {
        return await fs.readFile(lastProcessedEmailIdPath, 'utf8');
    } catch (error) {
        // Return null if file doesn't exist
        return null;
    }
};

// Function to save the last processed email ID
const saveLastProcessedEmailId = async (emailId) => {
    await fs.writeFile(lastProcessedEmailIdPath, emailId, 'utf8');
};

// Function to fetch unread emails from Gmail
const fetchEmails = async (auth) => {
    const gmail = google.gmail({ version: 'v1', auth });
    try {
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: 'is:unread', // Fetch unread emails
        });

        const messages = response.data.messages || [];
        const lastProcessedEmailId = await getLastProcessedEmailId();

        for (const message of messages) {
            if (lastProcessedEmailId && message.id <= lastProcessedEmailId) {
                continue; // Skip already processed emails
            }

            const msg = await gmail.users.messages.get({ userId: 'me', id: message.id });
            const subject = msg.data.payload.headers.find(header => header.name === 'Subject').value;
            const sender = msg.data.payload.headers.find(header => header.name === 'From').value;

            // Extract the body, checking for html or plain text
            const parts = msg.data.payload.parts || [];
            let body = '';
            if (parts.length) {
                body = parts.find(part => part.mimeType === 'text/plain') ?
                    parts.find(part => part.mimeType === 'text/plain').body.data : '';
            } else {
                body = msg.data.payload.body.data; // fallback
            }

            // Decode the base64url encoded body
            if (body) {
                body = Buffer.from(body, 'base64').toString('utf-8');
            }

            // Create a summary (e.g., first 100 characters)
            const summary = body.length > 100 ? body.substring(0, 100) + '...' : body;

            const alertMessage = `New Email Alert!\nFrom: ${sender}\nSubject: ${subject}\nSummary: ${summary}`;
            await sendMessage(alertMessage, process.env.RECIPIENT_WHATSAPP_NUMBER);
            console.log(`Sent alert for email from ${sender}`);

            // Save the latest ID processed
            await saveLastProcessedEmailId(message.id);
        }
    } catch (error) {
        console.error('Error fetching emails:', error);
    }
};

// Send message to WhatsApp
const sendMessage = async (message, senderID) => {
    try {
        console.log("Sending message to WhatsApp:", message);
        const msg = await client.messages.create({
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            body: message,
            to: senderID,
        });
        console.log("Message sent successfully, SID:", msg.sid);
    } catch (error) {
        console.error(`Error at sendMessage: ${error.message}`);
    }
};

// OAuth2 Client Setup for Gmail
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
);
oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN, // Load refresh token from .env
});

// Start an interval to fetch emails periodically
setInterval(() => {
    fetchEmails(oauth2Client); // Ensure to handle authentication properly
}, 300000); // Check every 5 minutes

// Set up Express app
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Root route
app.get('/', (req, res) => {
    res.send('Welcome to the Email Alerts App!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
