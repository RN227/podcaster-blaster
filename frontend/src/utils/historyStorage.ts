import type { HistoryItem } from '../App';

const STORAGE_KEY = 'podcaster-blaster-history';
const MAX_HISTORY_ITEMS = 50;

export const saveToHistory = (analysisData: any): void => {
  try {
    const existingHistory = getHistory();
    
    // Create new history item
    const newItem: HistoryItem = {
      id: generateId(),
      videoId: analysisData.videoId,
      url: analysisData.url,
      title: analysisData.title || 'Untitled Video',
      timestamp: new Date().toISOString(),
      analysisData: analysisData
    };

    // Check if this video already exists in history
    const existingIndex = existingHistory.findIndex(item => item.videoId === analysisData.videoId);
    
    let updatedHistory: HistoryItem[];
    if (existingIndex !== -1) {
      // Update existing item (move to top and update data)
      updatedHistory = [newItem, ...existingHistory.filter((_, index) => index !== existingIndex)];
    } else {
      // Add new item to the beginning
      updatedHistory = [newItem, ...existingHistory];
    }

    // Limit to MAX_HISTORY_ITEMS
    if (updatedHistory.length > MAX_HISTORY_ITEMS) {
      updatedHistory = updatedHistory.slice(0, MAX_HISTORY_ITEMS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error saving to history:', error);
  }
};

export const getHistory = (): HistoryItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch (error) {
    console.error('Error loading history:', error);
    return [];
  }
};

export const clearHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing history:', error);
  }
};

export const removeFromHistory = (id: string): void => {
  try {
    const existingHistory = getHistory();
    const updatedHistory = existingHistory.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error removing from history:', error);
  }
};

// Generate a simple unique ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Check if storage is available
export const isStorageAvailable = (): boolean => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};