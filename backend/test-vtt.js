const fs = require('fs');
const path = require('path');

// Copy the VTT parsing logic from TranscriptService
function vttTimeToSeconds(timeStr) {
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseFloat(parts[2]);
  
  return hours * 3600 + minutes * 60 + seconds;
}

function parseVttContent(content) {
  const segments = [];
  const lines = content.split('\n');
  let currentSegment = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip WEBVTT header and empty lines
    if (!line || line === 'WEBVTT' || line.startsWith('NOTE') || line.startsWith('Kind:') || line.startsWith('Language:')) {
      continue;
    }
    
    // Time stamp line (e.g., "00:00:01.000 --> 00:00:04.000")
    if (line.includes(' --> ')) {
      const [startTime, endTime] = line.split(' --> ');
      const start = vttTimeToSeconds(startTime);
      const end = vttTimeToSeconds(endTime);
      
      currentSegment = {
        start,
        duration: end - start
      };
    } 
    // Text line
    else if (currentSegment.start !== undefined) {
      // Skip lines with positioning info
      if (line.includes('align:') || line.includes('position:')) {
        continue;
      }
      
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

// Test with the actual VTT file
const vttPath = path.join(__dirname, 'temp', 'dQw4w9WgXcQ.en-orig.vtt');
const content = fs.readFileSync(vttPath, 'utf-8');

console.log('Testing VTT parsing...');
console.log('File size:', content.length, 'characters');

const segments = parseVttContent(content);
console.log(`Parsed ${segments.length} segments`);

if (segments.length > 0) {
  console.log('First few segments:');
  segments.slice(0, 5).forEach((seg, i) => {
    console.log(`${i + 1}. [${seg.start}s] ${seg.text}`);
  });
} else {
  console.log('No segments found - debugging...');
  const lines = content.split('\n');
  console.log('First 20 lines:');
  lines.slice(0, 20).forEach((line, i) => {
    console.log(`${i + 1}: "${line}"`);
  });
}