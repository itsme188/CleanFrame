import assert from 'node:assert/strict';
import {openPreview} from './browser.mjs';
const preview=await openPreview({publicFonts:true});
let checks=0;
try {
 const page=await preview.browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/assets/local-config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.CleanFrameLocal={revision:"test",addHome:["netflix","paramount","adults"]};'}));
 await page.route('https://geocoding-api.open-meteo.com/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({results:[{country_code:'US',postcodes:['10001'],name:'New York',latitude:40.75,longitude:-74}]})}));
 await page.route('https://api.open-meteo.com/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({current:{temperature_2m:70,weather_code:0},daily:{temperature_2m_max:[72],temperature_2m_min:[55]}})}));
 await page.addInitScript(()=>{window.calls=[];window.tizen={application:{launch:(id,ok)=>{window.calls.push(id);ok();},getAppsInfo:ok=>ok([])}};});
 await page.goto(preview.baseURL+'/home/');await page.waitForFunction(()=>window.ShoreQA?.ready());
 await page.evaluate(()=>ShoreQA.activate('home.app.adults'));
 assert.equal(await page.locator('.s-title').innerText(),'Adults');checks++;
 for(const [name,id] of [['Netflix','org.tizen.netflix-app'],['HBO Max','5b8c3eb16b.BeamCTVDev'],['Apple TV','com.samsung.tv.aria-video'],['Paramount+','rJyOSqC6Up.CBSAllAccess'],['Peacock','gzcc4LRFBF.Peacock']]){
  await page.getByRole('button',{name,exact:true}).click();assert.equal(await page.evaluate(()=>calls[calls.length-1]),id);checks++;
 }
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>ShoreQA.state().view),'home');checks++;
 await page.evaluate(()=>ShoreQA.scene('settings'));await page.getByRole('button',{name:/Weather/}).click();
 await page.getByRole('button',{name:'Save',exact:true}).click();assert.match(await page.locator('.weather-note').innerText(),/five-digit/);checks++;
 for(const digit of ['1','0','0','0','1'])await page.getByRole('button',{name:digit,exact:true}).click();
 await page.getByRole('button',{name:'Save',exact:true}).click();await page.keyboard.press('Escape');
 await page.waitForFunction(()=>document.querySelector('.weather-caption')?.textContent.includes('70°F'));
 assert.match(await page.locator('.weather-caption').innerText(),/New York/);checks++;
 await page.reload();await page.waitForFunction(()=>window.ShoreQA?.ready());assert.match(await page.locator('.weather-caption').innerText(),/70°F/);checks++;
 for(const width of [1920,1280]){
  await page.setViewportSize({width,height:width*9/16});await page.evaluate(()=>ShoreQA.scene('settings'));
  const bounds=await page.locator('.settings-group').last().boundingBox(),hint=await page.locator('.settings-overview-hint').boundingBox();assert.ok(bounds.y+bounds.height<hint.y);checks++;
 }
 assert.deepEqual(errors,[]);checks++;
 console.log(checks+' folder, ZIP, persistence, launch-boundary and layout checks passed.');
} finally {await preview.close();}
