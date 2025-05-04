const fs = require('fs');
const path = require('path');

// Create a simple SVG icon
const createSVGIcon = (size) => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="100%" height="100%" fill="#4285f4"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size/3}" fill="white"/>
    <rect x="${size/3}" y="${size/3}" width="${size/3}" height="${size/3}" fill="#4285f4"/>
  </svg>`;
};

// Sizes for the icons
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// Generate icons for each size
sizes.forEach(size => {
  const iconPath = path.join(iconsDir, `icon-${size}x${size}.png`);
  const svgContent = createSVGIcon(size);
  
  // Write SVG file (as a placeholder for PNG)
  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.svg`), svgContent);
  
  console.log(`Created icon: ${iconPath}`);
});

console.log('Icon generation complete. Note: These are SVG placeholders. For production, convert to PNG.');