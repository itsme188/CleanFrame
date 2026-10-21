import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../app/weather.js',import.meta.url),'utf8');
function setup(saved,failSave=false){
 const requests=[],values=new Map(),timers=[];
 if(saved)values.set('cleanframe.weather.v1',JSON.stringify(saved));
 function XHR(){this.open=(method,url)=>this.url=url;this.send=()=>requests.push(this);}
 const ctx={window:{},document:{hidden:false,addEventListener(){}},XMLHttpRequest:XHR,Date,JSON,Math,Error,setTimeout:f=>(timers.push(f),timers.length),clearTimeout(){},localStorage:{getItem:k=>values.get(k)||null,setItem(k,v){if(failSave)throw Error('Full');values.set(k,v);}}};
 vm.runInNewContext(source,ctx);const w=ctx.window.FrameWeather;w.init(()=>{});
 function reply(i,value){const r=requests[i];r.status=200;r.responseText=JSON.stringify(value);r.onload();}
 return {w,requests,values,reply};
}
const config={zip:'10001',unit:'fahrenheit'};
const geo={results:[{country_code:'US',postcodes:['10001'],name:'New York',latitude:40.75,longitude:-74}]};
const forecast={current:{temperature_2m:70,weather_code:0},daily:{temperature_2m_max:[72],temperature_2m_min:[55]}};
test('Public defaults send no location request',()=>{const s=setup();assert.equal(s.requests.length,0);assert.equal(s.w.summary(),'');});
test('ZIP lookup and forecast show real returned values',()=>{const s=setup(config);s.reply(0,geo);assert.match(s.requests[1].url,/temperature_unit=fahrenheit/);s.reply(1,forecast);assert.match(s.w.summary(),/70°F · Clear/);assert.match(s.w.summary(),/H 72° \/ L 55°/);});
test('Unknown ZIP does not request an unrelated location',()=>{const s=setup(config);s.reply(0,{results:[{country_code:'US',postcodes:['10002']}]});assert.equal(s.requests.length,1);assert.match(s.w.html(s.w.open()),/ZIP code not found/);});
test('Late responses cannot restore weather after turning it off',()=>{const s=setup(config);s.reply(0,geo);const t=s.w.open();t.f.i=15;assert.equal(s.w.key(t,'ok'),true);s.reply(1,forecast);assert.equal(s.w.summary(),'');assert.equal(s.w.config().zip,'');});
test('Failed storage save keeps current configuration',()=>{const s=setup(config,true),t=s.w.open();t.zip='90210';t.f.i=14;assert.equal(s.w.key(t,'ok'),false);assert.equal(s.w.config().zip,'10001');assert.match(t.error,/Could not save/);});
test('Back discards edited ZIP and incomplete ZIP cannot save',()=>{const s=setup(config),t=s.w.open();t.zip='12';t.f.i=14;assert.equal(s.w.key(t,'ok'),false);assert.match(t.error,/five-digit/);assert.equal(s.w.key(t,'back'),true);assert.equal(s.w.config().zip,'10001');});
test('Network failure marks cached data as stale',()=>{const s=setup(config);s.reply(0,geo);s.reply(1,forecast);s.w.refresh();s.requests[2].onerror();assert.match(s.w.summary(),/Updated/);});
