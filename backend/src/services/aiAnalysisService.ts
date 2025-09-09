import Anthropic from '@anthropic-ai/sdk';
import { TranscriptSegment } from './transcriptService';
import * as fs from 'fs';
import * as path from 'path';

export interface AIAnalysisResult {
  keyThemes: {
    title: string;
    summary: string;
    keyQuote?: string;
    timestamp: string;
  }[];
  toolsAndCompanies: {
    name: string;
    type: 'tool' | 'company' | 'technology';
    context: string;
    link?: string;
  }[];
  summary: {
    hosts: string[];
    guests: string[];
    overviewSummary: string;
    detailedPoints: string[];
  };
}

export interface SocialMediaPosts {
  posts: string[];
}

export class AIAnalysisService {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey || apiKey === 'your_api_key_here') {
      console.warn('⚠️ ANTHROPIC_API_KEY not set. AI analysis will be mocked.');
      this.anthropic = null as any;
    } else {
      this.anthropic = new Anthropic({
        apiKey: apiKey,
      });
    }
  }

  /**
   * Convert transcript segments to formatted text for AI analysis
   */
  private formatTranscriptForAnalysis(transcript: TranscriptSegment[]): string {
    return transcript
      .map(segment => {
        const minutes = Math.floor(segment.start / 60);
        const seconds = Math.floor(segment.start % 60);
        const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        return `[${timestamp}] ${segment.text}`;
      })
      .join('\n');
  }

  /**
   * Parse timestamp from formatted text
   */
  private parseTimestamp(text: string): string {
    const match = text.match(/\[(\d+:\d+)\]/);
    return match ? match[1] : '0:00';
  }

  /**
   * Analyze transcript using Claude AI
   */
  async analyzeTranscript(transcript: TranscriptSegment[]): Promise<AIAnalysisResult> {
    // If API key is not configured, throw error
    if (!this.anthropic) {
      throw new Error('Claude API key not configured. Please set ANTHROPIC_API_KEY environment variable.');
    }

    const formattedTranscript = this.formatTranscriptForAnalysis(transcript);
    
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 6000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: `Analyze this video transcript and extract the following information:

1. **Key Themes & Core Discussion Points**: Extract themes based on video length - aim for 1 theme per 5-7 minutes of content. For reference:
   - 10-15 minutes: 2-3 themes
   - 20-25 minutes: 3-4 themes  
   - 30-35 minutes: 4-6 themes
   - 40+ minutes: 6-8+ themes
   Each theme should have a title, summary, and timestamp. Include a representative quote only if one stands out clearly. PRIORITIZE extracting the maximum number of relevant themes rather than keeping it minimal.
2. **Tools & Companies**: Any software tools, companies, technologies, or platforms mentioned. Include official website links where possible.
3. **Summary**: Comprehensive summary with hosts, guests, overview, and detailed points

IMPORTANT: Make sure each theme has an accurate timestamp pointing to where that discussion begins in the video.

Please format your response as JSON with this exact structure:
{
  "keyThemes": [
    {
      "title": "Theme/Topic Title",
      "summary": "2-3 line summary of this theme or discussion point",
      "keyQuote": "Optional: A representative quote from this theme discussion (omit this field if no clear quote exists)",
      "timestamp": "MM:SS"
    }
  ],
  "toolsAndCompanies": [
    {
      "name": "Tool/Company Name",
      "type": "tool|company|technology",
      "context": "brief context of how it was mentioned",
      "link": "https://example.com (optional: official website link if well-known)"
    }
  ],
  "summary": {
    "hosts": ["Host Name 1", "Host Name 2"],
    "guests": ["Guest Name 1", "Guest Name 2"],
    "overviewSummary": "Brief 2-3 sentence overview of the video content",
    "detailedPoints": [
      "Main discussion point 1",
      "Main discussion point 2", 
      "Main discussion point 3"
    ]
  }
}

Transcript:
${formattedTranscript}`
        }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        try {
          return JSON.parse(content.text);
        } catch (parseError) {
          console.error('Failed to parse AI response as JSON:', parseError);
          throw new Error('Failed to parse Claude AI response. The response may be malformed.');
        }
      }
      
      throw new Error('Claude AI returned an unexpected response format.');
    } catch (error) {
      console.error('Error calling Claude API:', error);
      throw new Error(`Claude AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate social media posts based on analysis data
   */
  async generateSocialMediaPosts(aiAnalysis: AIAnalysisResult): Promise<SocialMediaPosts> {
    if (!this.anthropic) {
      throw new Error('Claude API key not configured. Please set ANTHROPIC_API_KEY environment variable.');
    }

    try {
      const prompts = this.loadSocialMediaPrompts();
      const content = this.formatAnalysisForSocialPosts(aiAnalysis);
      
      const posts: string[] = [];

      // Generate social media posts using Twitter-style prompts
      for (const prompt of prompts.socialMedia.prompts) {
        const response = await this.anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
          temperature: 0.7,
          messages: [{
            role: 'user',
            content: `${prompt}\n\nVideo Analysis:\n${content}`
          }],
        });

        const responseContent = response.content[0];
        if (responseContent.type === 'text') {
          posts.push(responseContent.text.trim());
        }
      }

      return { posts };
    } catch (error) {
      console.error('Error generating social media posts:', error);
      throw new Error(`Failed to generate social media posts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load social media prompts from config file
   */
  private loadSocialMediaPrompts(): any {
    try {
      const configPath = path.join(__dirname, '../config/social-prompts.json');
      const configContent = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(configContent);
    } catch (error) {
      console.error('Error loading social media prompts:', error);
      return {
        socialMedia: { prompts: ['Generate a social media post about this content.'] }
      };
    }
  }

  /**
   * Format analysis data for social media post generation
   */
  private formatAnalysisForSocialPosts(aiAnalysis: AIAnalysisResult): string {
    let content = `Summary: ${aiAnalysis.summary.overviewSummary}\n\n`;
    
    content += `Key Themes:\n`;
    aiAnalysis.keyThemes.forEach((theme, index) => {
      content += `${index + 1}. ${theme.title}: ${theme.summary}\n`;
      if (theme.keyQuote) {
        content += `   Quote: "${theme.keyQuote}"\n`;
      }
    });

    if (aiAnalysis.toolsAndCompanies.length > 0) {
      content += `\nTools & Companies Mentioned:\n`;
      aiAnalysis.toolsAndCompanies.forEach(item => {
        content += `- ${item.name} (${item.type}): ${item.context}\n`;
      });
    }

    return content;
  }

}