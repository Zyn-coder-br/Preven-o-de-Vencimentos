const CACHE='vencimentos-pa-v3-19-2';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{
  const data=event.data||{};
  if(data.type==='SHOW_NOTIFICATION'){
    const title=data.title||'Vencimentos PA';
    const options={...(data.options||{}),badge:'./notification-icon-produto.png'};
    event.waitUntil(self.registration.showNotification(title,options));
  }
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){if('focus' in c)return c.focus();}
    if(clients.openWindow)return clients.openWindow('./');
  }));
});
