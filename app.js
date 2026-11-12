/* Certificados de Análise — Prometals
   Dados no Supabase (login + tabelas + tempo real). Configuração em config.js. */
const Q1 = ['C','Si','Mn','P','S','Cr','Mo','Ni','Al','Co'];
const Q1N = ['Carbono','Silício','Manganês','Fósforo','Enxofre','Cromo','Molibd.','Níquel','Alumínio','Cobalto'];
const Q2 = ['Cu','Nb','Ti','V','W','Pb','Sn','B','Mg','Fe'];
const Q2N = ['Cobre','Nióbio','Titânio','Vanádio','Tungst.','Chumbo','Estanho','Boro','Magnésio','Ferro'];
const QALL = Q1.concat(Q2);
const CE = (()=>{ const d=document.createElement('div'); try{ d.contentEditable='plaintext-only'; }catch(e){} return d.contentEditable==='plaintext-only' ? 'plaintext-only' : 'true'; })();

/* Fixed fields that a new certificate inherits from the most recent one */
const FIXED = ['tipoNorma','pagina','fabRazao','fabEndereco','fabContato','fabTelefones','tituloQuimica','metodo','tituloOpLiga','tituloOpsItens','tituloAspectos','resultado','declaracao','aprovadoPor','analista','assinaturaLabel','rodapeMarca','rodapeEndereco','rodapeTelefones','titulo','subtitulo'];
const DEF = {
  aba:'', certNo:'', dataEmissao:'', nfe:'', pagina:'1 de 1', revisao:'1', tipoNorma:'3.1 — ISO 10474',
  fabRazao:'PROMETALS LTDA.', fabEndereco:'R. Jaime Rodriguez - Azenha, Nº 1100 - Nova Odessa / SP', fabContato:'qualidade1@prometals.co', fabTelefones:'19 9.8888-3525  /  19 9.8855-4442',
  cliente:'', pedido:'', referencia:'', produtos:[], material:'', corrida:'',
  tituloQuimica:'1 — ANÁLISE QUÍMICA', metodo:'Método: Espectrometria de Emissão Óptica (OES).   Unidade: % em massa.', quimica:{},
  tituloOpLiga:'2 — OPs LIGA', tituloOpsItens:'3 - OPs Itens', opLiga:'', opsItens:'',
  tituloAspectos:'4 — ASPECTOS GERAIS E DIMENSIONAL', resultado:'APROVADO CONFORME ANÁLISE CRÍTICA.',
  declaracao:'Declaramos que os produtos fornecidos estão em conformidade com os requisitos do pedido. Os resultados referem-se exclusivamente à amostra ensaiada. Este certificado é do tipo 3.1, validado por representante de inspeção autorizado, independente do setor de fabricação. Este documento não deve ser reproduzido, exceto integralmente.',
  aprovadoPor:'APROVADO POR (representante de inspeção autorizado): Luiz', dataAprovacao:'',
  analista:'Caio Deodato dos Santos Silva  —  Analista de Qualidade', assinaturaLabel:'Assinatura:',
  rodapeMarca:'●  PROMETALS.CO', rodapeEndereco:'R. Jaime Rodriguez - Azenha, 1100 - Nova Odessa / SP', rodapeTelefones:'19 9.8888-3525  /  19 9.8855-4442',
  titulo:'CERTIFICADO DE QUALIDADE', subtitulo:'Documento conforme padrões da ISO',
  opsBusca:'', obs:'', ligaRef:'', mostrarAssinatura:true, mostrarQuimica:true, abaAuto:true
};

/* ---------------- helpers ---------------- */
const $ = s => document.querySelector(s);
const clone = o => JSON.parse(JSON.stringify(o));
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const uid = () => 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const pad = n => String(n).padStart(2,'0');
const hoje = () => { const d=new Date(); return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear(); };
const dateKey = s => { const m=String(s||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? m[3]+pad(m[2])+pad(m[1]) : ''; };
const firstLine = s => String(s||'').split('\n').map(x=>x.trim()).filter(Boolean);
const opTokens = s => String(s||'').split(/[^0-9A-Za-z]+/).filter(Boolean);
const abaFrom = c => c.trim() ? 'CORRIDA ' + c.trim().replace(/\s*-\s*/g,'-') : '';
function getPath(o, p){ return p.split('.').reduce((a,k)=> a==null ? a : a[k], o); }
function setPath(o, p, v){ const ks=p.split('.'); let a=o; for(let i=0;i<ks.length-1;i++){ if(a[ks[i]]==null) a[ks[i]]={}; a=a[ks[i]]; } a[ks[ks.length-1]]=v; }
function fmtNum(s){ s=String(s??'').trim(); return /^-?\d+\.\d+$/.test(s) ? s.replace('.',',') : s; }
function parseNum(s){
  s = String(s??'').trim();
  if(!s || /^(nd|n\.d\.?|na|n\/a|-|—|–)$/i.test(s)) return null;
  const m = s.match(/^[<>≤≥]?\s*(\d+(?:[.,]\d+)?)$/);
  return m ? parseFloat(m[1].replace(',','.')) : NaN;
}
const fmtBR = n => String(n).replace('.',',');

/* ---------------- estado ---------------- */
const ELEMS_DB = ['C','Si','Mn','Cr','Ni','V','Nb','Mo','Cu','W','Ti'];
let state = {certs:[], ligas:[], elemsDB:ELEMS_DB.slice(), ligasAlteradoEm:0, assinatura:'', assinaturaEm:0};
let cur = null;          // certificado aberto no editor
let viewList = [];       // ids na ordem da lista (para anterior/próxima)
let sortBy = {k:'ordem', d:-1};
const sel = new Set();
let user = null;
let loaded = {certs:false, config:false}, configExists = null;

function upgradeCert(c){
  for(const k in DEF) if(c[k]===undefined) c[k] = clone(DEF[k]);
  if(!Array.isArray(c.produtos)) c.produtos = [];
  if(!c.quimica || typeof c.quimica!=='object') c.quimica = {};
  return c;
}
const plain = o => JSON.parse(JSON.stringify(o));      // o Firestore não aceita "undefined"
function stable(v){
  if(Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if(v && typeof v==='object') return '{' + Object.keys(v).filter(k=>v[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',') + '}';
  return JSON.stringify(v===undefined ? null : v);
}
const hhmm = t => new Date(t).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
function setSave(t, err){ const el=$('#saveState'); el.textContent=t; el.classList.toggle('err', !!err); }

/* ---------------- banco online (Supabase: login + tabelas + tempo real) ---------------- */
const SB_LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm';
const CFG = window.SUPABASE_CONFIG || {};
const CONFIGURED = !!(CFG.url && CFG.anonKey && /^https:\/\//.test(CFG.url) && !/COLE_AQUI|SEU-PROJETO/i.test(String(CFG.url) + String(CFG.anonKey)));
const T_CERT = 'certificados_analise', T_CFG = 'certificados_config', T_USERS = 'certificados_usuarios';
const OUTBOX = 'certificados.pendentes', CACHE = 'certificados.copia';
let sb = null, chan = null, rtDown = false, hiddenAt = 0;
const pendingCert = new Map();     // id -> timer (digitação ainda não enviada)
let configT = null, cfgRetry = null, inflight = 0, lastSaved = 0, retryT = null, cacheT = null, offlineMode = false;

async function loadSupabase(){
  const m = await import(SB_LIB);
  return m.createClient(CFG.url, CFG.anonKey, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}});
}
const run = async p => { const r = await p; if(r && r.error) throw r.error; return r ? r.data : null; };
const isNet = e => !navigator.onLine || (e && (e.status===0 || e.name==='AuthRetryableFetchError' || /fetch|network|timeout|load failed/i.test(String(e.message||''))));
const isMissing = e => e && (e.code==='PGRST205' || e.code==='42P01' || /could not find the table|does not exist/i.test(String(e.message||'')));

function msgErro(e){
  const c = (e && e.code) || '', m = String((e && e.message) || e || '');
  if(c==='invalid_credentials' || /invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
  if(c==='email_not_confirmed') return 'Este e-mail ainda não foi confirmado. Peça ao administrador para confirmar o usuário no Supabase.';
  if(c==='over_request_rate_limit' || c==='over_email_send_rate_limit' || (e && e.status===429)) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  if(c==='weak_password') return 'Senha fraca: use pelo menos 6 caracteres.';
  if(c==='same_password') return 'A nova senha precisa ser diferente da atual.';
  if(c==='42501' || /row-level security|permission denied/i.test(m)) return 'Seu usuário não tem permissão (confira a lista de usuários liberados no Supabase).';
  if(isMissing(e)) return 'As tabelas do sistema não existem no Supabase (rode o arquivo supabase.sql).';
  if(isNet(e)) return 'Sem conexão com a internet.';
  return m;
}

/* alterações que ainda não chegaram ao banco ficam guardadas aqui até a internet voltar */
function outbox(){ try{ return JSON.parse(localStorage.getItem(OUTBOX) || '{}') || {}; }catch(e){ return {}; } }
function setOutbox(o){ try{ if(Object.keys(o).length) localStorage.setItem(OUTBOX, JSON.stringify(o)); else localStorage.removeItem(OUTBOX); }catch(e){} }
function outPut(id, v){ const o = outbox(); o[id] = v; setOutbox(o); }
function outDel(id, expected){ const o = outbox(); if(id in o && (expected===undefined || stable(o[id])===expected)){ delete o[id]; setOutbox(o); } }
const outCount = () => Object.keys(outbox()).length + (cfgRetry ? 1 : 0);

/* cópia local para abrir sem internet */
function cacheSave(){ clearTimeout(cacheT); cacheT = setTimeout(()=>{ if(!user) return; try{ localStorage.setItem(CACHE, JSON.stringify({u:user.id, t:Date.now(), certs:state.certs, ligas:state.ligas, elemsDB:state.elemsDB, ligasAlteradoEm:state.ligasAlteradoEm, assinatura:state.assinatura})); }catch(e){} }, 1500); }
function cacheLoad(uid){ try{ const c = JSON.parse(localStorage.getItem(CACHE) || 'null'); return c && c.u===uid ? c : null; }catch(e){ return null; } }
function clearLocal(){ try{ localStorage.removeItem(CACHE); localStorage.removeItem(OUTBOX); }catch(e){} }

function updSaveState(){
  if(!user){ setSave(''); return; }
  const n = outCount();
  if(offlineMode || (!navigator.onLine && (n || pendingCert.size))) setSave(n ? `Sem internet — ${n} alteração(ões) aguardando envio` : 'Sem internet — mostrando a última cópia', true);
  else if(pendingCert.size || configT || inflight) setSave('Salvando…');
  else if(n) setSave(`${n} alteração(ões) aguardando envio`, true);
  else setSave(lastSaved ? 'Salvo no banco online às ' + hhmm(lastSaved) + ' ✓' : 'Banco online ✓');
}
window.addEventListener('online', ()=>{ updSaveState(); if(offlineMode) reloadAll(); else retryAll(); });
window.addEventListener('offline', updSaveState);

function writeFailed(e){
  if(isNet(e)){ scheduleRetry(); return; }
  console.error(e);
  toast('Não foi possível salvar no banco online: ' + msgErro(e), {err:true, ms:9000});
}
function scheduleRetry(){ clearTimeout(retryT); retryT = setTimeout(retryAll, 8000); }
async function retryAll(){
  clearTimeout(retryT);
  if(!sb || !user) return;
  const o = outbox();
  for(const [id, v] of Object.entries(o)){
    if(pendingCert.has(id)) continue;
    if(v && v.__excluido) await pushDelete(id); else { const c = state.certs.find(x=>x.id===id) || v; await pushCert(c); }
  }
  if(cfgRetry){ const f = cfgRetry; cfgRetry = null; await pushConfig(f); }
}

function stamp(c){ c.alteradoEm = Date.now(); c.alteradoPor = user ? (user.email||'') : ''; }
async function pushCert(c){
  const data = plain(c), sig = stable(data);
  outPut(c.id, data); inflight++; updSaveState();
  try{
    await run(sb.from(T_CERT).upsert({id:c.id, dados:data, alterado_em:new Date(c.alteradoEm||Date.now()).toISOString(), alterado_por:c.alteradoPor||''}));
    outDel(c.id, sig); lastSaved = Date.now();
  }catch(e){ writeFailed(e); }
  finally{ inflight--; updSaveState(); cacheSave(); }
}
async function pushDelete(id){
  outPut(id, {__excluido:true}); inflight++; updSaveState();
  try{ await run(sb.from(T_CERT).delete().eq('id', id)); outDel(id); lastSaved = Date.now(); }
  catch(e){ writeFailed(e); }
  finally{ inflight--; updSaveState(); cacheSave(); }
}
async function pushConfig(fields){
  inflight++; updSaveState();
  try{ await run(sb.from(T_CFG).upsert(Object.assign({id:'geral'}, fields))); lastSaved = Date.now(); configExists = true; }
  catch(e){ cfgRetry = Object.assign(cfgRetry || {}, fields); writeFailed(e); }
  finally{ inflight--; updSaveState(); cacheSave(); }
}
function scheduleCert(c){ clearTimeout(pendingCert.get(c.id)); pendingCert.set(c.id, setTimeout(()=>flushCert(c.id), 600)); updSaveState(); }
function flushCert(id){
  clearTimeout(pendingCert.get(id)); pendingCert.delete(id);
  const c = state.certs.find(x=>x.id===id);
  if(c && sb) pushCert(c);
  updSaveState();
}
function saveCertNow(c){ stamp(c); clearTimeout(pendingCert.get(c.id)); pendingCert.delete(c.id); if(sb) pushCert(c); }
function deleteCertNow(id){ clearTimeout(pendingCert.get(id)); pendingCert.delete(id); if(sb) pushDelete(id); }
async function saveMany(list){
  for(let i=0; i<list.length; i+=300){
    const part = list.slice(i, i+300);
    part.forEach(c=>outPut(c.id, plain(c)));
    inflight++; updSaveState();
    try{
      await run(sb.from(T_CERT).upsert(part.map(c=>({id:c.id, dados:plain(c), alterado_em:new Date(c.alteradoEm||Date.now()).toISOString(), alterado_por:c.alteradoPor||''}))));
      part.forEach(c=>outDel(c.id)); lastSaved = Date.now();
    }catch(e){ writeFailed(e); }
    finally{ inflight--; updSaveState(); }
  }
  cacheSave();
}
function scheduleConfig(){ clearTimeout(configT); configT = setTimeout(flushConfig, 600); updSaveState(); }
function flushConfig(){
  clearTimeout(configT); configT = null;
  if(sb) pushConfig({ligas:plain(state.ligas), elems_db:state.elemsDB, ligas_alterado_em:state.ligasAlteradoEm});
  updSaveState();
}
function saveSignature(url){
  state.assinatura = url; state.assinaturaEm = Date.now();
  if(sb) pushConfig({assinatura:url, assinatura_em:state.assinaturaEm});
}
function flushAll(){ [...pendingCert.keys()].forEach(flushCert); if(configT) flushConfig(); }
/* toda alteração marca quem e quando, e vai para o banco depois de uma pausa curta na digitação */
function touch(kind){
  if(kind==='ligas'){ state.ligasAlteradoEm = Date.now(); scheduleConfig(); return; }
  if(!cur) return;
  stamp(cur); scheduleCert(cur); cacheSave();
}
window.addEventListener('beforeunload', e=>{ if(pendingCert.size || configT){ flushAll(); e.preventDefault(); e.returnValue = ''; } });

let refreshT = null;
function refreshViews(){
  clearTimeout(refreshT);
  refreshT = setTimeout(()=>{
    if($('#v-busca').classList.contains('on')) renderList();
    else if($('#v-db').classList.contains('on') && !(document.activeElement && document.activeElement.closest('#dbt'))){ renderDB(); renderSig(); }
    updBanner();
  }, 60);
}

/* ---------------- leitura e tempo real ---------------- */
async function loadAll(){
  const rows = [];
  for(let from = 0; ; from += 1000){
    const part = await run(sb.from(T_CERT).select('id,dados').order('id').range(from, from + 999));
    rows.push(...(part||[]));
    if(!part || part.length < 1000) break;
  }
  const cfg = await run(sb.from(T_CFG).select('*').eq('id', 'geral').maybeSingle());
  return {rows, cfg};
}
function applyCfg(cfg){
  if(!cfg) return false;
  if(!configT && !cfgRetry && (+cfg.ligas_alterado_em||0) >= (state.ligasAlteradoEm||0)){
    state.ligas = Array.isArray(cfg.ligas) ? cfg.ligas : [];
    state.elemsDB = Array.isArray(cfg.elems_db) && cfg.elems_db.length ? cfg.elems_db : ELEMS_DB.slice();
    state.ligasAlteradoEm = +cfg.ligas_alterado_em || 0;
  }
  const changed = (cfg.assinatura||'') !== state.assinatura;
  state.assinatura = cfg.assinatura || ''; state.assinaturaEm = +cfg.assinatura_em || 0;
  return changed;
}
function applyAll({rows, cfg}){
  const ob = outbox();
  const map = new Map(rows.map(r=>[r.id, upgradeCert(Object.assign({}, r.dados, {id:r.id}))]));
  for(const [id, v] of Object.entries(ob)){ if(v && v.__excluido) map.delete(id); else if(v) map.set(id, upgradeCert(Object.assign({}, v, {id}))); }  // o que não foi enviado ainda vale
  for(const id of pendingCert.keys()){ const lc = state.certs.find(x=>x.id===id); if(lc) map.set(id, lc); }
  const prev = cur;
  state.certs = [...map.values()];
  configExists = !!cfg;
  const sigChanged = applyCfg(cfg);
  loaded.certs = true; loaded.config = true;
  if(prev){
    const n = state.certs.find(c=>c.id===prev.id);
    if(!n) curGone();
    else if(n!==prev){ const changed = stable(n)!==stable(prev); cur = n; if(changed) curUpdated(); else if(sigChanged) renderPaper(); }
  }
  cacheSave(); refreshViews();
}
async function reloadAll(){
  if(!sb || !user) return;
  try{ const d = await loadAll(); offlineMode = false; applyAll(d); updSaveState(); retryAll(); }
  catch(e){ if(isNet(e)){ offlineMode = true; updSaveState(); } else console.error(e); }
}
function curGone(){
  if(cur && $('#v-editor').classList.contains('on')){ cur = null; go('#/'); toast('Este certificado foi excluído por outra pessoa.', {ms:6000}); }
}
function curUpdated(){
  if(!$('#v-editor').classList.contains('on')) return;
  const ae = document.activeElement, fpath = ae && paper.contains(ae) && ae.dataset ? ae.dataset.f : null;
  renderPaper(fpath || undefined); renderSide(); $('#abaInput').value = cur.aba;
  toast(`Este certificado foi alterado${cur.alteradoPor ? ' por ' + cur.alteradoPor : ''}.`, {ms:5000});
}
function onCertChange(p){
  if(p.eventType==='DELETE'){
    const id = p.old && p.old.id; if(!id){ reloadAll(); return; }
    if(pendingCert.has(id)) return;
    state.certs = state.certs.filter(c=>c.id!==id); sel.delete(id);
    if(cur && cur.id===id) curGone();
    cacheSave(); refreshViews(); return;
  }
  const r = p.new; if(!r || !r.id || !r.dados) return;
  const id = r.id;
  if(pendingCert.has(id) || outbox()[id]) return;            // temos alterações locais mais novas
  const data = upgradeCert(Object.assign({}, r.dados, {id}));
  const i = state.certs.findIndex(c=>c.id===id);
  if(i>=0){ if(stable(state.certs[i])===stable(data)) return; state.certs[i] = data; }   // eco das nossas próprias gravações
  else state.certs.push(data);
  if(cur && cur.id===id){ cur = data; curUpdated(); }
  cacheSave(); refreshViews();
}
function onCfgChange(p){
  if(p.eventType==='DELETE') return;
  const sigChanged = applyCfg(p.new); configExists = true;
  if(cur && $('#v-editor').classList.contains('on')){ if(sigChanged) renderPaper(); markSpec(); renderSpec(); }
  cacheSave(); refreshViews();
}
function startRealtime(){
  stopRealtime();
  chan = sb.channel('certificados-equipe')
    .on('postgres_changes', {event:'*', schema:'public', table:T_CERT}, onCertChange)
    .on('postgres_changes', {event:'*', schema:'public', table:T_CFG}, onCfgChange)
    .subscribe(status => {
      if(status==='SUBSCRIBED' && rtDown){ rtDown = false; reloadAll(); }      // reconectou: busca o que mudou nesse meio tempo
      if(status==='CHANNEL_ERROR' || status==='TIMED_OUT') rtDown = true;
    });
}
function stopRealtime(){ if(chan && sb){ try{ sb.removeChannel(chan); }catch(e){} } chan = null; }
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState==='hidden') hiddenAt = Date.now();
  else if(user && hiddenAt && Date.now() - hiddenAt > 120000) reloadAll();   // voltou depois de um tempo: confere tudo
});

/* ---------------- tela de entrada (login) ---------------- */
let userId, recovering = false;    // undefined até a primeira resposta do login
function showGate(mode, err){
  $('#gate').classList.remove('hidden');
  $('#loginForm').classList.toggle('hidden', mode!=='login');
  $('#recForm').classList.toggle('hidden', mode!=='recovery');
  const m = $('#gateMsg');
  m.classList.toggle('hidden', mode==='login' || mode==='recovery');
  if(mode==='loading') m.innerHTML = '<p>Carregando…</p>';
  if(mode==='setup') m.innerHTML = `<p><b>Falta ligar o sistema ao Supabase.</b></p><p>Abra o arquivo <b>config.js</b> no GitHub e cole a URL e a chave <b>anon / publishable</b> do seu projeto. O passo a passo está no <b>README</b>.</p>`;
  if(mode==='setupdb') m.innerHTML = `<p><b>O banco ainda não foi preparado.</b></p><p>No Supabase, abra o <b>SQL Editor</b>, cole o conteúdo do arquivo <b>supabase.sql</b> e clique em <b>Run</b>. Depois recarregue esta página.</p><button class="btn" type="button" data-gate="logout">Sair</button>`;
  if(mode==='noaccess') m.innerHTML = `<p><b>Seu usuário ainda não foi liberado.</b></p><p>Peça ao administrador para incluir <b>${esc(user && user.email || '')}</b> na tabela <b>${T_USERS}</b> do Supabase.</p><button class="btn" type="button" data-gate="logout">Sair</button>`;
  if(mode==='offline') m.innerHTML = `<p><b>Não consegui conectar ao banco de dados.</b></p><p>Verifique a internet e tente de novo.</p><p class="small">${esc(msgErro(err))}</p><button class="btn primary" type="button" onclick="location.reload()">Tentar de novo</button>`;
  if(mode==='login'){ $('#lgErr').textContent = ''; setTimeout(()=>$('#lgEmail').focus(), 30); }
  if(mode==='recovery'){ $('#rcErr').textContent = ''; setTimeout(()=>$('#rcSenha').focus(), 30); }
}
function hideGate(){ $('#gate').classList.add('hidden'); }
$('#gateMsg').addEventListener('click', e=>{ if(e.target.closest('[data-gate="logout"]')) logout(); });
function updUser(){
  const b = $('#userBtn');
  b.classList.toggle('hidden', !user);
  if(user) b.innerHTML = `<span class="dot"></span>${esc(user.email||'Usuário')}`;
}
async function logout(){ flushAll(); clearLocal(); try{ await sb.auth.signOut(); }catch(e){ setUser(null); } }
$('#loginForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const em = $('#lgEmail').value.trim(), pw = $('#lgSenha').value;
  $('#lgErr').textContent = ''; $('#lgOk').textContent = '';
  const b = $('#lgBtn'); b.disabled = true; b.textContent = 'Entrando…';
  try{ await run(sb.auth.signInWithPassword({email:em, password:pw})); $('#lgSenha').value = ''; }
  catch(err){ $('#lgErr').textContent = msgErro(err); }
  finally{ b.disabled = false; b.textContent = 'Entrar'; }
});
$('#lgReset').addEventListener('click', async ()=>{
  const em = $('#lgEmail').value.trim();
  $('#lgOk').textContent = '';
  if(!em){ $('#lgErr').textContent = 'Digite seu e-mail acima e clique de novo em “Esqueci minha senha”.'; $('#lgEmail').focus(); return; }
  try{ await run(sb.auth.resetPasswordForEmail(em, {redirectTo: location.origin + location.pathname})); $('#lgErr').textContent = ''; $('#lgOk').textContent = `Se ${em} estiver cadastrado, chegará um e-mail com o link para criar uma nova senha.`; }
  catch(err){ $('#lgErr').textContent = msgErro(err); }
});
$('#recForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const a = $('#rcSenha').value, b2 = $('#rcSenha2').value;
  if(a.length < 6){ $('#rcErr').textContent = 'Use pelo menos 6 caracteres.'; return; }
  if(a !== b2){ $('#rcErr').textContent = 'As duas senhas não são iguais.'; return; }
  const b = $('#rcBtn'); b.disabled = true;
  try{
    await run(sb.auth.updateUser({password:a}));
    recovering = false; $('#rcSenha').value = ''; $('#rcSenha2').value = '';
    const s = await run(sb.auth.getSession());
    userId = null; setUser(s && s.session ? s.session.user : null);
    toast('Senha alterada.');
  }catch(err){ $('#rcErr').textContent = msgErro(err); }
  finally{ b.disabled = false; }
});
$('#userBtn').addEventListener('click', ()=>{
  const n = outCount();
  ask('Usuário', `<p>Você está conectado como <b>${esc(user && user.email || '')}</b>.</p><p>Todos os usuários liberados veem e editam os mesmos certificados.</p>` + (n ? `<p style="color:var(--red)"><b>Atenção:</b> ${n} alteração(ões) ainda não foram enviadas ao banco. Se sair agora, elas serão perdidas.</p>` : ''), [{t:'Fechar'},{t:'Sair',v:1,cls:'danger'}])
    .then(v=>{ if(v) logout(); });
});

/* faixa de avisos (primeiro acesso) */
function setBanner(html, cls){ const bn = $('#sbanner'); bn.className = 'sbanner' + (cls ? ' ' + cls : '') + (html ? '' : ' hidden'); bn.innerHTML = html || ''; measure(); }
function updBanner(){
  if(!user) return setBanner('');
  if(offlineMode) return setBanner(`<span><b>Sem conexão com o banco online.</b> Você está vendo a última cópia salva neste computador. As alterações serão enviadas quando a internet voltar.</span><span class="sb-act"><button class="btn sm" data-share="retry">Tentar de novo</button></span>`, 'err');
  if(loaded.config && configExists===false && !state.ligas.length)
    return setBanner(`<span><b>Primeiro acesso:</b> importe o arquivo <b>configuracao-inicial.json</b> para trazer as ligas do Banco de dados e a assinatura.</span><span class="sb-act"><button class="btn sm primary" data-share="import">Importar arquivo…</button></span>`);
  setBanner('');
}
$('#sbanner').addEventListener('click', e=>{
  const b = e.target.closest('[data-share]'); if(!b) return;
  if(b.dataset.share==='import') $('#fileImport').click();
  if(b.dataset.share==='retry') reloadAll().then(updBanner);
});

/* ---------------- sessão ---------------- */
async function checkAccess(){ const rows = await run(sb.from(T_USERS).select('email').limit(1)); return !!(rows && rows.length); }
async function setUser(u){
  const id = u ? u.id : null;
  if(id === userId) return;              // mesmo usuário (renovação de sessão etc.)
  userId = id; user = u || null;
  stopRealtime();
  state.certs = []; state.ligas = []; state.assinatura = ''; cur = null; sel.clear();
  loaded = {certs:false, config:false}; configExists = null; offlineMode = false;
  updUser();
  if(!user){ setBanner(''); setSave(''); showGate('login'); return; }
  showGate('loading');
  try{
    if(!(await checkAccess())){ showGate('noaccess'); return; }
    const d = await loadAll();
    hideGate(); applyAll(d); startRealtime(); route(); updSaveState(); retryAll();
  }catch(e){
    if(isMissing(e)){ showGate('setupdb'); return; }
    const c = isNet(e) ? cacheLoad(user.id) : null;
    if(c){       // sem internet: abre a última cópia deste computador
      offlineMode = true; hideGate();
      applyAll({rows: c.certs.map(x=>({id:x.id, dados:x})), cfg:{ligas:c.ligas, elems_db:c.elemsDB, ligas_alterado_em:c.ligasAlteradoEm, assinatura:c.assinatura}});
      route(); updSaveState(); updBanner();
    } else showGate('offline', e);
  }
}

/* ---------------- routing ---------------- */
function go(h){ if(location.hash===h) route(); else location.hash = h; }
function route(){
  const h = location.hash || '#/';
  let v = 'busca';
  const m = h.match(/^#\/c\/(.+)$/);
  if(m){
    const c = state.certs.find(x=>x.id===decodeURIComponent(m[1]));
    if(c){ v='editor'; openEditor(c); } else if(loaded.certs){ history.replaceState(null,'','#/'); }
  } else if(h==='#/db'){ v='db'; renderDB(); renderSig(); }
  if(v!=='editor') cur = null;
  if(v==='busca') renderList();
  document.querySelectorAll('.view').forEach(s=>s.classList.toggle('on', s.id==='v-'+v));
  document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('on', a.dataset.nav===v));
  document.title = v==='editor' ? (cur.aba||'Certificado') + ' — Certificados' : 'Certificados de Análise';
  window.scrollTo(0,0);
  measure();
  if(v==='busca') setTimeout(()=>$('#q').focus({preventScroll:true}), 0);
}
window.addEventListener('hashchange', route);

/* ---------------- search / list ---------------- */
function hay(r){
  return norm([r.aba, r.corrida, r.material, r.cliente, r.certNo, r.pedido, r.referencia, r.nfe, r.opLiga, r.opsItens, r.opsBusca,
    (r.produtos||[]).map(p=>p.titulo+' '+p.linhas.join(' ')).join(' ')].join(' | '));
}
const tight = s => s.replace(/\s*([-/])\s*/g, '$1');
function matchText(r, q){
  const qn = tight(norm(q).trim()); if(!qn) return true;
  const h = tight(hay(r));
  if(/\d[-/]\d/.test(qn)){
    // corrida / OP style ("32-228", "32 - 228"): match whole numbers only, so 1932-2282 doesn't match 32-228
    const re = new RegExp('(^|[^0-9a-z])' + qn.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '($|[^0-9a-z])');
    return re.test(h);
  }
  if(h.includes(qn)) return true;
  return qn.split(/\s+/).every(t => h.includes(t));
}
function opHit(r, q){
  const where = [];
  if(opTokens(r.opsItens).includes(q)) where.push('OPs/Itens');
  if(opTokens(r.opLiga).includes(q)) where.push('OP da liga');
  if(opTokens(r.referencia).includes(q)) where.push('Referência');
  if(opTokens(r.opsBusca).includes(q)) where.push('OPs extras');
  return where;
}
function sortVal(r, k){
  if(k==='dataEmissao') return dateKey(r.dataEmissao);
  if(k==='ordem') return r.ordem;
  return String(r[k]??'');
}
function compare(a, b){
  const k = sortBy.k, va = sortVal(a,k), vb = sortVal(b,k);
  let c;
  if(typeof va==='number' && typeof vb==='number') c = va - vb;
  else { if(!va && vb) return 1; if(va && !vb) return -1; c = String(va).localeCompare(String(vb), 'pt-BR', {numeric:true, sensitivity:'base'}); }
  return c * sortBy.d || (b.ordem - a.ordem);
}
function hlText(text, q){
  const t = esc(text); if(!q) return t;
  const qq = esc(q).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  try{ return t.replace(new RegExp(qq,'gi'), m=>'<mark>'+m+'</mark>'); }catch(e){ return t; }
}
function hlOps(text, q, numeric){
  if(!numeric) return hlText(text, q);
  return esc(text).replace(/[0-9A-Za-z]+/g, m => m===q ? '<mark>'+m+'</mark>' : m);
}
function renderList(){
  const q = $('#q').value.trim();
  $('#qclear').classList.toggle('hidden', !q);
  $('#qkbd').classList.toggle('hidden', !!q);
  const numeric = /^\d{2,}$/.test(q);
  let rows = [];
  const exact = [];
  for(const r of state.certs){
    const where = numeric ? opHit(r, q) : [];
    if(where.length){ exact.push({r, where}); rows.push({r, hit:true}); }
    else if(matchText(r, q)) rows.push({r, hit:false});
  }
  rows.sort((a,b)=> (b.hit - a.hit) || compare(a.r, b.r));
  viewList = rows.map(x=>x.r.id);

  // result banner (like the "Resultado:" cell in the Excel sheet)
  const rb = $('#resbox');
  rb.className = 'resbox';
  if(!q){
    rb.classList.add('idle');
    rb.innerHTML = 'Digite uma OP (ex.: 3323) para ver em qual corrida ela está — ou procure por corrida, material, cliente, pedido…';
  } else if(numeric){
    if(exact.length){
      exact.sort((a,b)=>compare(a.r,b.r));
      rb.innerHTML = 'Encontrada na(s) corrida(s):' + exact.map(x=>`<button class="chip" data-open="${esc(x.r.id)}" title="Abrir certificado">${esc(x.r.aba)}<small>${esc(x.where.join(', '))}</small></button>`).join('') + `<span class="qtd">Qtd. encontrada: ${exact.length}</span>`;
    } else {
      rb.classList.add('no');
      rb.innerHTML = `OP ${esc(q)} NÃO encontrada em nenhum certificado` + (rows.length ? `<span class="qtd">${rows.length} resultado(s) parecido(s) abaixo</span>` : '');
    }
  } else {
    if(rows.length===1) rb.innerHTML = `1 certificado encontrado: <button class="chip" data-open="${esc(rows[0].r.id)}">${esc(rows[0].r.aba)}</button><span class="qtd">Enter abre</span>`;
    else if(rows.length) rb.innerHTML = `${rows.length} certificados encontrados para “${esc(q)}”`;
    else { rb.classList.add('no'); rb.innerHTML = `Nada encontrado para “${esc(q)}”`; }
  }

  const tb = $('#rows');
  if(!rows.length){
    tb.innerHTML = `<tr><td colspan="10" class="empty">${!loaded.certs ? 'Carregando certificados…' : state.certs.length ? 'Nenhum certificado corresponde à busca.' : 'Nenhum certificado ainda. Clique em “Nova corrida” para criar o primeiro.'}</td></tr>`;
  } else {
    const qh = numeric ? q : q;
    tb.innerHTML = rows.map(({r, hit}) => {
      const certs = firstLine(r.certNo);
      return `<tr data-id="${esc(r.id)}" class="${hit?'hit':''}">
        <td class="ck"><input type="checkbox" data-ck="${esc(r.id)}" ${sel.has(r.id)?'checked':''} aria-label="Selecionar ${esc(r.aba)}"></td>
        <td class="aba">${hlText(r.aba, numeric?'':qh)}${r.mostrarQuimica===false ? '<div class="extra" style="font-weight:400">sem análise química</div>' : ''}</td>
        <td class="ops">${hlOps(r.opsItens, qh, numeric)}${r.opsBusca ? `<div class="extra" title="OPs extras usadas só na busca">extras: ${hlOps(r.opsBusca, qh, numeric)}</div>` : ''}</td>
        <td class="c">${hlText(r.material, numeric?'':qh)}</td>
        <td class="c">${hlText(r.corrida, numeric?'':qh)}</td>
        <td class="c b">${hlOps(r.opLiga, qh, numeric)}</td>
        <td class="cli">${hlText(r.cliente, numeric?'':qh)}</td>
        <td class="cert">${hlText(certs[0]||'', numeric?'':qh)}${certs.length>1 ? ` <small>+${certs.length-1}</small>` : ''}</td>
        <td class="c">${esc(r.dataEmissao)}</td>
        <td class="act"><button class="lnk" data-open="${esc(r.id)}">abrir</button><button class="ico" data-print="${esc(r.id)}" title="Imprimir / PDF" aria-label="Imprimir"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg></button></td>
      </tr>`;
    }).join('');
  }
  $('#cnt').textContent = q ? `${rows.length} de ${state.certs.length} certificados` : `${state.certs.length} certificados cadastrados`;
  document.querySelectorAll('table.idx th[data-sort]').forEach(th=>{
    const on = th.dataset.sort===sortBy.k;
    th.innerHTML = th.textContent.replace(/[▲▼]$/,'').trim() + (on ? `<span class="ar">${sortBy.d>0?'▲':'▼'}</span>` : '');
  });
  updSel();
}
function updSel(){
  const n = sel.size;
  $('#selInfo').textContent = n + ' selecionado(s)';
  $('#selInfo').classList.toggle('hidden', !n);
  $('#btnSelClear').classList.toggle('hidden', !n);
  $('#btnPrintSel').disabled = !n;
  const vis = viewList.length && viewList.every(id=>sel.has(id));
  $('#ckAll').checked = !!vis;
  $('#ckAll').indeterminate = !vis && viewList.some(id=>sel.has(id));
}

$('#q').addEventListener('input', renderList);
$('#q').addEventListener('keydown', e=>{
  if(e.key==='Enter'){
    const hits = document.querySelectorAll('#resbox [data-open]');
    if(hits.length===1) openId(hits[0].dataset.open);
    else if(viewList.length===1) openId(viewList[0]);
    else if(hits.length>1) hits[0].focus();
  } else if(e.key==='Escape'){ $('#q').value=''; renderList(); }
  else if(e.key==='ArrowDown'){ const b=document.querySelector('#rows [data-open]'); if(b){ e.preventDefault(); b.focus(); } }
});
$('#qclear').addEventListener('click', ()=>{ $('#q').value=''; renderList(); $('#q').focus(); });
$('#resbox').addEventListener('click', e=>{ const b=e.target.closest('[data-open]'); if(b) openId(b.dataset.open); });
$('#rows').addEventListener('click', e=>{
  const ck = e.target.closest('[data-ck]');
  if(ck){ ck.checked ? sel.add(ck.dataset.ck) : sel.delete(ck.dataset.ck); updSel(); return; }
  if(e.target.closest('td.ck')) return;
  const p = e.target.closest('[data-print]'); if(p){ printCerts([state.certs.find(c=>c.id===p.dataset.print)]); return; }
  const tr = e.target.closest('tr[data-id]'); if(tr) openId(tr.dataset.id);
});
$('#ckAll').addEventListener('change', e=>{ viewList.forEach(id=> e.target.checked ? sel.add(id) : sel.delete(id)); renderList(); });
$('#btnSelClear').addEventListener('click', ()=>{ sel.clear(); renderList(); });
$('#btnPrintSel').addEventListener('click', ()=>{ const list = state.certs.filter(c=>sel.has(c.id)).sort(compare); if(list.length) printCerts(list); });
document.querySelector('table.idx thead').addEventListener('click', e=>{
  const th = e.target.closest('th[data-sort]'); if(!th) return;
  const k = th.dataset.sort;
  sortBy = sortBy.k===k ? {k, d:-sortBy.d} : {k, d: k==='dataEmissao' ? -1 : 1};
  renderList();
});
function openId(id){ go('#/c/' + encodeURIComponent(id)); }

/* ---------------- certificate rendering ---------------- */
function certHTML(r, ed){
  const ceA = ed ? ` contenteditable="${CE}" spellcheck="false"` : '';
  const F = (path, ph) => ` data-f="${path}" data-ph="${esc(ph||'')}"${ceA}`;
  const V = path => esc(getPath(r, path) ?? '');
  const cell = (span, cls, path, ph, extra='') => `<td colspan="${span}" class="${cls}"${F(path,ph)}${extra}>${V(path)}</td>`;
  const lab = (span, t) => `<td colspan="${span}" class="lab">${t}</td>`;
  const sec = (path, ph) => `<tr style="height:18pt">${cell(12,'sec',path,ph)}</tr>`;
  const secF = t => `<tr style="height:18pt"><td colspan="12" class="sec">${t}</td></tr>`;
  const qBlock = (els, names) => `
    <tr style="height:21.75pt"><td colspan="2" class="q ql c">Elemento</td>${els.map(e=>`<td class="q qs">${e}</td>`).join('')}</tr>
    <tr style="height:10.5pt"><td colspan="2" class="q"></td>${names.map(n=>`<td class="q qn">${n}</td>`).join('')}</tr>
    <tr style="height:18pt"><td colspan="2" class="q ql">Conc. obtida (%)</td>${els.map(e=>`<td class="q qv" data-el="${e}"${F('quimica.'+e,'')}>${V('quimica.'+e)}</td>`).join('')}</tr>`;
  const sig = r.mostrarAssinatura!==false && state.assinatura ? `<img class="sig" src="${state.assinatura}" alt="">` : '';
  const quim = r.mostrarQuimica===false
    ? (ed ? `<tr class="qoff"><td colspan="12"><div class="qoffw"><span>Análise química <b>removida</b> deste certificado — não sai na impressão. Os valores continuam guardados.</span><button data-act="qOn" tabindex="-1">Incluir análise química</button></div></td></tr>` : '')
    : `<tr style="height:18pt">${ed ? cell(9,'sec','tituloQuimica') + `<td colspan="3" class="sec qtog"><button data-act="qOff" tabindex="-1" title="Tirar a análise química deste certificado (os valores ficam guardados)">Remover do certificado</button></td>` : cell(12,'sec','tituloQuimica')}</tr>
    <tr style="height:12.75pt">${cell(12,'met','metodo')}</tr>
    ${qBlock(Q1, Q1N)}
    <tr class="sp" style="height:3.75pt"><td colspan="12"></td></tr>
    ${qBlock(Q2, Q2N)}`;
  return `<table class="cert"><colgroup>${'<col>'.repeat(12)}</colgroup>
    <tr style="height:19.5pt"><td colspan="5" rowspan="3" class="logo"><img src="logo.png" alt="Prometals"></td><td colspan="7"></td></tr>
    <tr style="height:19.5pt">${cell(7,'ttl','titulo')}</tr>
    <tr style="height:18pt">${cell(7,'sub','subtitulo')}</tr>
    <tr class="bar" style="height:3.75pt"><td colspan="12"></td></tr>
    ${secF('IDENTIFICAÇÃO DO DOCUMENTO')}
    <tr style="height:17.1pt">${lab(2,'Certificado Nº')}${cell(4,'val','certNo','nº do certificado')}${lab(2,'Data de emissão')}${cell(4,'val','dataEmissao','dd/mm/aaaa')}</tr>
    <tr style="height:17.1pt">${lab(2,'NF-e')}${cell(4,'val','nfe','')}${lab(2,'Página')}${cell(4,'val','pagina')}</tr>
    <tr style="height:17.1pt">${lab(2,'Revisão')}${cell(4,'val','revisao')}${lab(2,'Tipo / Norma')}${cell(4,'val','tipoNorma')}</tr>
    ${secF('FABRICANTE (EMISSOR)')}
    <tr style="height:17.1pt">${lab(2,'Razão social')}${cell(10,'val','fabRazao')}</tr>
    <tr style="height:17.1pt">${lab(2,'Endereço')}${cell(10,'val','fabEndereco')}</tr>
    <tr style="height:17.1pt">${lab(2,'Contato')}${cell(4,'val lnk','fabContato')}${lab(2,'Telefones')}${cell(4,'val','fabTelefones')}</tr>
    ${secF('CLIENTE / COMPRADOR')}
    <tr style="height:17.1pt">${lab(2,'Razão social')}${cell(10,'val','cliente','razão social do cliente')}</tr>
    <tr style="height:17.1pt">${lab(2,'Pedido nº')}${cell(4,'val','pedido','')}${lab(2,'Referência')}${cell(4,'val','referencia','')}</tr>
    <tr><td colspan="12" class="prtd">${prodsHTML(r, ed, F)}</td></tr>
    ${secF('IDENTIFICAÇÃO E RASTREABILIDADE')}
    <tr style="height:17.1pt">${lab(2,'Material / Esp.')}${cell(4,'val c','material','material')}${lab(2,'Corrida / Lote')}${cell(4,'val c','corrida','corrida')}</tr>
    ${quim}
    <tr style="height:18pt">${cell(2,'sec c','tituloOpLiga')}${cell(10,'sec c','tituloOpsItens')}</tr>
    <tr style="height:17.1pt">${cell(2,'val c opl','opLiga','OP liga')}${cell(10,'val c','opsItens','OPs dos itens')}</tr>
    ${sec('tituloAspectos')}
    <tr style="height:17.1pt">${lab(2,'Resultado')}${cell(10,'val','resultado')}</tr>
    ${secF('DECLARAÇÃO DE CONFORMIDADE')}
    <tr style="height:39.75pt">${cell(12,'decl','declaracao')}</tr>
    <tr style="height:15.75pt">${cell(6,'apr','aprovadoPor')}<td colspan="6" class="apr" title="Acompanha a Data de emissão">Data:&nbsp; <span data-mirror="dataEmissao">${esc(r.dataEmissao || r.dataAprovacao || '')}</span></td></tr>
    <tr style="height:25.5pt">${cell(6,'ana','analista')}<td colspan="6" class="asg"><div class="asgw">${esc(r.assinaturaLabel||'Assinatura:')} ________________________________${sig}</div></td></tr>
    <tr class="sp" style="height:6pt"><td colspan="12"></td></tr>
    <tr style="height:27.75pt">${cell(3,'ft ftb','rodapeMarca')}${cell(6,'ft fts','rodapeEndereco')}${cell(3,'ft fts','rodapeTelefones')}</tr>
  </table>`;
}
function prodsHTML(r, ed, F){
  const P = r.produtos || [];
  let h = '';
  if(!P.length) h += `<div class="prod"><div class="pt">PRODUTOS RELACIONADOS/QUANTIDADES</div></div>`;
  P.forEach((p,i)=>{
    h += `<div class="prod" data-i="${i}">`;
    if(ed) h += `<div class="ptools" contenteditable="false">
        <button data-act="addLine" data-i="${i}" tabindex="-1" title="Adicionar linha (Item / Quantidade)">+ linha</button>
        <button data-act="up" data-i="${i}" tabindex="-1" title="Mover para cima" ${i===0?'disabled':''}>↑</button>
        <button data-act="down" data-i="${i}" tabindex="-1" title="Mover para baixo" ${i===P.length-1?'disabled':''}>↓</button>
        <button data-act="delProd" data-i="${i}" tabindex="-1" class="del" title="Excluir produto">Excluir</button></div>`;
    h += `<div class="pt"${F(`produtos.${i}.titulo`,'Descrição do produto')}>${esc(p.titulo)}</div>`;
    (p.linhas||[]).forEach((l,j)=>{
      h += `<div class="plw"><div class="pl"${F(`produtos.${i}.linhas.${j}`,'Item / Quantidade')}>${esc(l)}</div>${ed ? `<button class="px" data-act="delLine" data-i="${i}" data-j="${j}" tabindex="-1" title="Remover linha">×</button>` : ''}</div>`;
    });
    h += `</div>`;
  });
  if(ed) h += `<button class="padd" data-act="addProd" tabindex="-1">+ Adicionar produto</button>`;
  return `<div class="prods" style="position:relative">${h}</div>`;
}

/* ---------------- editor ---------------- */
const paper = $('#paper');
function openEditor(c){
  cur = c;
  renderPaper();
  renderSide();
  $('#abaInput').value = c.aba;
  const i = viewList.indexOf(c.id);
  const list = viewList.length && i>=0 ? viewList : state.certs.slice().sort(compare).map(x=>x.id);
  const k = list.indexOf(c.id);
  $('#pos').textContent = k>=0 ? `${k+1} de ${list.length}` : '';
  $('#btnPrev').disabled = k<=0; $('#btnNext').disabled = k<0 || k>=list.length-1;
  $('#btnPrev').dataset.id = k>0 ? list[k-1] : ''; $('#btnNext').dataset.id = k>=0 && k<list.length-1 ? list[k+1] : '';
}
function renderPaper(focusPath, atEnd=true){
  paper.innerHTML = certHTML(cur, true);
  markSpec();
  if(focusPath) focusField(focusPath, atEnd);
}
function readText(el){
  let t = el.innerText.replace(/ /g,' ').replace(/\r/g,'');
  t = t.replace(/\n+$/,'');
  return t.trim()==='' ? '' : t;
}
function caretEnd(el){
  const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
}
function focusField(path, atEnd=true){
  const el = paper.querySelector(`[data-f="${CSS.escape(path)}"]`);
  if(!el) return;
  el.focus({preventScroll:false}); if(atEnd) caretEnd(el);
}
function editables(){ return [...paper.querySelectorAll('[data-f][contenteditable]')]; }
function focusRel(el, d){ const L=editables(); const i=L.indexOf(el); const n=L[i+d]; if(n){ n.focus(); caretEnd(n); } }

paper.addEventListener('input', e=>{
  const el = e.target.closest('[data-f]'); if(!el || !cur) return;
  const f = el.dataset.f, t = readText(el);
  if(t==='' && el.innerHTML!=='') el.innerHTML = '';
  if(f==='corrida' && cur.abaAuto){ cur.aba = abaFrom(t); $('#abaInput').value = cur.aba; }
  setPath(cur, f, t);
  if(f==='dataEmissao'){ cur.dataAprovacao = t; const m = paper.querySelector('[data-mirror="dataEmissao"]'); if(m) m.textContent = t; }
  touch();
  if(f.startsWith('quimica.') || f==='material') { clearTimeout(specT); specT = setTimeout(()=>{ markSpec(); renderSpec(); }, 250); }
});
let specT = null;
paper.addEventListener('focusout', e=>{
  const el = e.target.closest('[data-f^="quimica."]'); if(!el || !cur) return;
  const t = readText(el), n = fmtNum(t);
  if(n!==t){ el.textContent = n; setPath(cur, el.dataset.f, n); touch(); markSpec(); renderSpec(); }
});
paper.addEventListener('keydown', e=>{
  const el = e.target.closest('[data-f]'); if(!el || !cur) return;
  const f = el.dataset.f;
  const pm = f.match(/^produtos\.(\d+)\.(?:titulo|linhas\.(\d+))$/);
  if(e.key==='Enter'){
    e.preventDefault();
    if(e.altKey || e.shiftKey || e.ctrlKey){ document.execCommand('insertLineBreak'); return; }
    if(pm){
      const i=+pm[1], p=cur.produtos[i];
      if(pm[2]===undefined){ if(!p.linhas.length){ p.linhas.push(''); touch(); renderPaper(`produtos.${i}.linhas.0`); } else focusField(`produtos.${i}.linhas.0`); return; }
      const j=+pm[2];
      if(j===p.linhas.length-1){ p.linhas.push(''); touch(); renderPaper(`produtos.${i}.linhas.${j+1}`); }
      else focusField(`produtos.${i}.linhas.${j+1}`);
      return;
    }
    focusRel(el, +1);
  } else if(e.key==='Backspace' && pm && pm[2]!==undefined && readText(el)===''){
    e.preventDefault();
    const i=+pm[1], j=+pm[2];
    cur.produtos[i].linhas.splice(j,1); touch();
    renderPaper(j>0 ? `produtos.${i}.linhas.${j-1}` : `produtos.${i}.titulo`);
  } else if(e.key==='Escape'){
    e.stopPropagation(); el.blur();
  } else if((e.key==='ArrowDown' || e.key==='ArrowUp') && el.dataset.el){
    // move between the two chemistry rows like a grid
    const k = QALL.indexOf(el.dataset.el), t = e.key==='ArrowDown' ? k+10 : k-10;
    if(t>=0 && t<QALL.length){ e.preventDefault(); focusField('quimica.'+QALL[t]); }
  }
});
paper.addEventListener('paste', e=>{
  const el = e.target.closest('[data-f]'); if(!el || !cur) return;
  const text = (e.clipboardData || window.clipboardData).getData('text/plain') || '';
  const f = el.dataset.f;
  if(f.startsWith('quimica.')){
    const parts = text.replace(/\r/g,'').split(/\t|\n|;/).map(s=>s.trim());
    while(parts.length && parts[parts.length-1]==='') parts.pop();
    e.preventDefault();
    if(parts.length>1){
      let k = QALL.indexOf(f.slice(8)), n=0;
      for(const v of parts){ if(k>=QALL.length) break; cur.quimica[QALL[k]] = fmtNum(v); k++; n++; }
      touch(); renderPaper('quimica.'+QALL[Math.min(k, QALL.length)-1]); renderSpec();
      toast(`${n} valores colados na análise química`);
    } else document.execCommand('insertText', false, fmtNum(parts[0]||''));
    return;
  }
  if(CE!=='plaintext-only'){ e.preventDefault(); document.execCommand('insertText', false, text); }
});
paper.addEventListener('mousedown', e=>{ if(e.target.closest('[data-act]')) e.preventDefault(); });
paper.addEventListener('click', e=>{
  const b = e.target.closest('[data-act]'); if(!b || !cur) return;
  e.preventDefault();
  const P = cur.produtos, i=+b.dataset.i, j=+b.dataset.j;
  switch(b.dataset.act){
    case 'addProd': P.push({titulo:'', linhas:['Item: ','Quantidade(s): ']}); touch(); renderPaper(`produtos.${P.length-1}.titulo`); break;
    case 'addLine': P[i].linhas.push(''); touch(); renderPaper(`produtos.${i}.linhas.${P[i].linhas.length-1}`); break;
    case 'delLine': P[i].linhas.splice(j,1); touch(); renderPaper(); break;
    case 'up': if(i>0){ [P[i-1],P[i]]=[P[i],P[i-1]]; touch(); renderPaper(); } break;
    case 'down': if(i<P.length-1){ [P[i+1],P[i]]=[P[i],P[i+1]]; touch(); renderPaper(); } break;
    case 'qOff': setQuimica(cur,false); touch(); renderPaper(); renderSide(); toast('Análise química removida deste certificado (os valores ficam guardados).'); break;
    case 'qOn': setQuimica(cur,true); touch(); renderPaper(); renderSide(); toast('Análise química incluída de volta.'); break;
    case 'delProd':
      ask('Excluir produto', `<p>Excluir o produto <b>${esc(P[i].titulo||'(sem descrição)')}</b> deste certificado?</p>`, [{t:'Cancelar'},{t:'Excluir',v:1,cls:'danger'}])
        .then(v=>{ if(v){ P.splice(i,1); touch(); renderPaper(); } });
      break;
  }
});

$('#abaInput').addEventListener('input', e=>{ if(!cur) return; cur.aba = e.target.value; cur.abaAuto = false; touch(); document.title = (cur.aba||'Certificado') + ' — Certificados'; });
$('#abaInput').addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); const L=editables(); if(L[0]) { L[0].focus(); caretEnd(L[0]); } } });
$('#btnBack').addEventListener('click', ()=>go('#/'));
$('#btnPrev').addEventListener('click', e=>{ const id=e.currentTarget.dataset.id; if(id) openId(id); });
$('#btnNext').addEventListener('click', e=>{ const id=e.currentTarget.dataset.id; if(id) openId(id); });
$('#btnPrint').addEventListener('click', ()=>{ if(cur) printCerts([cur]); });
$('#btnDup').addEventListener('click', ()=>{
  if(!cur) return;
  const c = clone(cur);
  c.id = uid(); c.ordem = nextOrdem(); c.aba = (cur.aba||'Certificado') + ' (cópia)'; c.abaAuto = false; c.obs = ''; c.alteradoEm = Date.now();
  state.certs.push(c); saveCertNow(c);
  toast('Cópia criada — altere o que for preciso.');
  openId(c.id);
});
$('#btnDel').addEventListener('click', ()=>{
  if(!cur) return;
  const c = cur;
  ask('Excluir certificado', `<p>Excluir <b>${esc(c.aba||'este certificado')}</b>? Você poderá desfazer logo em seguida.</p>`, [{t:'Cancelar'},{t:'Excluir',v:1,cls:'danger'}]).then(v=>{
    if(!v) return;
    const idx = state.certs.indexOf(c);
    cur = null; go('#/');
    state.certs.splice(idx,1); sel.delete(c.id); deleteCertNow(c.id);
    toast(`${c.aba||'Certificado'} excluído.`, {ms:9000, action:'Desfazer', onAction:()=>{ if(!state.certs.some(x=>x.id===c.id)) state.certs.splice(Math.min(idx, state.certs.length),0,c); saveCertNow(c); renderList(); toast('Exclusão desfeita.'); }});
  });
});
function shiftNum(t, d){ return String(t||'').replace(/^(\s*)(\d+)(?=\s*[—–-])/, (m,sp,n)=> sp + Math.max(1, +n + d)); }
const SEC_AFTER_Q = ['tituloOpLiga','tituloOpsItens','tituloAspectos'];
/* Turn the chemistry section on/off; the following section numbers move by one so the certificate stays 1, 2, 3… */
function setQuimica(r, on){
  if((r.mostrarQuimica!==false) === on) return;
  r.mostrarQuimica = on;
  if(/^\s*\d+\s*[—–-]/.test(r.tituloQuimica||'')) SEC_AFTER_Q.forEach(k=> r[k] = shiftNum(r[k], on ? +1 : -1));
}
function nextOrdem(){ return Math.max(Date.now(), state.certs.reduce((m,c)=>Math.max(m, +c.ordem||0), 0) + 1); }

/* ---------------- side panel ---------------- */
function normMat(s){ return norm(s).replace(/[^a-z0-9]/g,''); }
function autoLiga(mat){
  const m = normMat(mat); if(!m) return null;
  return state.ligas.find(l=>normMat(l.nome)===m)
      || state.ligas.find(l=>{ const n=normMat(l.nome); return n.length>=3 && m.length>=3 && (n.startsWith(m) || m.startsWith(n)); })
      || null;
}
function refLiga(r){
  if(r.ligaRef==='-') return null;
  if(r.ligaRef) return state.ligas.find(l=>l.nome===r.ligaRef) || null;
  return autoLiga(r.material);
}
function specCheck(r){
  const liga = refLiga(r), out=[], inv=[], ok=[];
  for(const e of QALL){
    const raw = (r.quimica||{})[e], v = parseNum(raw);
    if(Number.isNaN(v)){ inv.push({e, raw}); continue; }
    if(!liga || v===null) continue;
    const lim = liga.lim[e]; if(!lim) continue;
    let mn = parseNum(lim[0]), mx = parseNum(lim[1]);
    if(Number.isNaN(mn)) mn=null; if(Number.isNaN(mx)) mx=null;
    if((mn===null||mn===0) && (mx===null||mx===0)) continue;
    const lo = mn||0;
    const bad = v < lo || (mx!==null && mx>0 && v > mx);
    (bad ? out : ok).push({e, raw, lo, mx});
  }
  return {liga, out, inv, ok};
}
function markSpec(){
  if(!cur || cur.mostrarQuimica===false) return;
  const s = specCheck(cur);
  paper.querySelectorAll('td[data-el]').forEach(td=>{ td.classList.remove('oos','inv'); td.removeAttribute('title'); });
  s.out.forEach(o=>{ const td=paper.querySelector(`td[data-el="${o.e}"]`); if(td){ td.classList.add('oos'); td.title=`Fora da faixa ${s.liga.nome}: ${fmtBR(o.lo)} a ${o.mx!=null&&o.mx>0?fmtBR(o.mx):'—'}`; } });
  s.inv.forEach(o=>{ const td=paper.querySelector(`td[data-el="${o.e}"]`); if(td){ td.classList.add('inv'); td.title='Valor com formato inválido'; } });
}
function renderSpec(){
  const box = $('#specOut'); if(!box || !cur) return;
  const s = specCheck(cur);
  let h = '';
  if(cur.mostrarQuimica===false){ box.innerHTML = '<p>A análise química foi removida deste certificado.</p>'; return; }
  if(!s.liga) h += `<p>${cur.ligaRef==='-' ? 'Conferência desligada para este certificado.' : `Nenhuma liga do Banco de dados corresponde ao material <b>${esc(cur.material||'—')}</b>. Escolha uma acima para conferir.`}</p>`;
  else if(!s.out.length) h += `<div class="ok">✓ Elementos com faixa definida estão dentro da faixa da liga ${esc(s.liga.nome)} (${s.ok.length} conferidos).</div>`;
  else h += `<div class="warn">${s.out.length} elemento(s) fora da faixa cadastrada para ${esc(s.liga.nome)} — confira:</div>`;
  if(s.inv.length) h += `<div class="bad" style="margin-top:6px">${s.inv.length} valor(es) com formato inválido (digitação):</div>`;
  if(s.out.length || s.inv.length){
    h += '<ul>' + s.out.map(o=>`<li class="o" data-go="${o.e}"><b>${o.e}</b> ${esc(o.raw)} <span>faixa ${fmtBR(o.lo)} a ${o.mx!=null&&o.mx>0?fmtBR(o.mx):'—'}</span></li>`).join('')
      + s.inv.map(o=>`<li class="i" data-go="${o.e}"><b>${o.e}</b> “${esc(o.raw)}” <span>verifique</span></li>`).join('') + '</ul>';
  }
  box.innerHTML = h;
}
function renderSide(){
  const auto = autoLiga(cur.material);
  const opts = [`<option value="">Automático ${auto ? '('+esc(auto.nome)+')' : '(nenhuma)'}</option>`, `<option value="-">Não conferir</option>`]
    .concat(state.ligas.map(l=>`<option value="${esc(l.nome)}">${esc(l.nome)}</option>`)).join('');
  $('#side').innerHTML = `
    <div class="scard">
      <h3>Conferência da análise <span class="tag">não imprime</span></h3>
      <p>Compara os valores com a faixa da liga no Banco de dados.</p>
      <label for="ligaSel">Liga de referência</label>
      <select id="ligaSel">${opts}</select>
      <div class="spec" id="specOut"></div>
    </div>
    <div class="scard">
      <h3>Opções do certificado</h3>
      <label class="chk" style="margin-top:2px"><input type="checkbox" id="chkQuim" ${cur.mostrarQuimica!==false?'checked':''}> Incluir análise química</label>
      <label class="chk" style="margin-top:6px;margin-bottom:12px"><input type="checkbox" id="chkSig" ${cur.mostrarAssinatura!==false?'checked':''}> Mostrar assinatura${state.assinatura ? '' : ' <span style="color:var(--mut)">(nenhuma cadastrada — veja Banco de dados)</span>'}</label>
      <button class="btn sm" id="btnHoje" style="width:100%;justify-content:center">Data de emissão = hoje</button>
    </div>
    <div class="scard">
      <h3>Uso interno <span class="tag">não imprime</span></h3>
      ${cur.alteradoEm ? `<p>Última alteração: <b>${esc(cur.alteradoPor||'—')}</b> em ${new Date(cur.alteradoEm).toLocaleString('pt-BR', {dateStyle:'short', timeStyle:'short'})}</p>` : ''}
      <label for="opsBusca">OPs extras para a busca</label>
      <input type="text" id="opsBusca" value="${esc(cur.opsBusca)}" placeholder="ex.: 3218 - 3219">
      <label for="obs">Observações</label>
      <textarea id="obs" rows="4" placeholder="Anotações da equipe sobre esta corrida">${esc(cur.obs)}</textarea>
    </div>
    <div class="scard">
      <h3>Como editar</h3>
      <ul>
        <li>Clique em qualquer campo do certificado e digite.</li>
        <li><kbd>Enter</kbd> vai para o próximo campo; <kbd>Alt</kbd>+<kbd>Enter</kbd> quebra a linha.</li>
        <li>Cole uma linha de valores do Excel/espectrômetro no campo <b>C</b> para preencher a análise inteira.</li>
        <li>Nos produtos, <kbd>Enter</kbd> cria linha nova e <kbd>Backspace</kbd> em linha vazia apaga.</li>
        <li><kbd>Ctrl</kbd>+<kbd>P</kbd> imprime / salva PDF. <kbd>Esc</kbd> volta para a busca.</li>
      </ul>
    </div>`;
  $('#ligaSel').value = cur.ligaRef || '';
  renderSpec();
}
$('#side').addEventListener('change', e=>{
  if(!cur) return;
  if(e.target.id==='ligaSel'){ cur.ligaRef = e.target.value; touch(); markSpec(); renderSpec(); }
  if(e.target.id==='chkSig'){ cur.mostrarAssinatura = e.target.checked; touch(); renderPaper(); }
  if(e.target.id==='chkQuim'){ setQuimica(cur, e.target.checked); touch(); renderPaper(); renderSpec(); }
});
$('#side').addEventListener('input', e=>{
  if(!cur) return;
  if(e.target.id==='opsBusca'){ cur.opsBusca = e.target.value; touch(); }
  if(e.target.id==='obs'){ cur.obs = e.target.value; touch(); }
});
$('#side').addEventListener('click', e=>{
  if(!cur) return;
  if(e.target.closest('#btnHoje')){ cur.dataEmissao = hoje(); cur.dataAprovacao = hoje(); touch(); renderPaper(); toast('Data de emissão = hoje ('+hoje()+').'); }
  const li = e.target.closest('[data-go]'); if(li) focusField('quimica.'+li.dataset.go);
});

/* ---------------- nova corrida ---------------- */
$('#btnNovo').addEventListener('click', novaCorrida);
function latest(){ return state.certs.slice().sort((a,b)=>b.ordem-a.ordem)[0]; }
function novaCorrida(){
  const q = $('#q').value.trim();
  const mats = [...new Set(state.ligas.map(l=>l.nome).concat(state.certs.map(c=>c.material)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR',{numeric:true}));
  const bases = state.certs.slice().sort((a,b)=>b.ordem-a.ordem);
  const body = `
    <div class="fg">
      <div><label for="nCor">Corrida *</label><input id="nCor" placeholder="ex.: 33-229" autocomplete="off"></div>
      <div><label for="nMat">Material</label><input id="nMat" list="dlMat" autocomplete="off"><datalist id="dlMat">${mats.map(m=>`<option value="${esc(m)}">`).join('')}</datalist></div>
      <div><label for="nLiga">OP da liga</label><input id="nLiga" autocomplete="off" value="${/^\d+$/.test(q)?esc(q):''}"></div>
      <div><label for="nOps">OPs / Itens</label><input id="nOps" autocomplete="off" placeholder="3305 - 3306 - 3307"></div>
      <div class="full"><label for="nBase">Copiar cliente, pedido e produtos de</label>
        <select id="nBase"><option value="">— Em branco —</option>${bases.map(c=>`<option value="${esc(c.id)}">${esc(c.aba)}${c.cliente?' · '+esc(c.cliente.slice(0,40)):''}</option>`).join('')}</select>
        <div class="hint">A análise química, nº do certificado e NF-e sempre começam em branco. Datas = hoje.</div></div>
      <div class="full"><label class="chk2"><input type="checkbox" id="nQuim" checked> Incluir análise química no certificado</label></div>
    </div>`;
  ask('Nova corrida', body, [{t:'Cancelar'},{t:'Criar e abrir',v:1,cls:'primary'}], {
    onOpen: m => { m.querySelector('#nCor').focus(); },
    validate: m => { const v=m.querySelector('#nCor').value.trim(); if(!v){ m.querySelector('#nCor').focus(); m.querySelector('#nCor').style.borderColor='var(--red)'; return false; } return true; },
    collect: m => ({cor:m.querySelector('#nCor').value.trim(), mat:m.querySelector('#nMat').value.trim(), liga:m.querySelector('#nLiga').value.trim(), ops:m.querySelector('#nOps').value.trim(), base:m.querySelector('#nBase').value, quim:m.querySelector('#nQuim').checked})
  }).then(res=>{
    if(!res) return;
    const exists = state.certs.find(c=>normMat(c.corrida)===normMat(res.cor) || normMat(c.aba)===normMat(abaFrom(res.cor)));
    const create = () => {
      const c = clone(DEF);
      const L = latest(); if(L){ FIXED.forEach(k=>{ if(L[k]!==undefined) c[k]=clone(L[k]); }); if(L.mostrarQuimica===false && /^\s*\d+\s*[—–-]/.test(c.tituloQuimica||'')) SEC_AFTER_Q.forEach(k=> c[k] = shiftNum(c[k], +1)); }
      const b = res.base && state.certs.find(x=>x.id===res.base);
      if(b){ ['cliente','pedido','referencia','produtos'].forEach(k=>c[k]=clone(b[k])); }
      if(!c.produtos.length) c.produtos = [{titulo:'', linhas:['Item: ','Quantidade(s): ']}];
      Object.assign(c, {id:uid(), ordem:nextOrdem(), corrida:res.cor, aba:abaFrom(res.cor), abaAuto:true, material:res.mat, opLiga:res.liga, opsItens:res.ops,
        dataEmissao:hoje(), dataAprovacao:hoje(), quimica:{}, alteradoEm:Date.now()});
      if(!res.quim) setQuimica(c, false);
      state.certs.push(c); saveCertNow(c);
      openId(c.id);
      setTimeout(()=>focusField('certNo'), 60);
    };
    if(exists) ask('Corrida já cadastrada', `<p>Já existe <b>${esc(exists.aba)}</b> com essa corrida.</p>`, [{t:'Cancelar'},{t:'Criar mesmo assim',v:2},{t:'Abrir a existente',v:1,cls:'primary'}])
      .then(v=>{ if(v===1) openId(exists.id); else if(v===2) create(); });
    else create();
  });
}

/* ---------------- banco de dados ---------------- */
function renderDB(){
  const E = state.elemsDB;
  $('#dbt').innerHTML = `<thead><tr><th rowspan="2">Liga</th>${E.map(e=>`<th colspan="2">${esc(e)}</th>`).join('')}<th rowspan="2"></th></tr>
    <tr>${E.map(()=>'<th>mín.</th><th>máx.</th>').join('')}</tr></thead>
    <tbody>${state.ligas.map((l,i)=>`<tr>
      <td><input data-db="${i}|nome" value="${esc(l.nome)}" aria-label="Nome da liga"></td>
      ${E.map(e=>{ const v=l.lim[e]||['','']; return `<td><input data-db="${i}|${e}|0" value="${esc(v[0])}" aria-label="${esc(l.nome)} ${e} mínimo"></td><td><input data-db="${i}|${e}|1" value="${esc(v[1])}" aria-label="${esc(l.nome)} ${e} máximo"></td>`; }).join('')}
      <td class="d"><button class="ico" data-dbdel="${i}" title="Excluir liga" aria-label="Excluir liga"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg></button></td>
    </tr>`).join('')}</tbody>`;
}
$('#dbt').addEventListener('input', e=>{
  const k = e.target.dataset.db; if(!k) return;
  const [i, el, mm] = k.split('|'); const l = state.ligas[+i];
  if(el==='nome') l.nome = e.target.value;
  else { if(!l.lim[el]) l.lim[el]=['','']; l.lim[el][+mm] = e.target.value.trim(); }
  touch('ligas');
});
$('#dbt').addEventListener('focusout', e=>{
  const k = e.target.dataset.db; if(!k || k.endsWith('nome')) return;
  const n = fmtNum(e.target.value); if(n!==e.target.value){ e.target.value=n; e.target.dispatchEvent(new Event('input',{bubbles:true})); }
});
$('#dbt').addEventListener('click', e=>{
  const b = e.target.closest('[data-dbdel]'); if(!b) return;
  const i = +b.dataset.dbdel, l = state.ligas[i];
  ask('Excluir liga', `<p>Excluir a liga <b>${esc(l.nome||'(sem nome)')}</b> do Banco de dados?</p>`, [{t:'Cancelar'},{t:'Excluir',v:1,cls:'danger'}]).then(v=>{
    if(!v) return; state.ligas.splice(i,1); state.ligasAlteradoEm = Date.now(); flushConfig(); renderDB();
    toast(`Liga ${l.nome} excluída.`, {ms:8000, action:'Desfazer', onAction:()=>{ state.ligas.splice(Math.min(i, state.ligas.length),0,l); state.ligasAlteradoEm = Date.now(); flushConfig(); renderDB(); }});
  });
});
$('#btnAddLiga').addEventListener('click', ()=>{
  state.ligas.push({nome:'', lim:{}}); state.ligasAlteradoEm = Date.now(); flushConfig(); renderDB();
  const inp = document.querySelector(`[data-db="${state.ligas.length-1}|nome"]`); inp.scrollIntoView({block:'center'}); inp.focus();
});

/* ---------------- print / PDF ---------------- */
const PAGE_H = 296 - 2*19.05;            // mm of usable height (Excel margins 0.75")
const PX_MM = 96/25.4;
function preparePrint(list){
  const pa = $('#printArea');
  pa.innerHTML = list.map(r=>`<div class="page">${certHTML(r,false)}</div>`).join('');
  pa.querySelectorAll('.cert').forEach(t=>{
    const h = t.getBoundingClientRect().height;
    const z = Math.min(0.94, (PAGE_H*PX_MM - 4) / h);       // 94% = Excel scale; shrink further only if needed
    t.style.zoom = z.toFixed(4);
  });
  document.body.classList.add('print-certs');
  printTitle = document.title;
  document.title = list.length===1 ? `Certificado ${list[0].aba||''}`.trim() : `Certificados (${list.length})`;
}
let printTitle = null;
async function printCerts(list){
  list = list.filter(Boolean); if(!list.length) return;
  flushAll();
  preparePrint(list);
  await Promise.all([...$('#printArea').querySelectorAll('img')].map(i=>i.decode ? i.decode().catch(()=>{}) : null));
  window.print();
}
window.addEventListener('beforeprint', ()=>{
  if(document.body.classList.contains('print-certs')) return;
  if(cur && $('#v-editor').classList.contains('on')) preparePrint([cur]);
  else if(sel.size && $('#v-busca').classList.contains('on')) preparePrint(state.certs.filter(c=>sel.has(c.id)).sort(compare));
});
window.addEventListener('afterprint', ()=>{
  document.body.classList.remove('print-certs');
  $('#printArea').innerHTML = '';
  if(printTitle!==null){ document.title = printTitle; printTitle = null; }
});

/* ---------------- backup (exportar / importar) ---------------- */
$('#btnMenu').addEventListener('click', e=>{
  e.stopPropagation();
  const pop = $('#menuPop'), open = pop.classList.toggle('hidden');
  $('#btnMenu').setAttribute('aria-expanded', String(!open));
  $('#menuNote').innerHTML = `Os dados ficam no banco online e todos os usuários veem as mesmas informações. Exporte um backup de vez em quando para guardar uma cópia na rede.`;
});
document.addEventListener('click', e=>{ if(!e.target.closest('.menu')) $('#menuPop').classList.add('hidden'); });
$('#menuPop').addEventListener('click', e=>{
  const m = e.target.closest('[data-m]'); if(!m) return;
  $('#menuPop').classList.add('hidden');
  if(m.dataset.m==='export') exportBackup();
  if(m.dataset.m==='import') $('#fileImport').click();
});
function exportBackup(){
  flushAll();
  const d = new Date(), stamp = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  const data = {sistema:'certificados-prometals', exportadoEm:d.toISOString(), certs:state.certs, ligas:state.ligas, elemsDB:state.elemsDB, assinatura:state.assinatura};
  const blob = new Blob([JSON.stringify(data, null, 1)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `certificados-backup_${stamp}.json`;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  toast('Backup exportado (veja a pasta de Downloads).');
}
$('#fileImport').addEventListener('change', e=>{
  const f = e.target.files[0]; e.target.value = ''; if(!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    let o; try{ o = JSON.parse(rd.result); }catch(err){ toast('Arquivo inválido: não é um arquivo .json do sistema.', {err:true}); return; }
    const certs = Array.isArray(o && o.certs) ? o.certs.filter(c=>c && typeof c==='object') : [];
    const ligas = Array.isArray(o && o.ligas) ? o.ligas : null;
    const sig = o && typeof o.assinatura==='string' && o.assinatura.startsWith('data:image') ? o.assinatura : '';
    if(!certs.length && !ligas && !sig){ toast('Este arquivo não tem certificados, ligas nem assinatura.', {err:true}); return; }
    const noLigas = !state.ligas.length, noSig = !state.assinatura;
    const body = `<div class="fg"><div class="full">
      <p>O arquivo tem:</p>
      ${certs.length ? `<label class="chk2"><input type="checkbox" id="imC" checked> <span><b>${certs.length}</b> certificado(s): adicionar os novos e atualizar os que já existem</span></label>` : ''}
      ${ligas ? `<label class="chk2"><input type="checkbox" id="imL" ${noLigas?'checked':''}> <span><b>${ligas.length}</b> liga(s): substituir o Banco de dados${noLigas ? '' : ' atual (' + state.ligas.length + ' ligas)'}</span></label>` : ''}
      ${sig ? `<label class="chk2"><input type="checkbox" id="imS" ${noSig?'checked':''}> <span>Assinatura: usar nos certificados</span></label>` : ''}
      <div class="hint" style="margin-top:10px">Vale para todos os usuários do sistema.</div></div></div>`;
    ask('Importar arquivo', body, [{t:'Cancelar'},{t:'Importar',v:1,cls:'primary'}], {
      collect: m => ({c: !!(m.querySelector('#imC')||{}).checked, l: !!(m.querySelector('#imL')||{}).checked, s: !!(m.querySelector('#imS')||{}).checked})
    }).then(async r=>{
      if(!r) return;
      let n = 0;
      if(r.l){ state.ligas = clone(ligas); if(Array.isArray(o.elemsDB) && o.elemsDB.length) state.elemsDB = o.elemsDB.slice(); state.ligasAlteradoEm = Date.now(); flushConfig(); }
      if(r.s) saveSignature(sig);
      if(r.c){
        const byId = new Map(state.certs.map(c=>[c.id, c]));
        const list = certs.map(c=>upgradeCert(Object.assign({}, clone(c), {id: c.id || uid()})))
          .filter(c=>{ const x = byId.get(c.id); return !x || (c.alteradoEm||0) > (x.alteradoEm||0); });
        list.forEach(c=>{ if(!c.ordem) c.ordem = Date.now(); const i = state.certs.findIndex(x=>x.id===c.id); if(i>=0) state.certs[i] = c; else state.certs.push(c); });
        n = list.length;
        saveMany(list);
      }
      refreshViews(); if(cur && $('#v-editor').classList.contains('on')) renderPaper();
      toast('Importado:' + [r.c ? ` ${n} certificado(s)` : '', r.l ? ' ligas' : '', r.s ? ' assinatura' : ''].filter(Boolean).join(',') + '.', {ms:5000});
    });
  };
  rd.readAsText(f);
});

/* ---------------- assinatura (fica no banco online, não no site) ---------------- */
function loadImg(src){ return new Promise((res,rej)=>{ const i = new Image(); i.onload = ()=>res(i); i.onerror = rej; i.src = src; }); }
async function shrinkImage(url){
  const im = await loadImg(url);
  const w = Math.min(700, im.naturalWidth), h = Math.round(im.naturalHeight * w / im.naturalWidth);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); cx.drawImage(im, 0, 0, w, h);
  return cv.toDataURL('image/png');
}
function renderSig(){
  $('#sigPrev').innerHTML = state.assinatura ? `<img src="${state.assinatura}" alt="Assinatura">` : '<span>Nenhuma assinatura cadastrada</span>';
  $('#sigDel').disabled = !state.assinatura;
}
$('#sigFile').addEventListener('change', e=>{
  const f = e.target.files[0]; e.target.value = ''; if(!f) return;
  const rd = new FileReader();
  rd.onload = async () => {
    try{ const url = await shrinkImage(rd.result); saveSignature(url); renderSig(); toast('Assinatura atualizada para todos os certificados.'); }
    catch(err){ toast('Não consegui ler essa imagem. Use um arquivo PNG ou JPG.', {err:true}); }
  };
  rd.readAsDataURL(f);
});
$('#sigDel').addEventListener('click', ()=>{
  ask('Remover assinatura', '<p>Os certificados passam a sair sem a imagem da assinatura. Continuar?</p>', [{t:'Cancelar'},{t:'Remover',v:1,cls:'danger'}])
    .then(v=>{ if(v){ saveSignature(''); renderSig(); } });
});

/* ---------------- modal & toast ---------------- */
function ask(title, body, buttons, opt={}){
  return new Promise(res=>{
    const ov = document.createElement('div'); ov.className='ovl';
    ov.innerHTML = `<div class="mdl" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h2>${esc(title)}</h2><div class="mb">${body}</div><div class="mf">${buttons.map((b,i)=>`<button class="btn ${b.cls||''}" data-i="${i}">${esc(b.t)}</button>`).join('')}</div></div>`;
    document.body.appendChild(ov);
    const m = ov.querySelector('.mdl');
    const done = v => { ov.remove(); document.removeEventListener('keydown', kd, true); res(v); };
    const pick = i => { const b = buttons[i]; if(b.v && opt.validate && !opt.validate(m)) return; done(b.v ? (opt.collect ? opt.collect(m) : b.v) : null); };
    ov.addEventListener('click', e=>{ if(e.target===ov) done(null); const b=e.target.closest('[data-i]'); if(b) pick(+b.dataset.i); });
    const kd = e=>{
      if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); done(null); }
      if(e.key==='Enter' && !e.target.closest('button,select')){ e.preventDefault(); e.stopPropagation(); const k=buttons.length-1; pick(k); }
    };
    document.addEventListener('keydown', kd, true);
    if(opt.onOpen) opt.onOpen(m); else m.querySelector('.mf .btn:last-child').focus();
  });
}
function toast(msg, o={}){
  const t = document.createElement('div'); t.className = 'toast' + (o.err?' err':'');
  t.innerHTML = `<span>${esc(msg)}</span>` + (o.action ? `<button>${esc(o.action)}</button>` : '');
  $('#toasts').appendChild(t);
  const kill = () => t.remove();
  if(o.action) t.querySelector('button').addEventListener('click', ()=>{ kill(); o.onAction(); });
  setTimeout(kill, o.ms || 3200);
}

/* ---------------- global keys ---------------- */
document.addEventListener('keydown', e=>{
  const typing = e.target.closest('input,textarea,select,[contenteditable]');
  if(document.querySelector('.ovl')) return;
  if(e.key==='/' && !typing){ e.preventDefault(); if(!$('#v-busca').classList.contains('on')) go('#/'); setTimeout(()=>{ $('#q').focus(); $('#q').select(); }, 0); }
  else if(e.key==='Escape' && !typing && $('#v-editor').classList.contains('on')){ go('#/'); }
  else if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='p'){
    if($('#v-editor').classList.contains('on') && cur){ e.preventDefault(); printCerts([cur]); }
    else if($('#v-busca').classList.contains('on') && sel.size){ e.preventDefault(); printCerts(state.certs.filter(c=>sel.has(c.id)).sort(compare)); }
  }
  else if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='s'){ e.preventDefault(); flushAll(); toast('Salvo no banco online.'); }
  else if(e.altKey && (e.key==='ArrowLeft'||e.key==='ArrowRight') && $('#v-editor').classList.contains('on')){
    e.preventDefault(); const id = (e.key==='ArrowLeft' ? $('#btnPrev') : $('#btnNext')).dataset.id; if(id) openId(id);
  }
});

/* ---------------- início ---------------- */
$('#topLogo').src = 'logo.png';
function measure(){
  document.documentElement.style.setProperty('--topH', $('.top').offsetHeight + 'px');
  const t = $('.etool'); if(t.offsetHeight) document.documentElement.style.setProperty('--toolH', t.offsetHeight + 'px');
}
window.addEventListener('resize', measure);
$('#topLogo').addEventListener('load', measure);

async function boot(){
  if(!CONFIGURED){ showGate('setup'); return; }
  showGate('loading');
  try{ sb = await loadSupabase(); }
  catch(e){ console.error(e); showGate('offline', e); return; }
  sb.auth.onAuthStateChange((event, session) => {
    // fora do callback, como recomenda a biblioteca do Supabase
    setTimeout(()=>{
      if(event==='PASSWORD_RECOVERY'){ recovering = true; showGate('recovery'); return; }
      if(recovering) return;
      setUser(session ? session.user : null);
    }, 0);
  });
}
window.__app = {get state(){ return state; }, get cur(){ return cur; }, preparePrint, route, flushAll, reloadAll};
boot();
