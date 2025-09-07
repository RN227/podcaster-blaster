import VideoAnalyzer from './components/VideoAnalyzer';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Podcaster Blaster
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Extract transcripts from YouTube videos and get AI-powered analysis 
            including key takeaways, tools mentioned, and interesting quotes.
          </p>
        </header>
        
        <VideoAnalyzer />
      </div>
    </div>
  );
}

export default App;