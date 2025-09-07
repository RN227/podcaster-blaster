# Podcaster Blaster 🎙️

A YouTube video analysis tool that extracts transcripts and generates AI-powered analysis including key takeaways, tools/companies mentioned, and social media posts.

## Features

- 🎥 **YouTube Video Analysis**: Extract transcripts from YouTube videos using multiple fallback methods
- 🤖 **AI-Powered Insights**: Generate summaries, themes, and key takeaways using Claude AI
- 📱 **Social Media Generation**: Auto-generate LinkedIn and Twitter posts from video content
- 🔗 **Interactive Transcripts**: Clickable timestamps for video navigation
- 📊 **Tools & Companies Detection**: Identify and categorize mentioned tools/companies with reference links

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **Backend**: Node.js + Express + TypeScript
- **AI**: Claude API (Anthropic) with claude-3-5-sonnet-20250114
- **Transcript Extraction**: yt-dlp + @distube/ytdl-core + youtube-transcript (multi-tier fallback)

## Local Development

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Anthropic API key

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd podcaster-blaster
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   cd frontend && npm install
   
   # Backend
   cd ../backend && npm install
   ```

3. **Environment Configuration**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit .env and add your ANTHROPIC_API_KEY
   
   # Frontend (optional for local development)
   cd ../frontend
   cp .env.example .env
   # Edit .env if needed
   ```

4. **Run in development**
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend  
   cd frontend && npm run dev
   ```

## Deployment to Vercel

### Backend Deployment

1. **Deploy the backend first**
   ```bash
   cd backend
   vercel --prod
   ```

2. **Set environment variables in Vercel dashboard**
   - `ANTHROPIC_API_KEY`: Your Claude API key
   - `YTDLP_PATH`: Leave empty for serverless
   - `PORT`: Leave as 3001 or remove

3. **Note the deployed backend URL** (e.g., `https://your-backend-domain.vercel.app`)

### Frontend Deployment

1. **Update frontend configuration**
   ```bash
   cd frontend
   # Create .env.production or set in Vercel dashboard
   echo "VITE_API_BASE_URL=https://your-backend-domain.vercel.app" > .env.production
   ```

2. **Deploy frontend**
   ```bash
   cd frontend
   vercel --prod
   ```

3. **Set environment variables in Vercel dashboard**
   - `VITE_API_BASE_URL`: Your deployed backend URL

### Alternative: Combined Deployment

You can also deploy both as a monorepo:

1. **Create root vercel.json**
   ```json
   {
     "builds": [
       { "src": "frontend/package.json", "use": "@vercel/static-build" },
       { "src": "backend/src/index.ts", "use": "@vercel/node" }
     ],
     "routes": [
       { "src": "/api/(.*)", "dest": "/backend/src/index.ts" },
       { "src": "/(.*)", "dest": "/frontend/$1" }
     ]
   }
   ```

2. **Deploy from root**
   ```bash
   vercel --prod
   ```

## API Endpoints

- `GET /health` - Health check
- `POST /api/analyze` - Analyze YouTube video
  ```json
  {
    "url": "https://youtube.com/watch?v=..."
  }
  ```

## Configuration

### Social Media Prompts

Edit `/backend/src/config/social-prompts.json` to customize AI prompts for generating LinkedIn and Twitter posts.

### Environment Variables

#### Backend
- `ANTHROPIC_API_KEY`: Required - Your Claude API key
- `YTDLP_PATH`: Optional - Path to yt-dlp binary (not needed on Vercel)
- `PORT`: Optional - Server port (default: 3001)

#### Frontend
- `VITE_API_BASE_URL`: Optional - Backend API URL (auto-detected in development)

## Features Overview

### Analysis Output
- **Enhanced Summary**: Host/guest identification, overview, detailed points
- **Key Themes**: 6-8+ themes based on video length with timestamps
- **Tools & Companies**: Categorized mentions with reference links
- **Social Media Posts**: 3 LinkedIn + 3 Twitter posts ready to publish
- **Interactive Transcript**: Clickable timestamps for video navigation

### Export Options
- Plain text transcript
- Formatted transcript with timestamps  
- Complete AI analysis in JSON format
- Copy-to-clipboard for social media posts

## Troubleshooting

### Common Issues

1. **"Failed to fetch" errors**
   - Check backend is running and accessible
   - Verify CORS configuration
   - Check network connectivity

2. **Transcript extraction fails**
   - Video may not have captions enabled
   - Try a different video
   - Check YouTube URL format

3. **AI analysis fails**
   - Verify ANTHROPIC_API_KEY is set correctly
   - Check API quota/billing
   - Falls back to mock data automatically

### Development Tips

- Use `npm run dev` for hot reloading
- Check browser console for detailed error messages
- Backend logs show detailed extraction process
- Mock data is returned when API key is not configured

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details