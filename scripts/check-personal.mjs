// Local-only verification uses the owner's ignored photo overlay, never committed fixtures.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {openPreview,root} from './browser.mjs';
const configPath=root+'.local/personal/overlay/assets/local-config.js';
if(!existsSync(configPath)){console.log('No private photo overlay; skipped.');process.exit(0);}
const config=JSON.parse(readFileSync(configPath,'utf8').split('=').slice(1).join('=').trim().replace(/;$/,''));
if(!config.wallpapers?.length){console.log('No private photos; skipped.');process.exit(0);}
const preview=await openPreview();
try{
 const page=await preview.browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.ShoreQA={minuteMs:300};});
 await page.goto(preview.baseURL+'/home/');await page.waitForFunction(()=>window.ShoreQA?.ready());
 const first=await page.evaluate(()=>ShoreQA.state().wallpaper);
 assert.ok(first.startsWith('family-'));
 await page.waitForFunction(first=>ShoreQA.state().wallpaper!==first,first,{timeout:10000});
 assert.ok((await page.evaluate(()=>ShoreQA.state().wallpaper)).startsWith('family-'));
 await page.evaluate(()=>ShoreQA.scene('settings'));
 for(const photo of config.wallpapers){
  for(const path of [photo.src,photo.thumb,'assets/wallpapers/'+photo.id+'-panel.jpg',...['study-soft','field-blur','field-frost','field-clear'].map(s=>'assets/materials/'+photo.id+'-'+s+'.jpg')]){
   const response=await page.request.get(preview.baseURL+'/home/'+path);assert.equal(response.status(),200);
  }
 }
 assert.deepEqual(errors,[]);
 console.log(config.wallpapers.length+' complete personal photo bundles served; family-only rotation passed.');
}finally{await preview.close();}
