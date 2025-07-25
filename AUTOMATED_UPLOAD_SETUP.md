# Automated YouTube Upload Setup

This feature provides completely automated YouTube video uploads with AI-generated content using YouTube's native scheduling system.

## Features

### 🤖 AI-Powered Content Generation
- **Automatic Title Optimization**: Uses OpenAI GPT-4o to generate engaging, click-worthy titles
- **Smart Description Creation**: Creates SEO-optimized descriptions with hooks, key points, and calls-to-action
- **Relevant Tag Generation**: Generates 10-15 trending, relevant tags for better discoverability

### ⏰ YouTube Native Scheduling
- **Daily 7am EST Posting**: Automatically schedules videos for 7am EST daily
- **YouTube's Built-in System**: Uses YouTube's native scheduling - no background processing required
- **Immediate Upload**: Videos are uploaded immediately and scheduled on YouTube's servers

### 🔄 Fully Automated Workflow
- **One-Click Upload**: No manual input required - just click "🤖 Auto Upload"
- **Background Processing**: Videos are processed and uploaded automatically
- **Error Handling**: Failed uploads are tracked and can be retried

## How It Works

### 1. Automated Upload Process
1. Click the "🤖 Auto Upload" button on any video script
2. AI analyzes the script content and generates:
   - Optimized title (max 60 characters)
   - Engaging description (max 4000 characters)
   - Relevant tags (10-15 trending tags)
3. Video is scheduled for the next available 7am EST slot
4. Background processor automatically uploads when scheduled time arrives

### 2. Scheduling Logic
- **Starting Point**: Today at 7am EST
- **Daily Schedule**: Every day at 7am EST
- **Queue Management**: If videos are already scheduled, finds the next available date
- **Time Zone**: Uses EST (UTC-5) year-round for simplicity

### 3. YouTube Native Scheduling
- **Immediate Upload**: Videos are uploaded to YouTube immediately
- **Scheduled Publication**: YouTube handles the scheduling and publishing
- **No Background Processing**: No need to keep the app running 24/7

## Setup Requirements

### 1. Environment Variables
Ensure you have the following in your `.env.local`:

```bash
# Required - OpenAI API for content generation
OPENAI_API_KEY=your_openai_api_key_here

# Required - YouTube API credentials
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret

# Required - Database and other settings
DATABASE_URL=your_database_url
NEXTAUTH_SECRET=your_nextauth_secret
ENCRYPTION_KEY=your_encryption_key
```

### 2. Database Migration
The feature adds a new `scheduled_videos` table. Run:

```bash
npm run db:generate
npm run db:push
```

### 3. Channel Authentication
Before using automated uploads:
1. Create a YouTube channel in the system
2. Connect it to YouTube via OAuth
3. Ensure the channel shows as "Connected to YouTube"

## Usage

### For Video Scripts
1. **Generate Content**: Create a video script with audio and video
2. **Auto Upload**: Click the "🤖 Auto Upload" button
3. **Scheduling**: Video is automatically scheduled and content is generated
4. **Monitoring**: Check the scheduled videos list in channel management

### For Channel Management
1. **View Scheduled Videos**: Each authenticated channel shows its scheduled videos
2. **Monitor Status**: See upload status (scheduled, uploaded, failed)
3. **Processor Status**: Check if the background processor is running
4. **Manual Control**: Restart the upload processor if needed

## API Endpoints

### Automated Upload
- `POST /api/automated-youtube-upload` - Schedule a video for automated upload

### Scheduled Videos
- `GET /api/scheduled-videos?channelId={id}` - Get scheduled videos for a channel



## How It Works

### YouTube Native Scheduling
The system uses YouTube's built-in scheduling feature:

1. **Immediate Upload**: Videos are uploaded to YouTube immediately as "private"
2. **Scheduled Publication**: YouTube's servers handle the scheduling and publishing
3. **No Background Processing**: No need to keep your application running 24/7

### Scheduling Logic
- **Next Available Slot**: Calculates the next 7am EST time slot
- **YouTube API**: Uses `publishAt` parameter in the YouTube API
- **Automatic Publishing**: YouTube automatically publishes the video at the scheduled time

## Troubleshooting

### Common Issues

1. **Videos Not Uploading**
   - Verify channel is authenticated with YouTube
   - Check that the video file exists and is accessible
   - Review error messages in the response

2. **Scheduling Issues**
   - Videos are scheduled for 7am EST daily
   - Check timezone settings
   - Verify the `publishAt` parameter is being sent correctly

3. **AI Content Generation Fails**
   - Verify OpenAI API key is valid
   - Check API usage limits
   - Fallback content will be used if generation fails



### Monitoring

- **YouTube Studio**: Check for uploaded videos in YouTube Studio
- **Video Status**: Videos will appear as "Scheduled" in YouTube Studio
- **Error Logs**: Failed uploads show error messages in the response
- **No Background Monitoring**: No need to monitor background processes

## Advanced Configuration

### Custom Scheduling
To modify the scheduling logic, edit the `getNext7amESTSlot()` function in `src/app/api/automated-youtube-upload/route.ts`:
- Change the time (currently 7am EST)
- Modify the frequency (currently daily)
- Adjust timezone handling

### AI Content Generation
To customize content generation, edit `src/lib/ai-content-generator.ts`:
- Modify prompts for different content styles
- Adjust temperature and token limits
- Add custom fallback content



## Security Considerations

- **OAuth Tokens**: Stored encrypted in the database
- **API Keys**: Never exposed in client-side code
- **Upload Permissions**: Only authenticated channels can upload
- **Error Handling**: Sensitive information is not logged

## Performance Notes

- **No Background Processing**: No continuous background tasks
- **AI Generation**: Uses GPT-4o for high-quality content
- **Immediate Upload**: Videos are uploaded and scheduled immediately
- **File Handling**: Temporary files are cleaned up automatically 