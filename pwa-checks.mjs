import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
const script=await readFile('dist/sw.js','utf8');
function worker(){
  const scope='https://example.test/sobralis/';
  const handlers={};const entries=new Map();const removed=[];
  const cache={addAll:async requests=>{for(const req of requests)entries.set(req.url,new Response(req.url));},match:async request=>entries.get(typeof request==='string'?request:request.url)?.clone()};
  const self={registration:{scope},location:{origin:'https://example.test'},clients:{claim:async()=>{}},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:()=>{self.activated=true;}};
  const context={self,URL,Request,Response,Set,Promise,caches:{open:async()=>cache,keys:async()=>['sobralis:https://example.test/sobralis/:old','sobralis:https://example.test/another/:v1'],delete:async key=>removed.push(key)},fetch:async()=>{throw Error('network offline');}};
  vm.runInNewContext(script,context);
  const install=async()=>{let ready;handlers.install({waitUntil:p=>ready=p});await ready;};
  const request=async(url,mode='cors',method='GET')=>{let response;handlers.fetch({request:{url,mode,method},respondWith:p=>response=p});return response;};
  return {scope,handlers,entries,removed,self,install,request};
}
test('Manifest stays within the GitHub Pages subdirectory and has valid PNG icons',async()=>{
  const manifest=JSON.parse(await readFile('dist/manifest.webmanifest','utf8'));
  const base='https://example.test/sobralis/';
  assert.equal(new URL(manifest.start_url,base).href,base);assert.equal(new URL(manifest.scope,base).href,base);assert.equal(manifest.display,'standalone');
  for(const icon of manifest.icons){const png=await readFile('dist/'+icon.src);assert.equal(png.subarray(1,4).toString(),'PNG');const [width,height]=icon.sizes.split('x').map(Number);assert.equal(png.readUInt32BE(16),width);assert.equal(png.readUInt32BE(20),height);}
});
test('Every offline asset exists and includes all application modules',async()=>{
  const w=worker();await w.install();
  for(const url of w.entries.keys()){const path=new URL(url).pathname.replace('/sobralis/','');await access('dist/'+(path||'index.html'));}
  for(const file of ['index.html','games.js','app.js','pwa.js','style.css','manifest.webmanifest'])assert.ok(w.entries.has(w.scope+file));
});
test('Offline navigation works with search parameters and all core files',async()=>{
  const w=worker();await w.install();
  const page=await w.request(w.scope+'?q=крокодил&n=4','navigate');assert.equal(page.status,200);assert.equal(await page.text(),w.scope+'index.html');
  for(const file of ['games.js','app.js','style.css','pwa.js'])assert.equal((await w.request(w.scope+file)).status,200);
});
test('Worker leaves unrelated apps and non-GET requests alone',async()=>{
  const w=worker();await w.install();assert.equal(await w.request('https://example.test/other/','navigate'),undefined);assert.equal(await w.request('https://fonts.googleapis.com/css2'),undefined);assert.equal(await w.request(w.scope+'api','cors','POST'),undefined);assert.equal(await w.request(w.scope+'missing','navigate'),undefined);
});
test('Activation only clears this app caches and updates need explicit acceptance',async()=>{
  const w=worker();let done;w.handlers.activate({waitUntil:p=>done=p});await done;
  assert.deepEqual(w.removed,['sobralis:https://example.test/sobralis/:old']);assert.equal(w.self.activated,undefined);w.handlers.message({data:{type:'ACTIVATE_UPDATE'}});assert.equal(w.self.activated,true);
});
