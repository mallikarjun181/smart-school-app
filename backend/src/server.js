
import 'dotenv/config';
import express from 'express';
import https from 'https';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const PORT = Number(process.env.PORT || 4000);
const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
const JWT_SECRET = process.env.JWT_SECRET || '';
if (JWT_SECRET.length < 32 || (isProduction && (JWT_SECRET.includes('REPLACE_WITH') || JWT_SECRET.length < 64))) {
  console.error('JWT_SECRET must be at least 32 characters. Set it in backend/.env.');
  process.exit(1);
}
const HTTPS_KEY_PATH = process.env.HTTPS_KEY_PATH || '';
const HTTPS_CERT_PATH = process.env.HTTPS_CERT_PATH || '';
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
const APP_BASE_URL = (process.env.APP_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER;
function mailConfigured(){ return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && MAIL_FROM); }
function mailTransport(){
  if(!mailConfigured()) return null;
  return nodemailer.createTransport({host:SMTP_HOST,port:SMTP_PORT,secure:SMTP_SECURE,auth:{user:SMTP_USER,pass:SMTP_PASS}});
}
async function sendResetEmail(user, rawToken){
  const transport=mailTransport();
  if(!transport) throw new Error('Email service is not configured. Add SMTP settings to backend/.env');
  const resetUrl=`${APP_BASE_URL}/?resetToken=${encodeURIComponent(rawToken)}`;
  await transport.sendMail({
    from:MAIL_FROM,
    to:user.email,
    subject:'Smart School password reset',
    text:`Hello ${user.name},\n\nWe received a request to reset your Smart School password.\n\nOpen this link within 30 minutes to choose a new password:\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html:`<p>Hello ${user.name},</p><p>We received a request to reset your Smart School password.</p><p><a href="${resetUrl}">Reset your Smart School password</a></p><p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>`
  });
}
fs.mkdirSync(uploadDir,{recursive:true});

app.use(helmet({contentSecurityPolicy:false,hsts:isProduction?{maxAge:31536000,includeSubDomains:true,preload:true}:false}));
const allowedOrigins = String(process.env.FRONTEND_URL || `http://localhost:${PORT}`).split(',').map(x=>x.trim()).filter(Boolean);
if (isProduction && allowedOrigins.some(x => !x.startsWith('https://'))) {
  console.error('In production, FRONTEND_URL must use HTTPS.');
  process.exit(1);
}
if (isProduction && String(process.env.APP_BASE_URL || '').startsWith('http://')) {
  console.error('In production, APP_BASE_URL must use HTTPS.');
  process.exit(1);
}
app.use(cors({origin:(origin,cb)=>{ if(!origin || allowedOrigins.includes(origin)) return cb(null,true); return cb(new Error('CORS origin denied')); },credentials:true,methods:['GET','POST','PUT','PATCH','DELETE','OPTIONS'],allowedHeaders:['Content-Type','Authorization']}));
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use(compression());
app.use((req,res,next)=>{
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});
app.use(express.json({limit:'1mb'}));
app.use(express.urlencoded({extended:false,limit:'1mb'}));
const REDIS_URL = String(process.env.REDIS_URL || '').trim();
const redis = REDIS_URL ? new Redis(REDIS_URL,{maxRetriesPerRequest:2,enableReadyCheck:true}) : null;
if(redis){ redis.on('error',err=>console.error('Redis error:',err.message)); }
const rateLimitStore = redis ? new RedisStore({sendCommand:(...args)=>redis.call(...args)}) : undefined;
if(isProduction && !redis) console.warn('REDIS_URL is not configured. Rate limits are process-local; use Redis when running multiple backend instances.');
const limiterKey=(req)=>{
  const authHeader=req.headers.authorization||'';
  if(authHeader.startsWith('Bearer ')){
    try{ const payload=jwt.decode(authHeader.slice(7)); if(payload?.sub) return `user:${payload.sub}`; }catch{}
  }
  return `ip:${ipKeyGenerator(req.ip)}`;
};
const limiterOptions=(max,message,keyGenerator=limiterKey)=>({windowMs:15*60*1000,max,standardHeaders:'draft-8',legacyHeaders:false,store:rateLimitStore,keyGenerator,message:{success:false,message}});
const apiLimiter = rateLimit(limiterOptions(Number(process.env.API_RATE_LIMIT_MAX || 3000),'Too many requests. Please try again later.'));
app.get('/api/health',(req,res)=>ok(res,{status:'ok',service:'smart-school-backend',time:new Date().toISOString(),requestId:req.requestId}));
app.get('/api/ready',async(req,res)=>{
  try{ await prisma.$queryRaw`SELECT 1`; if(redis) await redis.ping(); ok(res,{status:'ready',database:'ok',redis:redis?'ok':'not-configured'}); }
  catch{ fail(res,503,'Service not ready'); }
});

app.use('/api',apiLimiter);

const authLimiter = rateLimit({windowMs:15*60*1000,max:Number(process.env.AUTH_RATE_LIMIT_MAX||30),standardHeaders:'draft-8',legacyHeaders:false,store:rateLimitStore,keyGenerator:(req)=>`auth:${ipKeyGenerator(req.ip)}:${String(req.body?.identity||'').trim().toLowerCase()}`,message:{success:false,message:'Too many authentication attempts. Please try again later.'}});
const resetLimiter = rateLimit(limiterOptions(5,'Too many password reset requests. Please try again later.'));
const uploadLimiter = rateLimit(limiterOptions(Number(process.env.UPLOAD_RATE_LIMIT_MAX||60),'Too many uploads. Please try again later.'));
app.use('/api/auth/login',authLimiter);
app.use('/api/auth/forgot-password',resetLimiter);
app.use('/api/auth/reset-password',resetLimiter);

const ok=(res,data)=>res.json({success:true,data});
const fail=(res,status,message,errors=[])=>res.status(status).json({success:false,message,...(errors.length?{errors}:{})});

function sign(user){return jwt.sign({sub:user.id,role:user.role,schoolId:user.schoolId},JWT_SECRET,{expiresIn:'2h',issuer:'smart-school',audience:'smart-school-app'});}
async function auth(req,res,next){
  try{
    const h=req.headers.authorization||'';
    if(!h.startsWith('Bearer ')) return fail(res,401,'Authentication required');
    const p=jwt.verify(h.slice(7),JWT_SECRET,{issuer:'smart-school',audience:'smart-school-app'});
    const u=await prisma.user.findUnique({where:{id:p.sub}});
    if(!u||u.status!=='ACTIVE') return fail(res,401,'Account inactive or restricted');
    req.user=u; next();
  }catch{return fail(res,401,'Invalid or expired token');}
}
const roles=(...allowed)=>(req,res,next)=>allowed.includes(req.user.role)?next():fail(res,403,'Access denied');
function tenantWhere(req, extra={}){ return {...extra, schoolId:req.user.schoolId}; }
function tenantData(req, data={}){ const clean={...data}; delete clean.schoolId; return {...clean,schoolId:req.user.schoolId}; }

async function audit(req,action,entity,entityId,oldValue=null,newValue=null){
  try{await prisma.auditLog.create({data:{schoolId:req.user?.schoolId, userId:req.user?.id,action,entity,entityId,oldValue:oldValue??undefined,newValue:newValue??undefined,ipAddress:req.ip}})}catch{}
}

app.post('/api/auth/login',async(req,res)=>{
  const {identity,password,role}=req.body||{};
  if(!identity||!password||!role) return fail(res,400,'Identity, password and role are required');
  if(String(identity).length>160 || String(password).length>128) return fail(res,400,'Invalid login input');
  const allowed={OWNER:'OWNER',SCHOOL_ADMIN:'SCHOOL_ADMIN',CLASS_TEACHER:'CLASS_TEACHER',SUBJECT_TEACHER:'SUBJECT_TEACHER',PARENT:'PARENT'};
  if(!allowed[role]) return fail(res,400,'Invalid role');
  const normalized=String(identity).trim();
  const normalizedMobile=normalized.replace(/\D/g,'');
  const user=await prisma.user.findFirst({where:{role,status:'ACTIVE',OR:[{email:normalized.toLowerCase()},{mobile:normalizedMobile},{username:normalized.toLowerCase()}]}});
  if(!user || !(await bcrypt.compare(password,user.passwordHash))) return fail(res,401,'Invalid credentials');
  const authenticatedUser={id:user.id,schoolId:user.schoolId,name:user.name,email:user.email||null,mobile:user.mobile||null,username:user.username||null,role:user.role,status:user.status,mustChangePassword:user.mustChangePassword,passwordUpdatedAt:user.passwordUpdatedAt||null};
  const token=sign(user);
  return res.json({success:true,token,user:authenticatedUser,data:{token,user:authenticatedUser}});
});

app.get('/api/auth/me',auth,(req,res)=>ok(res,{id:req.user.id,schoolId:req.user.schoolId,name:req.user.name,email:req.user.email,mobile:req.user.mobile,username:req.user.username||null,role:req.user.role,status:req.user.status,mustChangePassword:req.user.mustChangePassword}));
app.post('/api/auth/change-password',auth,async(req,res)=>{
  const {newPassword,confirmPassword}=req.body||{};
  if(!newPassword||newPassword.length<10||newPassword.length>128||newPassword!==confirmPassword)return fail(res,400,'Password must be 10-128 characters and match confirmation');
  if(!/[A-Z]/.test(newPassword)||!/[a-z]/.test(newPassword)||!/[0-9]/.test(newPassword)||!/[^A-Za-z0-9]/.test(newPassword))return fail(res,400,'Password must include uppercase, lowercase, number and special character');
  await prisma.user.update({where:{id:req.user.id},data:{passwordHash:await bcrypt.hash(newPassword,12),mustChangePassword:false,passwordUpdatedAt:new Date()}});
  await prisma.passwordResetToken.deleteMany({where:{userId:req.user.id}});
  await audit(req,'CHANGE_PASSWORD','User',req.user.id);
  ok(res,{message:'Password changed'});
});
app.post('/api/auth/forgot-password',async(req,res)=>{
  try{
    const identity=String(req.body?.identity||'').trim().toLowerCase();
    if(!identity || !identity.includes('@')) return fail(res,400,'Enter the registered email address');
    const user=await prisma.user.findUnique({where:{email:identity}});
    // Do not reveal whether an account exists. In development, surface configuration errors.
    if(!user || user.status!=='ACTIVE') return ok(res,{message:'If an account exists for that email, reset instructions have been sent.'});
    const rawToken=crypto.randomBytes(32).toString('hex');
    const tokenHash=crypto.createHash('sha256').update(rawToken).digest('hex');
    await prisma.passwordResetToken.deleteMany({where:{userId:user.id}});
    await prisma.passwordResetToken.create({data:{userId:user.id,tokenHash,expiresAt:new Date(Date.now()+30*60*1000)}});
    await sendResetEmail(user,rawToken);
    ok(res,{message:'If an account exists for that email, reset instructions have been sent.'});
  }catch(e){
    console.error('Password reset email failed:',e.message);
    if (isProduction) return ok(res,{message:'If an account exists for that email, reset instructions have been sent.'});
    fail(res,503,'Unable to send reset email. Check the SMTP settings in backend/.env');
  }
});
app.post('/api/auth/reset-password',async(req,res)=>{
  try{
    const token=String(req.body?.token||'').trim();
    const newPassword=String(req.body?.newPassword||'');
    const confirmPassword=String(req.body?.confirmPassword||'');
    if(!token) return fail(res,400,'Reset token is required');
    if(token.length!==64) return fail(res,400,'Reset link is invalid or expired');
    if(newPassword.length<10 || newPassword.length>128 || newPassword!==confirmPassword) return fail(res,400,'Password must be 10-128 characters and match confirmation');
    if(!/[A-Z]/.test(newPassword)||!/[a-z]/.test(newPassword)||!/[0-9]/.test(newPassword)||!/[^A-Za-z0-9]/.test(newPassword)) return fail(res,400,'Password must include uppercase, lowercase, number and special character');
    const tokenHash=crypto.createHash('sha256').update(token).digest('hex');
    const record=await prisma.passwordResetToken.findUnique({where:{tokenHash},include:{user:true}});
    if(!record || record.usedAt || record.expiresAt<=new Date() || record.user.status!=='ACTIVE') return fail(res,400,'Reset link is invalid or expired');
    await prisma.$transaction([
      prisma.user.update({where:{id:record.userId},data:{passwordHash:await bcrypt.hash(newPassword,12),mustChangePassword:false,passwordUpdatedAt:new Date()}}),
      prisma.passwordResetToken.update({where:{id:record.id},data:{usedAt:new Date()}}),
      prisma.passwordResetToken.deleteMany({where:{userId:record.userId,id:{not:record.id}}})
    ]);
    ok(res,{message:'Password reset successfully. You can now sign in.'});
  }catch(e){
    console.error('Password reset failed:',e.message);
    fail(res,400,'Unable to reset password');
  }
});

app.get('/api/state',auth,async(req,res)=>{
  const s=await prisma.appState.findFirst({where:{schoolId:req.user.schoolId}});
  if(!s)return ok(res,{});
  ok(res,s.data);
});
app.put('/api/state',auth,async(req,res)=>{
  try{
    let data=req.body||{};
    if(req.user.role==='CLASS_TEACHER'){
      const allowedKeys=['attendance','attendanceHistory','parentNotifications','teacherHistory'];
      data=Object.fromEntries(allowedKeys.filter(k=>Object.prototype.hasOwnProperty.call(data,k)).map(k=>[k,data[k]]));
      const existing=await prisma.appState.findFirst({where:{schoolId:req.user.schoolId}});
      data={...(existing?.data||{}),...data};
    }else if(!['OWNER','SCHOOL_ADMIN'].includes(req.user.role)){
      return fail(res,403,'Access denied');
    }
    await prisma.appState.upsert({where:{schoolId:req.user.schoolId},create:{schoolId:req.user.schoolId,data},update:{data}});
    ok(res,{saved:true});
  }catch(e){console.error('PUT /api/state failed',e.message);fail(res,400,'Unable to save application state');}
});

/* Normalized API endpoints. These are used by new integrations and are also
   available for replacing the compatibility state bridge module-by-module. */
const resourceMap={
 students:prisma.student, teachers:prisma.teacher, parents:prisma.parent, classes:prisma.schoolClass,
 subjects:prisma.subject, attendance:prisma.attendance, homework:prisma.homework, marks:prisma.mark,
 timetable:prisma.timetable, notices:prisma.notice, events:prisma.event, certificates:prisma.certificate,
 fees:prisma.fee, notifications:prisma.notification
};
const writeRoles={
  students:['OWNER','SCHOOL_ADMIN','CLASS_TEACHER'], teachers:['OWNER','SCHOOL_ADMIN'], parents:['OWNER','SCHOOL_ADMIN'],
  classes:['OWNER','SCHOOL_ADMIN'], subjects:['OWNER','SCHOOL_ADMIN'], notices:['OWNER','SCHOOL_ADMIN'],
  events:['OWNER','SCHOOL_ADMIN'], certificates:['OWNER','SCHOOL_ADMIN'], fees:['OWNER','SCHOOL_ADMIN'],
  attendance:['OWNER','SCHOOL_ADMIN','CLASS_TEACHER'], homework:['OWNER','SCHOOL_ADMIN','CLASS_TEACHER','SUBJECT_TEACHER'],
  marks:['OWNER','SCHOOL_ADMIN','CLASS_TEACHER','SUBJECT_TEACHER'], timetable:['OWNER','SCHOOL_ADMIN','SUBJECT_TEACHER'],
  notifications:['OWNER','SCHOOL_ADMIN'],
};
const parentReadable=new Set(['students','attendance','homework','marks','timetable','notices','events','certificates','fees','notifications']);
const resourceModels=resourceMap;
/* Parent account creation: a Class Teacher can create a real login account and link
   the parent to a student in the teacher's assigned class. The generated temporary
   password is returned once so the teacher can give it to the parent. */
app.post('/api/parents/account',auth,roles('CLASS_TEACHER'),async(req,res)=>{
  const name=String(req.body?.name||'').trim();
  const email=String(req.body?.email||'').trim().toLowerCase();
  const username=String(req.body?.username||'').trim().toLowerCase();
  const password=String(req.body?.password||'');
  const mobile=String(req.body?.mobile||'').replace(/\D/g,'');
  const studentId=String(req.body?.studentId||'').trim();
  if(name.length<2 || name.length>160 || mobile.length<7 || mobile.length>15 || !studentId) return fail(res,400,'Valid parent name, mobile and student are required');
  if(email && !/^\S+@\S+\.\S+$/.test(email)) return fail(res,400,'Invalid parent email');
  if(!/^[a-z][a-z0-9._-]{3,39}$/.test(username)) return fail(res,400,'Username must start with a letter and contain 4-40 lowercase letters, numbers, dot, underscore or hyphen');
  if(password.length<10 || password.length>128 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) return fail(res,400,'Password must be 10-128 characters and include uppercase, lowercase, number and special character');
  try{
    const teacher=await prisma.teacher.findFirst({where:{userId:req.user.id,schoolId:req.user.schoolId},select:{assignedClassId:true}});
    if(!teacher?.assignedClassId)return fail(res,403,'No Class Teacher class is assigned to this account');
    const student=await prisma.student.findFirst({where:{id:studentId,schoolId:req.user.schoolId},select:{id:true,classId:true,name:true}});
    if(!student || student.classId!==teacher.assignedClassId)return fail(res,403,'You can only create parent accounts for students in your assigned class');
    const existingMobile=await prisma.user.findFirst({where:{mobile,schoolId:req.user.schoolId}});
    if(existingMobile)return fail(res,409,'A login account already exists for this mobile number');
    if(email){const existingEmail=await prisma.user.findFirst({where:{email,schoolId:req.user.schoolId}});if(existingEmail)return fail(res,409,'A login account already exists for this email');}
    const existingUsername=await prisma.user.findFirst({where:{username,schoolId:req.user.schoolId}});
    if(existingUsername)return fail(res,409,'A login account already exists for this username');
    const result=await prisma.$transaction(async(tx)=>{
      const user=await tx.user.create({data:{schoolId:req.user.schoolId,name,email:email||null,mobile,username,passwordHash:await bcrypt.hash(password,12),role:'PARENT',status:'ACTIVE',mustChangePassword:true}});
      const parent=await tx.parent.create({data:{schoolId:req.user.schoolId,userId:user.id,name,mobile,email:email||null}});
      await tx.parentStudent.create({data:{schoolId:req.user.schoolId,parentId:parent.id,studentId:student.id}});
      return {user,parent};
    });
    await audit(req,'CREATE','Parent',result.parent.id,null,{userId:result.user.id,studentId:student.id});
    ok(res,{parent:{id:result.parent.id,userId:result.user.id,name:result.parent.name,email:result.parent.email,mobile:result.parent.mobile,username:result.user.username,role:'PARENT',mustChangePassword:true},student:{id:student.id,name:student.name},temporaryPassword:password});
  }catch(e){console.error('POST /api/parents/account failed',e.message);fail(res,409,'Unable to create parent login account. Email or mobile may already exist.');}
});


app.get('/api/parents/credential-status',auth,roles('CLASS_TEACHER'),async(req,res)=>{
  try{
    const teacher=await prisma.teacher.findFirst({where:{userId:req.user.id,schoolId:req.user.schoolId},select:{assignedClassId:true}});
    if(!teacher?.assignedClassId)return fail(res,403,'No Class Teacher class is assigned to this account');
    const students=await prisma.student.findMany({where:{schoolId:req.user.schoolId,classId:teacher.assignedClassId},select:{id:true}});
    const studentIds=students.map(s=>s.id);
    const links=await prisma.parentStudent.findMany({where:{schoolId:req.user.schoolId,studentId:{in:studentIds}},select:{parentId:true}});
    const parentIds=[...new Set(links.map(x=>x.parentId))];
    if(!parentIds.length)return ok(res,[]);
    const parents=await prisma.parent.findMany({where:{schoolId:req.user.schoolId,id:{in:parentIds}},select:{id:true,user:{select:{username:true,mustChangePassword:true,passwordUpdatedAt:true}}}});
    ok(res,parents.map(p=>({parentId:p.id,username:p.user?.username||null,mustChangePassword:p.user?.mustChangePassword!==false,passwordUpdatedAt:p.user?.passwordUpdatedAt||null})));
  }catch(e){console.error('GET /api/parents/credential-status failed',e.message);fail(res,500,'Unable to load parent credential status')}
});

app.post('/api/attendance/bulk',auth,roles('CLASS_TEACHER'),async(req,res)=>{
  const date=String(req.body?.date||'').trim();
  const period=String(req.body?.period||'Morning Attendance').trim();
  const records=Array.isArray(req.body?.records)?req.body.records:[];
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!records.length)return fail(res,400,'Valid date and attendance records are required');
  const teacher=await prisma.teacher.findFirst({where:{userId:req.user.id,schoolId:req.user.schoolId},select:{id:true,assignedClassId:true}});
  if(!teacher?.id||!teacher.assignedClassId)return fail(res,403,'No Class Teacher class is assigned to this account');
  const allowed=await prisma.student.findMany({where:{schoolId:req.user.schoolId,classId:teacher.assignedClassId},select:{id:true,classId:true}});
  const allowedIds=new Set(allowed.map(s=>s.id));
  const clean=records.filter(r=>allowedIds.has(String(r.studentId))).map(r=>({studentId:String(r.studentId),status:String(r.status||'Present').toUpperCase()}));
  const validStatuses=new Set(['PRESENT','ABSENT','LATE']);
  if(clean.some(r=>!validStatuses.has(r.status)))return fail(res,400,'Invalid attendance status');
  try{
    await prisma.$transaction(async(tx)=>{
      await tx.attendance.deleteMany({where:{schoolId:req.user.schoolId,classId:teacher.assignedClassId,date:new Date(date+'T00:00:00.000Z'),period}});
      await tx.attendance.createMany({data:clean.map(r=>({schoolId:req.user.schoolId,studentId:r.studentId,classId:teacher.assignedClassId,date:new Date(date+'T00:00:00.000Z'),period,status:r.status,markedBy:teacher.id}))});
    });
    ok(res,{saved:clean.length});
  }catch(e){console.error('POST /api/attendance/bulk failed',e.message);fail(res,400,'Unable to save attendance');}
});


async function parentStudentIds(userId,schoolId){
  const p=await prisma.parent.findFirst({where:{userId,schoolId},select:{id:true}});
  if(!p)return [];
  const links=await prisma.parentStudent.findMany({where:{parentId:p.id,schoolId},select:{studentId:true}});
  return links.map(x=>x.studentId);
}

async function getClassTeacherAssignedClassId(req){
  const schoolId=req.user.schoolId;
  if(!schoolId)return null;
  const teacher=await prisma.teacher.findFirst({
    where:{userId:req.user.id,schoolId},
    select:{id:true,assignedClassId:true}
  });
  if(teacher?.assignedClassId)return teacher.assignedClassId;
  // Recover the assignment from the SchoolClass -> classTeacher relation
  // when older data has classTeacherId set but assignedClassId is missing.
  if(teacher?.id){
    const cls=await prisma.schoolClass.findFirst({
      where:{schoolId,classTeacherId:teacher.id},
      select:{id:true}
    });
    if(cls?.id)return cls.id;
  }
  return null;
}

async function scopedWhere(req,name){
  const schoolId=req.user.schoolId;
  if(!schoolId)return null;
  const base={schoolId};
  if(req.user.role==='PARENT'){
    if(!parentReadable.has(name)) return null;
    const ids=await parentStudentIds(req.user.id,schoolId);
    if(['students','fees','attendance','marks','certificates','notifications'].includes(name)) return {...base,studentId:{in:ids}};
    if(name==='homework' || name==='timetable'){
      const students=await prisma.student.findMany({where:{schoolId,id:{in:ids}},select:{classId:true}});
      const classIds=[...new Set(students.map(s=>s.classId).filter(Boolean))];
      return classIds.length?{...base,classId:{in:classIds}}:{...base,classId:{in:[]}};
    }
    if(['notices','events'].includes(name)) return base;
  }
  if(req.user.role==='CLASS_TEACHER'){
    const classId=await getClassTeacherAssignedClassId(req);
    if(['students','attendance','homework','marks'].includes(name)) return classId?{...base,classId}:null;
    if(name==='classes') return classId?{...base,id:classId}:null;
    if(name==='parents' && classId){
      const students=await prisma.student.findMany({where:{schoolId,classId},select:{id:true}});
      const ids=students.map(s=>s.id);
      const links=await prisma.parentStudent.findMany({where:{schoolId,studentId:{in:ids}},select:{parentId:true}});
      return {...base,id:{in:[...new Set(links.map(x=>x.parentId))]}};
    }
  }
  return base;
}

async function assertTenantRelations(req,name,data){
  const schoolId=req.user.schoolId;
  const checks={
    students:[], teachers:[], parents:[], classes:[], subjects:[], attendance:[['studentId',prisma.student],['classId',prisma.schoolClass],['markedBy',prisma.teacher]],
    homework:[['subjectId',prisma.subject],['teacherId',prisma.teacher],['classId',prisma.schoolClass]],
    marks:[['studentId',prisma.student],['subjectId',prisma.subject],['classId',prisma.schoolClass],['enteredBy',prisma.teacher]],
    timetable:[['classId',prisma.schoolClass],['subjectId',prisma.subject],['teacherId',prisma.teacher]],
    certificates:[['studentId',prisma.student]], fees:[['studentId',prisma.student]],
    notifications:[['studentId',prisma.student]],
  };
  for(const [field,model] of (checks[name]||[])){
    if(data?.[field]===undefined || data[field]===null || data[field]==='') continue;
    const found=await model.findFirst({where:{id:String(data[field]),schoolId},select:{id:true}});
    if(!found) throw Object.assign(new Error(`Cross-tenant or invalid ${field}`),{code:'TENANT_RELATION'});
  }
}


// Fee payment proof / verification workflow. Payment proof and receipts are stored as
// tenant-scoped private FileAsset URLs; parents can only access files belonging to their children.
app.get('/api/fees/:id/payment',auth,async(req,res)=>{
  try{
    const fee=await prisma.fee.findFirst({where:{id:req.params.id,schoolId:req.user.schoolId}});
    if(!fee)return fail(res,404,'Fee not found');
    if(req.user.role==='PARENT'){
      const ids=await parentStudentIds(req.user.id,req.user.schoolId);
      if(!ids.includes(fee.studentId))return fail(res,403,'Access denied');
    } else if(!['OWNER','SCHOOL_ADMIN'].includes(req.user.role)) return fail(res,403,'Access denied');
    ok(res,{feeId:fee.id,studentId:fee.studentId,paymentProof:fee.paymentProof||null,paymentVerification:fee.paymentVerification,verifiedBy:fee.verifiedBy||null,verifiedAt:fee.verifiedAt||null,receiptFile:fee.receiptFile||null,receiptIssuedAt:fee.receiptIssuedAt||null,receiptNumber:fee.receiptNumber||null});
  }catch(e){console.error('GET /api/fees/:id/payment failed',e);fail(res,500,'Unable to load payment status');}
});

app.post('/api/fees/:id/payment-proof',auth,roles('PARENT'),async(req,res)=>{
  try{
    const fee=await prisma.fee.findFirst({where:{id:req.params.id,schoolId:req.user.schoolId}});
    if(!fee)return fail(res,404,'Fee not found');
    const ids=await parentStudentIds(req.user.id,req.user.schoolId);
    if(!ids.includes(fee.studentId))return fail(res,403,'Access denied');
    const proof=String(req.body?.paymentProof||'').trim();
    if(!proof || !proof.startsWith('/api/files/'))return fail(res,400,'A valid uploaded payment screenshot is required');
    const data=await prisma.fee.update({where:{id:fee.id},data:{paymentProof:proof,paymentVerification:'PENDING',verifiedBy:null,verifiedAt:null,receiptFile:null,receiptIssuedAt:null,paymentStatus:'Payment Submitted',status:'Pending'}});
    await audit(req,'UPDATE','FeePayment',fee.id,fee,data);
    ok(res,data);
  }catch(e){console.error('POST /api/fees/:id/payment-proof failed',e);fail(res,400,'Unable to submit payment proof');}
});

app.post('/api/fees/:id/verify-payment',auth,roles('OWNER','SCHOOL_ADMIN'),async(req,res)=>{
  try{
    const fee=await prisma.fee.findFirst({where:{id:req.params.id,schoolId:req.user.schoolId}});
    if(!fee)return fail(res,404,'Fee not found');
    const approved=Boolean(req.body?.approved);
    const receiptFile=req.body?.receiptFile?String(req.body.receiptFile).trim():null;
    const receiptNumber=req.body?.receiptNumber?String(req.body.receiptNumber).trim():null;
    if(approved && (!fee.paymentProof || !receiptFile || !receiptFile.startsWith('/api/files/'))) return fail(res,400,'Verify requires the parent payment proof and an uploaded receipt');
    const data=await prisma.fee.update({where:{id:fee.id},data:approved?{paymentVerification:'VERIFIED',verifiedBy:req.user.id,verifiedAt:new Date(),paymentStatus:'Paid',status:'Paid',receiptFile,receiptIssuedAt:new Date(),...(receiptNumber?{receiptNumber}: {})}:{paymentVerification:'REJECTED',verifiedBy:req.user.id,verifiedAt:new Date(),paymentStatus:'Unpaid',status:'Pending'}});
    await audit(req,approved?'VERIFY':'REJECT','FeePayment',fee.id,fee,data);
    ok(res,data);
  }catch(e){console.error('POST /api/fees/:id/verify-payment failed',e);fail(res,400,'Unable to verify payment');}
});

for(const [name,model] of Object.entries(resourceModels)){
  app.get(`/api/${name}`,auth,async(req,res)=>{
    try{
      const where=await scopedWhere(req,name);
      if(where===null)return fail(res,403,'Access denied');
      const requestedLimit=Math.min(Math.max(Number.parseInt(req.query.limit,10)||100,1),500);
      const requestedOffset=Math.max(Number.parseInt(req.query.offset,10)||0,0);
      const usePaging=req.query.limit!==undefined || req.query.offset!==undefined;
      const query={where,skip:requestedOffset,take:usePaging?requestedLimit:500};
      if(name==='students') query.include={class:true,parents:{include:{parent:true}}};
      const data=await model.findMany(query);
      if(usePaging){
        const total=await model.count({where});
        return ok(res,{items:data,total,limit:requestedLimit,offset:requestedOffset,hasMore:requestedOffset+data.length<total});
      }
      ok(res,data);
    }catch(e){console.error(`GET /api/${name} failed`,e);fail(res,500,'Unable to load data');}
  });
  app.post(`/api/${name}`,auth,async(req,res)=>{
    if(!writeRoles[name]?.includes(req.user.role))return fail(res,403,'Access denied');
    try{
      const payload=tenantData(req,req.body);
      if(name==='students' && req.user.role==='CLASS_TEACHER'){
        const assignedClassId=await getClassTeacherAssignedClassId(req);
        if(!assignedClassId || payload.classId!==assignedClassId)return fail(res,403,'You can only add students to your assigned class');
      }
      await assertTenantRelations(req,name,payload); const data=await model.create({data:payload});
      await audit(req,'CREATE',name,data.id,null,data);
      ok(res,data);
    }catch(e){console.error(`POST /api/${name} failed`,e);fail(res,400,'Validation or database error');}
  });
  app.put(`/api/${name}/:id`,auth,async(req,res)=>{
    if(!writeRoles[name]?.includes(req.user.role))return fail(res,403,'Access denied');
    try{
      const old=await model.findFirst({where:tenantWhere(req,{id:req.params.id})});
      if(!old)return fail(res,404,'Record not found');
      if(req.user.role==='CLASS_TEACHER' && ['students','attendance','homework','marks'].includes(name)){
        const assignedClassId=await getClassTeacherAssignedClassId(req);
        if(!assignedClassId || old.classId!==assignedClassId)return fail(res,403,'Access denied');
      }
      const payload=tenantData(req,req.body);
      if(name==='students' && req.user.role==='CLASS_TEACHER'){
        const assignedClassId=await getClassTeacherAssignedClassId(req);
        if(!assignedClassId || payload.classId!==assignedClassId || old.classId!==assignedClassId)return fail(res,403,'You can only edit students in your assigned class');
      }
      await assertTenantRelations(req,name,payload); const data=await model.update({where:{id:req.params.id},data:payload});
      await audit(req,'UPDATE',name,data.id,old,data);
      ok(res,data);
    }catch(e){console.error(`PUT /api/${name}/:id failed`,e);fail(res,400,'Validation or database error');}
  });
  app.delete(`/api/${name}/:id`,auth,async(req,res)=>{
    if(!writeRoles[name]?.includes(req.user.role))return fail(res,403,'Access denied');
    try{
      const old=await model.findFirst({where:tenantWhere(req,{id:req.params.id})});
      if(!old)return fail(res,404,'Record not found');
      if(req.user.role==='CLASS_TEACHER' && ['students','attendance','homework','marks'].includes(name)){
        const assignedClassId=await getClassTeacherAssignedClassId(req);
        if(!assignedClassId || old.classId!==assignedClassId)return fail(res,403,'Access denied');
      }
      await model.delete({where:{id:req.params.id}});
      await audit(req,'DELETE',name,req.params.id,old);
      ok(res,{deleted:true});
    }catch(e){console.error(`DELETE /api/${name}/:id failed`,e);fail(res,400,'Unable to delete record');}
  });
}

app.get('/api/schools',auth,roles('OWNER'),async(req,res)=>{
  const schools=await prisma.school.findMany({orderBy:{createdAt:'asc'}});
  ok(res,schools);
});
app.post('/api/schools',auth,roles('OWNER'),async(req,res)=>{
  const name=String(req.body?.name||'').trim();
  const slug=String(req.body?.slug||'').trim().toLowerCase();
  if(name.length<2 || name.length>160 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return fail(res,400,'Valid school name and slug are required');
  try{
    const school=await prisma.school.create({data:{name,slug}});
    await audit(req,'CREATE','School',school.id,null,school);
    ok(res,school);
  }catch(e){console.error('POST /api/schools failed',e.message);fail(res,409,'School slug already exists or is invalid');}
});

app.post('/api/schools/:schoolId/admin',auth,roles('OWNER'),async(req,res)=>{
  const school=await prisma.school.findUnique({where:{id:req.params.schoolId}});
  if(!school)return fail(res,404,'School not found');
  const name=String(req.body?.name||'').trim();
  const email=String(req.body?.email||'').trim().toLowerCase();
  const mobile=String(req.body?.mobile||'').replace(/\D/g,'');
  if(name.length<2 || !/^\S+@\S+\.\S+$/.test(email) || mobile.length<7)return fail(res,400,'Valid name, email and mobile are required');
  const temporaryPassword=`Aa1!${crypto.randomBytes(12).toString('base64url')}`;
  try{
    const user=await prisma.user.create({data:{schoolId:school.id,name,email,mobile,passwordHash:await bcrypt.hash(temporaryPassword,12),role:'SCHOOL_ADMIN',status:'ACTIVE',mustChangePassword:true}});
    await audit(req,'CREATE','SchoolAdmin',user.id,null,{schoolId:school.id,email:user.email});
    ok(res,{user:{id:user.id,schoolId:school.id,name:user.name,email:user.email,mobile:user.mobile,role:user.role,mustChangePassword:true},temporaryPassword});
  }catch(e){console.error('POST /api/schools/:schoolId/admin failed',e.message);fail(res,409,'Email or mobile already exists');}
});

app.get('/api/parent/me',auth,async(req,res)=>{
  if(req.user.role!=='PARENT')return fail(res,403,'Parent access required');
  const parent=await prisma.parent.findFirst({where:{userId:req.user.id,schoolId:req.user.schoolId},include:{user:{select:{id:true,username:true,email:true,mobile:true}}}});
  if(!parent)return fail(res,404,'Parent profile not found');
  const links=await prisma.parentStudent.findMany({where:{parentId:parent.id,schoolId:req.user.schoolId},include:{student:{include:{class:true}}}});
  ok(res,{parent,students:links.map(x=>x.student)});
});
app.get('/api/students/:id',auth,async(req,res)=>{
  const s=await prisma.student.findFirst({where:{id:req.params.id,schoolId:req.user.schoolId},include:{parents:true,class:true}});
  if(!s)return fail(res,404,'Student not found');
  if(req.user.role==='PARENT'){
    const p=await prisma.parent.findFirst({where:{userId:req.user.id,schoolId:req.user.schoolId}});
    if(!p || !s.parents.some(x=>x.parentId===p.id))return fail(res,403,'Access denied');
  }
  if(req.user.role==='CLASS_TEACHER'){
    const t=await prisma.teacher.findFirst({where:{userId:req.user.id,schoolId:req.user.schoolId}});
    if(!t||t.assignedClassId!==s.classId)return fail(res,403,'Access denied');
  }
  ok(res,s);
});
app.get('/api/school-information',auth,async(req,res)=>{
  ok(res,await prisma.schoolInformation.findFirst({where:{schoolId:req.user.schoolId}})||{});
});
app.put('/api/school-information',auth,roles('OWNER','SCHOOL_ADMIN'),async(req,res)=>{
  const old=await prisma.schoolInformation.findFirst({where:{schoolId:req.user.schoolId}});
  const data=await prisma.schoolInformation.upsert({where:{schoolId:req.user.schoolId},create:{schoolId:req.user.schoolId,...req.body},update:{...req.body}});
  await audit(req,'UPDATE','SchoolInformation',data.id,old,data); ok(res,data);
});
app.get('/api/settings',auth,async(req,res)=>ok(res,await prisma.schoolSettings.findFirst({where:{schoolId:req.user.schoolId}})||{}));
app.put('/api/settings',auth,roles('OWNER','SCHOOL_ADMIN'),async(req,res)=>{
  const data=await prisma.schoolSettings.upsert({where:{schoolId:req.user.schoolId},create:{schoolId:req.user.schoolId,...req.body},update:{...req.body}}); ok(res,data);
});

const allowedUploadTypes={
  'image/jpeg':['.jpg','.jpeg'],
  'image/png':['.png'],
  'image/webp':['.webp'],
  'application/pdf':['.pdf'],
  'video/mp4':['.mp4']
};
const storage=multer.diskStorage({destination:uploadDir,filename:(req,file,cb)=>{
  const ext=path.extname(file.originalname).toLowerCase();
  cb(null,`${crypto.randomUUID()}${ext}`);
}});
const upload=multer({storage,limits:{fileSize:10*1024*1024,files:1,fields:10},fileFilter:(req,file,cb)=>{
  const ext=path.extname(file.originalname).toLowerCase();
  const valid=Boolean(allowedUploadTypes[file.mimetype]?.includes(ext));
  cb(valid?null:new Error('Unsupported or mismatched file type'),valid);
}});
function hasValidMagic(file){
  const fd=fs.openSync(file.path,'r');
  const b=Buffer.alloc(16); fs.readSync(fd,b,0,16,0); fs.closeSync(fd);
  if(file.mimetype==='image/jpeg') return b[0]===0xff&&b[1]===0xd8&&b[2]===0xff;
  if(file.mimetype==='image/png') return b.slice(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if(file.mimetype==='image/webp') return b.slice(0,4).toString()==='RIFF'&&b.slice(8,12).toString()==='WEBP';
  if(file.mimetype==='application/pdf') return b.slice(0,5).toString()==='%PDF-';
  if(file.mimetype==='video/mp4') return b.slice(4,8).toString()==='ftyp';
  return false;
}
async function canAccessFile(req,file){
  if(req.user.role==='OWNER'||req.user.role==='SCHOOL_ADMIN'||req.user.id===file.uploadedById)return true;
  if(!file.studentId)return false;
  if(req.user.role==='PARENT') return (await parentStudentIds(req.user.id,req.user.schoolId)).includes(file.studentId);
  if(req.user.role==='CLASS_TEACHER'){
    const student=await prisma.student.findFirst({where:{id:file.studentId,schoolId:req.user.schoolId},select:{classId:true}});
    const t=await prisma.teacher.findFirst({where:{userId:req.user.id,schoolId:req.user.schoolId},select:{assignedClassId:true}});
    return Boolean(student?.classId && t?.assignedClassId && student.classId===t.assignedClassId);
  }
  return false;
}
app.get('/uploads/:filename',async(req,res)=>{
  try{
    const file=await prisma.fileAsset.findUnique({where:{filename:req.params.filename}});
    if(!file || file.visibility!=='PUBLIC') return res.status(404).end();
    const safeName=path.basename(file.filename);
    const full=path.join(uploadDir,safeName);
    if(!fs.existsSync(full)) return res.status(404).end();
    res.type(file.mimeType); res.setHeader('Content-Disposition',`inline; filename="${file.originalName.replace(/"/g,'')}"`); res.sendFile(full);
  }catch{res.status(404).end();}
});
app.get('/api/files/:id',auth,async(req,res)=>{
  try{
    const file=await prisma.fileAsset.findFirst({where:{id:req.params.id,schoolId:req.user.schoolId}});
    if(!file)return fail(res,404,'File not found');
    if(file.visibility!=='PUBLIC' && !(await canAccessFile(req,file))) return fail(res,403,'Access denied');
    const full=path.join(uploadDir,path.basename(file.filename));
    if(!fs.existsSync(full))return fail(res,404,'File not found');
    res.type(file.mimeType); const inline=String(req.query.inline||'')==='1'; res.setHeader('Content-Disposition',`${inline?'inline':'attachment'}; filename="${file.originalName.replace(/"/g,'')}"`); res.sendFile(full);
  }catch{fail(res,404,'File not found');}
});
app.post('/api/uploads',auth,uploadLimiter,roles('OWNER','SCHOOL_ADMIN','CLASS_TEACHER','SUBJECT_TEACHER','PARENT'),upload.single('file'),async(req,res)=>{
  if(!req.file)return fail(res,400,'File is required');
  try{
    if(!hasValidMagic(req.file)){fs.unlinkSync(req.file.path);return fail(res,400,'File content does not match its declared type');}
    const visibility=String(req.body?.visibility||'PRIVATE').toUpperCase();
    if(!['PUBLIC','PRIVATE'].includes(visibility)){fs.unlinkSync(req.file.path);return fail(res,400,'Invalid file visibility');}
    if(visibility==='PUBLIC' && !['OWNER','SCHOOL_ADMIN'].includes(req.user.role)){fs.unlinkSync(req.file.path);return fail(res,403,'Only school administrators can create public files');}
    const studentId=req.body?.studentId?String(req.body.studentId):null;
    if(studentId){
      const student=await prisma.student.findFirst({where:{id:studentId,schoolId:req.user.schoolId},select:{id:true,classId:true}});
      if(!student){fs.unlinkSync(req.file.path);return fail(res,404,'Student not found');}
      if(req.user.role==='PARENT' && !(await parentStudentIds(req.user.id,req.user.schoolId)).includes(studentId)){fs.unlinkSync(req.file.path);return fail(res,403,'Access denied');}
      if(req.user.role==='CLASS_TEACHER'){
        const t=await prisma.teacher.findFirst({where:{userId:req.user.id,schoolId:req.user.schoolId},select:{assignedClassId:true}});
        if(!t?.assignedClassId || t.assignedClassId!==student.classId){fs.unlinkSync(req.file.path);return fail(res,403,'Access denied');}
      }
    }
    const file=await prisma.fileAsset.create({data:{schoolId:req.user.schoolId,filename:req.file.filename,originalName:req.file.originalname,mimeType:req.file.mimetype,size:req.file.size,visibility,studentId,uploadedById:req.user.id}});
    await audit(req,'UPLOAD','FileAsset',file.id,null,{filename:file.filename,mimeType:file.mimeType,size:file.size,visibility:file.visibility,studentId:file.studentId});
    ok(res,{id:file.id,url:visibility==='PUBLIC'?`/uploads/${file.filename}`:`/api/files/${file.id}`,originalName:file.originalName,mimeType:file.mimeType,size:file.size,visibility:file.visibility});
  }catch(e){try{fs.unlinkSync(req.file.path)}catch{};console.error('Upload failed:',e.message);fail(res,400,'Unable to upload file');}
});

const FRONTEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend');

app.use(express.static(FRONTEND_DIR));
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    return res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  }
  next();
});

app.use((err,req,res,next)=>{console.error(err);if(res.headersSent)return next(err);fail(res,500,'Internal server error')});
async function shutdown(signal){
  console.log(`${signal} received. Shutting down gracefully...`);
  try{ await prisma.$disconnect(); if(redis) await redis.quit(); } finally { process.exit(0); }
}
process.on('SIGINT',()=>shutdown('SIGINT'));
process.on('SIGTERM',()=>shutdown('SIGTERM'));

app.set('etag','strong');
if(typeof app.listen === 'function'){
  app.requestTimeout=120000;
  app.headersTimeout=65000;
  app.keepAliveTimeout=60000;
}

async function start(){
  try{
    await prisma.$connect();
    if(HTTPS_KEY_PATH || HTTPS_CERT_PATH){
      if(!HTTPS_KEY_PATH || !HTTPS_CERT_PATH) throw new Error('HTTPS_KEY_PATH and HTTPS_CERT_PATH must both be set.');
      const options={key:fs.readFileSync(path.resolve(HTTPS_KEY_PATH)),cert:fs.readFileSync(path.resolve(HTTPS_CERT_PATH))};
      https.createServer(options,app).listen(PORT,()=>console.log(`Smart School backend running on https://localhost:${PORT}`));
    }else{
      if(isProduction) console.warn('TLS is not configured in Node. Use an HTTPS reverse proxy/load balancer in production, or set HTTPS_KEY_PATH and HTTPS_CERT_PATH.');
      app.listen(PORT,()=>console.log(`Smart School backend running on http://localhost:${PORT}`));
    }
  }catch(error){
    console.error('Smart School backend could not start securely or connect to PostgreSQL.');
    console.error(error?.message||error);
    process.exit(1);
  }
}
start();
