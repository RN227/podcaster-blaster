export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface VideoInfo {
  id: string;
  url: string;
  title?: string;
  transcript: TranscriptSegment[];
}

export class TranscriptService {
  /**
   * Extract video ID from YouTube URL
   */
  private extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Main transcript extraction method using YouTube Transcript API
   */
  async getTranscript(url: string): Promise<VideoInfo> {
    console.log('🎯 TranscriptService: Starting transcript extraction');
    
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }
    
    console.log(`📹 Video ID: ${videoId}`);
    
    const apiToken = process.env.YOUTUBE_TRANSCRIPT_API_TOKEN;
    if (!apiToken || apiToken === 'your_transcript_api_token_here') {
      throw new Error('YouTube Transcript API token not configured');
    }
    
    console.log('🔑 API Token found, making request...');
    
    try {
      const response = await fetch('https://www.youtube-transcript.io/api/transcripts', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ids: [videoId]
        })
      });

      console.log(`📡 API Response Status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ API Error: ${errorText}`);
        throw new Error(`YouTube Transcript API failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`📋 API Response received, parsing...`);
      
      // API returns an array, get the first item
      const videoData = Array.isArray(data) && data.length > 0 ? data[0] : null;
      
      if (!videoData) {
        throw new Error('No video data in API response');
      }
      
      console.log(`📺 Video Title: ${videoData.title || 'Unknown'}`);
      
      if (!videoData.tracks || videoData.tracks.length === 0) {
        throw new Error('No transcript tracks found for this video');
      }
      
      const transcriptData = videoData.tracks[0].transcript;
      console.log(`📝 Found ${transcriptData.length} transcript segments`);
      
      const segments: TranscriptSegment[] = transcriptData.map((item: any) => ({
        text: item.text.trim(),
        start: parseFloat(item.start),
        duration: parseFloat(item.dur)
      }));

      console.log(`✅ Successfully parsed ${segments.length} segments`);
      
      return {
        id: videoId,
        url,
        title: videoData.title || 'Unknown',
        transcript: this.deduplicateTranscript(segments)
      };
      
    } catch (error) {
      console.log(`❌ Error in getTranscript: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Remove duplicate and overlapping segments
   */
  private deduplicateTranscript(segments: TranscriptSegment[]): TranscriptSegment[] {
    if (segments.length === 0) return segments;
    
    const deduplicated: TranscriptSegment[] = [];
    const similarity = (a: string, b: string): number => {
      const wordsA = new Set(a.toLowerCase().split(/\s+/));
      const wordsB = new Set(b.toLowerCase().split(/\s+/));
      const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
      const union = new Set([...wordsA, ...wordsB]);
      return union.size === 0 ? 0 : intersection.size / union.size;
    };
    
    let currentSegment = segments[0];
    
    for (let i = 1; i < segments.length; i++) {
      const nextSegment = segments[i];
      const textSimilarity = similarity(currentSegment.text, nextSegment.text);
      const timeDiff = Math.abs(nextSegment.start - currentSegment.start);
      
      // If segments are very similar or overlapping, merge or skip
      if (textSimilarity > 0.7 || timeDiff < 2) {
        // Keep the longer or more complete text
        if (nextSegment.text.length > currentSegment.text.length) {
          currentSegment = nextSegment;
        }
      } else {
        deduplicated.push(currentSegment);
        currentSegment = nextSegment;
      }
    }
    
    deduplicated.push(currentSegment);
    
    console.log(`Deduplication: ${segments.length} → ${deduplicated.length} segments (${Math.round((1 - deduplicated.length / segments.length) * 100)}% reduction)`);
    
    return deduplicated;
  }

  /**
   * Convert transcript segments to plain text
   */
  getFullText(transcript: TranscriptSegment[]): string {
    return transcript.map(segment => segment.text).join(' ');
  }

  /**
   * Format transcript for display with timestamps
   */
  formatTranscriptForDisplay(transcript: TranscriptSegment[]): string {
    return transcript
      .map(segment => {
        const minutes = Math.floor(segment.start / 60);
        const seconds = Math.floor(segment.start % 60);
        const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        return `[${timestamp}] ${segment.text}`;
      })
      .join('\n');
  }
}