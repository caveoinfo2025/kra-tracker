import { Client } from "../node_modules/ssh2/lib/index.js";
if (!process.env.HOSTINGER_SSH_PASSWORD) { console.error("✗ HOSTINGER_SSH_PASSWORD env var is required."); process.exit(1); }
const SSH = { host:"145.79.213.54", port:65002, username:"u686730471", password:process.env.HOSTINGER_SSH_PASSWORD, keepaliveInterval:10000 };
const APP="/home/u686730471/domains/uat.caveoinfosystems.com/public_html";
function run(conn,cmd){return new Promise((res,rej)=>{let o="",e="";conn.exec(`bash -c ${JSON.stringify(cmd)}`,(err,s)=>{if(err)return rej(err);s.on("data",d=>o+=d);s.stderr.on("data",d=>e+=d);s.on("close",c=>res({code:c,o:o.trim(),e:e.trim()}));});});}
const conn=new Client();
await new Promise((r,j)=>conn.on("ready",r).on("error",j).connect(SSH));
const procs=await run(conn,"ps -eo pid,etime,rss,cmd | grep -E 'next|node' | grep -v grep | head -20");
console.log("=== running node/next processes ===\n"+(procs.o||"(none)"));
const nextDir=await run(conn,`ls -la ${APP}/.next 2>/dev/null | head -20; echo "---BUILD_ID---"; cat ${APP}/.next/BUILD_ID 2>/dev/null || echo "(no BUILD_ID — build not finished)"`);
console.log("\n=== .next dir ===\n"+nextDir.o);
conn.end();
