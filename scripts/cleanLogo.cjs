// cleanLogo.cjs – removes near‑white pixels from the logo and overwrites the public image
const { Jimp } = require('jimp');
const path = require('path');

const inputPath = path.join(__dirname, '..', 'public', 'maru_logo.png');
const outputPath = inputPath; // overwrite

Jimp.read(inputPath)
  .then(image => {
    // Define a threshold for "white" (e.g., >240 for each RGB channel)
    const threshold = 240;
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
      const r = image.bitmap.data[idx + 0];
      const g = image.bitmap.data[idx + 1];
      const b = image.bitmap.data[idx + 2];
      if (r > threshold && g > threshold && b > threshold) {
        // make pixel fully transparent
        image.bitmap.data[idx + 3] = 0;
      }
    });
    return image.write(outputPath);
  })
  .then(() => {
    console.log('Logo cleaned and saved to', outputPath);
  })
  .catch(err => {
    console.error('Error processing logo:', err);
    process.exit(1);
  });
