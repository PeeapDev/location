/**
 * Generate PWA Icons for Xeeno Map
 *
 * Run: node scripts/generate-icons.js
 *
 * This creates icon-192.png and icon-512.png in the public folder
 */

const fs = require('fs');
const path = require('path');

// Simple PNG generator using raw bytes
// Creates a basic icon with the SL branding

function createPNG(size) {
  // Create a simple colored square PNG
  // This is a minimal PNG implementation

  const width = size;
  const height = size;

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT chunk - image data
  const rawData = [];

  // Brand color: #4F46E5 (indigo)
  const bgR = 79, bgG = 70, bgB = 229;
  // White for pin
  const pinR = 255, pinG = 255, pinB = 255;

  const centerX = width / 2;
  const centerY = height / 2;
  const pinRadius = width * 0.25;
  const innerRadius = width * 0.1;

  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY * 0.85;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Check if inside pin circle
      const inPin = dist < pinRadius && y < centerY + pinRadius * 0.8;
      // Check if in pin point (triangle at bottom)
      const inPoint = y >= centerY && y < centerY + pinRadius &&
        Math.abs(dx) < (centerY + pinRadius - y) * 0.6;
      // Check if in inner circle
      const inInner = dist < innerRadius;

      if ((inPin || inPoint) && !inInner) {
        rawData.push(pinR, pinG, pinB);
      } else if (inInner) {
        rawData.push(bgR, bgG, bgB);
      } else {
        rawData.push(bgR, bgG, bgB);
      }
    }
  }

  // Compress with zlib (deflate)
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(rawData), { level: 9 });

  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');

  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 implementation
function crc32(data) {
  let crc = 0xffffffff;
  const table = makeCRCTable();

  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function makeCRCTable() {
  const table = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

// Generate icons
const publicDir = path.join(__dirname, '..', 'public');

console.log('Generating PWA icons...');

// 192x192 icon
const icon192 = createPNG(192);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);
console.log('Created icon-192.png');

// 512x512 icon
const icon512 = createPNG(512);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);
console.log('Created icon-512.png');

console.log('Done!');
