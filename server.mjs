import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const types = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
http.createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep) || !types[path.extname(file)] || pathname.includes('node_modules')) {res.writeHead(404);res.end();return;}
    const body = await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]+'; charset=utf-8'});res.end(body);
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(5188,'127.0.0.1',()=>console.log('XRD Workbench: http://127.0.0.1:5188'));

