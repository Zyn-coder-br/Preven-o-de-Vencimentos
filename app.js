const KEY='prevencao_vencimentos_v3';const OLD='prevencao_vencimentos_v2';let db=loadDB();let batidaAtual=null;let identificacaoFoto=null;let ocrBusy=false;let identificacaoCatalogo=null;
function defaults(){return{version:3,products:[],batidas:[],corridors:Array.from({length:18},(_,i)=>({id:i+1,nome:'Corredor '+(i+1),ativo:true})),users:[{id:'ramon',nome:'Ramon',funcao:'Pleno 2',admin:true,trabalhando:true},{id:'luan',nome:'Luan',funcao:'Pleno 1',admin:false,trabalhando:true},{id:'wagner',nome:'Wagner',funcao:'Chefe',admin:false,trabalhando:true}],rules:{greenMax:4,yellowMax:9,notifTime:'08:00',retiradaNotifTime:'18:00'}}}
function loadDB(){let x=localStorage.getItem(KEY);if(x){try{return normalize(JSON.parse(x))}catch{}}let d=defaults();let old=localStorage.getItem(OLD);if(old)try{let arr=JSON.parse(old);d.products=arr.map(x=>({id:String(x.id||Date.now()+Math.random()),produto:x.produto||'',marca:x.marca||'',categoria:x.categoria||'',validade:x.validade,quantidade:+x.quantidade||0,corredor:+x.corredor||1,status:x.status==='Separado'?'Separado':x.status==='Oferta solicitada'?'Oferta solicitada':x.status==='Oferta aplicada'?'Oferta aplicada':'Encontrado',foto:x.foto||'',obs:x.obs||'',criado:x.criado||new Date().toISOString(),criadoPor:'importado V2',separada:0}))}catch{}localStorage.setItem(KEY,JSON.stringify(d));return d}
function normalize(d){let z=defaults();let products=(d.products||[]).map(x=>({...x,barcode:x.barcode||x.codigoBarras||'',quantidade:+x.quantidade||0,separada:Math.max(0,Math.min(+x.separada||0,+x.quantidade||0)),historico:x.historico||[]}));let catalog=Array.isArray(d.catalog)?d.catalog:[];catalog=catalog.map(c=>({...c,barcode:String(c.barcode||'').replace(/\D/g,''),marca:c.marca||'',quantidadeProduto:c.quantidadeProduto||c.quantity||'',foto:c.foto||'',imagemFonte:c.imagemFonte||c.fonte||''}));products.forEach(p=>{let code=String(p.barcode||'').replace(/\D/g,'');if(code&&p.produto&&!catalog.some(c=>String(c.barcode||'')===code)){catalog.push({barcode:code,produto:p.produto,marca:p.marca||'',quantidadeProduto:p.quantidadeProduto||'',foto:p.foto||'',atualizado:p.atualizado||p.criado||new Date().toISOString(),fonte:'cadastro-local'});}});return{...z,...d,products,catalog,batidas:d.batidas||[],corridors:d.corridors||z.corridors,users:d.users||z.users,rules:{...z.rules,...(d.rules||{})}}}
function save(){localStorage.setItem(KEY,JSON.stringify(db))}function $ (id){return document.getElementById(id)}function toast(t){$('toast').textContent=t;$('toast').style.display='block';clearTimeout(window._t);window._t=setTimeout(()=>$('toast').style.display='none',2400)}
function now(){return new Date()}function today0(){let d=new Date();d.setHours(0,0,0,0);return d}function days(v){if(!v)return null;return Math.ceil((new Date(v+'T00:00:00')-today0())/86400000)}function fmt(v){if(!v)return'';let [y,m,d]=v.split('-');return d+'/'+m+'/'+y}function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function statusBadge(s){let c={
'Encontrado':'b-gray',
'Ainda no corredor':'b-red',
'Separado':'b-green',
'Aguardando oferta':'b-yellow',
'Oferta solicitada':'b-green',
'Oferta aplicada':'b-green',
'Resolvido':'b-green',
'Retirado/PIQUE':'b-green',
'Área de vencimento':'b-blue',
'PLU/Etiqueta':'b-green'
}[s]||'b-gray';return `<span class="badge ${c}">${esc(s)}</span>`}
function priority(n){if(n<0)return'VENCIDO';if(n<=db.rules.greenMax)return'CRITICO';if(n<=db.rules.yellowMax)return'ATENCAO';return'PRIORIDADE'}function daysBadge(n){let c=n<=db.rules.greenMax?'b-red':n<=db.rules.yellowMax?'b-yellow':'b-orange';let t=n<0?'Vencido há '+Math.abs(n)+' dia(s)':n===0?'Vence hoje':n===1?'1 dia restante':n+' dias restantes';return`<span class="badge ${c}">${t}</span>`}function badge(p){let c=p==='VENCIDO'||p==='CRITICO'?'b-red':p==='ATENCAO'?'b-yellow':p==='PRIORIDADE'?'b-orange':'b-gray';let t={VENCIDO:'Vencido',CRITICO:'0–4 dias',ATENCAO:'5–9 dias',PRIORIDADE:'10+ dias'}[p]||p;return`<span class="badge ${c}">${t}</span>`}
function activeCorr(){return db.corridors.filter(c=>c.ativo)}function user(){return db.users.find(u=>u.trabalhando)||db.users[0]}function userName(id){return db.users.find(u=>u.id===id)?.nome||id||'—'}
const GROUPS={operacao:[['batida','🔎 Batida'],['produtos','📦 Produtos'],['vencimentos','🔔 Vencimentos'],['pendencias','🚨 Pendências']],acompanhamento:[['hoje','🗓️ Hoje'],['semana','📆 Semana'],['historico','📅 Histórico'],['relatorios','📊 Relatórios']],admin:[['config','⚙️ Configuração'],['backup','💾 Backup']]};
const VIEW_GROUP={painel:'painel',novo:'operacao',batida:'operacao',produtos:'operacao',vencimentos:'operacao',pendencias:'operacao',hoje:'acompanhamento',semana:'acompanhamento',historico:'acompanhamento',relatorios:'acompanhamento',config:'admin',backup:'admin'};
function saveNavigation(view){try{localStorage.setItem('pv_last_view',view);localStorage.setItem('pv_scroll_'+view,String(window.scrollY||0))}catch(e){}}
function setGroup(group,openFirst=true){let sub=$('subnav');if(group==='painel'){sub.hidden=true;sub.innerHTML='';document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.group==='painel'));if(openFirst)showView('painel');return}sub.hidden=false;sub.innerHTML=GROUPS[group].map(([id,label])=>`<button data-view="${id}" class="${$(id)?.classList.contains('active')?'active':''}">${label}</button>`).join('');document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.group===group));sub.querySelectorAll('button').forEach(b=>b.onclick=()=>showView(b.dataset.view));if(openFirst){let current=document.querySelector('.view.active')?.id;let first=GROUPS[group][0][0];showView(current&&VIEW_GROUP[current]===group?current:first)}}
function showView(id){let current=document.querySelector('.view.active')?.id;if(current)saveNavigation(current);document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$(id).classList.add('active');let group=VIEW_GROUP[id]||'painel';if(group==='painel'){setGroup('painel',false)}else{setGroup(group,false);$('subnav').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.view===id));}saveNavigation(id);renderAll(id);requestAnimationFrame(()=>{try{let y=parseInt(localStorage.getItem('pv_scroll_'+id)||'0',10);window.scrollTo(0,y)}catch(e){}})}
function goVencimentosSection(sectionId){showView('vencimentos');requestAnimationFrame(()=>requestAnimationFrame(()=>{const el=$(sectionId);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}));}
function renderAll(id){if(id==='painel')renderPainel();if(id==='batida')renderBatida();if(id==='produtos')renderProdutos();if(id==='vencimentos')renderVencimentos();if(id==='pendencias')renderPendencias();if(id==='hoje')renderHoje();if(id==='semana')renderSemana();if(id==='historico')renderHistorico();if(id==='relatorios')renderRelatorios();if(id==='config')renderConfig();if(id==='novo')fillCorridors();if(id==='backup'){} }
setGroup('painel',false);
function restoreNavigation(){let id='painel';try{let saved=localStorage.getItem('pv_last_view');if(saved&&$(saved))id=saved}catch(e){}showView(id)}
function fillCorridors(){let html='<option value="">Selecione</option>'+activeCorr().map(c=>`<option value="${c.id}">${esc(c.nome)}</option>`).join('');$('corredor').innerHTML=html;let f='<option value="">Todos corredores</option>'+activeCorr().map(c=>`<option value="${c.id}">${esc(c.nome)}</option>`).join('');$('fCor').innerHTML=f}
function acaoStatus(s){return {'Encontrado':'Verificar e separar o produto','Ainda no corredor':'Separar o produto do corredor','Separado':'Encaminhar para oferta','Aguardando oferta':'Solicitar/aplicar oferta','Oferta solicitada':'Acompanhar aplicação da oferta','Oferta aplicada':'Confirmar exposição/saída do produto','Resolvido':'Concluído','Retirado/PIQUE':'Produto retirado da área de venda'}[s]||'Verificar produto'}
function lastBatida(c){let a=db.batidas.filter(b=>b.corredorId==c.id).sort((x,y)=>new Date(y.data)-new Date(x.data));return a[0]||null}function daysSince(c){let b=lastBatida(c);return b?Math.floor((today0()-new Date(b.data).setHours(0,0,0,0))/86400000):9999}
function recommended(){let arr=activeCorr().map(c=>({c,d:daysSince(c),last:lastBatida(c),week:lastBatidaSinceWeek(c)}));let agora=new Date(),inicioMes=new Date(agora.getFullYear(),agora.getMonth(),1);let mes=db.batidas.filter(b=>new Date(b.data)>=inicioMes),feitos=new Set(mes.map(b=>String(b.corredorId)));let pendMes=arr.filter(x=>!feitos.has(String(x.c.id)));if(pendMes.length){pendMes.sort((a,b)=>{if(a.d===9999&&b.d!==9999)return -1;if(b.d===9999&&a.d!==9999)return 1;return b.d-a.d||a.c.id-b.c.id});return pendMes[0]}let atrasados=arr.filter(x=>x.d>15);if(atrasados.length){atrasados.sort((a,b)=>b.d-a.d||a.c.id-b.c.id);return atrasados[0]}let semSemana=arr.filter(x=>!x.week);if(semSemana.length)arr=semSemana;arr.sort((a,b)=>b.d-a.d||a.c.id-b.c.id);return arr[0]||{c:activeCorr()[0],d:9999,last:null,week:null}}
function lastBatidaSinceWeek(c){let w=startOfWeek();return db.batidas.filter(b=>b.corredorId==c.id&&new Date(b.data)>=w).sort((a,b)=>new Date(b.data)-new Date(a.data))[0]||null}
function batidasHoje(){let t=today0();return db.batidas.filter(b=>new Date(b.data)>=t)}
function produtosHoje(){let t=today0();return db.products.filter(x=>new Date(x.criado)>=t)}
function renderPainel(){let r=recommended(),p=db.products;let counts={total:p.length,v:0,c:0,a:0,sep:0,agu:0,sol:0,ap:0,cor:0};p.forEach(x=>{let n=days(x.validade),q=priority(n);if(q==='VENCIDO')counts.v++;if(q==='CRITICO')counts.c++;if(q==='ATENCAO')counts.a++;if(x.status==='Separado')counts.sep++;if(x.status==='Aguardando oferta')counts.agu++;if(x.status==='Oferta solicitada')counts.sol++;if(x.status==='Oferta aplicada')counts.ap++;if(x.status==='Ainda no corredor')counts.cor});let bh=batidasHoje(),ph=produtosHoje(),amanha=p.filter(isOpenProduct).filter(x=>days(x.validade)===1),hoje=p.filter(isOpenProduct).filter(x=>days(x.validade)===0),venc=p.filter(isOpenProduct).filter(x=>days(x.validade)<0),pend=p.filter(x=>x.status==='Ainda no corredor'||x.status==='Aguardando oferta'||x.status==='Separado'||days(x.validade)<=9);$('painelHero').innerHTML=`<div class="hero"><small>🧠 PRÓXIMA BATIDA RECOMENDADA</small><h2 style="margin:5px 0">${esc(r.c.nome)}</h2><p style="margin:4px 0">${r.d===9999?'Nunca realizada':r.d+' dia(s) desde a última batida'}${r.week?' • Já batido nesta semana':''}<br><small>Meta mensal: ${(() => {let z=new Date(),i=new Date(z.getFullYear(),z.getMonth(),1),s=new Set(db.batidas.filter(b=>new Date(b.data)>=i).map(b=>String(b.corredorId)));return s.size+' de '+activeCorr().length+' corredores cobertos';})()}</small></p><div class="actions"><button class="primary" onclick="startBatida(${r.c.id})">▶️ Iniciar batida</button><button class="secondary" onclick="showView('batida')">Escolher outro</button></div></div>`;$('metrics').innerHTML=[['🚨 Vencem hoje',hoje.length,'red','vencimentos','venceHoje'],['🔴 Vencem amanhã',amanha.length,'red','vencimentos','venceAmanha'],['⚠️ Vencidos',venc.length,'red','vencimentos','venceVencidos'],['📊 Acompanhamento',0,'','acompanhamento','hoje']].map(a=>{let count=a[4]==='venceHoje'?hoje.length:a[4]==='venceAmanha'?amanha.length:a[4]==='venceVencidos'?venc.length:'→';return `<div class="card metric" role="button" tabindex="0" style="cursor:pointer" onclick="${a[3]==='vencimentos'?`goVencimentosSection('${a[4]}')`: `setGroup('acompanhamento',true)` }" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}"><span>${a[0]}</span><strong class="${a[2]}">${count}</strong></div>`}).join('');let alertas=[...hoje.map(x=>({x,t:'🚨 Vence hoje'})),...amanha.map(x=>({x,t:'🔴 Vence amanhã'}))];$('painelAlertas').innerHTML=alertas.length?alertas.slice(0,6).map(a=>`<div style="padding:9px 0;border-bottom:1px solid var(--line)"><strong>${a.t}</strong><br>${esc(a.x.produto)} • ${esc(corridorName(a.x.corredor))} • ${remaining(a.x)} restante(s)</div>`).join(''):`<div class="empty">Nenhum vencimento crítico para hoje ou amanhã.</div>`;let working=db.users.filter(u=>u.trabalhando);$('equipeHoje').innerHTML=working.length?working.map(u=>{let bb=bh.filter(b=>b.usuarioId===u.id).length,pp=ph.filter(x=>x.criadoPor===u.id).length;return`<p style="margin:8px 0">🟢 <strong>${esc(u.nome)}</strong> — ${esc(u.funcao)}<br><small>${bb} batida(s) • ${pp} produto(s) registrado(s)</small></p>`}).join(''):'<div class="empty">Nenhum membro marcado como trabalhando.</div>';let totalCorr=activeCorr().length,mesAgora=new Date(),inicioMes=new Date(mesAgora.getFullYear(),mesAgora.getMonth(),1);let batidasMes=db.batidas.filter(b=>new Date(b.data)>=inicioMes),corredoresMes=new Set(batidasMes.map(b=>String(b.corredorId))),feitosMes=corredoresMes.size,pctMes=totalCorr?Math.round(Math.min(100,(feitosMes/totalCorr)*100)):0;let atrasados15=activeCorr().filter(c=>daysSince(c)>15),pendentesMes=activeCorr().filter(c=>!corredoresMes.has(String(c.id)));let cicloTxt=atrasados15.length?`<span class="badge red">⚠️ ${atrasados15.length} corredor(es) há mais de 15 dias sem batida</span>`:'<span class="badge green">✅ Nenhum corredor passou de 15 dias sem batida</span>';let metaTxt=pendentesMes.length?`<span class="badge red">🎯 Faltam ${pendentesMes.length} corredor(es) para completar a meta mensal</span>`:'<span class="badge green">🎯 Meta mensal completa: todos os ${totalCorr} corredores já tiveram batida</span>';let mesNome=mesAgora.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});$('progressoHoje').innerHTML=`<div class="kpi"><strong>📅 ${mesNome}</strong><br><strong>${feitosMes} de ${totalCorr}</strong> corredor(es) trabalhado(s) no mês • <strong>${pctMes}%</strong> de cobertura</div><div style="margin-top:10px;height:14px;background:#e8eef5;border-radius:99px;overflow:hidden"><div style="height:100%;width:${pctMes}%;background:var(--blue)"></div></div><div style="margin-top:10px">${metaTxt}</div><div style="margin-top:8px">${cicloTxt}</div><small class="muted" style="display:block;margin-top:8px"><strong>Regra da batida:</strong> primeiro completar os ${totalCorr} corredores no mês. Depois, priorizar quem estiver há mais de 15 dias sem batida; se ninguém estiver nessa situação, seguir pelo maior tempo sem batida, evitando repetir na mesma semana quando possível.</small>`}
function productMini(x){let n=days(x.validade);return`<div style="padding:9px 0;border-bottom:1px solid var(--line)"><strong>${esc(x.produto)}</strong> <small>• ${fmt(x.validade)} • ${x.quantidade} un.</small><br>${badge(priority(n))} ${statusBadge(x.status)} • ${esc(corridorName(x.corredor))}</div>`}
function corridorName(id){return db.corridors.find(c=>c.id==id)?.nome||'Corredor '+id}
function startBatida(id,motivo=''){batidaAtual={id:'b'+Date.now(),corredorId:id,inicio:now().toISOString(),produtos:[],usuarioId:user().id,motivo};showView('batida')}
function renderVencimentos(){
 let base=db.products.filter(x=>x.validade&&x.status!=='Retirado/PIQUE');
 let hoje=base.filter(x=>days(x.validade)===0&&x.status!=='Resolvido').sort((a,b)=>String(a.validade).localeCompare(String(b.validade)));
 let amanha=base.filter(x=>days(x.validade)===1&&x.status!=='Resolvido').sort((a,b)=>String(a.validade).localeCompare(String(b.validade)));
 let prox10=base.filter(x=>{let n=days(x.validade);return n>=2&&n<=10&&x.status!=='Resolvido'}).sort((a,b)=>days(a.validade)-days(b.validade));
 let venc=base.filter(x=>days(x.validade)<0&&x.status!=='Resolvido').sort((a,b)=>days(a.validade)-days(b.validade));
 let card=x=>`<div class="item"><img class="thumb" src="${x.foto||''}" alt=""><div class="item-main"><strong>${esc(x.produto)}</strong><small>Validade: ${fmt(x.validade)} • ${esc(corridorName(x.corredor))} • ${remaining(x)} restante(s)</small><br><small>▦ EAN: <strong>${esc(x.barcode||'EAN não cadastrado')}</strong></small><br>${daysBadge(days(x.validade))} ${statusBadge(x.status)}<br><small>Registrado por ${esc(userName(x.criadoPor))}</small></div></div>`;
 let card10=x=>`<div class="item"><img class="thumb" src="${x.foto||''}" alt=""><div class="item-main"><strong>${esc(x.produto)}</strong><small>Validade: ${fmt(x.validade)} • ${esc(corridorName(x.corredor))} • ${remaining(x)} restante(s)</small><br><small>▦ EAN: <strong>${esc(x.barcode||'EAN não cadastrado')}</strong></small><br>${daysBadge(days(x.validade))} ${statusBadge(x.status)}<br><small>Registrado por ${esc(userName(x.criadoPor))}</small></div><div class="actions"><button class="secondary" onclick="actionNext10('${x.id}')">⚙️ Ação</button></div></div>`;
 let fill=(id,arr,empty,renderer=card)=>$(id).innerHTML=arr.length?`<div class="product-list">${arr.map(renderer).join('')}</div>`:`<div class="empty">${empty}</div>`;
 $('vencKpis').innerHTML=[['🚨 Vence hoje',hoje.length,'red'],['🔴 Vence amanhã',amanha.length,'red'],['🟡 Próximos 10 dias',prox10.length,'yellow'],['⚠️ Vencidos',venc.length,'red']].map(a=>`<div class="card metric"><span>${a[0]}</span><strong class="${a[2]}">${a[1]}</strong></div>`).join('');
 fill('venceHoje',hoje,'Nenhum produto vence hoje.');
 fill('venceAmanha',amanha,'Nenhum produto vence amanhã.');
 fill('vence10',prox10,'Nenhum produto vence nos próximos 10 dias.',card10);
 fill('venceVencidos',venc,'Nenhum produto vencido.');
}
function renderPendencias(){
 let base=db.products.filter(x=>x.status!=='Retirado/PIQUE');
 let retirada=base.filter(x=>x.validade&&(days(x.validade)===0||days(x.validade)===1)).sort((a,b)=>days(a.validade)-days(b.validade));
 let noCor=base.filter(x=>x.status==='Ainda no corredor'&&x.validade&&days(x.validade)<=30).sort((a,b)=>days(a.validade)-days(b.validade));
 let retiradaCard=x=>{let thumb=x.foto||"data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2296%22 height=%2296%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 rx=%2212%22 fill=%22%23eef3f8%22/%3E%3Ctext x=%2250%25%22 y=%2258%22 text-anchor=%22middle%22 font-size=%2234%22%3E%F0%9F%93%A6%3C/text%3E%3C/svg%3E";return `<div class="item" style="border:2px solid #c62828;background:#fffafa;align-items:center"><img class="thumb" src="${escapeAttr(thumb)}" alt="Foto do produto" style="width:88px;height:88px;object-fit:cover;border-radius:12px"><div class="item-main"><strong>${esc(x.produto)}</strong><small style="display:block;margin-top:5px">▦ EAN: <strong>${esc(x.barcode||'EAN não cadastrado')}</strong></small><div style="margin-top:7px">${daysBadge(days(x.validade))}</div><small style="display:block;margin-top:5px">${days(x.validade)<0?'⚠️ Vencido':days(x.validade)===0?'🚨 Vence hoje':days(x.validade)+' dia(s) restantes'}</small></div><div class="actions"><button class="primary" onclick="marcarRetiradoPique('${x.id}')">📸 Retirado/PIQUE</button></div></div>`};
 let noCorCard=x=>{let thumb=x.foto||"data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2296%22 height=%2296%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 rx=%2212%22 fill=%22%23eef3f8%22/%3E%3Ctext x=%2250%25%22 y=%2258%22 text-anchor=%22middle%22 font-size=%2234%22%3E%F0%9F%93%A6%3C/text%3E%3C/svg%3E";return `<div class="item" style="border:2px solid #c62828;background:#fffafa;align-items:center"><img class="thumb" src="${escapeAttr(thumb)}" alt="Foto do produto" style="width:88px;height:88px;object-fit:cover;border-radius:12px"><div class="item-main"><strong>${esc(x.produto)}</strong><small style="display:block;margin-top:5px">${esc(x.marca||'Produto')} • ${esc(x.quantidadeProduto||'')}</small><small style="display:block;margin-top:5px">▦ EAN: <strong>${esc(x.barcode||'EAN não cadastrado')}</strong></small><div style="margin-top:7px">${daysBadge(days(x.validade))}</div><small style="display:block;margin-top:5px">${days(x.validade)<0?'⚠️ Vencido':days(x.validade)===0?'🚨 Vence hoje':days(x.validade)+' dia(s) restantes'}</small></div><div class="actions"><button class="secondary" onclick="editStatus('${x.id}')">Status</button></div></div>`};
 $('pendKpis').innerHTML=[['🚨 Retirada em 1 dia',retirada.length,'red'],['🔴 Ainda no corredor',noCor.length,'red']].map(a=>`<div class="card metric"><span>${a[0]}</span><strong class="${a[2]}">${a[1]}</strong></div>`).join('');
 $('pendRetirada').innerHTML=retirada.length?`<div class="product-list">${retirada.map(retiradaCard).join('')}</div>`:'<div class="empty">Nenhum produto com 1 dia restante pendente de retirada.</div>';
 $('pendCorredor').innerHTML=noCor.length?`<div class="product-list">${noCor.map(noCorCard).join('')}</div>`:'<div class="empty">Nenhum produto nesta situação.</div>';
}
function resetPiquePhotoInput(){let old=$('piqueFoto');if(!old)return;let fresh=old.cloneNode(true);old.replaceWith(fresh);fresh.addEventListener('change',handlePiquePhotoChange)}
function handlePiquePhotoChange(e){let f=e.target.files[0],pr=$('piqueFotoPreview'),btn=$('confirmPiqueBtn');pr.removeAttribute('src');pr.hidden=true;btn.disabled=true;if(!f)return;let r=new FileReader();r.onload=()=>{pr.src=r.result;pr.hidden=false;btn.disabled=false};r.readAsDataURL(f)}
function marcarRetiradoPique(id){let x=db.products.find(p=>p.id===id);if(!x)return;if(x.status==='Retirado/PIQUE'){toast('Produto já está marcado como Retirado/PIQUE.');return}piqueProductId=id;$('piqueModalProduct').textContent='Produto: '+(x.produto||'—')+' • '+(days(x.validade)<0?'Vencido':days(x.validade)===0?'Vence hoje':days(x.validade)+' dia(s) restantes');resetPiquePhotoInput();openPiqueModal()}
function renderBatida(){if(!batidaAtual){let r=recommended();$('batidaBox').innerHTML=`<div class="hero"><small>CORREDOR RECOMENDADO</small><h2>${esc(r.c.nome)}</h2><p>${r.d===9999?'Nunca realizado':r.d+' dia(s) sem batida'}${r.week?' • já realizado nesta semana':''}</p><div class="actions"><button class="primary" onclick="startBatida(${r.c.id})">▶️ Iniciar corredor recomendado</button><button class="secondary" onclick="chooseOther()">Fazer outro corredor</button></div></div><div class="card" style="margin-top:12px"><h3>Prioridade dos corredores</h3>${activeCorr().map(c=>({c,d:daysSince(c),week:lastBatidaSinceWeek(c)})).sort((a,b)=>{if(a.d===9999&&b.d!==9999)return -1;if(b.d===9999&&a.d!==9999)return 1;return b.d-a.d||a.c.id-b.c.id}).map(o=>{let c=o.c,d=o.d;return`<div class="corridor-row"><strong>${c.id}</strong><span>${esc(c.nome)}<br><small>${d===9999?'Nunca realizado':d+' dia(s) sem batida'}</small></span><span>${o.week?'📅':d>=10?'🔴':d>=5?'🟡':'🟢'}</span></div>`}).join('')}</div><div class="alert">💡 O sistema evita recomendar novamente um corredor já batido nesta semana enquanto houver outro corredor pendente.</div>`;return}let c=db.corridors.find(x=>x.id==batidaAtual.corredorId);$('batidaBox').innerHTML=`<div class="card"><h3>🔎 ${esc(c.nome)}</h3><p>Iniciada por <strong>${esc(userName(batidaAtual.usuarioId))}</strong> às ${new Date(batidaAtual.inicio).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</p><div class="actions"><button class="primary" onclick="quickProduct()">＋ Registrar produto</button>${batidaAtual.produtos.length?'<button class="secondary" onclick="finishBatida()">✅ Finalizar batida</button>':'<button class="secondary" disabled title="Registre pelo menos um produto antes de finalizar">🔒 Finalizar batida</button>'}<button class="secondary" onclick="cancelBatida()">Cancelar</button></div>${batidaAtual.produtos.length?'':'<p class="muted" style="margin-top:8px">Para evitar registros acidentais, a batida só pode ser finalizada depois que pelo menos um produto for registrado. Se entrou no corredor e não realizou a atividade, use <strong>Cancelar</strong>.</p>'}</div><div class="card" style="margin-top:12px"><h3>Produtos desta batida (${batidaAtual.produtos.length})</h3><div class="product-list">${batidaAtual.produtos.length?batidaAtual.produtos.map(id=>{let x=db.products.find(p=>p.id===id);return x?productCard(x,false):''}).join(''):'<div class="empty">Nenhum produto registrado nesta batida.</div>'}</div></div>`}
function chooseOther(){let opts=activeCorr().map(c=>`${c.id} — ${c.nome}`).join('\n');let s=prompt('Digite o número do corredor indicado:\n\n'+opts);let id=Number((s||'').split('—')[0].trim()||s);if(!activeCorr().some(c=>c.id===id)){toast('Corredor inválido.');return}let m=prompt('Motivo (ex.: Orientação da gerência, Prioridade operacional, Corredor indisponível):','Orientação da gerência');if(m===null)return;startBatida(id,m.trim()||'Outro');toast('Outro corredor selecionado. A recomendação original continua pendente.')}
async function finishBatida(){if(!batidaAtual)return;let ev={id:batidaAtual.id,data:now().toISOString(),corredorId:batidaAtual.corredorId,usuarioId:currentActorId(),produtos:batidaAtual.produtos.length,observacao:batidaAtual.motivo||''};db.batidas.push(ev);save();await emitCloudEvent('BATIDA_FINALIZADA',{corredorId:ev.corredorId,corredor:corredorName(ev.corredorId),produtos:ev.produtos});notifyLocal('🔎 Batida finalizada',`${corredorName(ev.corredorId)} • ${ev.produtos} produto(s) registrado(s).`);toast('Batida registrada com sucesso.');batidaAtual=null;renderBatida();renderPainel();renderSemana();renderHistorico();renderRelatorios()}
function cancelBatida(){batidaAtual=null;renderBatida()}
function quickProduct(){showView('novo');window._returnBatida=true;$('corredor').value=batidaAtual.corredorId}

function abrirIdentificadorFoto(){
  if(ocrBusy){toast('A identificação já está em andamento.');return}
  $('fotoIdentificar').value='';
  $('fotoIdentificar').click();
}
function usarFotoNormal(){
  $('foto').click();
}
function mostrarIdentificacao(msg,kind='info'){
  let b=$('identificacaoBox'); if(!b)return;
  b.style.display='block';
  b.innerHTML=msg;
}
function escapeAttr(s){return esc(s).replace(/`/g,'&#096;')}
function limparOCRTexto(t){
  return String(t||'')
    .replace(/\r/g,'\n')
    .split(/\n+/)
    .map(x=>x.replace(/[|•▪●]+/g,' ').replace(/\s+/g,' ').trim())
    .filter(x=>x.length>=3)
    .filter(x=>/[A-Za-zÀ-ÿ]{2,}/.test(x))
    .slice(0,18);
}
function sugerirNomePorOCR(texto){
  let linhas=limparOCRTexto(texto);
  let catalog=db.products.map(p=>p.produto).filter(Boolean);
  // Primeiro tenta reaproveitar um produto já cadastrado, usando palavras relevantes.
  let low=String(texto||'').toLowerCase();
  let melhor=null,score=0;
  catalog.forEach(nome=>{
    let toks=nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/[^a-z0-9]+/).filter(x=>x.length>=3);
    let hits=toks.filter(t=>low.normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(t)).length;
    if(hits>score){score=hits;melhor=nome}
  });
  if(melhor && score>=2) return melhor;
  // Remove linhas muito genéricas e privilegia linhas com números (peso/volume) ou várias palavras.
  let candidatas=linhas.filter(x=>!/(ingredientes|informação nutricional|informacoes nutricionais|fabricado|indústria|industria|sac\b|cnpj|conservar|cont[eé]m|valor energ[eé]tico|carboidrato|prote[ií]na|gordura|sódio|sodio)/i.test(x));
  candidatas.sort((a,b)=>{
    let sa=(a.match(/\d+\s*(g|kg|ml|l)\b/i)?5:0)+(a.split(/\s+/).length>=2?2:0)+Math.min(a.length,45)/100;
    let sb=(b.match(/\d+\s*(g|kg|ml|l)\b/i)?5:0)+(b.split(/\s+/).length>=2?2:0)+Math.min(b.length,45)/100;
    return sb-sa;
  });
  return candidatas[0]||linhas[0]||'';
}
async function carregarTesseract(){
  if(window.Tesseract)return window.Tesseract;
  await new Promise((resolve,reject)=>{
    let sc=document.createElement('script');
    sc.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    sc.onload=resolve; sc.onerror=()=>reject(new Error('Não foi possível carregar o leitor de texto.'));
    document.head.appendChild(sc);
  });
  return window.Tesseract;
}
async function identificarFoto(ev){
  let file=ev.target.files&&ev.target.files[0];
  if(!file)return;
  ocrBusy=true;
  identificacaoFoto=file;
  mostrarIdentificacao('⏳ <strong>Lendo a embalagem...</strong><br><small>Estou procurando o nome, marca e tamanho visíveis na foto. Isso pode levar alguns segundos na primeira vez.</small>');
  try{
    let T=await carregarTesseract();
    let result=await T.recognize(file,'por',{logger:m=>{
      if(m&&m.status==='recognizing text'&&typeof m.progress==='number'){
        mostrarIdentificacao('⏳ <strong>Lendo a embalagem...</strong> '+Math.round(m.progress*100)+'%');
      }
    }});
    let texto=result&&result.data?result.data.text:'';
    let conf=Number(result&&result.data&&result.data.confidence||0);
    let sugestao=sugerirNomePorOCR(texto);
    // OCR de embalagem pode devolver ruído. Não vamos sugerir texto sem confiança mínima.
    if(conf<45 || !sugestao || sugestao.length<4){
      mostrarIdentificacao('⚠️ <strong>Não consegui identificar o produto com segurança.</strong><br><small>A leitura por foto é mais lenta e pode errar textos de embalagens. Para agilizar a rotina, prefira o <strong>código de barras</strong> quando disponível.</small>');
      return;
    }
    if(sugestao){
      $('produto').value=sugestao;
      mostrarIdentificacao(
        '<strong>🔎 Sugestão encontrada</strong><br>'+
        '<span style="font-size:17px"><strong>'+esc(sugestao)+'</strong></span><br>'+
        '<small>Confira o nome antes de registrar. A foto ficará disponível para anexar ao produto.</small>'+
        '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">'+
        '<button type="button" class="primary" onclick="confirmarIdentificacao()">✅ Usar esta sugestão</button>'+
        '<button type="button" class="secondary" onclick="editarIdentificacao()">✏️ Corrigir</button></div>'
      );
    }else{
      mostrarIdentificacao(
        '⚠️ <strong>Não consegui identificar com segurança.</strong><br>'+
        '<small>Digite o nome manualmente ou tente novamente com a embalagem mais próxima e bem iluminada.</small>'
      );
    }
  }catch(e){
    console.error(e);
    mostrarIdentificacao('⚠️ <strong>Não foi possível fazer a identificação pela foto.</strong><br><small>Verifique a internet e tente novamente. Você também pode preencher o nome manualmente.</small>');
  }finally{ocrBusy=false}
}
function confirmarIdentificacao(){
  let v=$('produto').value.trim();
  if(v){mostrarIdentificacao('✅ <strong>Identificação confirmada.</strong><br><small>Revise validade, quantidade e corredor e depois toque em Registrar.</small>');toast('Sugestão confirmada.')}
}
function editarIdentificacao(){
  $('produto').focus();
  $('produto').select();
  mostrarIdentificacao('✏️ <strong>Edite o nome acima</strong> e depois confira os demais campos antes de registrar.');
}
let barcodeStream=null,barcodeTimer=null,barcodeBusy=false,barcodeControls=null,barcodeReader=null,barcodeDetector=null;
function abrirLeitorBarras(){
  $('barcodeScanner').style.display='block'; $('barcodeManual').style.display='block'; $('barcodeManualBtn').style.display='block';
  const secure=window.isSecureContext || location.protocol==='https:' || location.hostname==='localhost';
  if(!secure || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    mostrarIdentificacao('⚠️ <strong>Câmera ao vivo indisponível neste modo.</strong><br><small>O arquivo foi aberto fora de um contexto seguro. Para usar o leitor pela câmera, abra a versão publicada no <strong>GitHub Pages (HTTPS)</strong>. Enquanto isso, use <strong>Fotografar código</strong> ou digite o EAN e toque em <strong>Consultar</strong>.</small>');
    return;
  }
  mostrarIdentificacao('▦ <strong>Leitor ativo</strong><br><small>Permita o acesso à câmera e aponte para o código de barras. A leitura é automática.</small>');
  iniciarCameraV393();
}
async function carregarZXingOpcional(){
  if(window.ZXingBrowser && window.ZXingBrowser.BrowserMultiFormatReader) return window.ZXingBrowser;
  if(window.__zxingLoadPromise) return window.__zxingLoadPromise;
  window.__zxingLoadPromise=new Promise((resolve,reject)=>{
    const sc=document.createElement('script');
    let done=false;
    const finish=(ok)=>{if(done)return;done=true;ok?resolve(window.ZXingBrowser||null):reject(new Error('ZXing indisponível'));};
    sc.src='https://unpkg.com/@zxing/browser@0.2.1';
    sc.async=true;
    sc.onload=()=>finish(true);
    sc.onerror=()=>finish(false);
    document.head.appendChild(sc);
    setTimeout(()=>finish(false),5000);
  });
  return window.__zxingLoadPromise;
}

async function iniciarCameraV393(){
  fecharCameraSomente();
  const video=$('barcodeVideo');
  try{
    barcodeStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
    video.srcObject=barcodeStream; video.muted=true; video.setAttribute('playsinline','');
    await video.play();
    if('BarcodeDetector' in window){
      try{ barcodeDetector=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128','itf','codabar']}); }catch(e){ barcodeDetector=null; }
    }
    if(barcodeDetector){
      const loop=async()=>{
        if(!barcodeStream || video.readyState<2)return;
        try{
          const codes=await barcodeDetector.detect(video);
          const code=codes&&codes[0]&&codes[0].rawValue;
          if(code && !barcodeBusy){barcodeBusy=true;await processarCodigo(code).catch(console.error);barcodeBusy=false;}
        }catch(e){}
        if(barcodeStream) barcodeTimer=requestAnimationFrame(loop);
      };
      barcodeTimer=requestAnimationFrame(loop);
      mostrarIdentificacao('🟢 <strong>Câmera aberta.</strong><br><small>Procure o código de barras dentro da área da câmera.</small>');
      return;
    }
    // Fallback ZXing: carregado somente se o navegador não oferecer BarcodeDetector.
    try{ await carregarZXingOpcional(); }catch(e){}
    if(window.ZXingBrowser && window.ZXingBrowser.BrowserMultiFormatReader){
      const devices=await ZXingBrowser.BrowserCodeReader.listVideoInputDevices();
      const back=devices.find(d=>/back|rear|environment|traseira/i.test(d.label))||devices[0];
      barcodeReader=new ZXingBrowser.BrowserMultiFormatReader();
      barcodeControls=await barcodeReader.decodeFromVideoDevice(back?.deviceId,video,(result)=>{
        if(result && result.text && !barcodeBusy){barcodeBusy=true;processarCodigo(result.text).catch(console.error).finally(()=>barcodeBusy=false);}
      });
      mostrarIdentificacao('🟢 <strong>Câmera aberta.</strong><br><small>Leitor ZXing ativo. Aponte para o EAN.</small>');
      return;
    }
    throw new Error('Leitor nativo e ZXing indisponíveis');
  }catch(e){
    console.error(e);
    fecharCameraSomente();
    let msg='Não foi possível abrir a câmera.';
    if(e&&e.name==='NotAllowedError')msg='A câmera foi bloqueada. Permita a câmera para este site e tente novamente.';
    else if(e&&e.name==='NotFoundError')msg='Nenhuma câmera compatível foi encontrada.';
    else if(e&&e.name==='NotReadableError')msg='A câmera está ocupada por outro aplicativo ou navegador.';
    mostrarIdentificacao('⚠️ <strong>'+msg+'</strong><br><small>Se estiver no GitHub Pages, confira a permissão da câmera do Chrome. Se estiver usando o arquivo ZIP, use <strong>Fotografar código</strong> ou o campo manual.</small>');
  }
}
function abrirFotoCodigo(){ $('fotoCodigo').value=''; $('fotoCodigo').click(); }
async function lerCodigoPorFoto(event){
  const file=event.target.files&&event.target.files[0]; if(!file)return;
  mostrarIdentificacao('⏳ <strong>Lendo o código da foto...</strong><br><small>Segure o código inteiro e bem focado na imagem.</small>');
  try{
    try{await carregarZXingOpcional();}catch(e){}
    if(window.ZXingBrowser && window.ZXingBrowser.BrowserMultiFormatReader){
      const reader=new ZXingBrowser.BrowserMultiFormatReader(); const url=URL.createObjectURL(file);
      try{const result=await reader.decodeFromImageUrl(url); if(result&&result.text){await processarCodigo(result.text);return;}}finally{URL.revokeObjectURL(url);}
    }
    if('BarcodeDetector' in window){const detector=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128','itf','codabar']});const bmp=await createImageBitmap(file);const codes=await detector.detect(bmp);if(bmp.close)bmp.close();if(codes&&codes[0]&&codes[0].rawValue){await processarCodigo(codes[0].rawValue);return;}}
    mostrarIdentificacao('⚠️ <strong>Não consegui ler o código nesta foto.</strong><br><small>Tente outra foto, mais próxima e com boa iluminação, ou digite o número abaixo.</small>');
  }catch(e){console.error(e);mostrarIdentificacao('⚠️ <strong>Não consegui ler o código desta foto.</strong><br><small>Digite o número no campo e toque em <strong>Consultar</strong>.</small>');}
}
function fecharCameraSomente(){
  if(barcodeControls){try{barcodeControls.stop()}catch(e){} barcodeControls=null;}
  if(barcodeReader){try{barcodeReader.reset()}catch(e){} barcodeReader=null;}
  if(barcodeTimer)cancelAnimationFrame(barcodeTimer); barcodeTimer=null; barcodeDetector=null;
  if(barcodeStream){barcodeStream.getTracks().forEach(t=>t.stop());barcodeStream=null;}
  const v=$('barcodeVideo'); if(v){try{v.pause()}catch(e){} v.srcObject=null;}
}
function fecharLeitorBarras(){fecharCameraSomente();$('barcodeScanner').style.display='none';barcodeBusy=false}
async function buscarCodigoManual(){let code=$('barcodeManual').value.replace(/\D/g,'');if(code.length<8){toast('Digite um código de barras válido.');return}await processarCodigo(code)}
function normalizarNomeExterno(p){let n=p?.product_name_pt||p?.product_name||p?.generic_name_pt||p?.generic_name||'';let b=p?.brands||'';let q=p?.quantity||'';let out=[b,n].filter(Boolean).join(' ').trim();if(q&&!new RegExp('\\b'+String(q).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(out))out+=(out?' ':'')+q;return {nome:out,marca:b,quantidadeProduto:q}}
function extrairImagemExterna(p){try{let si=p?.selected_images?.front;if(si){for(const lang of ['pt','pt-br','en','fr']){let z=si?.[lang];if(z?.display?.url)return z.display.url;if(typeof z?.display==='string')return z.display;if(z?.small?.url)return z.small.url;if(z?.thumb?.url)return z.thumb.url;if(typeof z?.small==='string')return z.small;if(typeof z?.thumb==='string')return z.thumb;}}let u=p?.image_small_url||p?.image_thumb_url||p?.image_url||p?.image_front_small_url||p?.image_front_url;return u||''}catch(e){return ''}}

async function consultarOpenFacts(code,base){
  try{
    // A API v3 retorna o produto dentro de `product` e não usa o mesmo
    // campo status=1 da API v2. O código anterior descartava produtos válidos.
    let url=base+'/api/v3/product/'+encodeURIComponent(code)+'?product_type=all&cc=br&lc=pt&fields=code,product_name,product_name_pt,generic_name,generic_name_pt,brands,quantity,image_url,image_small_url,image_thumb_url,image_front_url,image_front_small_url,selected_images';
    let r=await fetch(url,{headers:{'Accept':'application/json'}});
    if(!r.ok)return null;
    let j=await r.json();
    if(j&&j.product){
      let nome=normalizarNomeExterno(j.product);
      if(nome&&nome.nome)return {...nome,imagem:extrairImagemExterna(j.product),fonte:base.includes('beauty')?'Open Beauty Facts':'Open Food Facts'};
    }
  }catch(e){console.warn('Open Facts:',e)}
  return null;
}
async function consultarOpenFactsV2(code,base){
  try{
    let url=base+'/api/v2/product/'+encodeURIComponent(code)+'.json?fields=code,product_name,product_name_pt,generic_name,generic_name_pt,brands,quantity,image_url,image_small_url,image_thumb_url,image_front_url,image_front_small_url&lc=pt';
    let r=await fetch(url,{headers:{'Accept':'application/json'}});
    if(!r.ok)return null;
    let j=await r.json();
    if(j&&j.status===1&&j.product){
      let nome=normalizarNomeExterno(j.product);
      if(nome&&nome.nome)return {...nome,imagem:extrairImagemExterna(j.product),fonte:base.includes('beauty')?'Open Beauty Facts':'Open Food Facts'};
    }
  }catch(e){console.warn('Open Facts v2:',e)}
  return null;
}

async function consultarUPCItemDB(code){
  try{let r=await fetch('https://api.upcitemdb.com/prod/trial/lookup?upc='+encodeURIComponent(code),{headers:{'Accept':'application/json'}});if(!r.ok)return null;let j=await r.json();let p=j&&j.items&&j.items[0];if(!p)return null;let nome=[p.brand,p.title].filter(Boolean).join(' ').trim();if(p.size&&!new RegExp('\\b'+String(p.size).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(nome))nome+=(nome?' ':'')+p.size;return nome?{nome,fonte:'UPCitemdb'}:null}catch(e){return null}
}
async function consultarImagemPorEAN(code){
  let fontes=['https://world.openfoodfacts.org','https://world.openbeautyfacts.org'];
  for(const base of fontes){
    try{
      let url=base+'/api/v3/product/'+encodeURIComponent(code)+'?product_type=all&cc=br&lc=pt&fields=code,image_url,image_small_url,image_thumb_url,image_front_url,image_front_small_url,selected_images';
      let r=await fetch(url,{headers:{'Accept':'application/json'}});
      if(!r.ok)continue;
      let j=await r.json();
      let img=extrairImagemExterna(j?.product);
      if(img)return {imagem:img,fonte:base.includes('beauty')?'Open Beauty Facts':'Open Food Facts'};
    }catch(e){console.warn('Imagem por EAN:',e)}
  }
  return null;
}
function imagemIdentificacaoHtml(url,fonte){
  if(!url)return '';
  return '<div style="margin-top:10px;display:flex;align-items:center;gap:10px"><img src="'+escapeAttr(url)+'" class="thumb" style="width:72px;height:72px;object-fit:cover" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src=&apos;data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'80\' height=\'80\'%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'%23eef3f8\'/%3E%3Ctext x=\'50%25\' y=\'55%25\' text-anchor=\'middle\' font-size=\'28\'%3E%F0%9F%93%A6%3C/text%3E%3C/svg%3E&apos;" alt="Imagem do produto"><div><strong>🖼️ Imagem encontrada automaticamente</strong><br><small>Ela será usada na miniatura ao registrar. Uma foto própria, se escolhida, terá prioridade.</small>'+(fonte?'<br><small>Fonte: '+esc(fonte)+'</small>':'')+'</div></div>';
}
async function processarCodigo(raw){let code=String(raw||'').replace(/\D/g,'');if(!code){return} $('barcodeManual').value=code;
  fecharCameraSomente(); $('barcodeScanner').style.display='none'; identificacaoFoto=null;
  let local=(db.catalog||[]).find(c=>String(c.barcode||'').replace(/\D/g,'')===code);
  if(!local) local=db.products.find(p=>String(p.barcode||'').replace(/\D/g,'')===code);
  if(local){
    identificacaoCatalogo={...local,fonte:'catalogo-local',imagemFonte:local.imagemFonte||local.fonte||'catálogo local'}; $('produto').value=local.produto||'';
    if(local.foto){identificacaoFoto=local.foto; mostrarIdentificacao('⚡ <strong>Código reconhecido no catálogo local</strong><br><span style="font-size:17px"><strong>'+esc(local.produto||'')+'</strong></span>'+(local.marca?'<br><small>Marca: '+esc(local.marca)+'</small>':'')+(local.quantidadeProduto?'<br><small>Conteúdo: '+esc(local.quantidadeProduto)+'</small>':'')+imagemIdentificacaoHtml(local.foto, local.imagemFonte||'catálogo local')+'<br><small>Resposta imediata, sem consulta externa. Confira antes de registrar.</small>'); toast('Produto reconhecido pelo catálogo local.'); return;}
    mostrarIdentificacao('⚡ <strong>Código reconhecido no catálogo local</strong><br><span style="font-size:17px"><strong>'+esc(local.produto||'')+'</strong></span><br><small>Buscando uma imagem para completar o cadastro...</small>');
    let img=await consultarImagemPorEAN(code);
    if(img){identificacaoFoto=img.imagem;identificacaoCatalogo.imagem=img.imagem; identificacaoCatalogo.imagemFonte=img.fonte;mostrarIdentificacao('⚡ <strong>Código reconhecido no catálogo local</strong><br><span style="font-size:17px"><strong>'+esc(local.produto||'')+'</strong></span>'+imagemIdentificacaoHtml(img.imagem,img.fonte)+'<br><small>Imagem encontrada em '+esc(img.fonte)+'. Confira antes de registrar.</small>');}else{mostrarIdentificacao('⚡ <strong>Código reconhecido no catálogo local</strong><br><span style="font-size:17px"><strong>'+esc(local.produto||'')+'</strong></span><br><small>Produto reconhecido. Não foi encontrada imagem automática para este EAN.</small>');}
    toast('Produto reconhecido pelo catálogo local.'); return;
  }
  mostrarIdentificacao('🔎 <strong>Consultando produto e imagem...</strong><br><small>Código '+esc(code)+' • tentando bases públicas.</small>');
  let fontes=[['https://world.openfoodfacts.org',false],['https://world.openbeautyfacts.org',true]];
  for(const [base] of fontes){
    let achado=await consultarOpenFacts(code,base);
    if(!achado) achado=await consultarOpenFactsV2(code,base);
    if(achado){identificacaoCatalogo={barcode:code,produto:achado.nome,marca:achado.marca||'',quantidadeProduto:achado.quantidadeProduto||'',imagem:achado.imagem||'',fonte:achado.fonte,imagemFonte:achado.fonte,imagemFonte:achado.fonte}; identificacaoFoto=achado.imagem||null; $('produto').value=achado.nome;
      mostrarIdentificacao('✅ <strong>Produto encontrado pelo EAN</strong><br><span style="font-size:17px"><strong>'+esc(achado.nome)+'</strong></span>'+(achado.marca?'<br><small>Marca: '+esc(achado.marca)+'</small>':'')+(achado.quantidadeProduto?'<br><small>Conteúdo: '+esc(achado.quantidadeProduto)+'</small>':'')+imagemIdentificacaoHtml(achado.imagem,achado.fonte)+'<br><small>Fonte: '+esc(achado.fonte)+'. Confira antes de registrar. O código e a imagem serão salvos no catálogo local.</small>'); toast(achado.imagem?'Produto e imagem encontrados pelo EAN.':'Produto encontrado; não foi encontrada imagem para este EAN.'); return}
  }
  let upc=await consultarUPCItemDB(code);if(upc){identificacaoCatalogo={barcode:code,produto:upc.nome,marca:'',quantidadeProduto:'',imagem:'',fonte:upc.fonte}; $('produto').value=upc.nome; mostrarIdentificacao('✅ <strong>Produto encontrado</strong><br><span style="font-size:17px"><strong>'+esc(upc.nome)+'</strong></span><br><small>Fonte: UPCitemdb. Confira antes de registrar. Não foi encontrada imagem automática nesta consulta.</small>'); toast('Produto encontrado pelo código.'); return}
  mostrarIdentificacao('⚠️ <strong>Código não encontrado automaticamente.</strong><br><small>O código foi mantido. Digite o nome manualmente e registre; depois ele ficará disponível no catálogo local.</small>');
}
async function salvarProduto(){let produto=$('produto').value.trim(),validade=$('validade').value,q=+$('quantidade').value,c=+$('corredor').value;if(!produto||!validade||!q||!c){toast('Preencha produto, validade, quantidade e corredor.');return}let file=$('foto').files[0],foto=identificacaoFoto||'';if(file){foto=await compressImage(file)}let barcode=$('barcodeManual').value.replace(/\D/g,'').trim();let meta=(identificacaoCatalogo&&String(identificacaoCatalogo.barcode||'').replace(/\D/g,'')===barcode)?identificacaoCatalogo:null;let x={id:'p'+Date.now()+Math.random().toString(16).slice(2),produto,marca:meta?.marca||'',quantidadeProduto:meta?.quantidadeProduto||'',validade,quantidade:q,corredor:c,status:(document.getElementById('novoStatus')?.value||'Encontrado'),foto,imagemFonte:meta?.imagemFonte||meta?.fonte||'',obs:$('obs').value.trim(),criado:now().toISOString(),criadoPor:user().id,separada:0,barcode,batidaId:(batidaAtual&&batidaAtual.corredorId===c)?batidaAtual.id:null,atualizado:now().toISOString(),historico:[{data:now().toISOString(),status:(document.getElementById('novoStatus')?.value||'Encontrado'),usuarioId:user().id}]};db.products.push(x);if(barcode){db.catalog=Array.isArray(db.catalog)?db.catalog:[];let item=db.catalog.find(c=>String(c.barcode||'').replace(/\D/g,'')===barcode);if(item){item.produto=produto;item.marca=meta?.marca||item.marca||'';item.quantidadeProduto=meta?.quantidadeProduto||item.quantidadeProduto||'';item.foto=foto||item.foto||'';item.imagemFonte=(foto&&file)?'foto-própria':(meta?.imagemFonte||item.imagemFonte||item.fonte||'');item.atualizado=now().toISOString();item.fonte=item.fonte||'confirmado-pelo-usuario';}else db.catalog.push({barcode,produto,marca:meta?.marca||'',quantidadeProduto:meta?.quantidadeProduto||'',foto:foto||meta?.imagem||'',imagemFonte:(file?'foto-própria':(meta?.imagemFonte||meta?.fonte||'')),atualizado:now().toISOString(),fonte:'confirmado-pelo-usuario'});}if(batidaAtual&&batidaAtual.corredorId===c)batidaAtual.produtos.push(x.id);save();toast(barcode?'Produto registrado e código salvo no catálogo local!':'Produto registrado!');limparForm();if(window._returnBatida){window._returnBatida=false;showView('batida')}else showView('produtos')}
function limparForm(){['produto','validade','quantidade','obs','barcodeManual'].forEach(id=>$(id).value='');$('foto').value='';$('fotoIdentificar').value='';identificacaoFoto=null;identificacaoCatalogo=null;$('identificacaoBox').style.display='none';$('status').value='Encontrado';fillCorridors()}
function compressImage(file){return new Promise(res=>{let r=new FileReader();r.onload=()=>{let im=new Image();im.onload=()=>{let max=500,s=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.72))};im.src=r.result};r.readAsDataURL(file)})}
function renderProdutos(){fillCorridors();let q=($('busca').value||'').toLowerCase(),fs=$('fStatus').value,fp=$('fPrior').value,fc=$('fCor').value;let arr=db.products.filter(x=>x.status!=='Retirado/PIQUE'&&(!q||x.produto.toLowerCase().includes(q))&&(!fs||x.status===fs)&&(!fp||priority(days(x.validade))===fp)&&(!fc||String(x.corredor)===fc)).sort((a,b)=>days(a.validade)-days(b.validade));$('productList').innerHTML=arr.length?`<div class="stickybar"><strong>${arr.length} item(ns)</strong><button id="selectAllBtn" class="secondary" onclick="toggleSelectAllVisible()">☑ Marcar todos</button><select id="bulkStatus"><option value="">Alterar selecionados...</option><option>Ainda no corredor</option><option>Área de vencimento</option><option>PLU/Etiqueta</option></select><button class="primary" onclick="applyBulk()">Aplicar</button></div>`+arr.map(x=>productCard(x,true)).join(''):'<div class="card empty">Nenhum produto encontrado.</div>'}
function productCard(x,selectable){let n=days(x.validade),sep=Math.max(0,Math.min(+x.separada||0,+x.quantidade||0)),rest=Math.max(0,(+x.quantidade||0)-sep);return`<div class="item"><input type="checkbox" class="sel" data-id="${x.id}" onchange="syncSelectAllButton()" ${selectable?'':'style="display:none"'}><img class="thumb" src="${x.foto||'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'80\' height=\'80\'%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'%23eef3f8\'/%3E%3Ctext x=\'50%25\' y=\'55%25\' text-anchor=\'middle\' font-size=\'28\'%3E%F0%9F%93%A6%3C/text%3E%3C/svg%3E'}" alt=""><div class="item-main"><strong>${esc(x.produto)}</strong><small>${fmt(x.validade)} • ${x.quantidade} encontrada(s) • ${esc(corridorName(x.corredor))}</small><br><small>▦ EAN: <strong>${esc(x.barcode||'EAN não cadastrado')}</strong></small><br>${daysBadge(n)} ${statusBadge(x.status)}<br><small>Separada: <strong>${sep}</strong> • Restante: <strong>${rest}</strong></small></div><div class="actions"><button class="secondary" onclick="editProduct('${x.id}')">✏️ Editar</button><button class="secondary" onclick="editStatus('${x.id}')">Status</button><button class="danger" onclick="excluirProduto('${x.id}')">🗑️ Excluir</button></div></div>`}
function excluirProduto(id){let idx=db.products.findIndex(p=>p.id===id);if(idx<0)return;let x=db.products[idx],nome=x.produto||'este produto';if(!confirm('Excluir '+nome+'?\n\nO produto será removido de Produtos, Vencimentos, Pendências e Acompanhamento.'))return;db.deletedProducts=Array.isArray(db.deletedProducts)?db.deletedProducts:[];let t=now().toISOString();db.deletedProducts.push({...x,excluidoEm:t,excluidoPor:currentActorId(),excluidoPorNome:currentActorName()});db.products.splice(idx,1);save();renderProdutos();renderPainel();renderVencimentos();renderPendencias();renderHoje();renderSemana();renderHistorico();renderRelatorios();toast('Produto excluído das áreas operacionais.')}
function selectedIds(){return [...document.querySelectorAll('.sel:checked')].map(x=>x.dataset.id)}function syncSelectAllButton(){let boxes=[...document.querySelectorAll('.sel')],btn=$('selectAllBtn');if(!btn||!boxes.length)return;let all=boxes.every(x=>x.checked);btn.textContent=all?'☐ Desmarcar todos':'☑ Marcar todos'}function toggleSelectAllVisible(){let boxes=[...document.querySelectorAll('.sel')];if(!boxes.length)return;let all=boxes.every(x=>x.checked);boxes.forEach(x=>x.checked=!all);syncSelectAllButton()}function applyBulk(){let s=$('bulkStatus').value,ids=selectedIds();if(!s||!ids.length){toast('Selecione produtos e um status.');return}ids.forEach(id=>changeStatus(id,s,false));save();toast(ids.length+' produto(s) atualizado(s).');renderProdutos();renderPainel()}
let editProductId=null;
function openEditModal(){let m=$('editModal');m.classList.add('open');m.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}
function closeEditModal(){let m=$('editModal');m.classList.remove('open');m.setAttribute('aria-hidden','true');document.body.style.overflow='';editProductId=null}
function editProduct(id){
 let x=db.products.find(p=>p.id===id); if(!x)return;
 editProductId=id;
 $('editProduto').value=x.produto||''; $('editValidade').value=x.validade||''; $('editQuantidade').value=+x.quantidade||0; $('editSeparada').value=+x.separada||0;
 $('editStatus').value=x.status||'Encontrado'; $('editMarca').value=x.marca||''; $('editTamanho').value=x.quantidadeProduto||''; $('editBarcode').value=String(x.barcode||'').replace(/\D/g,''); $('editObs').value=x.obs||'';
 let pr=$('editFotoPreview'); if(x.foto){pr.src=x.foto;pr.hidden=false}else{pr.removeAttribute('src');pr.hidden=true} $('editFoto').value='';
 openEditModal();
}
$('editFoto')?.addEventListener('change',e=>{let f=e.target.files[0],pr=$('editFotoPreview');if(!f){pr.hidden=true;return}let r=new FileReader();r.onload=()=>{pr.src=r.result;pr.hidden=false};r.readAsDataURL(f)});
async function saveEditProduct(){
 let id=editProductId,x=db.products.find(p=>p.id===id);if(!x)return;
 let produto=$('editProduto').value.trim(),validade=$('editValidade').value,q=Math.floor(+$('editQuantidade').value),sep=Math.floor(+$('editSeparada').value||0),status=$('editStatus').value,marca=$('editMarca').value.trim(),tam=$('editTamanho').value.trim(),barcode=$('editBarcode').value.replace(/\D/g,''),obs=$('editObs').value.trim();
 if(!produto||!validade||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(validade)){toast('Preencha produto e uma validade válida.');return}
 if(!Number.isFinite(q)||q<1){toast('Quantidade encontrada inválida.');return}
 if(!Number.isFinite(sep)||sep<0||sep>q){toast('Quantidade separada deve ficar entre 0 e a quantidade encontrada.');return}
 let old={produto:x.produto||'',validade:x.validade||'',quantidade:+x.quantidade||0,separada:+x.separada||0,status:x.status||'Encontrado',marca:x.marca||'',quantidadeProduto:x.quantidadeProduto||'',barcode:String(x.barcode||''),obs:x.obs||'',foto:x.foto||''};
 let changed=[];const add=(campo,a,b)=>{if(String(a)!==String(b))changed.push({campo,antes:a,depois:b})};
 add('produto',old.produto,produto);add('validade',old.validade,validade);add('quantidade',old.quantidade,q);add('separada',old.separada,sep);add('status',old.status,status);add('marca',old.marca,marca);add('peso/volume',old.quantidadeProduto,tam);add('EAN',old.barcode,barcode);add('observação',old.obs,obs);
 let foto=old.foto,file=$('editFoto').files[0];if(file){foto=await compressImage(file);changed.push({campo:'foto',antes:old.foto?'Foto cadastrada':'Sem foto',depois:'Nova foto'})}
 x.produto=produto;x.validade=validade;x.quantidade=q;x.separada=sep;x.status=status;x.marca=marca;x.quantidadeProduto=tam;x.barcode=barcode;x.obs=obs;x.foto=foto;x.imagemFonte=file?'foto-própria':(x.imagemFonte||'');x.atualizado=now().toISOString();
 x.historico=x.historico||[];if(changed.length)x.historico.push({data:x.atualizado,tipo:'edicao',usuarioId:user().id,alteracoes:changed});
 if(barcode){db.catalog=Array.isArray(db.catalog)?db.catalog:[];let item=db.catalog.find(c=>String(c.barcode||'').replace(/\D/g,'')===barcode);if(item){item.produto=produto;item.marca=marca||item.marca||'';item.quantidadeProduto=tam||item.quantidadeProduto||'';item.foto=foto||item.foto||'';item.imagemFonte=(foto&&file)?'foto-própria':(meta?.imagemFonte||item.imagemFonte||item.fonte||'');item.atualizado=x.atualizado}else db.catalog.push({barcode,produto,marca,quantidadeProduto:tam,foto,imagemFonte:file?'foto-própria':(x.imagemFonte||''),atualizado:x.atualizado,fonte:'edicao-pelo-usuario'})}
 save();closeEditModal();renderProdutos();renderPainel();renderVencimentos();renderPendencias();if(batidaAtual)renderBatida();toast(changed.length?'Produto atualizado e histórico registrado.':'Nenhuma alteração feita.');
}
let piqueProductId=null;
function openPiqueModal(){let m=$('piqueModal');m.classList.add('open');m.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}
function closePiqueModal(){let m=$('piqueModal');m.classList.remove('open');m.setAttribute('aria-hidden','true');document.body.style.overflow='';piqueProductId=null;resetPiquePhotoInput();$('piqueFotoPreview').removeAttribute('src');$('piqueFotoPreview').hidden=true;$('confirmPiqueBtn').disabled=true;$('confirmPiqueBtn').textContent='📸 Confirmar PIQUE'}
function setupPiquePhotoInput(){let el=$('piqueFoto');if(el)el.addEventListener('change',handlePiquePhotoChange)}
setupPiquePhotoInput();
async function confirmarRetiradaPique(){let id=piqueProductId,x=db.products.find(p=>p.id===id),file=$('piqueFoto')?.files?.[0];if(!x||!file){toast('A foto da retirada é obrigatória.');return}let btn=$('confirmPiqueBtn');btn.disabled=true;btn.textContent='Salvando…';try{let foto=await compressImage(file),actorId=currentActorId(),actorName=currentActorName(),t=now().toISOString();x.fotoPique=foto;x.piqueEm=t;x.piquePor=actorId;x.piquePorNome=actorName;x.status='Retirado/PIQUE';x.atualizado=t;x.historico=x.historico||[];x.historico.push({data:t,tipo:'PIQUE',status:'Retirado/PIQUE',usuarioId:actorId,usuarioNome:actorName,fotoPique:true});save();await emitCloudEvent('PIQUE_CONFIRMADO',{productId:x.id,produto:x.produto,corredorId:x.corredor,ean:x.barcode||'',validade:x.validade});notifyLocal('📸 Retirada/PIQUE confirmada',`${x.produto} • ${days(x.validade)<0?'Vencido':days(x.validade)===0?'Vence hoje':days(x.validade)+' dia(s) restantes'}`);closePiqueModal();renderProdutos();renderPainel();renderVencimentos();renderPendencias();renderRelatorios();if(batidaAtual)renderBatida();toast('Retirada/PIQUE confirmada com foto e registrada no histórico.')}catch(e){console.error(e);btn.disabled=false;btn.textContent='📸 Confirmar PIQUE';toast('Não foi possível salvar a foto. Tente novamente.')}}

let statusProductId=null;
function openStatusModal(){let m=$('statusModal');m.classList.add('open');m.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}
function closeStatusModal(){let m=$('statusModal');m.classList.remove('open');m.setAttribute('aria-hidden','true');document.body.style.overflow='';statusProductId=null}
function editStatus(id){let x=db.products.find(p=>p.id===id);if(!x)return;statusProductId=id;let opts=['Ainda no corredor','Área de vencimento','PLU/Etiqueta'];let icons={'Ainda no corredor':'🔴','Área de vencimento':'🔵','PLU/Etiqueta':'🟢'};let dots={'Ainda no corredor':'dot-corridor','Área de vencimento':'dot-area','PLU/Etiqueta':'dot-plu'};$('statusModalProduct').textContent='Produto: '+(x.produto||'—')+' • Atual: '+(x.status||'Encontrado');$('statusOptions').innerHTML=opts.map((st,i)=>`<button type="button" class="status-option ${st===x.status?'current':''}" data-status-index="${i}"><span class="status-dot ${dots[st]}"></span><span>${icons[st]} ${esc(st)}</span>${st===x.status?'<span class="muted" style="margin-left:auto">Atual</span>':''}</button>`).join('');openStatusModal()}
function actionNext10(id){let x=db.products.find(p=>p.id===id);if(!x)return;statusProductId=id;let opts=['Ainda no corredor','Área de vencimento'];let icons={'Ainda no corredor':'🔴','Área de vencimento':'🔵'};let dots={'Ainda no corredor':'dot-corridor','Área de vencimento':'dot-area'};$('statusModalProduct').textContent='Produto: '+(x.produto||'—')+' • Ação dos próximos 10 dias';$('statusOptions').innerHTML=opts.map((st,i)=>`<button type="button" class="status-option ${st===x.status?'current':''}" data-status-index="${i}" data-status-context="next10"><span class="status-dot ${dots[st]}"></span><span>${icons[st]} ${esc(st)}</span>${st===x.status?'<span class="muted" style="margin-left:auto">Atual</span>':''}</button>`).join('');window._statusContext='next10';openStatusModal()}

function selectStatusOption(id,s){let x=db.products.find(p=>p.id===id);if(!x)return;if(x.status===s){closeStatusModal();toast('Esse já é o status atual.');return}changeStatus(id,s,true);closeStatusModal();renderProdutos();renderPainel();renderVencimentos();renderPendencias();if(batidaAtual)renderBatida()}function changeStatus(id,s,notify=true){let x=db.products.find(p=>p.id===id);if(!x)return;x.status=s;x.atualizado=now().toISOString();x.historico=x.historico||[];x.historico.push({data:now().toISOString(),status:s,usuarioId:user().id});if(s==='Separado' && (+x.separada||0)<(+x.quantidade||0)){x.separada=+x.quantidade||0;x.historico.push({data:now().toISOString(),tipo:'quantidade',quantidadeEncontrada:x.quantidade,quantidadeSeparada:x.separada,usuarioId:user().id})}save();if(notify)toast('Status atualizado.')}
function editQty(id){let x=db.products.find(p=>p.id===id);if(!x)return;let q=prompt('Quantidade encontrada:',String(x.quantidade));if(q===null)return;q=Math.floor(+q);if(!Number.isFinite(q)||q<1){toast('Quantidade encontrada inválida.');return}let maxSep=q;let sep=prompt('Quantidade separada (0 a '+maxSep+'):',String(Math.min(+x.separada||0,maxSep)));if(sep===null)return;sep=Math.floor(+sep);if(!Number.isFinite(sep)||sep<0||sep>maxSep){toast('Quantidade separada inválida.');return}x.quantidade=q;x.separada=sep;x.atualizado=now().toISOString();x.historico=x.historico||[];x.historico.push({data:now().toISOString(),tipo:'quantidade',quantidadeEncontrada:q,quantidadeSeparada:sep,restante:q-sep,usuarioId:user().id});save();renderProdutos();renderPainel();if(batidaAtual)renderBatida();toast('Quantidades atualizadas. Restante: '+(q-sep)+' un.')}
function weekStart(){return startOfWeek()}
function weekEnd(){let d=weekStart();d.setDate(d.getDate()+7);return d}
function batidasSemana(){let a=weekStart(),b=weekEnd();return db.batidas.filter(x=>{let d=new Date(x.data);return d>=a&&d<b}).sort((x,y)=>new Date(y.data)-new Date(x.data))}
function renderSemana(){let bs=batidasSemana(), total=activeCorr().length, feitos=new Set(bs.map(x=>String(x.corredorId))), pend=Math.max(0,total-feitos.size);$('semanaKpis').innerHTML=[['🔎 Batidas na semana',bs.length,''],['📍 Corredores feitos',feitos.size,'green'],['⏳ Corredores pendentes',pend,'red'],['👥 Responsáveis ativos',new Set(bs.map(x=>x.usuarioId)).size,'']].map(a=>`<div class="card metric"><span>${a[0]}</span><strong class="${a[2]}">${a[1]}</strong></div>`).join('');let rows=activeCorr().map(c=>{let arr=bs.filter(x=>String(x.corredorId)===String(c.id));let last=db.batidas.filter(x=>String(x.corredorId)===String(c.id)).sort((a,b)=>new Date(b.data)-new Date(a.data))[0];let lastWeek=arr[0];let situ=lastWeek?'🟢 Feito nesta semana':'🔴 Pendente';let semLast=last?daysSince(c):9999;let tempo=semLast===9999?'Nunca realizado':semLast===0?'Feito hoje':semLast+' dia(s) sem batida';return`<tr><td><strong>${esc(c.nome)}</strong></td><td>${last?new Date(last.data).toLocaleString('pt-BR'):'Nunca'}</td><td>${arr.length}</td><td>${last?esc(userName(last.usuarioId)):'—'}</td><td><strong>${situ}</strong><br><small>${tempo}</small></td></tr>`}).join('');$('semanaCorrBody').innerHTML=rows||'<tr><td colspan="5"><div class="empty">Nenhum corredor ativo.</div></td></tr>';let names=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];let ws=weekStart();$('semanaDias').innerHTML=names.map((name,i)=>{let d=new Date(ws);d.setDate(ws.getDate()+i);let dayBs=bs.filter(x=>{let bd=new Date(x.data);return bd.getFullYear()===d.getFullYear()&&bd.getMonth()===d.getMonth()&&bd.getDate()===d.getDate()});return`<div class="card" style="margin:8px 0;padding:11px"><strong>${name} • ${d.toLocaleDateString('pt-BR')}</strong><div style="margin-top:7px">${dayBs.length?dayBs.map(x=>`<div style="padding:7px 0;border-bottom:1px solid var(--line)">🔎 <strong>${esc(corridorName(x.corredorId))}</strong> • ${esc(userName(x.usuarioId))} • ${new Date(x.data).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} • ${x.produtos} produto(s)</div>`).join(''):'<span class="muted">Nenhuma batida registrada.</span>'}</div></div>`}).join('')}
function renderHistorico(){let opts='<option value="">Todos corredores</option>'+activeCorr().map(c=>`<option value="${c.id}">${esc(c.nome)}</option>`).join('');$('histCor').innerHTML=opts;let fc=$('histCor').value,d=+$('histDias').value,cut=Date.now()-d*86400000;let a=db.batidas.filter(b=>new Date(b.data).getTime()>=cut&&(!fc||String(b.corredorId)===fc)).sort((a,b)=>new Date(b.data)-new Date(a.data));$('histBody').innerHTML=a.length?a.map(b=>`<tr><td>${new Date(b.data).toLocaleString('pt-BR')}</td><td>${esc(corridorName(b.corredorId))}</td><td>${esc(userName(b.usuarioId))}</td><td>${b.produtos}</td><td>${esc(b.observacao||'—')}</td></tr>`).join(''):'<tr><td colspan="5"><div class="empty">Nenhuma batida encontrada.</div></td></tr>'}
function remaining(x){return Math.max(0,(+x.quantidade||0)-Math.max(0,Math.min(+x.separada||0,+x.quantidade||0)))}
function isOpenProduct(x){return remaining(x)>0 && x.status!=='Resolvido' && x.status!=='Retirado/PIQUE'}
function origemProduto(x){return x.batidaId?'batida':'manual'}
function miniVenc(x,label){let r=remaining(x),n=days(x.validade);return `<div class="item"><img class="thumb" src="${x.foto||''}" alt=""><div class="item-main"><strong>${esc(x.produto)}</strong><small>Validade: ${fmt(x.validade)} • ${esc(corridorName(x.corredor))} • ${r} restante(s)</small><br>${badge(priority(n))} ${statusBadge(x.status)}<br><small>Registrado por ${esc(userName(x.criadoPor))}</small></div><div class="actions"><button class="secondary" disabled title="Ação futura">⚙️ Ação</button></div></div>`}
function startOfWeek(){let d=today0(),day=d.getDay();d.setDate(d.getDate()-(day===0?6:day-1));return d}
function inPeriod(iso,period){let t=new Date(iso);if(period==='all')return true;if(period==='today')return t>=today0();return t>=startOfWeek()}
function renderHoje(){let u=$('hojeUser'),cur=u.value;u.innerHTML='<option value="">Todos responsáveis</option>'+db.users.map(x=>`<option value="${x.id}">${esc(x.nome)}</option>`).join('');u.value=cur;let ou=$('hojeOrigem').value,st=$('hojeStatus').value;let a=db.products.filter(x=>{let d=new Date(x.criado);return d>=today0()&&(!u.value||x.criadoPor===u.value)&&(!ou||origemProduto(x)===ou)&&(!st||x.status===st)}).sort((a,b)=>new Date(b.criado)-new Date(a.criado));let bat=a.filter(x=>x.batidaId).length,manual=a.length-bat;let critical=a.filter(x=>{let n=days(x.validade);return n<0||n<=9}).length;$('hojeKpis').innerHTML=[['📦 Registrados',a.length,''],['🔎 De batida',bat,''],['📝 Manuais',manual,'orange'],['🚨 Críticos/atenção',critical,'red']].map(x=>`<div class="card metric"><span>${x[0]}</span><strong class="${x[2]}">${x[1]}</strong></div>`).join('');$('hojeList').innerHTML=a.length?a.map(x=>`<div class="item"><img class="thumb" src="${x.foto||''}" alt=""><div class="item-main"><strong>${esc(x.produto)}</strong><small>${fmt(x.validade)} • ${esc(corridorName(x.corredor))} • ${remaining(x)} restante(s)</small><br>${badge(priority(days(x.validade)))} ${statusBadge(x.status)}<br><small>👤 ${esc(userName(x.criadoPor))} • 🕐 ${new Date(x.criado).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} • ${x.batidaId?'🟢 Batida':'⚠️ Registro manual'}</small></div></div>`).join(''):'<div class="empty">Nenhum produto foi registrado hoje com esses filtros.</div>'}
function reportProductsForPeriod(period){return db.products.filter(x=>inPeriod(x.criado,period))}
function reportLabel(period){if(period==='today')return 'Hoje • '+today0().toLocaleDateString('pt-BR');if(period==='week')return 'Esta semana • '+weekStart().toLocaleDateString('pt-BR')+' a '+new Date(weekEnd().getTime()-86400000).toLocaleDateString('pt-BR');return 'Todos os registros'}
function reportData(period){let p=reportProductsForPeriod(period),b=db.batidas.filter(x=>inPeriod(x.data,period));return {p,b}}
function renderRelatorios(){let period=$('reportPeriod')?.value||'week',d=reportData(period),p=d.p,b=d.b;let totalCorr=activeCorr().length,feitos=new Set(b.map(x=>String(x.corredorId))).size,pend=Math.max(0,totalCorr-feitos),pct=totalCorr?Math.round(feitos/totalCorr*100):0;let vencHoje=p.filter(x=>isOpenProduct(x)&&days(x.validade)===0).length,vencAmanha=p.filter(x=>isOpenProduct(x)&&days(x.validade)===1).length,vencidos=p.filter(x=>isOpenProduct(x)&&days(x.validade)<0).length;let sep=p.filter(x=>x.status==='Separado').length,noCorr=p.filter(x=>x.status==='Ainda no corredor').length,agu=p.filter(x=>x.status==='Aguardando oferta').length,sol=p.filter(x=>x.status==='Oferta solicitada').length,ap=p.filter(x=>x.status==='Oferta aplicada').length,res=p.filter(x=>x.status==='Resolvido').length;$('reportPeriodLabel').textContent=reportLabel(period);$('reportKpis').innerHTML=[['🔎 Batidas',b.length,''],['📦 Produtos encontrados',p.length,''],['🚨 Críticos/atenção',p.filter(x=>days(x.validade)<=9&&isOpenProduct(x)).length,'red'],['📍 Corredores feitos',feitos+' / '+totalCorr,'green'],['⏳ Corredores pendentes',pend,'red'],['📊 Cobertura',pct+'%','']].map(a=>`<div class="card metric"><span>${a[0]}</span><strong class="${a[2]}">${a[1]}</strong></div>`).join('');$('reportStatusKpis').innerHTML=[['🟢 Separados',sep],['🔴 Ainda no corredor',noCorr],['🟡 Aguardando oferta',agu],['🟢 Oferta solicitada',sol],['🟢 Oferta aplicada',ap],['✅ Resolvidos',res],['🔴 Vence hoje',vencHoje],['🔴 Vence amanhã',vencAmanha],['⚠️ Vencidos',vencidos]].map(a=>`<div class="card metric"><span>${a[0]}</span><strong>${a[1]}</strong></div>`).join('');$('reportTeam').innerHTML=db.users.map(u=>{let bb=b.filter(x=>x.usuarioId===u.id).length,pp=p.filter(x=>x.criadoPor===u.id).length,ps=p.filter(x=>x.criadoPor===u.id&&x.status!=='Resolvido').length;return`<div style="padding:9px 0;border-bottom:1px solid var(--line)"><strong>${esc(u.nome)}</strong> — ${esc(u.funcao)}<br><small>${bb} batida(s) • ${pp} produto(s) registrado(s) • ${ps} pendência(s) em aberto</small></div>`}).join('');$('reportCorr').innerHTML=activeCorr().map(c=>{let arr=b.filter(x=>String(x.corredorId)===String(c.id)),d=daysSince(c),situ=arr.length?'🟢 Feito no período':'🔴 Pendente';return`<div style="padding:8px 0;border-bottom:1px solid var(--line)"><strong>${esc(c.nome)}</strong> — ${situ}<br><small>Última batida: ${arr.length?new Date(arr[0].data).toLocaleString('pt-BR'):(d===9999?'Nunca':d+' dia(s) atrás')} • ${arr.length} no período</small></div>`}).join('');$('reportProducts').innerHTML=p.length?`<div class="list-table"><table><thead><tr><th>Produto</th><th>Validade</th><th>Corredor</th><th>Encontrada</th><th>Separada</th><th>Restante</th><th>Status</th><th>Responsável</th></tr></thead><tbody>${[...p].sort((a,b)=>new Date(b.criado)-new Date(a.criado)).map(x=>`<tr><td>${esc(x.produto)}</td><td>${fmt(x.validade)}</td><td>${esc(corridorName(x.corredor))}</td><td>${+x.quantidade||0}</td><td>${+x.separada||0}</td><td>${remaining(x)}</td><td>${esc(x.status)}</td><td>${esc(userName(x.criadoPor))}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Nenhum produto no período.</div>'
let actorId=window.vencimentosCloud?.currentUser?.id||null;let actorName=window.vencimentosCloud?.currentProfile?.nome||userName(actorId);let pique=db.products.filter(x=>x.piqueEm&&inPeriod(x.piqueEm,period)&&(!actorId||x.piquePor===actorId)).sort((a,b)=>new Date(b.piqueEm)-new Date(a.piqueEm));$('reportPiqueLabel').textContent=actorName+' • '+pique.length+' retirada(s) confirmada(s) com foto no período';$('reportPique').innerHTML=pique.length?'<div class="pique-report-list">'+pique.map(x=>`<div class="pique-report-item">${x.fotoPique?`<img src="${escapeAttr(x.fotoPique)}" alt="Comprovante PIQUE">`:'<div style="width:110px;height:110px;display:grid;place-items:center;border-radius:10px;background:#eef3e9;font-size:32px">📷</div>'}<div><strong>${esc(x.produto)}</strong><div>Validade: ${x.validade&&days(x.validade)<0?'Vencido':x.validade&&days(x.validade)===0?'Vence hoje':fmt(x.validade)}</div><small>📸 Retirado/PIQUE em ${new Date(x.piqueEm).toLocaleString('pt-BR')}<br>👤 ${esc(x.piquePorNome||actorName)}<br>📍 ${esc(corridorName(x.corredor))}</small></div></div>`).join('')+'</div>':'<div class="empty">Nenhum movimento PIQUE seu no período selecionado.</div>';}
function reportCSVRows(){let period=$('reportPeriod')?.value||'week',d=reportData(period),p=d.p;let rows=[['RELATÓRIO PREVENÇÃO DE VENCIMENTOS',reportLabel(period)],[],['Produto','Validade','Corredor','Quantidade encontrada','Quantidade separada','Restante','Status','Responsável','Data/hora']];p.forEach(x=>rows.push([x.produto,fmt(x.validade),corridorName(x.corredor),+x.quantidade||0,+x.separada||0,remaining(x),x.status,userName(x.criadoPor),new Date(x.criado).toLocaleString('pt-BR')]));return rows}
function csvCell(v){let s=String(v??'').replace(/"/g,'""');return '"'+s+'"'}
function exportarRelatorioCSV(){let csv='\ufeff'+reportCSVRows().map(r=>r.map(csvCell).join(';')).join('\r\n');let blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='relatorio_prevencao_'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Relatório Excel (CSV) exportado.')}
function gerarPDF(){renderRelatorios();let old=document.title;document.title='Relatorio_Preventencao_'+new Date().toISOString().slice(0,10);window.print();setTimeout(()=>document.title=old,1000)}
function compartilharRelatorio(){let period=$('reportPeriod')?.value||'week',text='Relatório Prevenção de Vencimentos • '+reportLabel(period),rows=reportCSVRows(),csv='\ufeff'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n'),name='relatorio_prevencao_'+new Date().toISOString().slice(0,10)+'.csv';try{let file=new File([csv],name,{type:'text/csv;charset=utf-8'});if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({title:'Relatório Prevenção de Vencimentos',text,files:[file]}).then(()=>toast('Relatório anexado ao compartilhamento.')).catch(e=>{if(e&&e.name!=='AbortError')baixarRelatorioCSV(csv,name)})}else{baixarRelatorioCSV(csv,name);if(navigator.share){setTimeout(()=>navigator.share({title:'Relatório Prevenção de Vencimentos',text}).catch(()=>{}),300)}else toast('Relatório baixado. Abra o arquivo e use Compartilhar para enviar como anexo.')}}catch(e){baixarRelatorioCSV(csv,name);toast('Relatório baixado. Use o botão Compartilhar do arquivo para anexar.')}}function baixarRelatorioCSV(csv,name){let blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}

function renderConfig(){let me=user();$('usersConfig').innerHTML=db.users.map(u=>`<div style="padding:10px 0;border-bottom:1px solid var(--line)"><strong>${esc(u.nome)}</strong> — ${esc(u.funcao)} ${u.admin?'🔑 Admin':''}<br><label><input type="checkbox" ${u.trabalhando?'checked':''} onchange="toggleWork('${u.id}',this.checked)"> Trabalhando hoje (recebe alertas)</label></div>`).join('');$('corrConfig').innerHTML=activeCorr().map(c=>`<div class="corridor-row"><input value="${esc(c.id)}" disabled style="width:60px;padding:8px"><input value="${esc(c.nome)}" onchange="renameCorridor(${c.id},this.value)"><button class="danger" onclick="disableCorridor(${c.id})">Desativar</button></div>`).join('');$('rGreen').value=db.rules.greenMax;$('rYellow').value=db.rules.yellowMax;$('notifTime').value=db.rules.notifTime;$('retiradaNotifTime').value=db.rules.retiradaNotifTime||'18:00'}
function toggleWork(id,v){let u=db.users.find(x=>x.id===id);if(u){u.trabalhando=v;save();renderConfig();renderPainel();toast('Escala atualizada.')}}function renameCorridor(id,v){let c=db.corridors.find(x=>x.id===id);if(c){c.nome=v.trim()||('Corredor '+id);save();renderConfig();toast('Corredor atualizado.')}}function disableCorridor(id){let c=db.corridors.find(x=>x.id===id);if(c){c.ativo=false;save();renderConfig();fillCorridors();toast('Corredor desativado.')}}function addCorridor(){let id=Math.max(0,...db.corridors.map(c=>c.id))+1;db.corridors.push({id,nome:'Corredor '+id,ativo:true});save();renderConfig();toast('Corredor adicionado.')}function saveRules(){let g=+$('rGreen').value,y=+$('rYellow').value,t=$('notifTime').value,rt=$('retiradaNotifTime').value;if(!Number.isFinite(g)||!Number.isFinite(y)||y<=g){toast('Use limites válidos: atenção maior que em dia.');return}db.rules={...db.rules,greenMax:g,yellowMax:y,notifTime:t||'08:00',retiradaNotifTime:rt||'18:00'};save();toast('Regras salvas.');renderPainel()}
function exportar(){let blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='backup_prevencao_V3.12.6_'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Backup exportado.')}
function importar(e){let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{let d=JSON.parse(r.result);if(!d.products||!d.corridors)throw 0;db=normalize(d);save();renderPainel();toast('Backup importado.')}catch{toast('Arquivo V3 inválido.')}};r.readAsText(f)}
function currentActorId(){return window.vencimentosCloud?.currentUser?.id||user().id}function currentActorName(){return window.vencimentosCloud?.currentProfile?.nome||userName(currentActorId())}
async function emitCloudEvent(type,payload){try{let sb=window.vencimentosCloud?.supabase;if(!sb||!window.vencimentosCloud?.currentUser)return;let {error}=await sb.from('activity_events').insert({tipo:type,actor_id:window.vencimentosCloud.currentUser.id,actor_name:currentActorName(),payload});if(error)console.warn('activity_events indisponível:',error.message)}catch(e){console.warn('Falha ao enviar evento:',e)}}
function notifyLocal(title,body){try{if('Notification'in window&&Notification.permission==='granted')new Notification(title,{body})}catch(e){}}
function subscribeCloudEvents(){try{let sb=window.vencimentosCloud?.supabase;if(!sb||!window.vencimentosCloud?.currentUser)return;window.vencimentosCloud.eventsChannel=sb.channel('vencimentos-pa-events').on('postgres_changes',{event:'INSERT',schema:'public',table:'activity_events'},payload=>{let row=payload.new||{};if(row.actor_id===window.vencimentosCloud.currentUser.id)return;let p=row.payload||{};if(row.tipo==='BATIDA_FINALIZADA'){notifyLocal('🔎 Batida finalizada',`${row.actor_name||'Usuário'} finalizou ${p.corredor||'um corredor'} • ${p.produtos||0} produto(s).`)}else if(row.tipo==='PIQUE_CONFIRMADO'){notifyLocal('📸 Retirada/PIQUE',`${row.actor_name||'Usuário'} confirmou o PIQUE de ${p.produto||'um produto'}.`)}}).subscribe()}catch(e){console.warn('Realtime indisponível:',e)}}
function maybeNotify(){if(!('Notification'in window)||Notification.permission==='denied')return;let d=new Date(),hm=d.toTimeString().slice(0,5),stamp=d.toISOString().slice(0,10);let h=db.rules.notifTime||'08:00',rt=db.rules.retiradaNotifTime||'18:00';if(hm===h&&localStorage.getItem('notifDate')!==stamp){localStorage.setItem('notifDate',stamp);sendNotification('morning')}if(hm===rt&&localStorage.getItem('retiradaNotifDate')!==stamp){localStorage.setItem('retiradaNotifDate',stamp);sendNotification('retirada')}}function sendNotification(tipo='morning'){let r=recommended(),pending=db.products.filter(x=>x.status==='Ainda no corredor'||x.status==='Aguardando oferta').length,umDia=db.products.filter(x=>remaining(x)>0&&days(x.validade)===1&&x.status!=='Retirado/PIQUE');let title=tipo==='retirada'?'🚨 Retirada/PIQUE — fim do expediente':'Prevenção de Vencimentos';let proximos10=db.products.filter(x=>isOpenProduct(x)&&days(x.validade)>=0&&days(x.validade)<=10).length;let qtdBatidasHoje=batidasHoje().length;let body=tipo==='retirada'?`Há ${umDia.length} produto(s) com 1 dia restante. Retire no final do expediente e marque Retirado/PIQUE.`:`Hoje: ${r.c.nome}. ${proximos10} produto(s) vencem nos próximos 10 dias. ${qtdBatidasHoje} batida(s) realizada(s) hoje.`;if(umDia.length&&tipo!=='retirada')body+=` ${umDia.length} produto(s) vence(m) amanhã e precisam de retirada.`;new Notification(title,{body})}
function requestNotifications(){if('Notification'in window)Notification.requestPermission().then(p=>toast(p==='granted'?'Notificações ativadas.':'Notificações não autorizadas.'))}
// Integração inicial com nuvem: login conectado; dados locais continuam preservados nesta etapa.
function cloudSession(){return window.vencimentosCloud?.currentUser||null}

function init(){fillCorridors();renderPainel();renderBatida();renderProdutos();renderVencimentos();renderHoje();renderSemana();renderHistorico();renderRelatorios();renderConfig();renderPendencias();restoreNavigation();if('Notification'in window&&Notification.permission==='default'){setTimeout(()=>{},1000)}setInterval(maybeNotify,60000);setTimeout(subscribeCloudEvents,1800);if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').catch(()=>{})}
init();
document.addEventListener('click',function(e){let b=e.target.closest('#statusOptions .status-option');if(!b)return;let idx=Number(b.dataset.statusIndex);let opts=b.dataset.statusContext==='next10'?['Ainda no corredor','Área de vencimento']:['Ainda no corredor','Área de vencimento','PLU/Etiqueta'];if(statusProductId!=null&&opts[idx]){selectStatusOption(statusProductId,opts[idx]);window._statusContext='';}});