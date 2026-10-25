const fs=require('fs'),path=require('path'),YAML=require('yaml');
const R='C:/Users/jiami/OneDrive/Desktop/Claude/bobalab-website/content/';
function fm(f){const t=fs.readFileSync(f,'utf8');const m=t.match(/^---\r?\n([\s\S]*?)\r?\n---/);return {d:m?YAML.parse(m[1]):{},body:m?t.slice(m[0].length).trim():t}}
const kind=process.argv[2];
for(const f of fs.readdirSync(R+kind)){const {d,body}=fm(R+kind+'/'+f);
 if(kind==='publications') console.log([f.replace('.md',''),d.year,d.type,d.status,(d.directions||[]).join('+'),d.venue||'',d.title, d.featured?'FEAT':'', d.draft?'DRAFT':'', (d.links&&Object.keys(d.links).join(','))||''].join(' | '));
 if(kind==='people') console.log([f.replace('.md',''),d.name,d.role,d.group||'',d.status||'',d.photo||'',d.photo_consent??'',d.draft?'DRAFT':'',(d.directions||[]).join('+')].join(' | '));
 if(kind==='news') console.log([f,d.date,d.title,d.draft?'DRAFT':'', (d.summary||body).slice(0,140).replace(/\n/g,' ')].join(' | '));
 if(kind==='projects') console.log([f,d.title,d.status,(d.directions||[]).join('+'),d.image||d.figure||'',d.draft?'DRAFT':'',(d.summary||'').slice(0,120)].join(' | '));
}
