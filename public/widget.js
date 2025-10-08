/*
  Tumblr Privacy-First Stats Widget
  - Sends minimal event to /collect (no IP)
  - Renders small banner + top countries using /stats
  - Provides a link to clear the short-lived session cookie

  Usage in Tumblr theme HTML:
  <script defer src="https://YOUR_DOMAIN/widget.js" data-endpoint="https://YOUR_DOMAIN"></script>
*/
(function () {
  try {
    var scriptEl = document.currentScript || (function(){var s=document.getElementsByTagName('script');return s[s.length-1];})();
    var endpoint = (scriptEl && scriptEl.getAttribute('data-endpoint')) || '';
    if (!endpoint) {
      // Attempt to compute from script src
      var src = scriptEl && scriptEl.src || '';
      var m = src.match(/^(https?:\/\/[^\/]+)/i);
      endpoint = m ? m[1] : '';
    }
    if (!endpoint) return; // cannot operate

    // Opt-out flag stored locally; does not persist server-side
    var LS_KEY = 'tpga_optout';
    var isOptOut = function(){ try{ return localStorage.getItem(LS_KEY)==='1'; }catch(e){ return false; } };
    var setOptOut = function(v){ try{ localStorage.setItem(LS_KEY, v?'1':'0'); }catch(e){} };

    // Send minimal collect event
    function sendEvent(type) {
      if (isOptOut()) return;
      var payload = {
        type: type || 'view',
        page: (location.pathname + location.search).slice(0,300),
        vp: { w: window.innerWidth||0, h: window.innerHeight||0 }
      };
      try {
        fetch(endpoint + '/collect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include', // allow session cookie from service domain
          keepalive: true
        }).catch(function(){});
      } catch (e) { /* ignore */ }
    }

    // Render small banner and stats
    function el(tag, attrs, children){
      var x = document.createElement(tag);
      if (attrs) for (var k in attrs){ if(k==='style'){ for (var sk in attrs.style){ x.style[sk]=attrs.style[sk]; }} else if(k==='text'){ x.textContent = attrs.text; } else x.setAttribute(k, attrs[k]); }
      if (children) for (var i=0;i<children.length;i++){ x.appendChild(children[i]); }
      return x;
    }

    function render() {
      var root = el('div',{ id:'tpga', style:{ position:'fixed', right:'10px', bottom:'10px', background:'#111', color:'#fff', fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', fontSize:'12px', padding:'10px 12px', borderRadius:'8px', boxShadow:'0 2px 8px rgba(0,0,0,0.2)', zIndex:999999 } });
      var title = el('div',{ style:{ fontWeight:'600', marginBottom:'6px' }, text:'Estadísticas agregadas (privadas)' });
      var stats = el('div',{ id:'tpga-stats', style:{ lineHeight:'1.4', marginBottom:'6px' }, text:'Cargando…' });
      var links = el('div',{ style:{ display:'flex', gap:'8px', alignItems:'center' } });
      var aClear = el('a',{ href:'#', style:{ color:'#8bd', textDecoration:'underline' } , text:'Eliminar cookie de sesión' });
      var aOpt = el('a',{ href:'#', style:{ color:'#8bd', textDecoration:'underline' } , text: (isOptOut()? 'Activar' : 'Desactivar') + ' estadísticas' });
      aClear.addEventListener('click', function(e){ e.preventDefault(); fetch(endpoint+'/session/clear',{credentials:'include'}).then(function(){ stats.textContent='Sesión reiniciada'; setTimeout(loadStats, 700); }).catch(function(){}); });
      aOpt.addEventListener('click', function(e){ e.preventDefault(); var v = !isOptOut(); setOptOut(v); aOpt.textContent = (isOptOut()? 'Activar' : 'Desactivar') + ' estadísticas'; if(!v) sendEvent('view'); });
      links.appendChild(aClear); links.appendChild(document.createTextNode('· ')); links.appendChild(aOpt);
      var note = el('div',{ style:{ color:'#bbb', marginTop:'6px', maxWidth:'240px' }, text:'Solo contamos totales por país. No guardamos IPs ni identificadores individuales.'});
      root.appendChild(title); root.appendChild(stats); root.appendChild(links); root.appendChild(note);
      document.body.appendChild(root);

      function fmtTop(obj){
        var entries = Object.keys(obj||{}).map(function(k){return [k, obj[k]];});
        entries.sort(function(a,b){ return b[1]-a[1]; });
        return entries.slice(0,5).map(function(x){ return x[0]+': '+x[1]; }).join(', ');
      }
      function loadStats(){
        fetch(endpoint + '/stats', { credentials:'omit' })
          .then(function(r){ return r.json(); })
          .then(function(data){
            var p = data && data.periods || {};
            var d = p.day || {views:{},asks:{}};
            var w = p.week || {views:{},asks:{}};
            stats.innerHTML = ''+
              'Hoy · Visitas: ' + fmtTop(d.views) + '<br/>'+
              'Hoy · Asks: ' + fmtTop(d.asks) + '<br/>'+
              'Semana · Visitas: ' + fmtTop(w.views) + '<br/>'+
              'Semana · Asks: ' + fmtTop(w.asks);
          })
          .catch(function(){ stats.textContent='No disponible'; });
      }
      loadStats();
    }

    // Auto-detect ask form submissions (best-effort)
    function hookAsk() {
      try {
        var forms = document.getElementsByTagName('form');
        for (var i=0;i<forms.length;i++){
          var f = forms[i];
          var action = (f.getAttribute('action')||'').toLowerCase();
          if (action.indexOf('/ask') !== -1) {
            f.addEventListener('submit', function(){ sendEvent('ask'); });
          }
        }
      } catch(e){}
    }

    // Init
    if (!isOptOut()) sendEvent('view');
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function(){ render(); hookAsk(); });
    } else { render(); hookAsk(); }

  } catch (e) { /* silent */ }
})();

