const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs');

const sourcePath = path.join(__dirname, 'maru-app-icon.png');
const resDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

const densities = [
  { folder: 'mipmap-mdpi', launcher: 48, foreground: 108 },
  { folder: 'mipmap-hdpi', launcher: 72, foreground: 162 },
  { folder: 'mipmap-xhdpi', launcher: 96, foreground: 216 },
  { folder: 'mipmap-xxhdpi', launcher: 144, foreground: 324 },
  { folder: 'mipmap-xxxhdpi', launcher: 192, foreground: 432 },
];

async function generate() {
  const source = await Jimp.read(sourcePath);

  for (const density of densities) {
    const dir = path.join(resDir, density.folder);
    fs.mkdirSync(dir, { recursive: true });

    const launcher = source.clone().resize({ w: density.launcher, h: density.launcher });
    await launcher.write(path.join(dir, 'ic_launcher.png'));

    const round = source.clone().resize({ w: density.launcher, h: density.launcher });
    await round.write(path.join(dir, 'ic_launcher_round.png'));

    const foreground = source.clone().resize({ w: density.foreground, h: density.foreground });
    await foreground.write(path.join(dir, 'ic_launcher_foreground.png'));
  }

  const splashSizes = [
    { folder: 'drawable', size: 480 },
    { folder: 'drawable-port-mdpi', size: 320 },
    { folder: 'drawable-port-hdpi', size: 480 },
    { folder: 'drawable-port-xhdpi', size: 720 },
    { folder: 'drawable-port-xxhdpi', size: 960 },
    { folder: 'drawable-port-xxxhdpi', size: 1280 },
    { folder: 'drawable-land-mdpi', size: 320 },
    { folder: 'drawable-land-hdpi', size: 480 },
    { folder: 'drawable-land-xhdpi', size: 720 },
    { folder: 'drawable-land-xxhdpi', size: 960 },
    { folder: 'drawable-land-xxxhdpi', size: 1280 },
  ];

  for (const splash of splashSizes) {
    const dir = path.join(resDir, splash.folder);
    fs.mkdirSync(dir, { recursive: true });

    const canvas = new Jimp({ width: splash.size, height: splash.size, color: 0xffffffff });
    const logoSize = Math.round(splash.size * 0.55);
    const logo = source.clone().resize({ w: logoSize, h: logoSize });
    const x = Math.floor((splash.size - logoSize) / 2);
    const y = Math.floor((splash.size - logoSize) / 2);
    canvas.composite(logo, x, y);
    await canvas.write(path.join(dir, 'splash.png'));
  }

  console.log('Android launcher icons and splash screens generated.');
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
