#!/usr/bin/env node

/**
 * YouTube OAuth2 Authorization Helper
 *
 * Run once to generate a refresh token:
 *   npm run build && npm run auth
 *
 * This opens a browser for Google OAuth consent, then prints the refresh token.
 * Save it as YOUTUBE_REFRESH_TOKEN in your .env file.
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 */

import { google } from 'googleapis';
import http from 'node:http';
import { URL } from 'node:url';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required.');
  process.exit(1);
}

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
];

const REDIRECT_PORT = 5678;
const REDIRECT_PATH = '/rest/oauth2-credential/callback';
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}${REDIRECT_PATH}`;

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

async function main() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\n=== YouTube OAuth2 Authorization ===\n');
  console.log('Opening browser for authorization...');
  console.log(`\nIf browser doesn't open, visit:\n${authUrl}\n`);

  // Open browser
  const { exec } = await import('node:child_process');
  exec(`open "${authUrl}"`);

  // Start local server to capture callback
  const server = http.createServer(async (req, res) => {
    if (!req.url?.startsWith(REDIRECT_PATH)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
    const code = url.searchParams.get('code');

    if (!code) {
      res.writeHead(400);
      res.end('No authorization code received.');
      return;
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Authorization successful!</h1><p>You can close this tab.</p>');

      console.log('\n=== Authorization Successful ===\n');
      console.log('Add this to your .env file:\n');
      console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log(`\nAccess token (temporary): ${tokens.access_token?.substring(0, 30)}...`);
      console.log(`Scopes: ${tokens.scope}`);
      console.log(`Expires: ${tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'unknown'}`);
    } catch (err) {
      res.writeHead(500);
      res.end('Token exchange failed.');
      console.error('Token exchange error:', err);
    }

    server.close();
    process.exit(0);
  });

  server.listen(REDIRECT_PORT, () => {
    console.log(`Waiting for OAuth callback on port ${REDIRECT_PORT}...`);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
