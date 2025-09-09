import React, { useState, useRef } from 'react';
import { API_BASE_URL } from '../config';

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
  posts: string[];
}

interface AnalysisResult {
  success?: boolean;
  data?: {
    videoId: string;
    url: string;
    transcriptSegments: number;
    transcript: TranscriptSegment[];
    fullText: string;
    formattedTranscript: string;
    aiAnalysis?: AIAnalysisResult;
    socialMediaPosts?: SocialMediaPosts;
  };
  message?: string;
  url?: string;
}

const VideoAnalyzer: React.FC = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'themes' | 'tools' | 'social' | 'transcript'>('summary');
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
      // Use postMessage to communicate with the YouTube iframe
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

  const renderClickableTimestamp = (timestamp: string, className = '') => {
    return (
      <button
        onClick={() => seekToTimestamp(timestamp)}
        className={`text-blue-600 hover:text-blue-800 underline cursor-pointer transition-colors ${className}`}
        title={`Jump to ${timestamp}`}
      >
        {timestamp}
      </button>
    );
  };

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
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex flex-col space-y-4">
          <div>
            <label htmlFor="youtube-url" className="block text-sm font-medium text-gray-700 mb-2">
              YouTube Video URL
            </label>
            <input
              type="url"
              id="youtube-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </span>
            ) : (
              'Analyze Video'
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Video Analysis</h2>
            
            {result.data && (
              <div className="space-y-6">
                {/* Video Player - Larger but not full width */}
                <div className="flex justify-center">
                  <div className="w-full max-w-4xl">
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                      <iframe
                        ref={iframeRef}
                        src={getYouTubeEmbedUrl(result.data.videoId)}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
                      ></iframe>
                    </div>
                  </div>
                </div>
                
                {/* Video Info - Below Video */}
                <div className="grid md:grid-cols-3 gap-6 pt-4">
                  <div>
                    <h3 className="font-medium text-gray-700 mb-1">Video ID</h3>
                    <p className="text-gray-600 font-mono text-sm">{result.data.videoId}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-700 mb-1">Transcript Segments</h3>
                    <p className="text-gray-600">{result.data.transcriptSegments} segments</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-700 mb-1">Source</h3>
                    <a 
                      href={result.data.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm underline inline-flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                      </svg>
                      Watch on YouTube
                    </a>
                  </div>
                </div>
                
                {/* Export Options */}
                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-700 mb-3">Export Options</h3>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => navigator.clipboard.writeText(result.data!.fullText)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700 transition-colors inline-flex items-center"
                    >
                      📋 Plain Text
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(result.data!.formattedTranscript)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors inline-flex items-center"
                    >
                      🕐 With Timestamps
                    </button>
                    {result.data.aiAnalysis && (
                      <button
                        onClick={() => navigator.clipboard.writeText(JSON.stringify(result.data!.aiAnalysis, null, 2))}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 transition-colors inline-flex items-center"
                      >
                        🧠 AI Analysis (JSON)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {result.data && result.data.aiAnalysis && (
            <div>
              {/* Tab Navigation */}
              <div className="border-b border-gray-200 overflow-x-auto">
                <nav className="flex space-x-8 px-6 min-w-max" aria-label="Tabs">
                  {[
                    { key: 'summary', label: '📝 Summary', icon: '📝' },
                    { key: 'themes', label: '💡 Key Themes', icon: '💡' },
                    { key: 'tools', label: '🛠️ Tools & Companies', icon: '🛠️' },
                    { key: 'social', label: '📱 Social Media', icon: '📱' },
                    { key: 'transcript', label: '📄 Transcript', icon: '📄' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.key
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'summary' && (
                  <div className="space-y-6">
                    {/* Hosts and Guests Section - Side by side on wider screens */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Hosts Section */}
                      {result.data.aiAnalysis.summary.hosts.length > 0 && (
                        <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-400">
                          <h4 className="text-md font-semibold text-purple-900 mb-2 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                            Host{result.data.aiAnalysis.summary.hosts.length > 1 ? 's' : ''}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {result.data.aiAnalysis.summary.hosts.map((host, index) => (
                              <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                                {host}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Guests Section */}
                      {result.data.aiAnalysis.summary.guests.length > 0 && (
                        <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-400">
                          <h4 className="text-md font-semibold text-green-900 mb-2 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                            </svg>
                            Guest{result.data.aiAnalysis.summary.guests.length > 1 ? 's' : ''}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {result.data.aiAnalysis.summary.guests.map((guest, index) => (
                              <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                {guest}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Overview Summary */}
                    <div className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-400">
                      <h4 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                        Overview
                      </h4>
                      <p className="text-blue-800 leading-relaxed">{result.data.aiAnalysis.summary.overviewSummary}</p>
                    </div>

                    {/* Detailed Points */}
                    {result.data.aiAnalysis.summary.detailedPoints.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-gray-400">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                          Detailed Summary
                        </h4>
                        <ul className="space-y-3">
                          {result.data.aiAnalysis.summary.detailedPoints.map((point, index) => (
                            <li key={index} className="flex items-start">
                              <span className="flex-shrink-0 w-6 h-6 bg-gray-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                                {index + 1}
                              </span>
                              <p className="text-gray-700 leading-relaxed">{point}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'themes' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Themes & Core Discussion Points</h3>
                    <div className="space-y-6">
                      {result.data.aiAnalysis.keyThemes.map((theme, index) => (
                        <div key={index} className="bg-indigo-50 rounded-lg p-6 border-l-4 border-indigo-400">
                          <div className="flex items-start">
                            <span className="flex-shrink-0 w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 mt-1">
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              {/* Theme Title */}
                              <h4 className="text-xl font-bold text-indigo-900 mb-3">{theme.title}</h4>
                              
                              {/* Theme Summary */}
                              <p className="text-gray-800 leading-relaxed mb-4">{theme.summary}</p>
                              
                              {/* Key Quote - Optional */}
                              {theme.keyQuote && (
                                <div className="bg-white/70 rounded-lg p-4 mb-3 border-l-4 border-indigo-200">
                                  <div className="flex items-start">
                                    <svg className="w-6 h-6 text-indigo-400 mr-3 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707A1 1 0 011 8.586v-4a1 1 0 01.293-.707l3-3A1 1 0 016 1h4a1 1 0 011 1v4a1 1 0 01-.293.707l-3 3z" clipRule="evenodd" />
                                    </svg>
                                    <blockquote className="text-gray-700 italic leading-relaxed">
                                      "{theme.keyQuote}"
                                    </blockquote>
                                  </div>
                                </div>
                              )}
                              
                              {/* Timestamp */}
                              <div className="flex items-center text-sm">
                                <svg className="w-4 h-4 mr-1 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                <span className="text-gray-600 mr-2">Jump to discussion:</span>
                                {renderClickableTimestamp(theme.timestamp, 'text-sm font-medium')}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'tools' && result.data.aiAnalysis.toolsAndCompanies.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Tools & Companies Mentioned</h3>
                    <div className="space-y-4">
                      {result.data.aiAnalysis.toolsAndCompanies.map((item, index) => (
                        <div key={index} className="bg-purple-50 rounded-lg p-4 border border-purple-200 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-2 mb-2">
                            {item.link ? (
                              <a 
                                href={item.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="font-semibold text-purple-900 hover:text-purple-700 underline decoration-dotted flex items-center gap-1"
                              >
                                {item.name}
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </a>
                            ) : (
                              <span className="font-semibold text-purple-900">{item.name}</span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              item.type === 'tool' ? 'bg-blue-100 text-blue-800' :
                              item.type === 'company' ? 'bg-green-100 text-green-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {item.type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">{item.context}</p>
                          {item.link && (
                            <div className="mt-2 pt-2 border-t border-purple-200">
                              <p className="text-xs text-purple-600">
                                <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                                </svg>
                                Official website
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}


                {activeTab === 'social' && result.data.socialMediaPosts && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Media Posts</h3>
                    <div className="space-y-6">
                      {result.data.socialMediaPosts.posts.map((post, index) => (
                        <div key={index} className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-blue-900 flex items-center">
                              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84"></path>
                              </svg>
                              Social Media Post #{index + 1}
                            </h4>
                            <button
                              onClick={() => navigator.clipboard.writeText(post)}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors flex items-center"
                            >
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"></path>
                                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2V5a2 2 0 00-2-2V5a1 1 0 00-1-1H6a1 1 0 00-1 1v2a2 2 0 00-2 2v6h2V5z"></path>
                              </svg>
                              Copy
                            </button>
                          </div>
                          <div className="bg-white/70 rounded-lg p-4 border border-blue-100">
                            <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-sans">
                              {post}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'transcript' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Full Transcript</h3>
                    <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto overflow-x-auto border">
                      <div className="text-sm text-gray-800 font-mono leading-relaxed space-y-2">
                        {result.data.transcript.map((segment, index) => {
                          const minutes = Math.floor(segment.start / 60);
                          const seconds = Math.floor(segment.start % 60);
                          const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                          
                          return (
                            <div key={index} className="flex">
                              <button
                                onClick={() => seekToTimestamp(timestamp)}
                                className="text-blue-600 hover:text-blue-800 underline cursor-pointer transition-colors mr-2 font-medium flex-shrink-0"
                                title={`Jump to ${timestamp}`}
                              >
                                [{timestamp}]
                              </button>
                              <span className="break-words">{segment.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoAnalyzer;