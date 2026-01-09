import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const input = join(__dirname, '../public/icon.svg');
const outputDir = join(__dirname, '../public');

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

// Check if input file exists
if (!existsSync(input)) {
  console.error(`Error: Input file not found: ${input}`);
  process.exit(1);
}

console.log('Generating PNG icons from SVG...\n');

let successCount = 0;
let errorCount = 0;

for (const { name, size } of sizes) {
  const output = join(outputDir, name);
  try {
    await sharp(input)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png()
      .toFile(output);
    console.log(`✓ Generated ${name} (${size}x${size})`);
    successCount++;
  } catch (error) {
    console.error(`✗ Error generating ${name}:`, error.message);
    errorCount++;
  }
}

console.log(`\n${successCount} icons generated successfully`);
if (errorCount > 0) {
  console.error(`${errorCount} errors occurred`);
  process.exit(1);
}
