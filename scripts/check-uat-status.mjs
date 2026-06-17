import { Client } from "../node_modules/ssh2/lib/index.js";
const SSH = { host:"145.79.213.54", port:65002, username:"u686730471", password:"C@veo@2026", keepaliveInterval:10000 };
const APP="/home/u686730471/domains/uat.caveoinfosystems.com/public_html";
function run(conn,cmd){return new Promise((res)=>{let o="",e="";conn.exec(`bash -c ${JSON.stringify(cmd)}`,(err,s)=>{if(err)return res("EXEC_ERR: "+err.message);s.on("data",d=>o+=d);s.stderr.on("data",d=>e+=d);s.on("close",()=>res((o+e).trim()));});});}
const conn=new Client();
await new Promise((r,j)=>conn.on("ready",r).on("error",j).connect(SSH));
console.log("DONE sentinel (exit code):", await run(conn,`cat ${APP}/uat-build.done 2>/dev/null || echo NO_DONE_FILE`));
console.log("BUILD_ID:", await run(conn,`cat ${APP}/.next/BUILD_ID 2>/dev/null || echo NO_BUILD_ID`));
console.log("\n--- last 30 lines of uat-build.log ---");
console.log(await run(conn,`tail -30 ${APP}/uat-build.log 2>/dev/null || echo NO_LOG`));
conn.end();
