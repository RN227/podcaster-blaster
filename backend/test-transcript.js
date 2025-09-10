const { YoutubeTranscript } = require('youtube-transcript');

async function testTranscript() {
  // Test with different videos
  const testVideos = [
    'dQw4w9WgXcQ', // Rick Roll
    '9bZkp7q19f0', // PSY - Gangnam Style
    'kJQP7kiw5Fk', // Luis Fonsi - Despacito
  ];

  for (const videoId of testVideos) {
    try {
      console.log(`\nTesting video ${videoId}...`);
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      console.log(`✅ Found ${transcript.length} segments`);
      if (transcript.length > 0) {
        console.log('First segment:', transcript[0]);
        break; // Exit on first success
      }
    } catch (error) {
      console.error(`❌ Error for ${videoId}:`, error.message);
    }
  }
}

testTranscript();