'use strict';

const http = require('node:http');
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');

const host = '127.0.0.1';
const port = Number(process.argv[2] || 3000);
const files = {
  '/': ['index.html', 'text/html'],
  '/index.html': ['index.html', 'text/html'],
  '/wishlist.html': ['wishlist.html', 'text/html'],
  '/app.js': ['app.js', 'text/javascript'],
  '/styles.css': ['styles.css', 'text/css'],
  '/booking.js': ['booking.js', 'text/javascript'],
  '/wishlist/': ['docs/index.html', 'text/html'],
  '/wishlist/app.js': ['docs/app.js', 'text/javascript'],
  '/wishlist/booking.js': ['docs/booking.js', 'text/javascript'],
  '/wishlist/styles.css': ['docs/styles.css', 'text/css'],
  '/wishlist/gifts.json': ['docs/gifts.json', 'application/json'],
  '/wishlist/booking-config.json': ['docs/booking-config.json', 'application/json'],
};

function respond(res, status, type, body) {
  res.writeHead(status, {
    'Content-Type': type + '; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  res.end(body);
}

async function handle(req, res) {
  if (req.headers.host !== host + ':' + port && req.headers.host !== 'localhost:' + port) {
    return respond(res, 403, 'text/plain', 'Forbidden');
  }
  if (req.method !== 'GET') return respond(res, 405, 'text/plain', 'Method not allowed');
  const route = new URL(req.url, 'http://' + host);
  if (!Object.hasOwn(files, route.pathname)) return respond(res, 404, 'text/plain', 'Not found');
  const [file, type] = files[route.pathname];
  respond(res, 200, type, await readFile(join(__dirname, file)));
}

if (require.main === module) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('Укажите номер порта от 1 до 65535.');
    process.exit(1);
  }
  const server = http.createServer((req, res) => {
    handle(req, res).catch(() => respond(res, 500, 'text/plain', 'Server error'));
  });
  server.on('error', error => {
    if (error.code === 'EADDRINUSE') {
      console.error('Порт ' + port + ' занят. Если вишлист уже запущен, откройте http://' + host + ':' + port + '/. Иначе укажите другой порт в команде запуска, например 3001.');
    } else {
      console.error('Не удалось запустить сервер (' + (error.code || error.name) + '): ' + error.message);
    }
    process.exitCode = 1;
  });
  server.listen(port, host, () => console.log('Список желаний: http://' + host + ':' + port + '/'));
}

