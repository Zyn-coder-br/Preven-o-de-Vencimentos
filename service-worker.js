const CACHE='vencimentos-pa-v3-19-5';
const SHELL=[
  './',
  './index.html',
  './manifest.json',
  './logo-pa.png',
  './icon-192.png',
  './icon-512.png',
  './notification-icon.png',
  './notification-icon-produto.png',
  './notification-icon-pique.png',
  './notification-icon-batida.png',
  './notification-icon-fefo.png',
  './notificacao_pa.wav'
];

self.addEventListener('install', event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('vencimentos-pa-')&&k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('message', event=>{
  const data=event.data||{};
  if(data.type==='SKIP_WAITING') self.skipWaiting();
  if(data.type==='SHOW_NOTIFICATION'){
    const title=data.title||'Vencimentos PA';
    const options={...(data.options||{}),badge:(data.options&&data.options.badge)||'./notification-icon-produto.png'};
    event.waitUntil(self.registration.showNotification(title,options));
  }
});

self.addEventListener('fetch', event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;

  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req).then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put('./index.html',copy));
        return response;
      }).catch(()=>caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached=>cached || fetch(req).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(req,copy));
      return response;
    }))
  );
});

self.addEventListener('notificationclick', event=>{
  event.notification.close();
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){if('focus' in c)return c.focus();}
    if(clients.openWindow)return clients.openWindow('./');
  }));
});
