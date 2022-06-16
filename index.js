const crypto = require('crypto');
const dotenv = require('dotenv');
const fs = require('fs');
const http = require('http');
const process = require('process');

const BASE_URL = 'http://datamall2.mytransport.sg';

// Load environment variables
dotenv.config();

// Ensure "ACCOUNT_KEY" environment variable exists
const accountKey = process.env['ACCOUNT_KEY'];
if (!accountKey) {
  console.log('Please provide "ACCOUNT_KEY" environment variable');
  return;
}

async function get(path) {
  console.log(`HTTP GET: ${path}`);
  return new Promise(resolve => {
    http.get(`${BASE_URL}${path}`, {
      headers: {
        'AccountKey': accountKey,
      },
    }, res => {
      let data = '';
      res.setEncoding('utf-8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve(JSON.parse(data));
      });
      res.on('error', () => {
        resolve(null);
      });
    });
  });
}

async function sleep(milliseconds) {
  await new Promise(resolve => {
    setTimeout(() => resolve(), milliseconds);
  });
}

async function writeFile(path, data) {
  const str = JSON.stringify(data, undefined, '  ');
  const hash = crypto.createHash('sha256').update(str).digest('base64');
  await fs.writeFile(path, str, () => { });
  await fs.writeFile(`${path}.sha256`, hash, () => { });
}

async function execute(urlPath, filePath, delay) {
  delay = delay || 1000;
  let skip = 0;
  let data = [];
  while (true) {
    const ret = await get(`${urlPath}${skip > 0 ? `?$skip=${skip}` : ''}`);
    if (!ret['value'].length) {
      break;
    }
    data = data.concat(ret['value']);
    skip += ret['value'].length;
    await sleep(delay);
  }
  await writeFile(filePath, data);
}

(async () => {
  const cmd = process.argv[2];
  if (cmd === 'busstops') {
    await execute('/ltaodataservice/BusStops', 'data/busstops.json');
  } else if (cmd === 'busroutes') {
    await execute('/ltaodataservice/BusRoutes', 'data/busroutes.json');
  } else if (cmd === 'busservices') {
    await execute('/ltaodataservice/BusServices', 'data/busservices.json');
  } else {
    console.log(`Unrecognized command: ${cmd}`);
  }
})();
