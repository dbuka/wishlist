'use strict';

const { copyFile, mkdir, writeFile, readFile } = require('node:fs/promises');
const { join } = require('node:path');

async function build() {
  const guest = await readFile(join(__dirname, 'wishlist.html'), 'utf8');
  const page = guest
    .replace('<body>', '<body data-published>')
    .replace(/\s*<a[^>]*data-editor-link[^>]*>.*?<\/a>/, '');
  const output = join(__dirname, 'dist');
  await mkdir(output, { recursive: true });
  await Promise.all([
    writeFile(join(output, 'index.html'), page),
    copyFile(join(__dirname, 'app.js'), join(output, 'app.js')),
    copyFile(join(__dirname, 'booking.js'), join(output, 'booking.js')),
    copyFile(join(__dirname, 'styles.css'), join(output, 'styles.css')),
    copyFile(join(__dirname, 'docs/gifts.json'), join(output, 'gifts.json')),
    copyFile(join(__dirname, 'docs/booking-config.json'), join(output, 'booking-config.json')),
  ]);
}

build().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
