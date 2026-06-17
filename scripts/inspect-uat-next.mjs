import { Client } from "../node_modules/ssh2/lib/index.js";
const SSH = { host:"145.79.213.54", port:65002, username:"u686730471", password:"C@veo@2026", keepaliveInterval:10000 };
const APP="/home/u686730471/domains/uat.caveoinfosystems.com/public_html";
function run(conn,cmd){return new Promise((res)=>{let o="",e="";conn.exec(`bash -c ${JSON.stringify(cmd)}`,(err,s)=>{if(err)return res("EXEC_ERR: "+err.message);s.on("data",d=>o+=d);s.stderr.on("data",d=>e+=d);s.on("close",()=>res((o+e).trim()));});});}
const conn=new Client();
await new Promise((r,j)=>conn.on("ready",r).on("error",j).connect(SSH));
console.log("BUILD_ID:", await run(conn,`cat ${APP}/.next/BUILD_ID 2>/dev/null || echo MISSING`));
console.log("\nprerender-manifest exists:", await run(conn,`test -f ${APP}/.next/prerender-manifest.json && echo YES || echo NO`));
console.log("routes-manifest exists:", await run(conn,`test -f ${APP}/.next/routes-manifest.json && echo YES || echo NO`));
console.log("\n.next/server/app page count:", await run(conn,`find ${APP}/.next/server/app -name '*.html' 2>/dev/null | wc -l`));
console.log(".next/server/app/finance entries:", await run(conn,`ls ${APP}/.next/server/app/finance 2>/dev/null | head -30 || echo NONE`));
console.log("\nrunning node/next procs:", await run(conn,`ps -eo pid,etime,cmd | grep -E 'next|node' | grep -v grep | head || echo NONE`));
conn.end();
