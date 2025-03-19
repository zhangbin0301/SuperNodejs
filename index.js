const port = process.env.PORT || process.env.SERVER_PORT || 3000;
const FILE_PATH = process.env.FILE_PATH || './.npm';
const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');

const startScriptPath = './start.sh';
fs.chmodSync(startScriptPath, 0o755);
const subFilePath = FILE_PATH + '/log.txt';

const startScript = spawn(startScriptPath);
startScript.stdout.on('data', (data) => {
  console.log(`${data}`);
});
startScript.stderr.on('data', (data) => {
  console.error(`${data}`);
});
startScript.on('error', (error) => {
  console.error(`boot error: ${error}`);
  process.exit(1);
});

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200);
    res.end('hello world');
  } else if (req.url === '/healthcheck') {
    res.writeHead(200);
    res.end('ok');
  } else if (req.url === '/sub') {
    fs.readFile(subFilePath, 'utf8', (error, data) => {
      if (error) {
        res.writeHead(500);
        res.end('Error reading file');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(data);
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(port, () => {
  console.log(`server is listening on port : ${port}`);
});
