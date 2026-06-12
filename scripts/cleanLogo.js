import Jimp from 'jimp';
const path = require('path');

const inputPath = path.join(__dirname, '..', 'public', 'maru_logo.png');
const outputPath = inputPath; // overwrite

Jimp.read(inputPath)
  .then(image => {
    const threshold = 240;
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
      const r = image.bitmap.data[idx + 0];
      const g = image.bitmap.data[idx + 1];
      const b = image.bitmap.data[idx + 2];
      if (r > threshold && g > threshold && b > threshold) {
        image.bitmap.data[idx + 3] = 0;
      }
    });
    return image.writeAsync(outputPath);
  })
  .then(() => {
    console.log('Logo cleaned and saved to', outputPath);
  })
  .catch(err => {
    console.error('Error processing logo:', err);
    process.exit(1);
  });
