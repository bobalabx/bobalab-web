const L = h => { const c = [1,3,5].map(i => parseInt(h.slice(i,i+2),16)/255).map(v => v <= 0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4); return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; };
const cr = (a,b) => { const [x,y]=[L(a),L(b)].sort((p,q)=>q-p); return ((x+0.05)/(y+0.05)).toFixed(2); };
const rows = [
 ['light text: ink/paper','#111410','#ffffff',4.5],['light text: muted/paper','#50564f','#ffffff',4.5],['light text: muted/band (join)','#50564f','#f2f3f1',4.5],['light text: ink/band','#111410','#f2f3f1',4.5],
 ['light dir name bp','#2b4fa8','#ffffff',4.5],['light dir name ly','#a12c5a','#ffffff',4.5],['light dir name ma','#4c7a1e','#ffffff',4.5],['light dir name oo','#6b4500','#ffffff',4.5],
 ['dark text: ink/paper','#e7eae5','#101210',4.5],['dark text: muted/paper','#a6aca4','#101210',4.5],['dark text: muted/band','#a6aca4','#181b18',4.5],
 ['dark dir name bp','#8ea4f7','#101210',4.5],['dark dir name ly','#f590ae','#101210',4.5],['dark dir name ma','#a8da84','#101210',4.5],['dark dir name oo','#c4943a','#101210',4.5],
 ['light pearl edge bp (graphic)','#18244f','#ffffff',3],['light pearl edge ly','#471128','#ffffff',3],['light pearl edge ma','#22360f','#ffffff',3],['light pearl edge oo','#321e04','#ffffff',3],
 ['dark pearl centre bp (graphic)','#7086cc','#101210',3],['dark pearl centre ly','#be6890','#101210',3],['dark pearl centre ma','#7aa553','#101210',3],['dark pearl centre oo','#b08444','#101210',3],
 ['dark pearl edge bp','#5066b0','#101210',3],['dark pearl edge ly','#9c4a70','#101210',3],['dark pearl edge ma','#557d33','#101210',3],['dark pearl edge oo','#8a6329','#101210',3],
 ['focus ring ink/paper','#111410','#ffffff',3],['floor rule dark','#e7eae5','#101210',3],
];
for (const [n,a,b,t] of rows) { const v = cr(a,b); console.log((v>=t?'PASS':'FAIL'), v.padStart(6), `(>=${t})`, n); }
