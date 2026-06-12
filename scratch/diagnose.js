import { Jimp } from 'jimp';

async function diagnose() {
  try {
    const image = await Jimp.read('c:\\Users\\HP\\OneDrive\\Desktop\\travel app\\public\\maru_logo.png');
    let transparentCount = 0;
    let solidCount = 0;
    
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const alpha = this.bitmap.data[idx + 3];
      if (alpha < 255) {
        transparentCount++;
      } else {
        solidCount++;
      }
    });
    
    console.log(`DIAGNOSIS_RESULT: Transparent pixels = ${transparentCount}, Solid pixels = ${solidCount}, Total = ${transparentCount + solidCount}`);
  } catch (err) {
    console.error('Error reading image:', err);
  }
}

diagnose();
