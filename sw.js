const CACHE_NAME = "mazza-pm-v3d-fix-2025-12-27";
const ASSETS = [
  "./",
  "./index.html",
  "./taxonomy.json",
  "./manifest.webmanifest",
  "./sw.js",
  "./_redirects",
  "./404.html",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE_NAME);
    await Promise.allSettled(ASSETS.map(async (a) => {
      try { await c.add(a); } catch (e) { /* ignore missing asset */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate",(e)=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE_NAME?caches.delete(k):null)))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",(e)=>{
  const req=e.request;
  const url=new URL(req.url);

  if (url.origin!==self.location.origin) return;

  if (req.mode==="navigate"){
    e.respondWith(
      caches.match("./index.html").then(cached=>{
        return cached || fetch(req).then(r=>{
          const cp=r.clone();
          caches.open(CACHE_NAME).then(cc=>cc.put("./index.html",cp));
          return r;
        }).catch(()=>caches.match("./index.html"));
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(cached=>{
      return cached || fetch(req).then(r=>{
        const cp=r.clone();
        caches.open(CACHE_NAME).then(cc=>cc.put(req,cp));
        return r;
      });
    })
  );
});
