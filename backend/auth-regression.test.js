import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const server=fs.readFileSync(new URL('./src/server.js',import.meta.url),'utf8');
const frontend=fs.readFileSync(new URL('../frontend/index.html',import.meta.url),'utf8');

test('backend uses SCHOOL_ADMIN role and returns complete user',()=>{
  assert.match(server,/SCHOOL_ADMIN/);
  assert.match(server,/const authenticatedUser=\{id:user\.id,schoolId:user\.schoolId/);
  assert.match(server,/username:user\.username\|\|null/);
  assert.match(server,/res\.json\(\{success:true,token,user:authenticatedUser,data:\{token,user:authenticatedUser\}\}\)/);
});

test('frontend maps and validates authenticated School Admin safely',()=>{
  assert.match(frontend,/admin:'SCHOOL_ADMIN'/);
  assert.match(frontend,/const user=payload\?\.user;/);
  assert.match(frontend,/!user \|\| !user\.id \|\| !user\.role/);
  assert.match(frontend,/state\.selectedRole==='admin' && user\.role!=='SCHOOL_ADMIN'/);
  assert.match(frontend,/restoreAuthenticatedSession/);
});

test('security hardening keeps private files behind authorization',()=>{
  assert.match(server,/app\.get\('\/api\/files\/:id',auth/);
  assert.match(server,/file\.visibility!=='PUBLIC'/);
  assert.match(server,/canAccessFile/);
});

test('security headers, rate limits and production TLS controls are configured',()=>{
  assert.match(server,/helmet\(/);
  assert.match(server,/app\.disable\('x-powered-by'\)/);
  assert.match(server,/apiLimiter/);
  assert.match(server,/uploadLimiter/);
  assert.match(server,/HTTPS_KEY_PATH/);
  assert.match(server,/HTTPS_CERT_PATH/);
});

test('database container is not published on all interfaces',()=>{
  const compose=fs.readFileSync(new URL('../docker-compose.yml',import.meta.url),'utf8');
  assert.match(compose,/127\.0\.0\.1:5432:5432/);
});


test('multi-school tenant isolation is enforced in schema and API',()=>{
  const schema=fs.readFileSync(new URL('./prisma/schema.prisma',import.meta.url),'utf8');
  assert.match(schema,/model School \{/);
  assert.match(schema,/schoolId\s+String\s+@default\("default-school"\)/);
  assert.match(server,/function tenantWhere\(req/);
  assert.match(server,/function tenantData\(req/);
  assert.match(server,/await assertTenantRelations\(req,name,payload\)/);
  assert.match(server,/where:tenantWhere\(req,\{id:req\.params\.id\}\)/);
  assert.match(server,/app\.post\('\/api\/schools',auth,roles\('OWNER'\)/);
});
