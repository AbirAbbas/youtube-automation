# Video Generation Setup Documentation

This document explains how to set up and use the video generation feature that creates videos from scripts with stock footage.

## Overview

The video generation feature automatically creates videos by:
1. Analyzing script content to find relevant keywords
2. Searching Pexels for matching stock videos
3. Downloading and processing video segments
4. Stitching them together using FFmpeg
5. Combining with the generated audio
6. Uploading the final video to Cloudinary

## Prerequisites

### 1. System Requirements

**FFmpeg Installation:**
- **Ubuntu/Debian:** `sudo apt update && sudo apt install ffmpeg`
- **macOS:** `brew install ffmpeg`
- **Windows:** Download from [FFmpeg website](https://ffmpeg.org/download.html)

### 2. API Keys Required

Add these environment variables to your `.env.local` file:

```bash
# Pexels API Key (for stock videos)
PEXELS_API_KEY=your_pexels_api_key_here

# Cloudinary (already configured for audio)
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# ElevenLabs (already configured for audio)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

**Getting a Pexels API Key:**
1. Visit [Pexels API](https://www.pexels.com/api/)
2. Create a free account
3. Generate an API key
4. Add it to your environment variables

### 3. Database Migration

The video generation feature requires a new `video_url` field in the database:

```bash
npm run db:generate
npm run db:migrate
```

## Dependencies

The following packages have been installed:

```json
{
  "dependencies": {
    "fluent-ffmpeg": "^2.1.2",
    "pexels": "^1.3.0"
  },
  "devDependencies": {
    "@types/fluent-ffmpeg": "^2.1.24"
  }
}
```

## Architecture

### Services Created

1. **PexelsService** (`src/lib/pexels.ts`)
   - Searches for relevant stock videos
   - Downloads video content
   - Extracts keywords from script content

2. **VideoProcessor** (`src/lib/video-processor.ts`)
   - Uses FFmpeg to process videos
   - Stitches multiple video segments together
   - Combines video with audio
   - Handles video normalization and quality settings

3. **API Endpoint** (`src/app/api/generate-video/route.ts`)
   - Orchestrates the entire video generation process
   - Handles error management and progress tracking

4. **UI Component** (`src/app/components/GenerateVideoButton.tsx`)
   - Provides video generation interface
   - Shows progress and error states
   - Allows quality selection

## How It Works

### 1. Script Analysis
The system analyzes script sections to extract meaningful keywords:
- Removes common words (the, and, or, etc.)
- Prioritizes longer, more descriptive terms
- Uses section titles and content for context

### 2. Video Search
For each script section:
- Searches Pexels with extracted keywords
- Scores videos based on quality and duration
- Prefers 5-30 second clips in HD quality
- Falls back to generic terms if needed

### 3. Video Processing
Using FFmpeg:
- Downloads and normalizes each video segment
- Standardizes to 1920x1080 resolution
- Maintains 16:9 aspect ratio
- Trims videos to match audio duration

### 4. Final Assembly
- Concatenates video segments
- Combines with generated audio
- Applies quality settings (low/medium/high)
- Uploads final video to Cloudinary

## Usage

### From the UI

1. **Generate Script Audio First**
   - Scripts must have audio before video generation
   - Use the "Convert to Audio" button

2. **Generate Video**
   - Click "Generate Video" button
   - Select quality level (Low/Medium/High)
   - Wait 2-5 minutes for processing

3. **View Video**
   - Once generated, "Watch Video" button appears
   - Videos open in new tab
   - "Regenerate" option creates new video with different stock footage

### Programmatically

```typescript
import { pexelsService } from '@/lib/pexels';
import { videoProcessor } from '@/lib/video-processor';

// Search for videos
const videos = await pexelsService.findVideosForScript(sections, audioDuration);

// Process and create video
const videoBuffer = await videoProcessor.createVideo(
  videoSegments,
  audioUrl,
  options
);
```

## Quality Settings

| Quality | Speed | File Size | Use Case |
|---------|-------|-----------|----------|
| Low     | Fast  | Smaller   | Quick previews, testing |
| Medium  | Balanced | Balanced | General use, good quality |
| High    | Slow  | Larger    | Final videos, best quality |

## Error Handling

Common issues and solutions:

### FFmpeg Not Found
```
Error: FFmpeg not installed
Solution: Install FFmpeg on your system
```

### Pexels API Limit
```
Error: API quota exceeded
Solution: Check your Pexels API usage limits
```

### Video Processing Failed
```
Error: Video processing failed
Solution: Check temporary disk space and video file integrity
```

### No Suitable Videos Found
```
Error: Could not find suitable stock videos
Solution: Script content may be too specific; try broader topics
```

## File Organization

```
src/
├── lib/
│   ├── pexels.ts              # Pexels API integration
│   ├── video-processor.ts     # FFmpeg video processing
│   └── db/
│       └── schema.ts          # Updated with videoUrl field
├── app/
│   ├── api/
│   │   └── generate-video/
│   │       └── route.ts       # Video generation endpoint
│   ├── components/
│   │   └── GenerateVideoButton.tsx  # UI component
│   └── saved-scripts/
│       └── page.tsx           # Updated with video integration
```

## Performance Considerations

1. **Processing Time**: 2-5 minutes depending on:
   - Audio length
   - Number of video segments needed
   - Quality settings
   - System performance

2. **Storage**: Temporary files are cleaned up automatically

3. **API Limits**: 
   - Pexels: 200 requests/hour (free tier)
   - Consider upgrading for higher usage

4. **Server Resources**: Video processing is CPU-intensive

## Best Practices

1. **Script Content**: Write descriptive scripts with clear, visual keywords
2. **Audio First**: Always generate audio before attempting video generation
3. **Quality Selection**: Use "Medium" for most cases unless specific needs
4. **Error Handling**: Check logs for detailed error information
5. **API Monitoring**: Monitor Pexels API usage to avoid limits

## Troubleshooting

### Check System Requirements
```bash
# Verify FFmpeg installation
ffmpeg -version

# Check Node.js version (requires 18+)
node --version
```

### Verify Environment Variables
```bash
# Check if variables are set
echo $PEXELS_API_KEY
echo $CLOUDINARY_URL
```

### Test API Endpoints
```bash
# Test Pexels connection
curl -H "Authorization: YOUR_PEXELS_API_KEY" \
  "https://api.pexels.com/videos/search?query=technology&per_page=1"
```

### Check Logs
Video generation progress is logged to console with emojis:
- 🎬 Starting video generation
- 📏 Getting audio duration
- 🔍 Searching for stock videos
- 🎞️ Preparing video segments
- 📤 Uploading to Cloudinary
- ✅ Completed successfully

## Future Enhancements

Potential improvements for the video generation system:

1. **Custom Transitions**: Add fade effects between video segments
2. **Text Overlays**: Automatically add captions or title overlays
3. **Background Music**: Option to add background music tracks
4. **Multiple Sources**: Integrate additional stock video providers
5. **Video Templates**: Pre-defined video styles and layouts
6. **Batch Processing**: Generate multiple videos simultaneously
7. **Preview Mode**: Quick preview before final processing

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify all prerequisites are met
3. Review console logs for detailed error messages
4. Ensure all API keys are valid and have sufficient quota

The video generation feature integrates seamlessly with the existing audio generation workflow to provide a complete automated video creation pipeline. 