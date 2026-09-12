const CACHE='palbreeder-shell-v9-target-movement';
const ELK_URL='https://cdn.jsdelivr.net/npm/elkjs@0.10.0/lib/elk.bundled.js';
const SHELL=[
  './','./index.html','./styles.css','./ux-p0.css','./ux-p1.css',
  './mobile-bottom-nav.css','./mobile-owned-list.css','./data-screen.css','./mobile-reverse.css','./mobile-flow.css','./passive-picker.css','./passive-supply.css','./passive-presets.css','./search-owned-badges.css','./polish.css',
  './data-fetch-cache.js','./passive-note-fix.js','./flow-fix.js','./passive-extension.js','./passive-supply.js','./passive-presets.js','./app.js','./cloud-sync.js','./mobile-pal-search.js','./ux-p0.js','./ux-p1.js','./mobile-bottom-nav.js','./data-screen.js','./mobile-reverse.js','./mobile-flow.js','./passive-picker.js','./pwa.js',
  './manifest.webmanifest','./palbreeder-icon.svg'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>Promise.all([
    cache.addAll(SHELL),
    fetch(ELK_URL,{mode:'no-cors'}).then(response=>cache.put(ELK_URL,response)).catch(()=>{})
  ])).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('palbreeder-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  if(request.url===ELK_URL){
    event.respondWith(caches.match(ELK_URL).then(cached=>cached||fetch(request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(ELK_URL,copy));return response})));
    return;
  }
  if(new URL(request.url).origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',copy));return response}).catch(()=>caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy))}return response})));
});
