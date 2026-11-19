const STORES = ["Lidl", "Kaufland", "Billa", "Albert", "Penny"];
const json = (data, status=200, headers={}) => new Response(JSON.stringify(data), {status,headers:{"Content-Type":"application/json; charset=utf-8","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type, Authorization","Access-Control-Allow-Methods":"GET, POST, OPTIONS",...headers}});
const norm = s => String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("cs-CZ").trim();
function auth(req,env){return !!env.ADMIN_TOKEN && req.headers.get("Authorization")==="Bearer "+env.ADMIN_TOKEN}
export default {
 async fetch(req,env){
  const url=new URL(req.url);const path=url.pathname;
  if(req.method==="OPTIONS")return new Response(null,{headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type, Authorization","Access-Control-Allow-Methods":"GET, POST, OPTIONS"}});
  try{
   if(path==="/api/health")return json({ok:true,service:"Czech Price Hunter API"});
   if(path==="/api/stores")return json({stores:STORES});
   if(path==="/api/search"&&req.method==="GET"){
    const q=norm(url.searchParams.get("q"));const store=url.searchParams.get("store");const region=url.searchParams.get("region");const active=url.searchParams.get("active")==="1";const today=new Date().toISOString().slice(0,10);
    let sql="SELECT * FROM offers WHERE 1=1";const args=[];
    if(q){sql+=" AND normalized_name LIKE ?";args.push("%"+q+"%")}
    if(store){sql+=" AND store = ?";args.push(store)}
    if(region){sql+=" AND region = ?";args.push(region)}
    if(active){sql+=" AND valid_from <= ? AND valid_to >= ?";args.push(today,today)}
    sql+=" ORDER BY price ASC LIMIT 300";
    const {results}=await env.DB.prepare(sql).bind(...args).all();return json({offers:results});
   }
   if(path==="/api/flyers"&&req.method==="GET"){
    let sql="SELECT * FROM flyers";const region=url.searchParams.get("region");if(region)sql+=" WHERE region = ?";sql+=" ORDER BY valid_from DESC LIMIT 100";
    const q=region?await env.DB.prepare(sql).bind(region).all():await env.DB.prepare(sql).all();return json({flyers:q.results});
   }
   if(path==="/api/import"&&req.method==="POST"){
    if(!auth(req,env))return json({error:"Unauthorized"},401);
    const body=await req.json();const f=body.flyer;const offers=body.offers;
    if(!f||!STORES.includes(f.store)||!f.region||!f.valid_from||!f.valid_to||!Array.isArray(offers)||!offers.length)return json({error:"Invalid flyer payload or unsupported store"},400);
    if(f.valid_to<f.valid_from)return json({error:"valid_to must be on/after valid_from"},400);
    const created=await env.DB.prepare("INSERT INTO flyers(store,region,valid_from,valid_to,source_url) VALUES(?,?,?,?,?)").bind(f.store,f.region,f.valid_from,f.valid_to,f.source_url||null).run();
    const flyerId=created.meta.last_row_id;
    const stmt=env.DB.prepare("INSERT INTO offers(flyer_id,store,region,name,normalized_name,brand,price,old_price,unit,valid_from,valid_to,loyalty_required,source_url) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)");
    let inserted=0;
    for(const o of offers){
      if(!o.name||!Number.isFinite(Number(o.price))||Number(o.price)<0)return json({error:"Each offer needs name and non-negative numeric price"},400);
      const from=o.valid_from||f.valid_from,to=o.valid_to||f.valid_to;
      await stmt.bind(flyerId,f.store,f.region,o.name,norm(o.name),o.brand||null,Number(o.price),o.old_price==null?null:Number(o.old_price),o.unit||null,from,to,o.loyalty_required?1:0,o.source_url||f.source_url||null).run();inserted++;
    }
    return json({ok:true,flyer_id:flyerId,inserted});
   }
   if(path==="/api/collection-run"&&req.method==="POST"){
    if(!auth(req,env))return json({error:"Unauthorized"},401);
    return await runCollection(env,"manual");
   }
   return json({error:"Not found"},404);
  }catch(e){return json({error:e.message||"Internal error"},500)}
 },
 async scheduled(event,env,ctx){ctx.waitUntil(runCollection(env,"cron"))}
};
async function runCollection(env,trigger){
 const now=new Date().toISOString();
 const details={trigger,stores:STORES,region:env.DEFAULT_REGION||"Zlínský kraj",message:"Collection schedule executed. Retailer-specific flyer adapters are not configured yet; no product prices were scraped."};
 await env.DB.prepare("INSERT INTO collection_runs(status,details) VALUES(?,?)").bind("scheduled",JSON.stringify(details)).run();
 return json({ok:true,...details,at:now});
}
