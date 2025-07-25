# Cloudinary Setup Documentation

This document explains how to use the Cloudinary integration that has been set up in your Next.js app for uploading images, photos, and audio files.

## Setup

### 1. Environment Variables

Add the following environment variables to your `.env` or `.env.local` file:

```bash
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
CLOUDINARY_NOTIFICATION_URL=https://your-domain.com/api/cloudinary-webhook  # Optional: for async upload notifications
```

Get the CLOUDINARY_URL from your [Cloudinary dashboard](https://cloudinary.com/console) under "API Keys" → "Cloudinary URL".

The CLOUDINARY_NOTIFICATION_URL is optional and used for webhook notifications when processing large files asynchronously.

### 2. Dependencies

The following dependency has been installed:
- `cloudinary` - Official Cloudinary SDK

## Available Services

### CloudinaryService (`src/lib/cloudinary.ts`)

The main service provides methods for:

- `uploadImage()` - Upload images with optimization options
- `uploadAudio()` - Upload audio files with audio-specific options
- `uploadFile()` - Upload any file with auto-detection
- `uploadFromBase64()` - Upload from base64 strings
- `uploadFromUrl()` - Upload from external URLs
- `deleteFile()` - Delete files from Cloudinary
- `getOptimizedImageUrl()` - Get optimized image URLs
- `getThumbnailUrl()` - Get thumbnail URLs
- `checkAsyncUploadStatus()` - Check status of async uploads

## Usage Examples

### 1. Direct Service Usage

```typescript
import { cloudinaryService } from '@/lib/cloudinary';

// Upload an image
const result = await cloudinaryService.uploadImage(file, {
  folder: 'products',
  width: 800,
  height: 600,
  quality: 'auto',
  crop: 'limit'
});

// Upload audio (with async processing for large files)
const audioResult = await cloudinaryService.uploadAudio(audioFile, {
  folder: 'podcasts',
  bit_rate: '128k'
});

// Check async upload status
const status = await cloudinaryService.checkAsyncUploadStatus(publicId, 'video');

// Get optimized image URL
const optimizedUrl = cloudinaryService.getOptimizedImageUrl(publicId, {
  width: 300,
  height: 300,
  quality: 'auto'
});
```

### 2. API Routes

Use the pre-built API routes at `/api/upload`:

#### Upload File (POST)
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

#### Upload from URL (PUT)
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

#### Delete File (DELETE)
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

### 3. React Hook (`useCloudinaryUpload`)

```typescript
import { useCloudinaryUpload } from '@/lib/hooks/useCloudinaryUpload';

function MyComponent() {
  const { uploadFile, isUploading, error, result, progress } = useCloudinaryUpload();

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

### 4. File Upload Component

Use the pre-built `FileUpload` component:

```typescript
import FileUpload from '@/app/components/FileUpload';

function MyPage() {
  const handleUploadSuccess = (result: any) => {
    console.log('File uploaded successfully:', result);
    // Handle the uploaded file result
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
    // Handle the upload error
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

## Async Processing for Large Files

For large audio and video files, Cloudinary processes them asynchronously to avoid timeout issues. The system automatically enables async processing when:

- Audio files are larger than Cloudinary's synchronous processing limit
- Video files require complex transformations
- Files need to be processed with specific codecs or quality settings

### Async Processing Features

- **Automatic Detection**: Large files are automatically processed asynchronously
- **Progress Tracking**: You can check upload status using `checkAsyncUploadStatus()`
- **Webhook Notifications**: Optional webhook notifications when processing completes
- **Fallback Handling**: Proper error handling for async processing failures

### Example: Handling Async Uploads

```typescript
// Upload large audio file
const result = await cloudinaryService.uploadAudio(largeAudioBuffer, {
  folder: 'podcasts',
  eager_async: true, // Explicitly enable async processing
});

// Check processing status
const status = await cloudinaryService.checkAsyncUploadStatus(result.public_id, 'video');
console.log('Processing status:', status);

// The file URL will be available once processing is complete
console.log('File URL:', result.secure_url);
```

## File Organization

Files are organized in the following structure:

```
src/
├── lib/
│   ├── cloudinary.ts          # Main Cloudinary service
│   ├── upload-utils.ts        # Utility functions for file handling
│   └── hooks/
│       └── useCloudinaryUpload.ts  # React hook for uploads
├── app/
│   ├── api/
│   │   └── upload/
│   │       └── route.ts       # API routes for upload operations
│   └── components/
│       └── FileUpload.tsx     # Reusable upload component
```

## Utility Functions

The `upload-utils.ts` file provides helpful utilities:

- `fileToBase64()` - Convert File to base64
- `fileToBuffer()` - Convert File to Buffer
- `isValidImageType()` - Validate image file types
- `isValidAudioType()` - Validate audio file types
- `isValidFileSize()` - Check file size limits
- `validateFile()` - Comprehensive file validation
- `formatFileSize()` - Format bytes to human-readable size
- `extractPublicIdFromUrl()` - Extract public ID from Cloudinary URLs

## Configuration Options

### Image Upload Options
```typescript
interface ImageUploadOptions {
  folder?: string;
  public_id?: string;
  quality?: string | number;
  width?: number;
  height?: number;
  crop?: 'scale' | 'fit' | 'limit' | 'fill' | 'crop' | 'thumb';
  gravity?: 'auto' | 'center' | 'north' | 'south' | 'east' | 'west';
  format?: string;
  tags?: string[];
}
```

### Audio Upload Options
```typescript
interface AudioUploadOptions {
  folder?: string;
  public_id?: string;
  bit_rate?: string;
  frequency?: number;
  tags?: string[];
}
```

## Error Handling

All upload methods include comprehensive error handling:

```typescript
try {
  const result = await cloudinaryService.uploadImage(file, options);
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
2. **Use appropriate folders** to organize your uploads
3. **Optimize images** by setting quality and dimensions
4. **Handle errors gracefully** in your UI
5. **Clean up unused files** by implementing deletion when appropriate
6. **Use environment variables** for configuration
7. **Implement progress indicators** for better user experience

## Security Notes

- Never expose your `CLOUDINARY_URL` in client-side code as it contains your API secret
- Validate file types and sizes both client-side and server-side
- Consider implementing upload limits per user
- Use signed upload presets for additional security when needed

## Environment Variable Format

The `CLOUDINARY_URL` should be in the format:
```
cloudinary://api_key:api_secret@cloud_name
```

Example:
```
CLOUDINARY_URL=cloudinary://123456789012345:abcdefghijklmnopqrstuvwxyz1234567890@your-cloud-name
```

## Testing

To test if Cloudinary is properly configured:

```typescript
import { cloudinaryService } from '@/lib/cloudinary';

if (cloudinaryService.isConfigured()) {
  console.log('Cloudinary is properly configured');
} else {
  console.error('Cloudinary configuration is missing - check CLOUDINARY_URL');
}
``` 