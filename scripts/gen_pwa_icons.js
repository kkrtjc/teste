const sharp = require('sharp');
const path = require('path');

const outDir = path.join(__dirname, '..', 'client', 'public');

async function main() {
  const svg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
      <rect width="512" height="512" rx="96" fill="#2d5016"/>
      <text x="50%" y="58%" text-anchor="middle" font-family="Arial" font-size="220" fill="white">GM</text>
    </svg>
  `);

  await sharp(svg).resize(192, 192).png().toFile(path.join(outDir, 'app-icon-192.png'));
  await sharp(svg).resize(512, 512).png().toFile(path.join(outDir, 'app-icon-512.png'));
  console.log('icons ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

