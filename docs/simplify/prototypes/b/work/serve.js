const http=require('http'),fs=require('fs'),path=require('path');
const root=process.argv[2],port=+process.argv[3];
const T={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u.endsWith('/'))u+='index.html';const f=path.join(root,u);if(!f.startsWith(path.resolve(root))){r.writeHead(403);return r.end()}
fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end('nf')}r.writeHead(200,{'Content-Type':T[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});r.end(d)})}).listen(port,'127.0.0.1',()=>console.log('on',port));
