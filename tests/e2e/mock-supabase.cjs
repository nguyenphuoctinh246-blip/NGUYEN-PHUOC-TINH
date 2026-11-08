// Máy chủ giả lập Supabase tối thiểu (Auth + PostgREST) để kiểm thử trình duyệt thật.
const http = require('http'); const url = require('url'); const crypto = require('crypto');
const users = new Map(); const tokens = new Map(); const db = {}; const log = [];
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (u) => `${b64({alg:'HS256',typ:'JWT'})}.${b64({sub:u.id,email:u.email,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,aud:'authenticated'})}.sig`;
const tbl = (t) => (db[t] ??= new Map());
function session(u){ const at=jwt(u); tokens.set(at,u); return {access_token:at,token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:crypto.randomUUID(),user:{id:u.id,email:u.email,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()}}; }
function filters(q){ const f=[]; for(const [k,v] of Object.entries(q)){ if(['select','on_conflict','limit','offset','order','columns'].includes(k)) continue;
  if(v.startsWith('eq.')) f.push(r=>String(r[k])===v.slice(3));
  else if(v.startsWith('in.')){ const list=v.slice(4,-1).split(',').map(x=>x.replace(/^"|"$/g,'')); f.push(r=>list.includes(String(r[k]))); } }
  return f; }
http.createServer((req,res)=>{
  const u=url.parse(req.url,true); const cors={'access-control-allow-origin':req.headers.origin||'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'content-range','access-control-allow-credentials':'true'};
  if(req.method==='OPTIONS'){res.writeHead(204,cors);return res.end();}
  let body=''; req.on('data',c=>body+=c); req.on('end',()=>{
    const send=(code,obj,h={})=>{res.writeHead(code,{'content-type':'application/json',...cors,...h});res.end(obj===undefined?'':JSON.stringify(obj));};
    const j=body?JSON.parse(body):{};
    if(u.pathname==='/auth/v1/signup'){ if([...users.values()].some(x=>x.email===j.email)) return send(422,{code:422,error_code:'user_already_exists',msg:'User already registered'});
      const us={id:crypto.randomUUID(),email:j.email,password:j.password}; users.set(us.id,us); return send(200,session(us)); }
    if(u.pathname==='/auth/v1/token'){ const us=[...users.values()].find(x=>x.email===j.email&&x.password===j.password); if(!us) return send(400,{code:400,error_code:'invalid_credentials',msg:'Invalid login credentials'}); return send(200,session(us)); }
    if(u.pathname==='/auth/v1/user'){ const us=tokens.get((req.headers.authorization||'').replace('Bearer ','')); return us?send(200,session(us).user):send(401,{msg:'bad jwt'}); }
    if(u.pathname==='/auth/v1/logout'){ return send(204); }
    const m=u.pathname.match(/^\/rest\/v1\/(\w+)$/);
    if(m){ const us=tokens.get((req.headers.authorization||'').replace('Bearer ','')); if(!us) return send(401,{message:'JWT invalid'});
      const t=tbl(m[1]); const own=(r)=>r.user_id===us.id;
      log.push(`${req.method} ${m[1]} ${u.search||''}`.slice(0,140));
      if(req.method==='GET'||req.method==='HEAD'){ let rows=[...t.values()].filter(own).filter(r=>filters(u.query).every(f=>f(r))); const total=rows.length;
        const off=+(u.query.offset||0), lim=u.query.limit?+u.query.limit:rows.length; rows=rows.slice(off,off+lim);
        return send(200,req.method==='HEAD'?undefined:rows,{'content-range':`${rows.length?off+'-'+(off+rows.length-1):'*'}/${total}`}); }
      if(req.method==='POST'){ const arr=Array.isArray(j)?j:[j]; for(const r of arr){ if(r.user_id!==us.id) return send(403,{message:'RLS violation'}); t.set(r.user_id+'|'+r.id,{...r}); } return send(201); }
      if(req.method==='DELETE'){ const fs=filters(u.query); for(const [k,r] of [...t]) if(own(r)&&fs.every(f=>f(r))) t.delete(k); return send(204); } }
    if(u.pathname==='/__state'){ return send(200,{counts:Object.fromEntries(Object.entries(db).map(([k,v])=>[k,v.size])),log:log.slice(-40)}); }
    send(404,{message:'not found '+u.pathname});
  });
}).listen(54321,()=>console.log('mock up'));
