import React, { useState, useEffect } from 'react';
import { Plus, History, Clock, Play, Trash2, PanelLeft, PanelLeftOpen } from 'lucide-react';
import type { HistoryItem } from '../App';
import { getHistory, clearHistory as clearHistoryStorage } from '../utils/historyStorage';

interface HistorySidebarProps {
  onNewVideo: () => void;
  onSelectHistory: (item: HistoryItem) => void;
  selectedItem: HistoryItem | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({
  onNewVideo,
  onSelectHistory,
  selectedItem,
  isCollapsed,
  onToggleCollapse
}) => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  // Load history from localStorage on component mount
  useEffect(() => {
    const loadHistory = () => {
      const items = getHistory();
      setHistoryItems(items);
    };

    loadHistory();
    
    // Listen for storage changes (when new items are added)
    const handleStorageChange = () => {
      loadHistory();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('historyUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('historyUpdated', handleStorageChange);
    };
  }, []);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all history? This cannot be undone.')) {
      clearHistoryStorage();
      setHistoryItems([]);
      // Dispatch event to update other components
      window.dispatchEvent(new Event('historyUpdated'));
    }
  };

  const truncateTitle = (title: string | undefined, maxLength: number = 45) => {
    if (!title) return 'Untitled Video';
    return title.length > maxLength ? `${title.substring(0, maxLength)}...` : title;
  };

  if (isCollapsed) {
    return (
      <div className="h-screen bg-white/80 backdrop-blur-sm border-r border-slate-200/50 flex flex-col w-[60px]">
        {/* Header - Collapsed */}
        <div className="p-3 border-b border-slate-200/50">
          <div className="flex flex-col items-center space-y-3">
            {/* Expand Button */}
            <button
              onClick={onToggleCollapse}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="h-5 w-5" />
            </button>
            
            {/* New Video Button - Icon Only */}
            <button
              onClick={onNewVideo}
              className="p-3 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-xl hover:from-slate-800 hover:to-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all duration-200 shadow-lg shadow-slate-200/50"
              title="New Video"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* History Icons */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-1 space-y-1">
            {historyItems.slice(0, 8).map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectHistory(item)}
                  className={`w-full p-2 rounded-xl transition-all duration-200 group ${
                    isSelected
                      ? 'bg-slate-100/80 border border-slate-200/50 shadow-sm'
                      : 'hover:bg-slate-50/60 hover:shadow-sm'
                  }`}
                  title={item.title || 'Untitled Video'}
                >
                  <div className="flex justify-center">
                    <Play className="h-4 w-4 text-slate-600" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        {historyItems.length > 0 && (
          <div className="p-3 border-t border-slate-200/50">
            <div className="flex justify-center">
              <History className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen bg-white/80 backdrop-blur-sm border-r border-slate-200/50 flex flex-col w-[320px] transition-all duration-300">
      {/* Header */}
      <div className="p-6 border-b border-slate-200/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <History className="h-5 w-5 text-slate-600" />
            History
          </h2>
          <div className="flex items-center gap-1">
            {/* Collapse Button */}
            <button
              onClick={onToggleCollapse}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            {historyItems.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Clear all history"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* New Video Button */}
        <button
          onClick={onNewVideo}
          className="w-full bg-gradient-to-r from-slate-700 to-slate-800 text-white py-3 px-4 rounded-2xl hover:from-slate-800 hover:to-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all duration-200 font-medium text-sm shadow-lg shadow-slate-200/50 flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Video
        </button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto">
        {historyItems.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-slate-400 mb-3">
              <Play className="h-8 w-8 mx-auto opacity-50" />
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              Your analyzed videos will appear here. Start by analyzing a YouTube video above.
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {historyItems.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectHistory(item)}
                  className={`w-full p-3 rounded-2xl text-left transition-all duration-200 group ${
                    isSelected
                      ? 'bg-slate-100/80 border border-slate-200/50 shadow-sm'
                      : 'hover:bg-slate-50/60 hover:shadow-sm'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Video Title */}
                    <h3 className={`text-sm font-medium leading-tight transition-colors ${
                      isSelected ? 'text-slate-900' : 'text-slate-800 group-hover:text-slate-900'
                    }`}>
                      {truncateTitle(item.title)}
                    </h3>
                    
                    {/* Metadata */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-500">
                          {formatTimestamp(item.timestamp)}
                        </span>
                      </div>
                      
                      {/* Video ID Badge */}
                      <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                        {item.videoId.substring(0, 6)}...
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {historyItems.length > 0 && (
        <div className="p-4 border-t border-slate-200/50">
          <p className="text-xs text-slate-500 text-center">
            {historyItems.length} video{historyItems.length !== 1 ? 's' : ''} analyzed
          </p>
        </div>
      )}
    </div>
  );
};

export default HistorySidebar;