# YouTube API Integration Setup

This guide explains how to set up YouTube API integration for direct video uploads from your automation tool.

## Overview

The YouTube integration allows you to:
- Connect your app channels to real YouTube channels via OAuth 2.0
- Upload generated videos directly to YouTube
- Manage video metadata (title, description, tags, privacy settings)
- Track upload history and quotas

## Prerequisites

### 1. Google Cloud Project Setup

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable billing (required for YouTube API)

2. **Enable YouTube Data API v3**
   - In the Google Cloud Console, go to "APIs & Services" > "Library"
   - Search for "YouTube Data API v3"
   - Click on it and press "Enable"

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add your domain to "Authorized JavaScript origins":
     - `http://localhost:3000` (for development)
     - `https://yourdomain.com` (for production)
   - Add callback URLs to "Authorized redirect URIs":
     - `http://localhost:3000/api/auth/youtube/callback` (development)
     - `https://yourdomain.com/api/auth/youtube/callback` (production)
   - Download the credentials JSON file

### 2. Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# YouTube API OAuth Credentials
YOUTUBE_CLIENT_ID=your_google_oauth_client_id
YOUTUBE_CLIENT_SECRET=your_google_oauth_client_secret

# App URL for OAuth callbacks
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change for production

# Security Keys
NEXTAUTH_SECRET=your_random_secret_key_here
ENCRYPTION_KEY=your_32_character_encryption_key

# Existing variables (if not already set)
OPENAI_API_KEY=your_openai_key
DATABASE_URL=your_database_url
```

**Getting the credentials:**
- `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET`: From the OAuth 2.0 credentials you created
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `ENCRYPTION_KEY`: Generate with `openssl rand -hex 16`

### 3. Database Migration

The integration adds new fields to the `youtube_channels` table. Make sure to run:

```bash
npm run db:generate
npm run db:push
```

## Usage

### 1. Channel Authentication

Before uploading videos, channels must be authenticated with YouTube:

1. **In the Channel Management Interface:**
   - Each channel will show a "Connect to YouTube" button
   - Click to initiate OAuth flow
   - You'll be redirected to Google for authorization
   - Grant necessary permissions
   - You'll be redirected back with success confirmation

2. **Authentication Status:**
   - Connected channels show a green indicator
   - Authentication tokens are stored securely (encrypted)
   - Tokens are automatically refreshed when needed

### 2. Video Upload

Once a channel is authenticated and you have a generated video:

1. **Upload Button:**
   - Available on video scripts that have generated videos
   - Only shows for authenticated channels
   - Click "Upload to YouTube"

2. **Upload Options:**
   - **Title:** Video title (max 100 characters)
   - **Description:** Video description (max 5000 characters)
   - **Tags:** Comma-separated tags
   - **Privacy Status:** Private, Unlisted, or Public

3. **Upload Process:**
   - Video is downloaded from Cloudinary
   - Uploaded to YouTube with metadata
   - Temp files are cleaned up
   - Success notification with YouTube URL

### 3. UI Components

The integration includes several new components:

- `YouTubeAuthButton`: Authentication for channels
- `YouTubeUploadButton`: Upload interface for videos
- Enhanced channel management with auth status

## API Endpoints

### Authentication
- `POST /api/auth/youtube` - Generate OAuth URL
- `GET /api/auth/youtube/callback` - Handle OAuth callback

### Upload
- `POST /api/upload-to-youtube` - Upload video to YouTube

## Security Features

### 1. Token Security
- Access and refresh tokens are encrypted before storage
- Automatic token refresh when expired
- Secure OAuth state parameter handling

### 2. Validation
- Channel ownership verification
- Video existence checks
- Authentication status validation

### 3. Error Handling
- Comprehensive error messages
- Graceful fallbacks
- Proper cleanup of temp files

## Quotas and Limits

### YouTube API Quotas
- **Default quota:** 10,000 units per day
- **Video upload cost:** ~1,600 units per upload
- **Channel info:** ~1 unit per request

### Request Quota Increase
If you need higher quotas:
1. Go to Google Cloud Console > APIs & Services > Quotas
2. Find YouTube Data API v3
3. Request quota increase with justification

## Troubleshooting

### Common Issues

1. **"Channel not authenticated" Error**
   - Ensure OAuth flow was completed successfully
   - Check if tokens are stored in database
   - Try re-authenticating the channel

2. **"Quota exceeded" Error**
   - Check your daily API usage
   - Wait for quota reset (daily)
   - Request quota increase if needed

3. **"Invalid credentials" Error**
   - Verify `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET`
   - Check OAuth redirect URLs in Google Cloud Console
   - Ensure correct environment variables

4. **Upload failures**
   - Verify video file exists and is accessible
   - Check file size limits (YouTube supports up to 256GB)
   - Ensure channel has upload permissions

### Debug Mode

Enable detailed logging by setting:
```bash
DEBUG=youtube:*
```

### API Testing

Test your setup with the YouTube API Explorer:
- [YouTube Data API Explorer](https://developers.google.com/youtube/v3/docs/)

## Production Considerations

### 1. Domain Configuration
- Update `NEXT_PUBLIC_APP_URL` to your production domain
- Add production domain to Google Cloud OAuth settings
- Update redirect URIs

### 2. Security
- Use strong encryption keys
- Regular token rotation
- Monitor API usage

### 3. Monitoring
- Track upload success rates
- Monitor quota usage
- Set up error alerts

## Rate Limiting

Implement rate limiting for:
- Authentication requests
- Upload requests
- API calls to prevent quota exhaustion

## Support

For issues related to:
- **YouTube API:** [YouTube API Support](https://developers.google.com/youtube/v3/support)
- **Google OAuth:** [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- **This integration:** Check the application logs and verify environment variables 