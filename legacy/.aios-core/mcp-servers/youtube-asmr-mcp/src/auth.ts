#!/usr/bin/env node

/**
 * YouTube ASMR Channel - OAuth2 Authorization Helper
 *
 * Generates a refresh token with UPLOAD + MANAGEMENT scopes.
 * Run once after creating the YouTube channel:
 *   npm run build && npm run auth
 *
 * This opens a browser for Google OAuth consent, then prints the refresh token.
 * Save it as YOUTUBE_ASMR_REFRESH_TOKEN in your .env file.
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *
 * Scopes granted:
 *   - youtube (full management: upload, edit, delete, playlists)
 *   - yt-analytics.readonly (read analytics data)
 */

import { google } from 'googleapis';
import http from 'node:http';
import { URL } from 'node:url';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required.');
  console.error('Set them in your .env file or export them as environment variables.');
  process.exit(1);
}

// Full management + upload + analytics scopes
const SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
];

// Must match the redirect URI registered in Google Cloud Console
const REDIRECT_PORT = 5678;
const REDIRECT_PATH = '/rest/oauth2-credential/callback';
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}${REDIRECT_PATH}`;

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

async function main() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent to get refresh token
  });

  console.log('\n=== YouTube ASMR Channel - OAuth2 Authorization ===\n');
  console.log('IMPORTANT: When the browser opens, sign in with the Google account');
  console.log('that OWNS the ASMR YouTube channel.\n');
  console.log('Scopes being requested:');
  console.log('  - youtube (full management + upload)');
  console.log('  - youtube.upload (video upload)');
  console.log('  - youtube.force-ssl (secure API access)');
  console.log('  - yt-analytics.readonly (read analytics)\n');
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
    const error = url.searchParams.get('error');

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`<h1>Authorization failed</h1><p>Error: ${error}</p>`);
      console.error(`\nAuthorization error: ${error}`);
      server.close();
      process.exit(1);
      return;
    }

    if (!code) {
      res.writeHead(400);
      res.end('No authorization code received.');
      return;
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <h1>ASMR Channel Authorization Successful!</h1>
        <p>You can close this tab.</p>
        <p>Scopes: ${tokens.scope}</p>
        <p>Check terminal for the refresh token.</p>
      `);

      console.log('\n=== Authorization Successful ===\n');
      console.log('Add this to your .env file:\n');
      console.log(`YOUTUBE_ASMR_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log(`\nScopes granted: ${tokens.scope}`);
      console.log(`Access token (temporary): ${tokens.access_token?.substring(0, 30)}...`);
      console.log(`Expires: ${tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'unknown'}`);

      // Verify channel access
      oauth2Client.setCredentials(tokens);
      const yt = google.youtube({ version: 'v3', auth: oauth2Client });
      try {
        const channelRes = await yt.channels.list({ part: ['snippet', 'statistics'], mine: true });
        const channel = channelRes.data.items?.[0];
        if (channel) {
          console.log(`\nChannel verified: ${channel.snippet?.title}`);
          console.log(`  Channel ID: ${channel.id}`);
          console.log(`  Subscribers: ${channel.statistics?.subscriberCount}`);
          console.log(`  Videos: ${channel.statistics?.videoCount}`);
          console.log(`\nAlso add to .env:`);
          console.log(`YOUTUBE_ASMR_CHANNEL_ID=${channel.id}`);
        } else {
          console.log('\nWARNING: No YouTube channel found for this account.');
          console.log('Create a YouTube channel first, then run this auth again.');
        }
      } catch (channelErr) {
        console.log('\nCould not verify channel (not critical):', (channelErr as Error).message);
      }
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

  // Timeout after 5 minutes
  setTimeout(() => {
    console.error('\nTimeout: No authorization response received after 5 minutes.');
    server.close();
    process.exit(1);
  }, 5 * 60 * 1000);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
