const fs=require('fs'),path=require('path'),YAML=require('yaml');
const R='C:/Users/jiami/OneDrive/Desktop/Claude/bobalab-website/content/';
function fm(f){const t=fs.readFileSync(f,'utf8');const m=t.match(/^---\n([\s\S]*?)\n---/);return YAML.parse(m[1]);}
const out={pubs:[],people:[],news:[],projects:[]};
for(const f of fs.readdirSync(R+'publications')){const d=fm(R+'publications/'+f);out.pubs.push({slug:f.replace('.md',''),title:d.title,year:d.year,status:d.status,type:d.type,venue:d.venue,dirs:d.directions,authors:(d.authors||[]).map(a=>a.name),in_brief:d.in_brief,draft:d.draft,awards:(d.awards||[]).length});}
for(const f of fs.readdirSync(R+'people')){const d=fm(R+'people/'+f);out.people.push({slug:f.replace('.md',''),name:d.name,role:d.role,title:d.title,status:d.status,photo:d.photo,consent:d.photo_consent,listed:d.listed,draft:d.draft,dirs:d.directions});}
for(const f of fs.readdirSync(R+'news')){const d=fm(R+'news/'+f);out.news.push({date:d.date,type:d.type,title:d.title,dirs:d.directions,draft:d.draft});}
for(const f of fs.readdirSync(R+'projects')){const d=fm(R+'projects/'+f);out.projects.push({slug:f.replace('.md',''),title:d.title,status:d.status,dirs:d.directions,draft:d.draft});}
fs.writeFileSync('tools/data.json',JSON.stringify(out,null,1));
