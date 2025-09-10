import React, { useState, useRef } from 'react';
import { API_BASE_URL } from '../config';
import { 
  Play, 
  Clock, 
  FileText, 
  Copy, 
  ExternalLink, 
  Lightbulb, 
  Building, 
  Users, 
  User,
  Quote,
  Hash,
  Share2,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

interface AIAnalysisResult {
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

interface SocialMediaPosts {
  linkedin: string[];
  twitter: string[];
}

interface AnalysisResult {
  success?: boolean;
  data?: {
    videoId: string;
    url: string;
    title?: string;
    transcriptSegments: number;
    transcript: TranscriptSegment[];
    fullText: string;
    formattedTranscript: string;
    aiAnalysis?: AIAnalysisResult | null;
    socialMediaPosts?: SocialMediaPosts | null;
    aiError?: string | null;
  };
  message?: string;
  url?: string;
}

const VideoAnalyzer: React.FC = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'themes' | 'tools' | 'social' | 'transcript'>('summary');
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const validateYouTubeUrl = (url: string): boolean => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)[a-zA-Z0-9_-]{11}/;
    return youtubeRegex.test(url);
  };

  const getYouTubeEmbedUrl = (videoId: string): string => {
    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
  };

  const convertTimestampToSeconds = (timestamp: string): number => {
    const parts = timestamp.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1]; // MM:SS
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
    }
    return 0;
  };

  const seekToTimestamp = (timestamp: string) => {
    if (iframeRef.current && result?.data?.videoId) {
      const seconds = convertTimestampToSeconds(timestamp);
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [seconds, true]
        }),
        'https://www.youtube.com'
      );
    }
  };

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates({ ...copiedStates, [key]: true });
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const renderClickableTimestamp = (timestamp: string, className = '') => {
    return (
      <button
        onClick={() => seekToTimestamp(timestamp)}
        className={`inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors font-mono text-sm ${className}`}
        title={`Jump to ${timestamp}`}
      >
        <Clock className="h-3 w-3" />
        {timestamp}
      </button>
    );
  };

  const loadingStages = [
    { icon: '🎬', text: 'Connecting to YouTube...', subtext: 'Extracting video information' },
    { icon: '📝', text: 'Downloading transcript...', subtext: 'Processing video captions' },
    { icon: '🤖', text: 'AI is analyzing content...', subtext: 'Identifying key themes and insights' },
    { icon: '💡', text: 'Extracting key insights...', subtext: 'Finding tools, companies, and quotes' },
    { icon: '📱', text: 'Generating social content...', subtext: 'Creating LinkedIn and Twitter posts' },
    { icon: '✨', text: 'Finalizing analysis...', subtext: 'Preparing your results' }
  ];

  // Auto-advance loading stages
  React.useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingStage(prev => (prev + 1) % loadingStages.length);
      }, 3000); // Change every 3 seconds
      
      return () => clearInterval(interval);
    }
  }, [loading, loadingStages.length]);

  // Auto-scroll to results when analysis completes
  React.useEffect(() => {
    if (result && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 500); // Small delay for smooth transition
    }
  }, [result]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    if (!validateYouTubeUrl(url)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setLoading(true);
    setLoadingStage(0);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.details || errorData.error?.message || 'Failed to analyze video');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setLoadingStage(0);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Input Form */}
      <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/50 shadow-xl shadow-slate-200/20 p-8 mb-12">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label htmlFor="youtube-url" className="block text-sm font-medium text-slate-700">
              YouTube Video URL
            </label>
            <div className="relative">
              <input
                type="url"
                id="youtube-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-4 text-lg border border-slate-200 rounded-2xl bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all placeholder-slate-400"
              />
              <Play className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-slate-700 to-slate-800 text-white py-4 px-8 rounded-2xl hover:from-slate-800 hover:to-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-lg shadow-lg shadow-slate-200/50"
          >
{loading ? (
              <span className="flex flex-col items-center justify-center gap-2">
                <div className="flex items-center gap-3">
                  <div className="text-2xl animate-pulse">{loadingStages[loadingStage].icon}</div>
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
                <div className="text-center">
                  <div className="font-medium text-lg">{loadingStages[loadingStage].text}</div>
                  <div className="text-sm text-white/80 mt-1">{loadingStages[loadingStage].subtext}</div>
                </div>
                <div className="w-64 bg-white/20 rounded-full h-2 mt-2">
                  <div 
                    className="bg-white h-2 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${((loadingStage + 1) / loadingStages.length) * 100}%` }}
                  ></div>
                </div>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-3">
                <Lightbulb className="h-5 w-5" />
                Analyze Video
              </span>
            )}
          </button>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <h3 className="text-sm font-medium text-red-800">Analysis Failed</h3>
          </div>
          <p className="mt-2 text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && result.data && (
        <div ref={resultsRef} className="space-y-8">
          {/* Video Player */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/50 shadow-xl shadow-slate-200/20 overflow-hidden">
            <div className="p-8">
              <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  ref={iframeRef}
                  src={getYouTubeEmbedUrl(result.data.videoId)}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute top-0 left-0 w-full h-full"
                />
              </div>
              
              {/* Video Metadata */}
              <div className="grid md:grid-cols-3 gap-8 mt-8">
                <div className="space-y-2">
                  <h4 className="font-medium text-slate-600 text-sm uppercase tracking-wide">Video ID</h4>
                  <p className="font-mono text-slate-900 bg-slate-50 px-3 py-2 rounded-xl text-sm">{result.data.videoId}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-slate-600 text-sm uppercase tracking-wide">Segments</h4>
                  <p className="text-slate-900 text-lg">{result.data.transcriptSegments.toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-slate-600 text-sm uppercase tracking-wide">Source</h4>
                  <a 
                    href={result.data.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="text-sm">Watch on YouTube</span>
                  </a>
                </div>
              </div>
              
              {/* Export Options */}
              <div className="border-t border-slate-200 pt-8 mt-8">
                <h4 className="font-medium text-slate-700 mb-4 text-sm uppercase tracking-wide">Export Options</h4>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleCopy(result.data!.fullText, 'plainText')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm hover:bg-slate-200 transition-colors"
                  >
                    {copiedStates['plainText'] ? <CheckCircle2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    Plain Text
                  </button>
                  <button
                    onClick={() => handleCopy(result.data!.formattedTranscript, 'withTimestamps')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm hover:bg-slate-200 transition-colors"
                  >
                    {copiedStates['withTimestamps'] ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    With Timestamps
                  </button>
                  {result.data.aiAnalysis && (
                    <button
                      onClick={() => handleCopy(JSON.stringify(result.data!.aiAnalysis, null, 2), 'aiAnalysis')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm hover:bg-slate-200 transition-colors"
                    >
                      {copiedStates['aiAnalysis'] ? <CheckCircle2 className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
                      AI Analysis (JSON)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation & Content */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/50 shadow-xl shadow-slate-200/20 overflow-hidden">
            {/* Tab Navigation */}
            <div className="border-b border-slate-200">
              <nav className="flex overflow-x-auto px-8" aria-label="Tabs">
                {[
                  { key: 'summary', label: 'Summary', icon: FileText },
                  { key: 'themes', label: 'Key Themes', icon: Lightbulb },
                  { key: 'tools', label: 'Tools & Companies', icon: Building },
                  { key: 'social', label: 'Social Content', icon: Share2 },
                  { key: 'transcript', label: 'Transcript', icon: Quote }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`flex items-center gap-3 whitespace-nowrap py-6 px-1 mr-8 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.key
                          ? 'border-slate-700 text-slate-900'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-8">
              {activeTab === 'summary' && (
                <div className="space-y-8">
                  {result.data.aiError ? (
                    <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl p-8">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="h-6 w-6 text-red-500" />
                        <h3 className="text-lg font-semibold text-red-900">AI Analysis Unavailable</h3>
                      </div>
                      <p className="text-red-700 mb-4">
                        The AI analysis features are currently unavailable. The transcript was successfully extracted, but summary generation failed.
                      </p>
                      <div className="bg-red-100/80 rounded-xl p-4">
                        <p className="text-sm text-red-800">
                          <strong>Error:</strong> {result.data.aiError}
                        </p>
                      </div>
                      <p className="text-sm text-red-600 mt-3">
                        You can still view the complete transcript in the Transcript tab.
                      </p>
                    </div>
                  ) : result.data.aiAnalysis ? (
                    <div className="space-y-8">
                      {/* Hosts and Guests */}
                      <div className="grid md:grid-cols-2 gap-8">
                        {result.data.aiAnalysis.summary.hosts.length > 0 && (
                          <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-200/50">
                            <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-3">
                              <Users className="h-5 w-5 text-slate-600" />
                              Host{result.data.aiAnalysis.summary.hosts.length > 1 ? 's' : ''}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {result.data.aiAnalysis.summary.hosts.map((host, index) => (
                                <span key={index} className="px-4 py-2 bg-white text-slate-700 rounded-xl text-sm font-medium border border-slate-200">
                                  {host}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {result.data.aiAnalysis.summary.guests.length > 0 && (
                          <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-200/50">
                            <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-3">
                              <User className="h-5 w-5 text-slate-600" />
                              Guest{result.data.aiAnalysis.summary.guests.length > 1 ? 's' : ''}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {result.data.aiAnalysis.summary.guests.map((guest, index) => (
                                <span key={index} className="px-4 py-2 bg-white text-slate-700 rounded-xl text-sm font-medium border border-slate-200">
                                  {guest}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Overview */}
                      <div className="bg-slate-50/80 rounded-2xl p-8 border border-slate-200/50">
                        <h4 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-3">
                          <FileText className="h-5 w-5 text-slate-600" />
                          Overview
                        </h4>
                        <p className="text-slate-700 leading-relaxed text-lg">{result.data.aiAnalysis.summary.overviewSummary}</p>
                      </div>

                      {/* Detailed Points */}
                      {result.data.aiAnalysis.summary.detailedPoints.length > 0 && (
                        <div className="bg-slate-50/80 rounded-2xl p-8 border border-slate-200/50">
                          <h4 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-3">
                            <Hash className="h-5 w-5 text-slate-600" />
                            Key Points
                          </h4>
                          <div className="space-y-4">
                            {result.data.aiAnalysis.summary.detailedPoints.map((point, index) => (
                              <div key={index} className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-slate-700 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                                  {index + 1}
                                </div>
                                <p className="text-slate-700 leading-relaxed pt-1">{point}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              {activeTab === 'themes' && (
                <div className="space-y-6">
                  {result.data.aiError ? (
                    <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl p-8">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="h-6 w-6 text-red-500" />
                        <h3 className="text-lg font-semibold text-red-900">AI Analysis Unavailable</h3>
                      </div>
                      <p className="text-red-700 mb-4">
                        Key themes analysis is currently unavailable due to an AI processing error.
                      </p>
                      <div className="bg-red-100/80 rounded-xl p-4">
                        <p className="text-sm text-red-800">
                          <strong>Error:</strong> {result.data.aiError}
                        </p>
                      </div>
                    </div>
                  ) : result.data.aiAnalysis?.keyThemes ? (
                    <div className="space-y-8">
                      <h3 className="text-2xl font-semibold text-slate-900">Key Themes & Core Discussion Points</h3>
                      <div className="space-y-8">
                        {result.data.aiAnalysis.keyThemes.map((theme, index) => (
                          <div key={index} className="bg-slate-50/80 rounded-2xl p-8 border border-slate-200/50">
                            <div className="flex items-start gap-6">
                              <div className="flex-shrink-0 w-10 h-10 bg-slate-700 text-white rounded-full flex items-center justify-center text-lg font-bold">
                                {index + 1}
                              </div>
                              <div className="flex-1 space-y-4">
                                <h4 className="text-xl font-bold text-slate-900">{theme.title}</h4>
                                <p className="text-slate-700 leading-relaxed text-lg">{theme.summary}</p>
                                
                                {theme.keyQuote && (
                                  <div className="bg-white/80 rounded-xl p-6 border border-slate-200/50">
                                    <div className="flex items-start gap-4">
                                      <Quote className="h-6 w-6 text-slate-400 flex-shrink-0 mt-1" />
                                      <blockquote className="text-slate-700 italic leading-relaxed">
                                        "{theme.keyQuote}"
                                      </blockquote>
                                    </div>
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-2 pt-2">
                                  <span className="text-sm text-slate-600">Jump to discussion:</span>
                                  {renderClickableTimestamp(theme.timestamp, 'font-medium')}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {activeTab === 'tools' && (
                <div className="space-y-6">
                  {result.data.aiError ? (
                    <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl p-8">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="h-6 w-6 text-red-500" />
                        <h3 className="text-lg font-semibold text-red-900">AI Analysis Unavailable</h3>
                      </div>
                      <p className="text-red-700 mb-4">
                        Tools and companies analysis is currently unavailable due to an AI processing error.
                      </p>
                      <div className="bg-red-100/80 rounded-xl p-4">
                        <p className="text-sm text-red-800">
                          <strong>Error:</strong> {result.data.aiError}
                        </p>
                      </div>
                    </div>
                  ) : result.data.aiAnalysis?.toolsAndCompanies && result.data.aiAnalysis.toolsAndCompanies.length > 0 ? (
                    <div className="space-y-8">
                      <h3 className="text-2xl font-semibold text-slate-900">Tools & Companies Mentioned</h3>
                      <div className="grid gap-6">
                        {result.data.aiAnalysis.toolsAndCompanies.map((item, index) => (
                          <div key={index} className="bg-slate-50/80 rounded-2xl p-6 border border-slate-200/50 hover:bg-slate-100/80 transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                              <Building className="h-5 w-5 text-slate-600" />
                              {item.link ? (
                                <a 
                                  href={item.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="font-semibold text-slate-900 hover:text-slate-700 flex items-center gap-2"
                                >
                                  {item.name}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="font-semibold text-slate-900">{item.name}</span>
                              )}
                              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                item.type === 'tool' ? 'bg-blue-100 text-blue-700' :
                                item.type === 'company' ? 'bg-green-100 text-green-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {item.type}
                              </span>
                            </div>
                            <p className="text-slate-600 leading-relaxed">{item.context}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic text-center py-12">No tools or companies were identified in this video.</p>
                  )}
                </div>
              )}

              {activeTab === 'social' && (
                <div className="space-y-8">
                  {result.data.aiError ? (
                    <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl p-8">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="h-6 w-6 text-red-500" />
                        <h3 className="text-lg font-semibold text-red-900">AI Analysis Unavailable</h3>
                      </div>
                      <p className="text-red-700 mb-4">
                        Social media post generation is currently unavailable due to an AI processing error.
                      </p>
                      <div className="bg-red-100/80 rounded-xl p-4">
                        <p className="text-sm text-red-800">
                          <strong>Error:</strong> {result.data.aiError}
                        </p>
                      </div>
                    </div>
                  ) : result.data.socialMediaPosts ? (
                    <div className="space-y-10">
                      <h3 className="text-2xl font-semibold text-slate-900">Social Media Content</h3>
                      
                      {/* LinkedIn Posts */}
                      {result.data.socialMediaPosts.linkedin.length > 0 && (
                        <div className="space-y-6">
                          <h4 className="text-lg font-semibold text-slate-700 flex items-center gap-3">
                            <Share2 className="h-5 w-5" />
                            LinkedIn Posts
                          </h4>
                          <div className="space-y-6">
                            {result.data.socialMediaPosts.linkedin.map((post, index) => (
                              <div key={index} className="bg-slate-50/80 rounded-2xl p-6 border border-slate-200/50">
                                <div className="flex items-center justify-between mb-4">
                                  <h5 className="font-semibold text-slate-900">
                                    Post #{index + 1}
                                  </h5>
                                  <button
                                    onClick={() => handleCopy(post, `linkedin-${index}`)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-xl text-sm hover:bg-slate-800 transition-colors"
                                  >
                                    {copiedStates[`linkedin-${index}`] ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    Copy
                                  </button>
                                </div>
                                <div className="bg-white/80 rounded-xl p-6 border border-slate-200/50">
                                  <pre className="whitespace-pre-wrap text-slate-700 leading-relaxed font-sans">
                                    {post}
                                  </pre>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Twitter Posts */}
                      {result.data.socialMediaPosts.twitter.length > 0 && (
                        <div className="space-y-6">
                          <h4 className="text-lg font-semibold text-slate-700 flex items-center gap-3">
                            <Hash className="h-5 w-5" />
                            Twitter Posts
                          </h4>
                          <div className="space-y-6">
                            {result.data.socialMediaPosts.twitter.map((post, index) => (
                              <div key={index} className="bg-slate-50/80 rounded-2xl p-6 border border-slate-200/50">
                                <div className="flex items-center justify-between mb-4">
                                  <h5 className="font-semibold text-slate-900">
                                    Post #{index + 1}
                                  </h5>
                                  <button
                                    onClick={() => handleCopy(post, `twitter-${index}`)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-xl text-sm hover:bg-slate-800 transition-colors"
                                  >
                                    {copiedStates[`twitter-${index}`] ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    Copy
                                  </button>
                                </div>
                                <div className="bg-white/80 rounded-xl p-6 border border-slate-200/50">
                                  <pre className="whitespace-pre-wrap text-slate-700 leading-relaxed font-sans">
                                    {post}
                                  </pre>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500 italic text-center py-12">No social media posts available.</p>
                  )}
                </div>
              )}

              {activeTab === 'transcript' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-semibold text-slate-900">Full Transcript</h3>
                  <div className="bg-slate-50/80 rounded-2xl p-6 max-h-96 overflow-y-auto border border-slate-200/50">
                    <div className="space-y-3">
                      {result.data.transcript.map((segment, index) => {
                        const minutes = Math.floor(segment.start / 60);
                        const seconds = Math.floor(segment.start % 60);
                        const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                        
                        return (
                          <button
                            key={index}
                            onClick={() => seekToTimestamp(timestamp)}
                            className="w-full flex gap-4 group hover:bg-white/50 rounded-lg p-3 -mx-2 transition-colors cursor-pointer text-left"
                            title={`Jump to ${timestamp}`}
                          >
                            <span className="flex-shrink-0 text-slate-500 group-hover:text-slate-700 transition-colors font-mono text-sm">
                              [{timestamp}]
                            </span>
                            <span className="text-slate-700 leading-relaxed group-hover:text-slate-900 transition-colors">
                              {segment.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoAnalyzer;