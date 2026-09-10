import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import crypto from 'crypto';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const backend = path.join(root, 'backend');
const envExample = path.join(backend, '.env.example');
const envFile = path.join(backend, '.env');

function run(cmd, args, cwd) {
  console.log(`\n> ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status || 1);
}
function runWithInput(cmd,args,cwd,input){
  console.log(`\n> ${cmd} ${args.join(' ')}`);
  const r=spawnSync(cmd,args,{cwd,input,stdio:['pipe','inherit','inherit'],shell:true});
  if(r.status!==0) process.exit(r.status||1);
}

if (!fs.existsSync(path.join(root, 'docker-compose.yml'))) {
  throw new Error('Project root not found. Run this command from the Smart_School_FullStack_WORKING folder.');
}
if (!fs.existsSync(envExample)) throw new Error('backend/.env.example is missing from this project package.');
if (!fs.existsSync(envFile)) {
  let env = fs.readFileSync(envExample, 'utf8');
  env = env.replace(/JWT_SECRET="[^"]*"/, `JWT_SECRET="${crypto.randomBytes(48).toString('base64url')}"`);
  fs.writeFileSync(envFile, env);
  console.log('Created backend/.env with a fresh random JWT secret.');
} else {
  let env = fs.readFileSync(envFile, 'utf8');
  const m = env.match(/^JWT_SECRET="([^"]*)"/m);
  if (!m || m[1].length < 32) {
    env = env.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET="${crypto.randomBytes(48).toString('base64url')}"`);
    fs.writeFileSync(envFile, env);
    console.log('Repaired backend/.env with a fresh random JWT secret.');
  }
}

console.log('Checking PostgreSQL container...');
const existing = spawnSync('docker', ['ps', '-a', '--filter', 'name=smart-school-postgres', '--format', '{{.Names}}'], {
  cwd: root, encoding: 'utf8', shell: true
});
const names = (existing.stdout || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);

if (names.includes('smart-school-postgres')) {
  const state = spawnSync('docker', ['inspect', '-f', '{{.State.Running}}', 'smart-school-postgres'], {
    cwd: root, encoding: 'utf8', shell: true
  });
  if ((state.stdout || '').trim().toLowerCase() !== 'true') {
    console.log('Found existing smart-school-postgres container. Starting it...');
    run('docker', ['start', 'smart-school-postgres'], root);
  } else {
    console.log('Existing smart-school-postgres container is already running. Reusing it...');
  }
} else {
  console.log('Starting PostgreSQL with Docker Compose...');
  run('docker', ['compose', 'up', '-d'], root);
}

run('npm', ['install'], backend);
// Bootstrap the tenant table/row before Prisma adds foreign keys to existing development data.
const bootstrapSql = `CREATE TABLE IF NOT EXISTS "School" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "slug" TEXT NOT NULL UNIQUE, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP); INSERT INTO "School" ("id","name","slug") VALUES ('default-school','Smart School','smart-school') ON CONFLICT ("id") DO NOTHING;`;
const pgUser = process.env.POSTGRES_USER || 'smartschool';
const pgDb = process.env.POSTGRES_DB || 'smartschool';
runWithInput('docker', ['compose', 'exec', '-T', 'postgres', 'psql', '-U', pgUser, '-d', pgDb], root, bootstrapSql);
run('npx', ['prisma', 'validate'], backend);
run('npx', ['prisma', 'generate'], backend);
run('npx', ['prisma', 'db', 'push'], backend);
run('npm', ['run', 'db:seed'], backend);

console.log('\nSetup complete. Start the app with: npm run dev');
console.log('Then open: http://localhost:5000');
