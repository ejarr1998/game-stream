const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(size) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  const width = size;
  const height = size;
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);
  ihdrData.writeUInt8(2, 9);
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdr = createChunk('IHDR', ihdrData);
  
  const rawData = [];
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.2;
  
  for (let y = 0; y < height; y++) {
    rawData.push(0);
    for (let x = 0; x < width; x++) {
      let r = 0x1a, g = 0x1a, b = 0x2e;
      
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < radius * 1.5) {
        r = 0x7b; g = 0x2c; b = 0xbf;
      }
      
      if (x >= cx - radius * 0.3 && x <= cx + radius * 0.5) {
        const relY = (y - cy) / radius;
        const maxX = cx + radius * 0.5 - Math.abs(relY) * radius * 0.8;
        const minX = cx - radius * 0.3;
        if (x >= minX && x <= maxX && Math.abs(relY) < 0.6) {
          r = 0xff; g = 0xff; b = 0xff;
        }
      }
      
      const ringDist = Math.abs(dist - radius * 2.5);
      if (ringDist < size * 0.03) {
        r = 0x00; g = 0xd4; b = 0xff;
      }
      
      rawData.push(r, g, b);
    }
  }
  
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idat = createChunk('IDAT', compressed);
  const iend = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type);
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return crc ^ 0xffffffff;
}

const iconsDir = path.join(__dirname, '../public/icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[192, 512].forEach(size => {
  const pngPath = path.join(iconsDir, `icon-${size}.png`);
  if (!fs.existsSync(pngPath)) {
    console.log(`Generating ${size}x${size} icon...`);
    const png = createPNG(size);
    fs.writeFileSync(pngPath, png);
    console.log(`Created icon-${size}.png`);
  }
});

console.log('Icon generation complete');
