import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { TranscriptService } from './services/transcriptService';
import { AIAnalysisService } from './services/aiAnalysisService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const transcriptService = new TranscriptService();
const aiAnalysisService = new AIAnalysisService();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/analyze', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({
      error: {
        code: 'MISSING_URL',
        message: 'YouTube URL is required',
        details: 'Please provide a valid YouTube URL'
      }
    });
  }

  try {
    console.log(`Starting analysis for URL: ${url}`);
    
    // Extract transcript
    console.log('📝 Extracting transcript...');
    const videoInfo = await transcriptService.getTranscript(url);
    
    // Analyze transcript with AI
    console.log('🤖 Analyzing transcript with AI...');
    const aiAnalysis = await aiAnalysisService.analyzeTranscript(videoInfo.transcript);
    
    console.log(`✅ Analysis complete! Generated ${aiAnalysis.keyThemes.length} themes, ${aiAnalysis.toolsAndCompanies.length} tools/companies`);
    
    // Generate social media posts
    console.log('📱 Generating social media posts...');
    const socialPosts = await aiAnalysisService.generateSocialMediaPosts(aiAnalysis);
    console.log(`✅ Generated ${socialPosts.linkedin.length} LinkedIn and ${socialPosts.twitter.length} Twitter posts`);
    
    res.json({
      success: true,
      data: {
        videoId: videoInfo.id,
        url: videoInfo.url,
        transcriptSegments: videoInfo.transcript.length,
        transcript: videoInfo.transcript,
        fullText: transcriptService.getFullText(videoInfo.transcript),
        formattedTranscript: transcriptService.formatTranscriptForDisplay(videoInfo.transcript),
        aiAnalysis: aiAnalysis,
        socialMediaPosts: socialPosts
      }
    });

  } catch (error) {
    console.error('Error during analysis:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Return appropriate error codes
    if (errorMessage.includes('Invalid YouTube URL')) {
      return res.status(400).json({
        error: {
          code: 'INVALID_URL',
          message: 'Invalid YouTube URL',
          details: errorMessage
        }
      });
    } else if (errorMessage.includes('unavailable') || errorMessage.includes('private')) {
      return res.status(404).json({
        error: {
          code: 'VIDEO_UNAVAILABLE',
          message: 'Video not available',
          details: errorMessage
        }
      });
    } else if (errorMessage.includes('transcript') || errorMessage.includes('captions')) {
      return res.status(422).json({
        error: {
          code: 'NO_TRANSCRIPT',
          message: 'Transcript not available',
          details: errorMessage
        }
      });
    }

    // Generic server error
    return res.status(500).json({
      error: {
        code: 'PROCESSING_ERROR',
        message: 'Failed to process video',
        details: 'An unexpected error occurred while processing the video'
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});