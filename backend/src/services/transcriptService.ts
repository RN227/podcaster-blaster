import { YoutubeTranscript } from 'youtube-transcript';
import ytdl from '@distube/ytdl-core';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

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
   * Main transcript extraction method with fallbacks
   */
  async getTranscript(url: string): Promise<VideoInfo> {
    const videoId = this.extractVideoId(url);
    
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    console.log(`Fetching transcript for video ID: ${videoId}`);

    // Try multiple methods in order of preference
    let transcript: TranscriptSegment[] = [];

    // Method 1: Try ytdl-core
    try {
      console.log('=== Trying Method 1: ytdl-core ===');
      transcript = await this.tryYtdlCore(videoId);
      if (transcript.length > 0) {
        console.log(`✅ Successfully extracted ${transcript.length} segments using ytdl-core`);
        return {
          id: videoId,
          url,
          transcript: this.deduplicateTranscript(transcript)
        };
      }
    } catch (error) {
      console.log(`❌ ytdl-core method failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Method 2: Try youtube-transcript
    try {
      console.log('=== Trying Method 2: youtube-transcript library ===');
      transcript = await this.tryYoutubeTranscript(videoId);
      if (transcript.length > 0) {
        console.log(`✅ Successfully extracted ${transcript.length} segments using youtube-transcript`);
        return {
          id: videoId,
          url,
          transcript: this.deduplicateTranscript(transcript)
        };
      }
    } catch (error) {
      console.log(`❌ youtube-transcript method failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Method 3: Try yt-dlp if path is configured
    if (process.env.YTDLP_PATH) {
      try {
        console.log('=== Trying Method 3: yt-dlp ===');
        transcript = await this.tryYtDlp(videoId);
        if (transcript.length > 0) {
          console.log(`✅ Successfully extracted ${transcript.length} segments using yt-dlp`);
          return {
            id: videoId,
            url,
            transcript: this.deduplicateTranscript(transcript)
          };
        }
      } catch (error) {
        console.log(`❌ yt-dlp method failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // If all methods fail, throw error
    throw new Error('No transcript available for this video. The video may not have captions enabled.');
  }

  /**
   * Try extracting transcript using ytdl-core
   */
  private async tryYtdlCore(videoId: string): Promise<TranscriptSegment[]> {
    console.log(`Trying ytdl-core for video ID: ${videoId}`);
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    const info = await ytdl.getInfo(videoUrl);
    const subtitles = info.player_response?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    
    if (!subtitles || subtitles.length === 0) {
      throw new Error('No subtitle tracks found');
    }

    console.log(`Found ${subtitles.length} subtitle tracks`);
    
    // Prefer English subtitles
    let selectedTrack = subtitles.find(track => 
      track.languageCode === 'en' || 
      track.languageCode === 'en-US' ||
      track.name?.simpleText?.toLowerCase().includes('english')
    );
    
    if (!selectedTrack) {
      selectedTrack = subtitles[0];
    }
    
    console.log(`Selected track: ${selectedTrack.name?.simpleText || selectedTrack.languageCode} (${selectedTrack.languageCode})`);
    
    // Fetch the subtitle content
    const response = await fetch(selectedTrack.baseUrl);
    const xmlContent = await response.text();
    
    console.log(`Raw XML content (first 500 chars): ${xmlContent.substring(0, 500)}`);
    
    const segments = this.parseXmlSubtitles(xmlContent);
    console.log(`Parsed ${segments.length} segments from ytdl-core`);
    
    if (segments.length === 0) {
      throw new Error('Failed to parse subtitle content');
    }
    
    return segments;
  }

  /**
   * Try extracting transcript using youtube-transcript library
   */
  private async tryYoutubeTranscript(videoId: string): Promise<TranscriptSegment[]> {
    const transcriptList = await YoutubeTranscript.fetchTranscript(videoId);
    
    return transcriptList.map(item => ({
      text: item.text,
      start: item.offset / 1000, // Convert to seconds
      duration: item.duration ? item.duration / 1000 : 3 // Convert to seconds, default 3s
    }));
  }

  /**
   * Try extracting transcript using yt-dlp
   */
  private async tryYtDlp(videoId: string): Promise<TranscriptSegment[]> {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const tempDir = path.join(process.cwd(), 'temp');
    const outputPath = path.join(tempDir, `${videoId}.%(ext)s`);
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const ytdlpPath = process.env.YTDLP_PATH || 'yt-dlp';
    const command = `"${ytdlpPath}" --write-subs --write-auto-subs --sub-langs "en.*" --skip-download "${videoUrl}" -o "${outputPath}"`;
    
    console.log(`Executing: ${command}`);
    
    try {
      const { stdout, stderr } = await execAsync(command);
      console.log(`yt-dlp stdout: ${stdout}`);
      
      if (stderr) {
        console.log(`yt-dlp stderr: ${stderr}`);
      }
      
      // Look for subtitle files
      const files = fs.readdirSync(tempDir);
      const subtitleFile = files.find(file => file.includes(videoId) && (file.endsWith('.vtt') || file.endsWith('.srt')));
      
      if (!subtitleFile) {
        throw new Error('No subtitle file found');
      }
      
      const subtitlePath = path.join(tempDir, subtitleFile);
      const content = fs.readFileSync(subtitlePath, 'utf-8');
      
      // Parse VTT or SRT content
      const segments = subtitleFile.endsWith('.vtt') ? 
        this.parseVttContent(content) : 
        this.parseSrtContent(content);
      
      // Clean up
      fs.unlinkSync(subtitlePath);
      
      return segments;
    } catch (error) {
      throw new Error(`yt-dlp failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse VTT content to transcript segments
   */
  private parseVttContent(content: string): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];
    const lines = content.split('\n');
    let currentSegment: Partial<TranscriptSegment> = {};
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip WEBVTT header and empty lines
      if (!line || line === 'WEBVTT' || line.startsWith('NOTE')) {
        continue;
      }
      
      // Time stamp line (e.g., "00:00:01.000 --> 00:00:04.000")
      if (line.includes(' --> ')) {
        const [startTime, endTime] = line.split(' --> ');
        const start = this.vttTimeToSeconds(startTime);
        const end = this.vttTimeToSeconds(endTime);
        
        currentSegment = {
          start,
          duration: end - start
        };
      } 
      // Text line
      else if (currentSegment.start !== undefined) {
        currentSegment.text = line;
        
        if (currentSegment.text && currentSegment.start !== undefined && currentSegment.duration !== undefined) {
          segments.push({
            text: currentSegment.text,
            start: currentSegment.start,
            duration: currentSegment.duration
          });
          currentSegment = {};
        }
      }
    }
    
    return segments;
  }

  /**
   * Parse SRT content to transcript segments
   */
  private parseSrtContent(content: string): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];
    const blocks = content.split('\n\n');
    
    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length >= 3) {
        const timeLine = lines[1];
        const textLines = lines.slice(2);
        
        if (timeLine.includes(' --> ')) {
          const [startTime, endTime] = timeLine.split(' --> ');
          const start = this.srtTimeToSeconds(startTime.trim());
          const end = this.srtTimeToSeconds(endTime.trim());
          
          segments.push({
            text: textLines.join(' ').trim(),
            start,
            duration: end - start
          });
        }
      }
    }
    
    return segments;
  }

  /**
   * Convert VTT timestamp to seconds
   */
  private vttTimeToSeconds(timeStr: string): number {
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseFloat(parts[2]);
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Convert SRT timestamp to seconds
   */
  private srtTimeToSeconds(timeStr: string): number {
    const [time, ms] = timeStr.split(',');
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds + (ms ? parseInt(ms) / 1000 : 0);
  }

  /**
   * Parse XML subtitle format to transcript segments
   */
  private parseXmlSubtitles(xmlContent: string): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];
    
    // Simple XML parsing for subtitle format
    const textMatches = xmlContent.match(/<text[^>]*start="([^"]*)"[^>]*dur="([^"]*)"[^>]*>([^<]*)<\/text>/g);
    
    if (!textMatches) {
      return segments;
    }

    for (const match of textMatches) {
      const startMatch = match.match(/start="([^"]*)"/);
      const durMatch = match.match(/dur="([^"]*)"/);
      const textMatch = match.match(/>([^<]*)</);
      
      if (startMatch && durMatch && textMatch) {
        const start = parseFloat(startMatch[1]);
        const duration = parseFloat(durMatch[1]);
        const text = textMatch[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();

        if (text && !isNaN(start) && !isNaN(duration)) {
          segments.push({
            text,
            start,
            duration
          });
        }
      }
    }

    return segments;
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