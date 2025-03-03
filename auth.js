import express from 'express';
import { google } from 'googleapis';
import open from 'open';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Root route
app.get('/', (req, res) => {
    res.send('Welcome! Please go to <a href="/auth/google">/auth/google</a> to start the authentication process.');
});

// Google authentication route
app.get('/auth/google', (req, res) => {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent', // Force consent screen
        scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    });
    open(authUrl);
    res.send('Authentication is required. Please check your browser.');
});

// Callback route
app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    if (code) {
        try {
            const { tokens } = await oAuth2Client.getToken(code);
            oAuth2Client.setCredentials(tokens);
            console.log('Tokens:', tokens); // Log the entire tokens object
            console.log('Access Token:', tokens.access_token);
            console.log('Refresh Token:', tokens.refresh_token); // Ensure this is logged
            res.send('Authentication successful! You can close this tab. Refresh Token: ' + tokens.refresh_token);
        } catch (error) {
            console.error('Error retrieving access token:', error);
            res.send('Error retrieving access token. Please check the console logs.');
        }
    } else {
        res.send('No code received.');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
