import { Jimp } from 'jimp';

async function analyzeColors() {
  try {
    const image = await Jimp.read('C:\\Users\\HP\\.gemini\\antigravity\\brain\\57d88613-c6f8-446d-a15f-7d5fbd83be11\\media__1780163602210.png');
    const colorCounts = {};
    
    // Sample a grid of pixels
    for (let y = 0; y < image.bitmap.height; y += 4) {
      for (let x = 0; x < image.bitmap.width; x += 4) {
        const idx = (y * image.bitmap.width + x) * 4;
        const r = image.bitmap.data[idx];
        const g = image.bitmap.data[idx + 1];
        const b = image.bitmap.data[idx + 2];
        
        // Find orange pixels: where Red is significantly greater than Blue, and Green is medium
        if (r - b > 80 && g - b > 40) {
          const key = `${Math.round(r/10)*10},${Math.round(g/10)*10},${Math.round(b/10)*10}`;
          colorCounts[key] = (colorCounts[key] || 0) + 1;
        }
      }
    }
    
    console.log('DOMINANT_ORANGE_COLORS:', Object.entries(colorCounts).sort((a,b) => b[1] - a[1]).slice(0, 10));
  } catch (err) {
    console.error(err);
  }
}

analyzeColors();
