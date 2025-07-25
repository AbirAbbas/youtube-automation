# Local Storage Setup Documentation

This document explains how the local storage system works in your Next.js app for uploading and serving images, audio, and video files.

## Overview

The application now uses local file storage instead of Cloudinary for all file uploads. Files are stored in the `public/uploads` directory and served through the `/api/local-files` endpoint.

## File Organization

Files are organized in the following structure:

```
public/
└── uploads/
    ├── images/          # Image files (JPEG, PNG, GIF, etc.)
    ├── audio/           # Audio files (MP3, WAV, M4A, etc.)
    ├── videos/          # Video files (MP4, WebM, etc.)
    └── uploads/         # General uploads (auto-detected type)
```

Each file has a corresponding metadata file (`.meta.json`) that stores information about the file.

## API Endpoints

### File Upload (`/api/upload`)

**POST** - Upload a file
```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('type', 'image'); // 'image', 'audio', or 'auto'
formData.append('folder', 'uploads');

const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
});
```

**PUT** - Upload from URL
```javascript
const response = await fetch('/api/upload', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        url: 'https://example.com/image.jpg',
        uploadType: 'image',
        folder: 'external'
    }),
});
```

**DELETE** - Delete a file
```javascript
const response = await fetch('/api/upload', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        public_id: 'folder/filename',
        resource_type: 'image'
    }),
});
```

### File Serving (`/api/local-files/[...path]`)

Files are served directly from the local storage directory. URLs follow the pattern:
```
/api/local-files/{folder}/{filename}
```

Example: `/api/local-files/images/script-123-audio.mp3`

## Services

### LocalStorageService (`src/lib/local-storage-service.ts`)

Provides a Cloudinary-compatible interface for local storage:

```typescript
import { localStorageService } from '@/lib/local-storage-service';

// Upload an image
const result = await localStorageService.uploadImage(buffer, {
    folder: 'images',
    public_id: 'my-image',
    quality: 'auto'
});

// Upload audio
const audioResult = await localStorageService.uploadAudio(audioBuffer, {
    folder: 'audio',
    format: 'mp3'
});

// Upload any file
const fileResult = await localStorageService.uploadFile(buffer, {
    folder: 'uploads',
    resource_type: 'auto'
});
```

### LocalFileStorage (`src/lib/local-storage.ts`)

Low-level file storage operations:

```typescript
import { localFileStorage } from '@/lib/local-storage';

// Save a file
const result = await localFileStorage.saveFile(buffer, {
    folder: 'videos',
    public_id: 'my-video',
    tags: ['video', 'script']
});

// Get file info
const fileInfo = await localFileStorage.getFileInfo('my-video', 'videos');

// Delete a file
await localFileStorage.deleteFile('my-video', 'videos');
```

### LocalUploadService (`src/lib/upload-service.ts`)

High-level upload service that replaces the hybrid Cloudinary/local service:

```typescript
import { localUploadService } from '@/lib/upload-service';

// Upload a file
const result = await localUploadService.uploadFile(buffer, {
    folder: 'uploads',
    resource_type: 'auto'
});

// Upload specific types
const imageResult = await localUploadService.uploadImage(buffer, options);
const audioResult = await localUploadService.uploadAudio(buffer, options);
const videoResult = await localUploadService.uploadVideo(buffer, options);
```

## React Hook

### useLocalUpload (`src/lib/hooks/useCloudinaryUpload.ts`)

React hook for file uploads (maintains backward compatibility):

```typescript
import { useLocalUpload } from '@/lib/hooks/useCloudinaryUpload';

function MyComponent() {
    const { uploadFile, isUploading, error, result, progress } = useLocalUpload();

    const handleFileUpload = async (file: File) => {
        try {
            const result = await uploadFile(file, {
                type: 'image',
                folder: 'user-uploads',
                quality: 'auto'
            });
            console.log('Upload successful:', result);
        } catch (error) {
            console.error('Upload failed:', error);
        }
    };

    return (
        <div>
            {isUploading && <div>Uploading... {progress}%</div>}
            {error && <div>Error: {error}</div>}
            {result && <img src={result.secure_url} alt="Uploaded" />}
        </div>
    );
}
```

## File Upload Component

### FileUpload (`src/app/components/FileUpload.tsx`)

Reusable upload component:

```typescript
import FileUpload from '@/app/components/FileUpload';

function MyPage() {
    const handleUploadSuccess = (result: any) => {
        console.log('File uploaded successfully:', result);
    };

    const handleUploadError = (error: string) => {
        console.error('Upload error:', error);
    };

    return (
        <FileUpload
            acceptedTypes="image" // 'image', 'audio', or 'any'
            maxSizeInMB={10}
            folder="my-uploads"
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
        />
    );
}
```

## File Type Detection

The system automatically detects file types based on file signatures:

- **Images**: JPEG, PNG, GIF, WebP
- **Videos**: MP4, WebM, MOV, AVI, MKV
- **Audio**: MP3, WAV, M4A, AAC, OGG

## Security

- Files are served with appropriate MIME types
- Path traversal attacks are prevented
- Files are cached for 1 year for performance
- CORS headers are set for cross-origin requests

## Performance

- Files are served directly from the filesystem
- No external API calls required
- Automatic cleanup of old files (configurable)
- Efficient metadata storage in JSON files

## Migration from Cloudinary

The system maintains compatibility with existing Cloudinary URLs by:

1. Using the same API interface
2. Providing similar response structures
3. Supporting the same upload options
4. Maintaining backward compatibility in React hooks

## Environment Variables

No additional environment variables are required for local storage. The system works out of the box.

## File Cleanup

Automatic cleanup of old files is available:

```typescript
import { localFileStorage } from '@/lib/local-storage';

// Clean up files older than 30 days
const deletedCount = await localFileStorage.cleanupOldFiles('uploads', 30);
console.log(`Cleaned up ${deletedCount} old files`);
```

## Storage Statistics

Get storage statistics:

```typescript
import { localFileStorage } from '@/lib/local-storage';

const stats = await localFileStorage.getStorageStats('uploads');
console.log(`Files: ${stats.fileCount}, Size: ${stats.formattedSize}`);
```

## Error Handling

All upload methods include comprehensive error handling:

```typescript
try {
    const result = await localStorageService.uploadImage(file, options);
    // Handle success
} catch (error) {
    if (error instanceof Error) {
        console.error('Upload failed:', error.message);
    }
    // Handle error appropriately
}
```

## Best Practices

1. **Always validate files** before uploading using the provided validation functions
2. **Use appropriate folders** for different file types (images/, audio/, videos/)
3. **Set meaningful public IDs** for easier file management
4. **Monitor storage usage** and implement cleanup strategies
5. **Backup important files** as local storage is not redundant 