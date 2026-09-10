import { performance } from 'node:perf_hooks';

const base=(process.env.BASE_URL||'http://127.0.0.1:5000').replace(/\/$/,'');
const path=process.env.PATH||'/api/health';
const concurrency=Number(process.env.CONCURRENCY||100);
const requestsPerWorker=Number(process.env.REQUESTS_PER_WORKER||20);
const stages=(process.env.STAGES||'100,500,1000,2500,5000').split(',').map(Number).filter(n=>n>0);
const durationMs=Number(process.env.DURATION_MS||0);
const identity=process.env.IDENTITY||'parent@smartschool.local';
const password=process.env.PASSWORD||'Smart@123';
const role=process.env.ROLE||'PARENT';

async function login(){
  const r=await fetch(`${base}/api/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({identity,password,role})});
  if(!r.ok) throw new Error(`Login failed: ${r.status} ${await r.text()}`);
  return (await r.json()).token;
}

async function runStage(users){
  const token=path.startsWith('/api/auth/login')?null:await login();
  let ok=0,failed=0,lat=[];
  const started=performance.now();
  async function worker(){
    let i=0;
    while(durationMs?performance.now()-started<durationMs:i<requestsPerWorker){
      i++;
      const t=performance.now();
      try{
        const r=await fetch(`${base}${path}`,{headers:token?{authorization:`Bearer ${token}`}:{}});
        await r.arrayBuffer();
        if(r.ok)ok++;else failed++;
      }catch{failed++;}
      lat.push(performance.now()-t);
    }
  }
  await Promise.all(Array.from({length:users},worker));
  lat.sort((a,b)=>a-b);
  const pct=p=>lat[Math.min(lat.length-1,Math.floor(lat.length*p))]||0;
  const elapsed=(performance.now()-started)/1000;
  return {concurrentUsers:users,requests:ok+failed,ok,failed,requestsPerSecond:Number(((ok+failed)/elapsed).toFixed(2)),p50Ms:Number(pct(.50).toFixed(2)),p95Ms:Number(pct(.95).toFixed(2)),p99Ms:Number(pct(.99).toFixed(2)),elapsedSeconds:Number(elapsed.toFixed(2))};
}

const results=[];
for(const users of (process.env.RUN_ALL==='true'?stages:[concurrency])){
  console.log(`\nRunning ${users} concurrent users against ${base}${path} ...`);
  const r=await runStage(users);
  results.push(r);
  console.log(JSON.stringify(r,null,2));
  if(r.failed>0){console.error(`Stage ${users} had failures; stopping.`);break;}
}
console.log('\nCAPACITY TEST SUMMARY');
console.table(results);
