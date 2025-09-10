import { useState } from 'react';
import VideoAnalyzer from './components/VideoAnalyzer';
import HistorySidebar from './components/HistorySidebar';
import { Play } from 'lucide-react';

export interface HistoryItem {
  id: string;
  videoId: string;
  url: string;
  title?: string;
  timestamp: string;
  analysisData: any;
}

function App() {
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [isNewVideo, setIsNewVideo] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleNewVideo = () => {
    setSelectedHistoryItem(null);
    setIsNewVideo(true);
  };

  const handleSelectHistory = (item: HistoryItem) => {
    setSelectedHistoryItem(item);
    setIsNewVideo(false);
  };

  const handleAnalysisComplete = () => {
    // This will be called when a new analysis is completed
    setIsNewVideo(false);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className={`grid grid-cols-1 h-screen transition-all duration-300 ${
        isSidebarCollapsed 
          ? 'lg:grid-cols-[60px_1fr]' 
          : 'lg:grid-cols-[320px_1fr]'
      }`}>
        {/* History Sidebar - Hidden on mobile, shown on desktop */}
        <div className="hidden lg:block">
          <HistorySidebar 
            onNewVideo={handleNewVideo}
            onSelectHistory={handleSelectHistory}
            selectedItem={selectedHistoryItem}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebar}
          />
        </div>
        
        {/* Main Content */}
        <div className="overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-8 lg:py-16 lg:px-8">
            <header className="text-center mb-12 lg:mb-20">
              <div className="flex items-center justify-center mb-6 lg:mb-8">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-slate-600 to-slate-800 rounded-full blur opacity-30"></div>
                  <div className="relative bg-white p-3 lg:p-4 rounded-full border border-slate-200 shadow-lg">
                    <Play className="h-6 w-6 lg:h-8 lg:w-8 text-slate-700" fill="currentColor" />
                  </div>
                </div>
              </div>
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-light text-slate-900 mb-4 lg:mb-6 tracking-tight">
                Podcaster
                <span className="font-medium text-slate-700"> Blaster</span>
              </h1>
              <p className="text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-light">
                Transform podcast content into strategic insights. Extract transcripts, discover key themes, and generate professional social content with precision.
              </p>
            </header>
            
            <VideoAnalyzer 
              selectedHistoryItem={selectedHistoryItem}
              isNewVideo={isNewVideo}
              onAnalysisComplete={handleAnalysisComplete}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;