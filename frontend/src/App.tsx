import VideoAnalyzer from './components/VideoAnalyzer';
import { Play } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-16 lg:px-8">
        <header className="text-center mb-20">
          <div className="flex items-center justify-center mb-8">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-slate-600 to-slate-800 rounded-full blur opacity-30"></div>
              <div className="relative bg-white p-4 rounded-full border border-slate-200 shadow-lg">
                <Play className="h-8 w-8 text-slate-700" fill="currentColor" />
              </div>
            </div>
          </div>
          <h1 className="text-5xl lg:text-6xl font-light text-slate-900 mb-6 tracking-tight">
            Podcaster
            <span className="font-medium text-slate-700"> Blaster</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-light">
            Transform podcast content into strategic insights. Extract transcripts, discover key themes, and generate professional social content with precision.
          </p>
        </header>
        
        <VideoAnalyzer />
      </div>
    </div>
  );
}

export default App;