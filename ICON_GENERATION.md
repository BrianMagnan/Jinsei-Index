# App Icon Generation Guide

This guide explains how to generate the required icon files for the PWA.

## Required Icon Sizes

1. **favicon-16x16.png** - 16x16 pixels (browser tab)
2. **favicon-32x32.png** - 32x32 pixels (browser tab)
3. **apple-touch-icon.png** - 180x180 pixels (iOS home screen)
4. **icon-192.png** - 192x192 pixels (Android home screen, PWA)
5. **icon-512.png** - 512x512 pixels (Android splash screen, PWA)

## Source File

The source SVG icon is located at: `public/icon.svg`

## Generation Methods

### Option 1: Using Online Tools

1. **Favicon.io** (https://favicon.io/)
   - Upload `icon.svg` or use the text/emoji generator
   - Download the generated favicon package
   - Extract and place files in `public/` directory

2. **RealFaviconGenerator** (https://realfavicongenerator.net/)
   - Upload `icon.svg`
   - Configure options
   - Download and extract to `public/` directory

### Option 2: Using ImageMagick (Command Line)

If you have ImageMagick installed:

```bash
# Generate favicons
convert public/icon.svg -resize 16x16 public/favicon-16x16.png
convert public/icon.svg -resize 32x32 public/favicon-32x32.png

# Generate Apple touch icon
convert public/icon.svg -resize 180x180 public/apple-touch-icon.png

# Generate PWA icons
convert public/icon.svg -resize 192x192 public/icon-192.png
convert public/icon.svg -resize 512x512 public/icon-512.png
```

### Option 3: Using Node.js Script

Create a script using `sharp` or `jimp`:

```bash
npm install --save-dev sharp
```

Then create `scripts/generate-icons.js`:

```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

const input = path.join(__dirname, '../public/icon.svg');
const outputDir = path.join(__dirname, '../public');

sizes.forEach(({ name, size }) => {
  sharp(input)
    .resize(size, size)
    .png()
    .toFile(path.join(outputDir, name))
    .then(() => console.log(`Generated ${name}`))
    .catch(err => console.error(`Error generating ${name}:`, err));
});
```

Run with: `node scripts/generate-icons.js`

### Option 4: Using Design Tools

1. Open `icon.svg` in Figma, Adobe Illustrator, or similar
2. Export each size as PNG
3. Place files in `public/` directory

## File Structure

After generation, your `public/` directory should contain:

```
public/
├── icon.svg (source)
├── favicon-16x16.png
├── favicon-32x32.png
├── apple-touch-icon.png
├── icon-192.png
├── icon-512.png
└── manifest.json (already created)
```

## Testing

After generating icons:

1. Test in browser: Check that favicon appears in browser tab
2. Test on iOS: Add to home screen and verify icon appears
3. Test on Android: Install as PWA and verify icon appears
4. Use Chrome DevTools > Application > Manifest to verify all icons are detected

## Notes

- Icons should have transparent backgrounds (except for maskable icons if needed)
- The current icon uses the app's primary color (#0ea5e9) and dark background (#0a0a0f)
- For maskable icons, ensure important content is within the safe zone (80% of the icon)
