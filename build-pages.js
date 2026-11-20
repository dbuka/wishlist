'use strict';

const { copyFile, writeFile, readFile } = require('node:fs/promises');
const { join } = require('node:path');

async function build() {
  const guest = await readFile(join(__dirname, 'wishlist.html'), 'utf8');
  const page = guest
    .replace('<body>', '<body data-published>')
    .replace(/\s*<a[^>]*data-editor-link[^>]*>.*?<\/a>/, '');
  await Promise.all([
    writeFile(join(__dirname, 'docs/index.html'), page),
    copyFile(join(__dirname, 'app.js'), join(__dirname, 'docs/app.js')),
    copyFile(join(__dirname, 'booking.js'), join(__dirname, 'docs/booking.js')),
    copyFile(join(__dirname, 'styles.css'), join(__dirname, 'docs/styles.css')),
  ]);
}

build().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
