# YouTube Video Idea Generator 🎬

A beautiful Next.js application that generates creative YouTube video ideas using OpenAI's GPT models and can create full scripts with current web information. Built with TypeScript and styled with Tailwind CSS.

## ✨ Features

- **AI-Powered Idea Generation**: Uses OpenAI's GPT-4 to generate creative and engaging video ideas
- **Topic-Relevant Content**: Ensures all generated ideas are directly related to your chosen topic
- **Video Type Selection**: Generate ideas for full-length videos (8+ minutes) or YouTube Shorts (15-60 seconds)
- **AI-Automatable Filter**: Option to generate only ideas suitable for full AI automation
- **Category Selection**: Choose from 15+ popular YouTube categories to tailor your ideas
- **Script Generation**: Convert ideas into detailed, engaging scripts
- **Web Search Integration**: Scripts can include current information from the web using Tavily AI
- **Audio Generation**: Convert scripts to professional audio using **Local TTS (Coqui)** or ElevenLabs
- **Video Creation**: Automatically create videos with stock footage using Pexels
- **Customizable Results**: Generate 3-10 ideas per request
- **Beautiful UI**: Modern, responsive design with smooth animations
- **TypeScript**: Fully typed for better development experience
- **Real-time Loading States**: Visual feedback during idea generation

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key
- **For Local TTS**: Python 3.8+ with CUDA-capable GPU (RTX 4090 recommended)
- (Optional) Tavily API key for web search in scripts
- (Optional) ElevenLabs API key for cloud audio generation
- (Optional) Pexels API key for video generation
- (Optional) Cloudinary account for media storage

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd youtube-automation
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Local TTS (Recommended for RTX 4090 users)**
   ```bash
   # Install Coqui TTS for local inference
   pip install TTS torch torchaudio
   
   # Test installation
   tts --list_models
   ```

4. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Required - OpenAI API for idea and script generation
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Optional - Tavily API for web search in script generation
   TAVILY_API_KEY=your_tavily_api_key_here
   
   # Optional - ElevenLabs for cloud audio generation (alternative to local TTS)
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   
   # Optional - Pexels for stock video footage
   PEXELS_API_KEY=your_pexels_api_key_here
   
   # Optional - Cloudinary for media storage
   CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
   
   # Database connection
   DATABASE_URL=your_database_url_here
   
   # Local TTS Configuration (optional)
   PYTHON_PATH=python3
   TEMP_DIR=/tmp
   
   NEXT_PUBLIC_APP_NAME=YouTube Video Idea Generator
   ```

   **Getting API Keys:**
   - **OpenAI**: Get your API key from [OpenAI's platform](https://platform.openai.com/api-keys)
   - **Tavily**: Get your API key from [Tavily](https://tavily.com) for web search functionality
   - **ElevenLabs**: Get your API key from [ElevenLabs](https://elevenlabs.io) for cloud text-to-speech
   - **Pexels**: Get your API key from [Pexels API](https://www.pexels.com/api/) for stock videos
   - **Cloudinary**: Sign up at [Cloudinary](https://cloudinary.com) for media storage

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

## 🎯 How to Use

### 1. Generate Video Ideas
- Select a topic from the dropdown menu
- Choose video type: Full-length videos or YouTube Shorts
- Enable "AI-Automatable Ideas" for content suitable for full automation
- Enable "Search web for trending news & topics" for current, relevant ideas
- Click "Generate Video Ideas" to get creative suggestions

### 2. Generate Scripts with Web Search
- Save your favorite ideas from the generator
- Go to "Saved Ideas" page
- For each idea, toggle "Include Current Web Information" to enable web search
- Click "Generate Script" - the AI will search for current information and incorporate it
- Scripts will include up-to-date facts, recent news, and current developments

### 3. Create Audio and Video

#### Audio Generation Options:

**🚀 Local TTS (Recommended for RTX 4090)**
- **Free & Private**: Runs entirely on your hardware
- **High Quality**: Uses Coqui XTTS-v2 model with 17 language support
- **Voice Cloning**: Upload 6+ seconds of speech for voice cloning
- **No API costs**: Unlimited generation without usage fees

**☁️ Cloud TTS (ElevenLabs)**
- Professional quality cloud-based synthesis
- Requires API key and credits
- Consistent with existing workflows

#### Video Generation:
- Generate videos automatically with stock footage from Pexels
- All media is stored in Cloudinary for easy access

## 🎤 Audio Generation Details

### Local TTS (Coqui XTTS-v2)
- **Hardware Requirements**: CUDA-capable GPU (RTX 4090 ideal)
- **Features**: 
  - Voice cloning with 6+ second samples
  - 17 language support
  - 24kHz high-quality output
  - Streaming capability (<200ms latency)
  - DeepSpeed optimization for RTX cards
- **Privacy**: All processing happens locally on your machine
- **Cost**: Free after initial setup

### Cloud TTS (ElevenLabs)
- **Features**: Professional voice synthesis with advanced controls
- **Requirements**: API key and credits
- **Benefits**: No local hardware requirements, consistent results

## 🔍 Web Search Feature

The web search functionality powered by Tavily AI allows script generation to include:

- **Current News**: Latest developments and breaking news about your topic
- **Recent Statistics**: Up-to-date data and figures
- **Trending Information**: What's currently popular or discussed
- **Fact Verification**: Accurate, real-time information from reliable sources

This ensures your video scripts are always current and include the latest information about your chosen topic.

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run dev:env` - Start development server with environment variables
- `npm run build:env` - Build for production with environment variables
- `npm run start:env` - Start production server with environment variables
- `npm run db:generate` - Generate database schema
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open database studio

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── generate-ideas/         # Video idea generation
│   │   ├── generate-script/        # Script generation with web search
│   │   ├── convert-to-audio/       # ElevenLabs TTS conversion
│   │   ├── convert-to-audio-local/ # Local Coqui TTS conversion
│   │   ├── generate-video/         # Video creation with stock footage
│   │   ├── save-ideas/             # Save generated ideas
│   │   └── get-ideas/              # Retrieve saved ideas
│   ├── components/
│   │   ├── VideoIdeaGenerator.tsx  # Main idea generation interface
│   │   ├── ConvertToAudioButton.tsx # Audio generation component (Local + Cloud)
│   │   └── GenerateVideoButton.tsx # Video generation component
│   ├── saved-ideas/                # Saved ideas management
│   └── saved-scripts/              # Generated scripts management
├── lib/
│   ├── tavily.ts                   # Web search service
│   ├── pexels.ts                   # Stock video service
│   ├── audio-utils.ts              # ElevenLabs audio processing utilities
│   ├── local-audio-utils.ts        # Local TTS processing utilities
│   ├── video-processor.ts          # Video creation utilities
│   └── db/                         # Database utilities and schema
└── types/                          # TypeScript type definitions
```

## 🌟 Key Features Explained

### Topic Relevance
The AI is specifically instructed to ensure every generated idea is directly related to your chosen topic, eliminating generic or off-topic suggestions.

### Video Type Optimization
- **Full-Length Videos**: 8+ minute content with detailed exploration
- **YouTube Shorts**: 15-60 second quick, punchy content

### AI Automation Filter
Generate only ideas that can go through the complete AI pipeline:
- Script generation ✅
- Text-to-speech audio ✅ (Local or Cloud)
- Video creation with stock footage ✅

### Dual TTS Options
- **Local TTS**: Free, private, RTX 4090 optimized
- **Cloud TTS**: Professional quality, no hardware requirements

### Web Search Integration
Scripts can include current information by searching the web for:
- Recent news and developments
- Current statistics and data
- Trending topics and discussions
- Up-to-date facts and information

## 🔧 Technical Details

- **Frontend**: Next.js 15 with React 19 and TypeScript
- **Styling**: Tailwind CSS with dark mode support
- **AI Models**: OpenAI GPT-4 for idea generation, GPT-3.5-turbo for scripts
- **Web Search**: Tavily AI for real-time information retrieval
- **Audio**: 
  - **Local**: Coqui TTS (XTTS-v2) for RTX 4090 inference
  - **Cloud**: ElevenLabs for cloud-based synthesis
- **Video**: Pexels API for stock footage, FFmpeg for processing

## 💡 Performance Tips

### For RTX 4090 Users:
- Use Local TTS for unlimited, free generation
- Enable DeepSpeed for optimal GPU utilization
- Upload high-quality voice samples for better cloning results
- Consider using shorter text segments for faster processing

### General:
- Use web search sparingly to avoid rate limits
- Generate scripts in sections for better organization
- Cache generated audio for reuse in multiple videos

## 🚀 Hardware Recommendations

- **CPU**: Modern multi-core processor
- **GPU**: RTX 4090 (ideal), RTX 3080+ (good), RTX 2070+ (minimum for local TTS)
- **RAM**: 16GB+ (32GB recommended for video generation)
- **Storage**: SSD recommended for temp file operations
