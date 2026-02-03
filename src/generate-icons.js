const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createValidPNG(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = createIHDR(size, size);
  const imageData = createImageData(size);
  const idat = createIDAT(imageData);
  const iend = createIEND();
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createIHDR(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data.writeUInt8(8, 8);   // bit depth
  data.writeUInt8(6, 9);   // color type (RGBA)
  data.writeUInt8(0, 10);  // compression
  data.writeUInt8(0, 11);  // filter
  data.writeUInt8(0, 12);  // interlace
  
  return wrapChunk('IHDR', data);
}

function createImageData(size) {
  const rows = [];
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size * 0.35;
  const innerRadius = size * 0.15;
  
  for (let y = 0; y < size; y++) {
    const row = [0];
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      let r = 0x1a, g = 0x1a, b = 0x2e, a = 255;
      
      if (dist > outerRadius - 8 && dist < outerRadius + 8) {
        r = 0x00; g = 0xd4; b = 0xff;
      }
      
      if (dist < innerRadius) {
        r = 0x7b; g = 0x2c; b = 0xbf;
      }
      
      if (dist < innerRadius * 0.7) {
        const relX = (x - cx) / innerRadius;
        const relY = (y - cy) / innerRadius;
        if (relX > -0.3 && relX < 0.4 && Math.abs(relY) < (0.4 - relX) * 0.8) {
          r = 255; g = 255; b = 255;
        }
      }
      
      row.push(r, g, b, a);
    }
    rows.push(Buffer.from(row));
  }
  
  return Buffer.concat(rows);
}

function createIDAT(data) {
  const compressed = zlib.deflateSync(data, { level: 9 });
  return wrapChunk('IDAT', compressed);
}

function createIEND() {
  return wrapChunk('IEND', Buffer.alloc(0));
}

function wrapChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const crcInput = Buffer.concat([typeBytes, data]);
  const crc = crc32(crcInput);
  const crcBytes = Buffer.alloc(4);
  crcBytes.writeUInt32BE(crc, 0);
  
  return Buffer.concat([length, typeBytes, data, crcBytes]);
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = crcTable[(c ^ buf[n]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[192, 512].forEach(size => {
  const pngPath = path.join(iconsDir, `icon-${size}.png`);
  if (!fs.existsSync(pngPath)) {
    console.log(`Generating ${size}x${size} icon...`);
    const png = createValidPNG(size);
    fs.writeFileSync(pngPath, png);
    console.log(`Created icon-${size}.png`);
  }
});

console.log('Icon generation complete');
