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
    // If API key is not configured, return mock data
    if (!this.anthropic) {
      return this.getMockAnalysis();
    }

    const formattedTranscript = this.formatTranscriptForAnalysis(transcript);
    
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
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
          return this.getMockAnalysis();
        }
      }
      
      return this.getMockAnalysis();
    } catch (error) {
      console.error('Error calling Claude API:', error);
      return this.getMockAnalysis();
    }
  }

  /**
   * Generate social media posts based on analysis data
   */
  async generateSocialMediaPosts(aiAnalysis: AIAnalysisResult): Promise<SocialMediaPosts> {
    if (!this.anthropic) {
      return this.getMockSocialMediaPosts();
    }

    try {
      const prompts = this.loadSocialMediaPrompts();
      const content = this.formatAnalysisForSocialPosts(aiAnalysis);
      
      const posts: string[] = [];

      // Generate social media posts using Twitter-style prompts
      for (const prompt of prompts.socialMedia.prompts) {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
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
      return this.getMockSocialMediaPosts();
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

  /**
   * Get mock social media posts for development/fallback
   */
  private getMockSocialMediaPosts(): SocialMediaPosts {
    return {
      posts: [
        "🧵 Thread: AI Evaluations 101\n\n1/4 Just learned about the 4 main types of AI evaluations:\n• Code-based\n• Human \n• LLM-as-judge\n• User evaluations\n\nEach has its place in building reliable AI 🤖\n\n#AIEvaluation #MachineLearning",
        "💡 Key insight from today: \"Human evaluations are the gold standard, but they don't scale well\"\n\nThis is why LLM-as-judge methods are becoming so important. The trick is designing good evaluation prompts 📝\n\n#AI #ProductManagement #MachineLearning",
        "🎯 Thread on preventing AI hallucinations:\n\n1/3 It's not just about better models—it's about better evaluation frameworks\n\n2/3 Golden datasets + continuous monitoring = more reliable AI systems\n\n3/3 The key is building evaluation into every stage of development\n\n#AIReliability #MLOps",
        "🔍 Building golden datasets isn't just about data collection—it's about creating the foundation for reliable AI systems. This video breaks down practical approaches that go beyond basic training data.\n\n#DataScience #AIReliability #MLOps",
        "🚀 Just watched a deep dive into AI evaluations! Key takeaway: Proper evaluation frameworks are essential for building reliable AI products. The discussion on LLM-as-judge methodology was particularly insightful.\n\n#AI #MachineLearning #ProductManagement"
      ]
    };
  }

  /**
   * Get mock analysis data for development/fallback
   */
  private getMockAnalysis(): AIAnalysisResult {
    return {
      keyThemes: [
        {
          title: "The Critical Need for AI Evaluations",
          summary: "Discussion of why AI evaluations are essential for building reliable AI products and preventing hallucinations in production systems. The speakers emphasize how industry leaders are prioritizing evaluation frameworks.",
          keyQuote: "The CPOs of these companies are telling you eval are really important. You should probably think what are AI eval exactly.",
          timestamp: "1:23"
        },
        {
          title: "Four Types of AI Evaluation Methods",
          summary: "Comprehensive overview of the four main evaluation approaches: code-based evaluations, human evaluations, LLM-as-judge evaluations, and user evaluations. Each method has specific use cases and benefits.",
          keyQuote: "There are four main types of evaluations: code-based, human, LLM-as-judge, and user evaluations",
          timestamp: "2:45"
        },
        {
          title: "Code-Based Evaluation Implementation",
          summary: "Deep dive into implementing code-based evaluations, including setting up automated testing frameworks and measuring accuracy metrics for AI outputs.",
          timestamp: "5:12"
        },
        {
          title: "Human Evaluation Best Practices",
          summary: "Guidelines for conducting effective human evaluations, including rater selection, bias mitigation, and scaling human feedback processes.",
          keyQuote: "Human evaluations are the gold standard, but they don't scale well",
          timestamp: "8:30"
        },
        {
          title: "LLM-as-Judge Methodology",
          summary: "Exploring how to use language models to evaluate other AI systems, including prompt design for evaluation tasks and handling evaluation bias.",
          timestamp: "12:15"
        },
        {
          title: "Building Golden Datasets for Training",
          summary: "Practical approaches to creating high-quality datasets that serve as the foundation for training reliable AI systems and maintaining consistency in outputs.",
          keyQuote: "Building golden datasets is essential for training reliable AI systems",
          timestamp: "16:45"
        },
        {
          title: "Production Monitoring and Evaluation",
          summary: "Strategies for implementing continuous evaluation systems in production, including real-time monitoring and automated alerting for performance degradation.",
          timestamp: "20:30"
        },
        {
          title: "Preventing AI Hallucinations in Production",
          summary: "Advanced strategies and frameworks for implementing proper evaluation systems that help prevent AI hallucinations and maintain system reliability in production environments.",
          keyQuote: "Proper evaluation frameworks help prevent AI hallucinations in production",
          timestamp: "24:10"
        }
      ],
      toolsAndCompanies: [
        {
          name: "Claude",
          type: "tool",
          context: "Mentioned as an AI model for evaluation and analysis tasks",
          link: "https://claude.ai"
        },
        {
          name: "OpenAI",
          type: "company",
          context: "Referenced as a provider of LLM models for evaluation",
          link: "https://openai.com"
        },
        {
          name: "Anthropic",
          type: "company",
          context: "Mentioned in the context of AI safety and evaluation frameworks",
          link: "https://anthropic.com"
        },
        {
          name: "Python",
          type: "technology",
          context: "Programming language mentioned for building evaluation scripts"
        },
        {
          name: "Weights & Biases",
          type: "tool",
          context: "MLOps platform discussed for tracking model performance",
          link: "https://wandb.ai"
        }
      ],
      summary: {
        hosts: ["Peter Yang"],
        guests: ["AI Evaluation Expert"],
        overviewSummary: "This video provides a comprehensive beginner's guide to AI evaluations, covering the four main types of evaluations and their practical implementation. The content emphasizes the growing importance of evaluation skills for product managers working with AI systems.",
        detailedPoints: [
          "Introduction to the fundamental problems with LLM hallucinations and the need for proper evaluation",
          "Overview of the four main types of AI evaluations: code-based, human, LLM-as-judge, and user evaluations",
          "Practical walkthrough of building golden datasets for training reliable AI systems",
          "Discussion of how product managers need to develop AI evaluation skills as a core competency",
          "Real-world examples and frameworks for implementing evaluation systems in production"
        ]
      }
    };
  }
}