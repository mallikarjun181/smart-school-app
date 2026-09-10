import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const html=fs.readFileSync(new URL('./frontend/index.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
if(!scripts.length) throw new Error('No script blocks found in frontend/index.html');
const tempFiles=[];
try{
  scripts.forEach((code,i)=>{const f=`/tmp/smart-school-frontend-${process.pid}-${i}.js`;fs.writeFileSync(f,code);tempFiles.push(f);execFileSync(process.execPath,['--check',f],{stdio:'inherit'});});
  const functions=new Set([...html.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]));
  const attrs=['onclick','onsubmit','onchange','oninput','onload','onerror'];
  const ignore=new Set(['if','for','while','switch','Number','String','Boolean','Date','Math','JSON','Array','Object','Promise','setTimeout','setInterval','parseInt','confirm','alert','console','FileReader','URLSearchParams','fetch']);
  const missing=new Set(); let handlerCount=0;
  for(const attr of attrs){
    const re=new RegExp(`${attr}\\s*=\\s*([\"'])([\\s\\S]*?)\\1`,'gi');
    for(const m of html.matchAll(re)){
      handlerCount++;
      for(const call of m[2].matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)){const n=call[1];if(!functions.has(n)&&!ignore.has(n)&&n!=='getElementById'&&n!=='preventDefault'&&n!=='replace'&&n!=='toggle')missing.add(n);}
    }
  }
  if(missing.size) throw new Error(`Missing frontend handlers: ${[...missing].join(', ')}`);
  if(html.includes('/api/api/')) throw new Error('Duplicate /api/api path found');
  if(html.includes("localhost:4000/api")) throw new Error('Stale localhost:4000 API base found');
  if(/teachers\[0\]/.test(html)) throw new Error('Unsafe teacher fallback teachers[0] found');
  console.log(`Frontend validation PASS: ${scripts.length} script blocks, ${functions.size} functions, ${handlerCount} inline event handlers.`);
} finally {for(const f of tempFiles){try{fs.unlinkSync(f)}catch{}}}
