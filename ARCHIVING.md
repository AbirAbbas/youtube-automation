# Video Archiving Feature

## Overview

The YouTube automation system now includes automatic video archiving functionality that helps manage storage and keep your workspace organized. Videos are automatically archived after successful YouTube upload.

## Features

### Automatic Archiving
- Videos are automatically archived after successful YouTube upload
- Configurable archiving options (script, files, metadata)
- Optional delay before archiving
- Non-blocking archiving (upload process continues even if archiving fails)

### Archive Management
- View all archived videos by channel
- Restore archived videos when needed
- Bulk archiving operations
- Archive status tracking

### Configuration Options
- Enable/disable automatic archiving
- Choose what to archive (scripts, files, metadata)
- Set archiving delay
- Archive failed uploads (optional)

## How It Works

### Upload Process
1. Video is uploaded to YouTube
2. Upload status is updated to 'uploaded'
3. Archiving configuration is checked
4. If enabled, video is archived according to settings
5. Archive status is logged

### Archiving Process
1. **Script Archiving**: Marks the video script as archived in the database
2. **File Archiving**: Logs generated files for potential archiving (audio, video, thumbnail)
3. **Metadata Preservation**: Keeps all metadata for future reference

### File Archiving Notes
Currently, file archiving is logged only. In a production environment, you might want to:
- Move files to long-term storage (AWS S3 Glacier, etc.)
- Delete local files to free up space
- Update file URLs to point to archived locations

## API Endpoints

### GET /api/archived-videos
Get archived videos for a channel.

**Query Parameters:**
- `channelId` (required): The channel ID to get archived videos for

**Response:**
```json
{
  "success": true,
  "archivedVideos": [
    {
      "scheduledVideo": {
        "id": 1,
        "title": "Video Title",
        "description": "Video description",
        "status": "uploaded",
        "youtubeVideoUrl": "https://youtube.com/watch?v=...",
        "updatedAt": "2024-01-01T00:00:00Z"
      },
      "script": {
        "id": 1,
        "title": "Script Title",
        "estimatedLength": "5:30",
        "isArchived": true
      }
    }
  ]
}
```

### POST /api/archived-videos
Perform actions on archived videos.

**Request Body:**
```json
{
  "action": "restore" | "bulk-archive",
  "scriptId": 1, // Required for restore action
  "channelId": 1, // Required for bulk-archive action
  "options": {} // Optional configuration for bulk-archive
}
```

## Configuration

### Default Settings
```typescript
{
  autoArchive: true,
  archiveScript: true,
  archiveFiles: true,
  keepMetadata: true,
  archiveDelayMinutes: 0,
  archiveFailedUploads: false
}
```

### Configuration Options
- `autoArchive`: Enable/disable automatic archiving
- `archiveScript`: Archive the video script in the database
- `archiveFiles`: Archive generated files (audio, video, thumbnail)
- `keepMetadata`: Preserve metadata for future reference
- `archiveDelayMinutes`: Delay before archiving (0 = immediate)
- `archiveFailedUploads`: Archive videos that failed to upload

## Usage

### Viewing Archived Videos
1. Navigate to the "Archived Videos" page in the navigation
2. Select a channel from the dropdown
3. View archived videos with their details
4. Use the "Restore" button to unarchive videos

### Restoring Videos
1. Find the video you want to restore in the archived videos list
2. Click the "Restore" button
3. The video will be removed from the archived list and can be accessed normally

### Bulk Operations
Use the API endpoint to perform bulk operations:
```javascript
// Bulk archive all uploaded videos for a channel
fetch('/api/archived-videos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'bulk-archive',
    channelId: 1,
    options: {
      archiveScript: true,
      archiveFiles: true,
      keepMetadata: true
    }
  })
});
```

## Database Schema

### Video Scripts Table
- `isArchived`: Boolean field indicating if the script is archived

### Scheduled Videos Table
- Tracks upload status and YouTube video information
- Used to determine which videos should be archived

## Future Enhancements

### Planned Features
- File archiving to cloud storage
- Archive compression and optimization
- Archive retention policies
- Archive search and filtering
- Archive analytics and reporting

### File Archiving Implementation
To implement actual file archiving:

1. **Cloud Storage Integration**
   ```typescript
   // Example: AWS S3 Glacier
   const archiveToS3 = async (filePath: string, archiveKey: string) => {
     // Upload to S3 Glacier
     // Update database with new file location
     // Delete local file
   };
   ```

2. **Database Updates**
   ```typescript
   // Update file URLs to point to archived locations
   await updateVideoScript(scriptId, {
     audioUrl: `s3://archive-bucket/audio/${archiveKey}`,
     videoUrl: `s3://archive-bucket/video/${archiveKey}`,
     thumbnailPath: `s3://archive-bucket/thumbnails/${archiveKey}`
   });
   ```

3. **Cleanup Process**
   ```typescript
   // Remove local files after successful archiving
   const cleanupLocalFiles = async (filePaths: string[]) => {
     for (const path of filePaths) {
       if (fs.existsSync(path)) {
         fs.unlinkSync(path);
       }
     }
   };
   ```

## Troubleshooting

### Common Issues

1. **Archiving Fails After Upload**
   - Check console logs for error messages
   - Verify database permissions
   - Ensure archive configuration is valid

2. **Videos Not Being Archived**
   - Check if auto-archiving is enabled in configuration
   - Verify upload status is 'uploaded'
   - Check for any archiving errors in logs

3. **Cannot Restore Videos**
   - Verify script exists in database
   - Check database permissions
   - Ensure video is actually archived

### Log Messages
- `📦 Starting video archiving for scheduled video ID: X`
- `📦 Archived video script ID: X`
- `📦 Files marked for archiving: [...]`
- `✅ Successfully archived video: [Title]`
- `⚠️ Video not uploaded yet (status: X), skipping archiving`

## Security Considerations

- Archive configuration is stored in localStorage (client-side)
- Archive operations are non-blocking to prevent upload failures
- File archiving should be implemented with proper access controls
- Consider encryption for archived files in production

## Performance Impact

- Archiving is asynchronous and doesn't block uploads
- Database operations are minimal
- File archiving can be deferred to background processes
- Archive queries are optimized with proper indexing 