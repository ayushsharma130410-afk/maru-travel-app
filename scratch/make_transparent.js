import { Jimp } from 'jimp';

async function makeTransparent() {
  try {
    const image = await Jimp.read('C:\\Users\\HP\\.gemini\\antigravity\\brain\\57d88613-c6f8-446d-a15f-7d5fbd83be11\\media__1780163602210.png');
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    console.log(`Image dimensions: width = ${width}, height = ${height}`);
    
    // 2D visited array
    const visited = new Uint8Array(width * height);
    const queue = [];
    
    // Add all border pixels to the queue
    for (let x = 0; x < width; x++) {
      // Top border
      queue.push({ x, y: 0 });
      visited[x] = 1;
      // Bottom border
      queue.push({ x, y: height - 1 });
      visited[(height - 1) * width + x] = 1;
    }
    for (let y = 1; y < height - 1; y++) {
      // Left border
      queue.push({ x: 0, y });
      visited[y * width] = 1;
      // Right border
      queue.push({ x: width - 1, y });
      visited[y * width + (width - 1)] = 1;
    }
    
    // Pass 1: Flood fill for outer background
    let head = 0;
    while (head < queue.length) {
      const { x, y } = queue[head++];
      const idx = (y * width + x) * 4;
      const r = image.bitmap.data[idx];
      const g = image.bitmap.data[idx + 1];
      const b = image.bitmap.data[idx + 2];
      
      // Determine if the pixel is orange
      const isOrange = (r - b > 60) && (r - g > 35) && (g > 60) && (r > 130);
      
      if (!isOrange) {
        // Set transparent
        image.bitmap.data[idx + 3] = 0;
        
        // Push 4-neighbors
        const neighbors = [
          { x: x + 1, y },
          { x: x - 1, y },
          { x, y: y + 1 },
          { x, y: y - 1 }
        ];
        
        for (const n of neighbors) {
          if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
            const nIdx = n.y * width + n.x;
            if (visited[nIdx] === 0) {
              visited[nIdx] = 1;
              queue.push(n);
            }
          }
        }
      }
    }
    
    // Pass 2: Clean the inside of letters at the bottom (y > 200)
    for (let y = 200; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = image.bitmap.data[idx];
        const g = image.bitmap.data[idx + 1];
        const b = image.bitmap.data[idx + 2];
        
        // If it's not orange, set it to 100% transparent (cleans up loop holes inside A, R, U, etc.)
        const isOrange = (r - b > 60) && (r - g > 35) && (g > 60) && (r > 130);
        if (!isOrange) {
          image.bitmap.data[idx + 3] = 0;
        }
      }
    }
    
    await image.write('c:\\Users\\HP\\OneDrive\\Desktop\\travel app\\public\\maru_logo.png');
    console.log('LOGO_PROCESSING_SUCCESS: Outer grid and letter loop holes successfully keyed to transparent.');
  } catch (err) {
    console.error('Error processing image:', err);
  }
}

makeTransparent();
