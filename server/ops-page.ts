/** The operations shell contains no player data or credentials. All live data comes from authenticated endpoints. */
export function opsPage(enabled: boolean): string {
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><title>BINARY NINJA — OPERATIONS</title>
<link rel="stylesheet" href="/ops/assets/app.css"><script src="/ops/assets/app.js" defer></script></head>
<body data-enabled="${enabled}"><main class="ops">
<header class="masthead"><div><p class="eyebrow">BINARY NINJA / SERVER TELEMETRY</p><h1>OPERATIONS<span class="cursor" aria-hidden="true">_</span></h1></div>
<div class="connection"><span id="ops-status" role="status">CONNECTING</span><button id="ops-logout" class="quiet" hidden>LOCK DASHBOARD</button></div></header>
<section id="ops-auth" class="auth" aria-labelledby="auth-title">
<p class="eyebrow">RESTRICTED / READ ONLY</p><h2 id="auth-title">${enabled ? 'Open the operations console' : 'Operations access is disabled'}</h2>
<p>${enabled ? 'Observe connected operatives, accepted puzzle actions and server health.' : 'Set OBSERVABILITY_TOKEN in the server environment to enable private access.'}</p>
<form id="ops-login" ${enabled ? '' : 'hidden'}><label for="ops-token">ADMINISTRATOR CREDENTIAL</label>
<input id="ops-token" type="password" autocomplete="current-password" maxlength="512" required spellcheck="false">
<button id="ops-login-button" type="submit">OPEN OPERATIONS <span aria-hidden="true">→</span></button></form>
<p id="ops-auth-error" role="alert"></p><p class="fine">Private session · no gameplay controls · credentials never stored in this page</p></section>
<div id="ops-dashboard" hidden>
<div class="overview-line"><p>LIVE SERVER OVERVIEW</p><p id="ops-window">Recent window: 60 seconds · totals since startup</p></div>
<section class="metrics" aria-label="Server statistics">
${[
        ['connectedPlayers', 'PLAYERS ONLINE', 'current connections'],
        ['activeParties', 'ACTIVE PARTIES', 'currently connected'],
        ['activeChambers', 'ACTIVE CHAMBERS', 'currently playing'],
        ['recentAcceptedActions', 'GAMEPLAY ACTIONS', 'accepted · last 60 sec'],
        ['completedChambers', 'COMPLETIONS', 'total since startup'],
        ['recentErrors', 'ERRORS', 'last 60 sec'],
        ['uptimeSeconds', 'SERVER UPTIME', 'since this process started'],
        ['actionLatency', 'ACTION LATENCY', 'p95 · recent sample · ms'],
    ].map(([key, label, caption]) => `<article class="metric"><h2>${label}</h2><strong data-metric="${key}">—</strong><p>${caption}</p></article>`).join('')}
</section>
<div class="panels">
<section class="panel sessions-panel" aria-labelledby="sessions-title"><div class="section-heading"><div><p class="eyebrow">CURRENT SESSIONS</p><h2 id="sessions-title">Active chambers</h2></div><span id="ops-session-count" class="badge">0 PARTIES</span></div>
<div id="ops-sessions" class="sessions"><p class="empty">Waiting for connected players.</p></div></section>
<section class="panel feed-panel" aria-labelledby="feed-title"><div class="section-heading"><div><p class="eyebrow">ACCEPTED TRANSITIONS + SERVER HEALTH</p><h2 id="feed-title">Live activity</h2></div><span id="ops-event-count" class="badge">0 EVENTS</span></div>
<div class="filters"><label>SEVERITY<select id="ops-severity"><option value="all">All activity</option><option value="info">Info</option><option value="warn">Warnings</option><option value="error">Errors</option></select></label>
<label>CHAMBER<select id="ops-chamber"><option value="all">All chambers</option></select></label><button id="ops-pause" class="quiet" aria-pressed="false">PAUSE FEED</button></div>
<p id="ops-feed-status" class="fine">Newest first · bounded history · no movement packets</p>
<ol id="ops-events" class="events" aria-label="Recent server activity"></ol></section>
</div>
<footer><p id="ops-server-start">Server start —</p><p id="ops-health">Waiting for server health.</p><p>History resets on server restart. Fly.io retains stdout logs separately.</p></footer>
</div></main></body></html>`;
}

export const opsStyles = `
:root{font-family:ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace;color:#e5f4f0;background:#090f15;font-synthesis:none;--accent:#64e6d5;--muted:#91a6ae;--border:#284049}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 0 0,#12312f55,transparent 48%),#090f15;min-height:100vh}button,input,select{font:inherit}button,select{cursor:pointer}button{color:#081c1a;background:var(--accent);border:1px solid var(--accent);padding:12px 18px;font-weight:700;font-size:12px;letter-spacing:.07em}button:hover{filter:brightness(1.15)}button:disabled{opacity:.55;cursor:wait}button.quiet{color:#b9d0d5;background:#101b23;border-color:var(--border);padding:9px 12px;font-size:10px}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--accent);outline-offset:4px}[hidden]{display:none!important}.ops{max-width:1560px;margin:auto;padding:32px 42px}.masthead{display:flex;align-items:center;justify-content:space-between;gap:24px;border-bottom:1px solid var(--border);padding-bottom:25px}.eyebrow{color:var(--accent);letter-spacing:.16em;font-size:10px;margin:0 0 10px;line-height:1.5}h1{font-size:clamp(28px,4vw,42px);letter-spacing:.06em;margin:0;line-height:1.1}.cursor{color:var(--accent)}.connection{display:flex;align-items:center;gap:18px}#ops-status{font-size:11px;letter-spacing:.1em;color:var(--muted)}#ops-status[data-state=live]{color:var(--accent)}#ops-status[data-state=live]:before{content:"";display:inline-block;width:7px;height:7px;background:var(--accent);border-radius:50%;margin-right:8px;box-shadow:0 0 12px #64e6d570}#ops-status[data-state=error]{color:#ffac55}.auth{max-width:540px;margin:11vh auto;padding:36px;border:1px solid var(--border);background:#0d1921;box-shadow:0 12px 60px #0003}.auth h2{font-size:21px;line-height:1.5;margin:8px 0 14px}.auth p:not(.eyebrow){font-size:12px;line-height:1.8;color:var(--muted)}#ops-login{display:flex;flex-direction:column;gap:12px;margin-top:26px}label{font-size:10px;letter-spacing:.09em;color:var(--muted)}input,select{color:#e5f4f0;border:1px solid #35515c;background:#081119;padding:12px}input{width:100%}#ops-auth-error{color:#ffac55}.fine{font-size:10px!important;color:var(--muted);line-height:1.6}.overview-line{display:flex;justify-content:space-between;color:var(--muted);font-size:10px;letter-spacing:.07em;margin-top:22px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--border);border-left:1px solid var(--border)}.metric{padding:20px 22px;border-right:1px solid var(--border);border-bottom:1px solid var(--border);background:#0d1921c0}.metric h2{font-size:10px;font-weight:500;letter-spacing:.1em;color:#b8cbd1;margin:0 0 12px}.metric strong{font-size:32px;font-weight:500;line-height:1.2;color:var(--accent);font-variant-numeric:tabular-nums}.metric p{font-size:10px;color:var(--muted);margin:10px 0 0}.panels{display:grid;grid-template-columns:minmax(300px,1fr) minmax(0,1.75fr);gap:24px;margin-top:24px;align-items:start}.panel{border:1px solid var(--border);background:#0c1720}.section-heading{padding:21px 22px;display:flex;align-items:center;justify-content:space-between;gap:15px;border-bottom:1px solid var(--border)}.section-heading h2{font-size:19px;font-weight:500;letter-spacing:.02em;margin:0}.section-heading .eyebrow{font-size:9px}.badge{font-size:9px;white-space:nowrap;color:#b0c6cc;border:1px solid var(--border);padding:6px 8px;letter-spacing:.05em}.sessions{padding:0 22px;max-height:750px;overflow:auto}.session{padding:22px 0;border-bottom:1px solid #20333d}.session:last-child{border:0}.session-heading{display:flex;gap:12px;justify-content:space-between;align-items:center}.session h3{font-size:14px;letter-spacing:.04em;margin:0;color:#f1faf7;line-height:1.5}.session-ref{font-size:10px;line-height:1.6;color:#8fa9b6;margin:7px 0 12px}.status{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:var(--accent);background:#64e6d512;border:1px solid #64e6d535;padding:5px 6px}.status[data-status=completed]{color:#ffe078;border-color:#ffe07855;background:#ffe07810}.players{list-style:none;padding:0;margin:0}.player{display:flex;align-items:center;gap:8px;font-size:12px;margin:9px 0}.player-slot{color:#7f9ca9;font-size:10px}.player-name{font-weight:500;overflow-wrap:anywhere}.player-state{margin-left:auto;font-size:9px;color:#8ca7b2}.swatch{width:8px;height:8px;border-radius:2px;flex:none;background:#64e6d5}.swatch[data-colour=purple]{background:#b59bff}.swatch[data-colour=blue]{background:#55aaff}.swatch[data-colour=pink]{background:#ff70cb}.swatch[data-colour=orange]{background:#ffac55}.swatch[data-colour=lime]{background:#a4f76a}.swatch[data-colour=red]{background:#ff647d}.swatch[data-colour=yellow]{background:#ffe078}.progress{border-left:2px solid #315c61;margin:14px 0 0;padding:0 0 0 10px;color:#aec4cb;font-size:10px;line-height:1.8;list-style:none}.filters{display:flex;align-items:end;gap:12px;padding:16px 22px 0}.filters label{display:flex;flex-direction:column;gap:7px;flex:1}.filters select{width:100%;padding:8px;font-size:11px;min-width:100px}.filters .quiet{padding:10px 9px}#ops-feed-status{margin:12px 22px}.events{list-style:none;padding:0 22px;margin:0;max-height:690px;overflow:auto;overscroll-behavior:contain}.event{display:grid;grid-template-columns:68px 1fr;gap:12px;padding:15px 0;border-top:1px solid #20333d}.event time{color:#7e9eaa;font-size:10px;padding-top:2px;font-variant-numeric:tabular-nums}.event-message{font-size:12px;color:#d2e5e8;line-height:1.7;margin:0;overflow-wrap:anywhere}.event-context{font-size:9px;letter-spacing:.03em;color:#779ba9;margin:6px 0 0;line-height:1.6}.event[data-level=warn] .event-message{color:#ffcc88}.event[data-level=error] .event-message{color:#ff93a4}.event[data-event=chamber_completed] .event-message{color:var(--accent);font-weight:700}.empty{font-size:12px;color:var(--muted);line-height:1.8;padding:28px 0}footer{display:flex;flex-wrap:wrap;gap:6px 25px;border-top:1px solid var(--border);margin-top:24px;padding:12px 0;font-size:9px;color:#7795a2;line-height:1.7}footer p{margin:0}@media(min-width:1400px){.metrics{grid-template-columns:repeat(8,1fr)}.metric{padding:20px 16px}.metric strong{font-size:28px}}@media(max-width:900px){.ops{padding:24px}.panels{grid-template-columns:1fr}.sessions{max-height:500px}.overview-line{flex-wrap:wrap}.events{max-height:620px}}@media(max-width:540px){.ops{padding:18px 12px}.masthead{align-items:start;gap:10px}.connection{align-items:end;flex-direction:column;gap:12px}.masthead .eyebrow{font-size:8px}h1{font-size:27px}.metrics{grid-template-columns:repeat(2,1fr)}.metric{padding:16px}.metric strong{font-size:28px}.auth{padding:24px;margin-top:50px}.section-heading{padding:18px 14px}.sessions{padding:0 14px}.filters{padding:14px 14px 0;gap:8px;flex-wrap:wrap}.filters label{min-width:110px}#ops-feed-status{margin-left:14px}.events{padding:0 14px}.event{grid-template-columns:58px 1fr;gap:8px}}
`;

export const opsScript = String.raw`
(() => {
  const $ = id => document.getElementById(id);
  const auth = $('ops-auth'), dashboard = $('ops-dashboard'), status = $('ops-status');
  let source = null, snapshot = null, paused = false, checking = false, clock = null, receivedAt = 0;
  const chamberNames = {handshake:'HANDSHAKE',deadlock:'DEADLOCK','crossfeed-vault':'CROSSFEED VAULT','race-condition':'RACE CONDITION','use-after-free':'USE AFTER FREE',pressure:'PRESSURE',switch:'SWITCH',relay:'RELAY',uplink:'CONTROL SPINE'};
  const chamberName = id => chamberNames[id] || String(id || 'PARTY LOBBY').replaceAll('-', ' ').toUpperCase();
  const text = (tag, value, className) => { const el=document.createElement(tag); el.textContent=String(value); if(className)el.className=className; return el; };
  const duration = seconds => { seconds=Math.max(0,Math.floor(seconds)); return seconds>=86400?Math.floor(seconds/86400)+'d '+Math.floor(seconds%86400/3600)+'h':seconds>=3600?Math.floor(seconds/3600)+'h '+Math.floor(seconds%3600/60)+'m':Math.floor(seconds/60)+'m '+seconds%60+'s'; };
  function connection(label, state) { status.textContent=label; status.dataset.state=state; }
  function lock(message) {
    if(source)source.close(); source=null; if(clock)clearInterval(clock); clock=null;
    snapshot=null; dashboard.hidden=true; auth.hidden=false; $('ops-logout').hidden=true;
    $('ops-auth-error').textContent=message||''; connection('LOCKED','locked');
    $('ops-sessions').replaceChildren(); $('ops-events').replaceChildren();
  }
  function actor(e) { return e.player ? e.player+(e.playerSlot?' [P'+e.playerSlot+']':'') : e.playerSlot?'P'+e.playerSlot: 'Server'; }
  function label(e, key) { return String(e[key+'Name']||e[key+'Id']||e[key]||key); }
  function describe(e) {
    const who=actor(e), control=label(e,'control'), cube=label(e,'cube'), receiver=label(e,'receiver');
    switch(e.event) {
      case 'server_started': return 'Server online. Operations history begins.';
      case 'server_stopping': case 'server_shutdown': return 'Server shutting down gracefully.';
      case 'player_connected': return who+' connected';
      case 'player_disconnected': return who+' disconnected';
      case 'player_reconnected': return who+' reconnected';
      case 'party_created': return who+' created a party';
      case 'player_joined_party': return who+' joined the party';
      case 'chamber_selected': return who+' selected '+chamberName(e.chamber);
      case 'chamber_started': return chamberName(e.chamber)+' started';
      case 'chamber_completed': return chamberName(e.chamber)+' COMPLETED';
      case 'player_reached_exit': return who+' reached the exit';
      case 'character_created': return who+' initialized their character';
      case 'character_updated': return who+' updated their character'+(e.colour?' · '+e.colour.toUpperCase():'');
      case 'control_activated': return who+' activated '+control;
      case 'control_toggled': return who+' toggled '+control+(typeof e.enabled==='boolean'?' '+(e.enabled?'ON':'OFF'):'');
      case 'pressure_plate_activated': return control+' activated'+(e.player?' by '+who:'');
      case 'pressure_plate_released': return control+' released'+(e.player?' by '+who:'');
      case 'sensor_activated': return control+' activated'+(e.player?' by '+who:'');
      case 'sensor_released': return control+' released'+(e.player?' by '+who:'');
      case 'cube_picked_up': return who+' picked up '+cube;
      case 'cube_dropped': return who+' dropped '+cube;
      case 'payload_docked': return cube+' accepted at '+receiver;
      case 'cube_placed': return cube+' placed on '+receiver;
      case 'payload_removed': case 'cube_removed': return cube+' removed from '+receiver;
      case 'checkpoint_activated': return who+' activated '+label(e,'checkpoint');
      case 'relay_power_changed': case 'lift_power_changed': return label(e,'output')+' powered '+(e.enabled?'ON':'OFF');
      case 'controller_output_changed': return label(e,'output')+' '+(e.enabled?'ON':'OFF');
      case 'buffer_phase_changed': case 'platform_phase_changed': return control+' changed to '+String(e.phase||'unknown');
      case 'exit_unlocked': return 'Exit unlocked';
      case 'exit_locked': return 'Exit locked';
      case 'player_reset': return who+' reset';
      case 'cube_reset': return cube+' reset'+(e.player?' by '+who:'');
      case 'action_slow': return 'Slow action processing'+(e.totalMs?' · '+Math.round(e.totalMs)+' ms':'');
      case 'multiplayer_queue_slow': return 'Multiplayer queue delayed · '+Math.round(e.queueMs||0)+' ms';
      case 'persistence_slow': return 'Slow persistence'+(e.operation?' · '+String(e.operation).replaceAll('_',' '):'')+' · '+Math.round(e.persistMs||e.elapsedMs||0)+' ms';
      case 'persistence_failed': case 'room_persistence_failed': return 'Persistence failed'+(e.operation?' · '+String(e.operation).replaceAll('_',' '):'');
      case 'rate_limited': case 'rate_limit_reached': return 'Rate limit reached'+(e.operation?' · '+String(e.operation).replaceAll('_',' '):'')+(e.player?' · '+who:'');
      case 'room_operation_rejected': return 'Room operation rejected'+(e.code?' · '+e.code:'')+(e.player?' · '+who:'');
      case 'room_expired': return 'Temporary custom room expired';
      case 'request_failed': return 'Server request failed';
      case 'multiplayer_operation_failed': return 'Multiplayer operation failed'+(e.operation?' · '+String(e.operation).replaceAll('_',' '):'');
      default: return String(e.event).replaceAll('_',' ')+(e.player?' · '+who:'');
    }
  }
  function renderSessions() {
    const rows=(snapshot.sessions||[]).filter(session=>session.players.some(player=>player.connected)), fragment=document.createDocumentFragment();
    $('ops-session-count').textContent=rows.length+' '+(rows.length===1?'PARTY':'PARTIES');
    for(const session of rows) {
      const card=text('article','','session'); card.dataset.session=session.sessionRef;
      const heading=text('div','','session-heading'); heading.append(text('h3',chamberName(session.chamber)));
      const state=text('span',session.status,'status'); state.dataset.status=session.status; heading.append(state); card.append(heading);
      const online=session.players.filter(p=>p.connected).length;
      card.append(text('p',session.sessionRef+' / '+online+' online','session-ref'));
      const players=text('ul','','players');
      for(const p of session.players) {
        const row=text('li','','player'), swatch=text('span','','swatch'); swatch.dataset.colour=p.colour||'cyan'; swatch.setAttribute('aria-label',p.colour||'cyan');
        row.append(swatch,text('span','P'+p.slot,'player-slot'),text('span',p.name,'player-name'),text('span',p.connected?'CONNECTED':'OFFLINE','player-state')); players.append(row);
      }
      card.append(players);
      if(session.progress&&session.progress.length) {const progress=text('ul','','progress'); for(const item of session.progress.slice(-4))progress.append(text('li',item)); card.append(progress);}
      fragment.append(card);
    }
    if(!rows.length)fragment.append(text('p','No active parties. Join activity will appear here automatically.','empty'));
    $('ops-sessions').replaceChildren(fragment);
  }
  function renderEvents() {
    if(paused||!snapshot)return;
    const severity=$('ops-severity').value, chamber=$('ops-chamber').value;
    const events=snapshot.events.filter(e=>(severity==='all'||e.level===severity)&&(chamber==='all'||e.chamber===chamber)).slice().reverse();
    const fragment=document.createDocumentFragment();
    $('ops-event-count').textContent=events.length+' EVENTS';
    for(const event of events) {
      const row=text('li','','event'); row.dataset.event=event.event; row.dataset.level=event.level; row.dataset.id=String(event.id);
      const time=text('time',new Date(event.timestamp).toLocaleTimeString([], {hour12:false})); time.dateTime=event.timestamp;
      const details=text('div','');details.append(text('p',describe(event),'event-message'));
      const context=[event.sessionRef,event.chamber?chamberName(event.chamber):null,event.actor==='reporting_player'?'reporter '+actor(event):event.playerSlot?'P'+event.playerSlot:null,event.event].filter(Boolean).join(' / ');
      details.append(text('p',context,'event-context'));row.append(time,details);fragment.append(row);
    }
    if(!events.length)fragment.append(text('li','No matching activity yet.','empty'));
    $('ops-events').replaceChildren(fragment);
  }
  function updateUptime() { if(snapshot)document.querySelector('[data-metric="uptimeSeconds"]').textContent=duration(snapshot.uptimeSeconds+(Date.now()-receivedAt)/1000); }
  function render(value) {
    snapshot=value;receivedAt=Date.now();
    for(const key of ['connectedPlayers','activeParties','activeChambers','recentAcceptedActions','completedChambers','recentErrors'])document.querySelector('[data-metric="'+key+'"]').textContent=String(value.metrics[key]);
    document.querySelector('[data-metric="actionLatency"]').textContent=value.metrics.actionLatencyMs.count?String(Math.round(value.metrics.actionLatencyMs.p95)):'—';
    updateUptime();
    $('ops-server-start').textContent='PROCESS START / '+new Date(value.startedAt).toLocaleString();
    const m=value.metrics;
    $('ops-health').textContent=m.acceptedActions+' accepted · '+m.failedActions+' rejected/failed · persistence p95 '+(m.persistenceLatencyMs.count?Math.round(m.persistenceLatencyMs.p95)+' ms':'—')+' · '+m.suppressedWarnings+' repeated warnings suppressed'+(m.suppressedEvents?' · '+m.suppressedEvents+' flood events suppressed':'')+(m.droppedLogs?' · '+m.droppedLogs+' stdout records dropped':'');
    const chamber=$('ops-chamber'), selected=chamber.value, ids=new Set(value.events.map(e=>e.chamber).filter(Boolean));
    for(const session of value.sessions)if(session.chamber)ids.add(session.chamber);
    const options=[new Option('All chambers','all'),...Array.from(ids).sort().map(id=>new Option(chamberName(id),id))];
    chamber.replaceChildren(...options);chamber.value=ids.has(selected)?selected:'all';
    renderSessions();renderEvents();
  }
  function connect() {
    if(source)source.close();
    source=new EventSource('/api/ops/events');
    source.addEventListener('snapshot', event => {
      try {const value=JSON.parse(event.data);render(value);connection('LIVE','live');}
      catch {connection('INVALID UPDATE · RETRYING','error');}
    });
    source.onopen=()=>connection('LIVE','live');
    source.onerror=async()=> {
      connection('RECONNECTING','error');
      if(checking)return;checking=true;
      try {
        const response=await fetch('/api/ops/snapshot',{cache:'no-store'});
        if(response.status===401||response.status===503)lock(response.status===401?'Your session expired. Sign in again.':'Operations access is unavailable.');
      } catch { /* EventSource retries without adding a second stream. */ }
      finally {checking=false;}
    };
    if(!clock)clock=setInterval(updateUptime,1000);
  }
  async function open() {
    const response=await fetch('/api/ops/snapshot',{cache:'no-store'});
    if(response.status===401){lock();return;}
    if(!response.ok)throw new Error('Operations are unavailable. Retry shortly.');
    render(await response.json());auth.hidden=true;dashboard.hidden=false;$('ops-logout').hidden=false;connection('CONNECTING','connecting');connect();
  }
  $('ops-login').addEventListener('submit',async event=>{
    event.preventDefault(); const input=$('ops-token'), button=$('ops-login-button');
    const token=input.value; input.value=''; button.disabled=true; $('ops-auth-error').textContent='';
    try {
      const response=await fetch('/api/ops/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
      if(!response.ok) {const body=await response.json();throw new Error(body.error||'Unable to sign in.');}
      await open();
    } catch(error) {lock(error.message||'Unable to connect. Retry shortly.');}
    finally {button.disabled=false;}
  });
  $('ops-logout').addEventListener('click',async()=>{
    try {const response=await fetch('/api/ops/session',{method:'DELETE'});if(!response.ok&&response.status!==401)throw new Error();lock();}
    catch {connection('LOCK FAILED · RETRY','error');}
  });
  for(const id of ['ops-severity','ops-chamber'])$(id).addEventListener('change',renderEvents);
  $('ops-pause').addEventListener('click',()=>{
    paused=!paused;$('ops-pause').textContent=paused?'RESUME FEED':'PAUSE FEED';$('ops-pause').setAttribute('aria-pressed',String(paused));
    $('ops-feed-status').textContent=paused?'Feed paused · live metrics continue':'Newest first · bounded history · no movement packets';if(!paused)renderEvents();
  });
  window.addEventListener('pagehide',()=>{if(source)source.close();if(clock)clearInterval(clock);});
  window.addEventListener('pageshow',event=>{if(event.persisted&&snapshot)connect();});
  if(document.body.dataset.enabled==='true')open().catch(error=>lock(error.message));
  else connection('DISABLED','locked');
})();
`;
