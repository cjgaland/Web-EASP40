'use strict';

// ===== Config =====
const IMAGE_EXT = ['jpg','jpeg','png','webp','gif'];
const VIDEO_EXT = ['mp4','webm','mov'];
const FALLBACK  = ['foto1.jpg','foto2.jpg','foto3.jpeg'];   // por si manifest falla
const INTERVAL_MS = 3500; // 3.5 s para fotos
const BASE_PATH = 'assets/img/xx_edicion/';

// ===== Elementos del DOM =====
const viewport = document.getElementById('viewport');
const thumbs   = document.getElementById('thumbs');
const counter  = document.getElementById('counter');
const btnPrev  = document.getElementById('btnPrev');
const btnNext  = document.getElementById('btnNext');
const viewer   = document.getElementById('viewer');

// ===== Estado =====
let items = [];
let idx = 0;
let timer = null;
let currentVideo = null;

// ===== Utilidades =====
const extOf = (fn) => {
  const m = String(fn).toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
};
const isImage = (fn) => IMAGE_EXT.includes(extOf(fn));
const isVideo = (fn) => VIDEO_EXT.includes(extOf(fn));

// Tipo MIME aproximado por extensión (Safari agradece el type)
function mimeFor(fn){
  const ext = extOf(fn);
  if(ext === 'mp4')  return 'video/mp4';
  if(ext === 'webm') return 'video/webm';
  if(ext === 'mov')  return 'video/quicktime';
  return '';
}

// Intenta cargar manifest en su ruta prevista y, si falla, en raíz.
async function loadManifest(){
  const tryPaths = [`${BASE_PATH}manifest.json`, `manifest.json`];
  for(const url of tryPaths){
    try{
      const res = await fetch(url, {cache:'no-store'});
      if(res.ok){
        const txt = await res.text();
        // tolera coma final accidental
        const cleaned = txt.replace(/,\s*]/g, ']');
        const list = JSON.parse(cleaned);
        const arr = Array.from(new Set(
          list.filter(Boolean).map(s=>String(s).trim()).filter(s=>s.length>0)
        ));
        if(arr.length) return arr;
      }
    }catch(_){ /* siguiente intento */ }
  }
  return FALLBACK;
}

function clearViewport(){
  currentVideo = null;
  while(viewport.firstChild) viewport.removeChild(viewport.firstChild);
}
function updateCounter(){ counter.textContent = `${idx+1} / ${items.length}`; }

function errorBox(src){
  const d = document.createElement('div');
  d.className = 'video-error';
  d.innerHTML =
    `<p>No se puede reproducir este recurso: <strong>${src.split('/').pop()}</strong></p>` +
    '<p style="opacity:.85">Sugerencia: convertir a <strong>.mp4 (H.264 + AAC)</strong> y activar “Web Optimized”.</p>';
  return d;
}

function createImage(src){
  const img = document.createElement('img');
  img.src = src; img.alt = 'XX edición'; img.loading = 'eager';
  // fallback .jpg <-> .jpeg
  let swapped = false;
  img.onerror = ()=>{
    if(swapped){ img.replaceWith(errorBox(src)); return; }
    swapped = true;
    if(src.toLowerCase().endsWith('.jpg')) img.src = src.replace(/\.jpg$/i,'.jpeg');
    else if(src.toLowerCase().endsWith('.jpeg')) img.src = src.replace(/\.jpeg$/i,'.jpg');
    else img.replaceWith(errorBox(src));
  };
  return img;
}

function createSoundCTA(video){
  const cta = document.createElement('button');
  cta.className = 'sound-cta';
  cta.textContent = '▶ Reproducir con sonido';
  cta.addEventListener('click', ()=>{
    try { video.muted = false; video.setAttribute('muted',''); } catch(_){}
    video.play().catch(()=>{});
    cta.remove();
  });
  return cta;
}

// —— Vídeo compatible con Safari / iOS
function createVideo(src){
  const wrap = document.createElement('div');
  wrap.className = 'video-wrap';

  const video = document.createElement('video');

  // Atributos y propiedades ANTES de añadir la fuente / DOM (Safari)
  video.muted = true;                      // requisito para autoplay
  video.setAttribute('muted','');
  video.playsInline = true;
  video.setAttribute('playsinline','');
  video.setAttribute('webkit-playsinline','');

  video.autoplay = true;                   // intentamos autoplay (silencioso)
  video.controls = true;
  video.loop = false;
  video.preload = 'metadata';

  // Fuente con type explícito
  const source = document.createElement('source');
  source.src  = src;
  source.type = mimeFor(src) || 'video/mp4';
  video.appendChild(source);

  const cta = createSoundCTA(video);

  // Errores de carga / códec
  video.onerror = ()=>{
    wrap.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'video-error';
    box.innerHTML =
      '<p>No se puede reproducir este vídeo aquí.</p>' +
      `<p><a href="${src}" download>Descargar/abrir ${src.split('/').pop()}</a></p>` +
      '<p style="opacity:.8">Sugerencia: convertir a .mp4 (H.264 + AAC) y “Web Optimized”.</p>';
    wrap.appendChild(box);
  };

  // Autoplay “seguro”: si se bloquea, dejamos controles y CTA
  const tryPlay = () => {
    const p = video.play();
    if(p && typeof p.catch === 'function'){
      p.catch(()=>{/* Safari puede bloquear autoplay; el usuario puede dar play */});
    }
  };

  video.addEventListener('loadedmetadata', tryPlay);
  // Si aun así no arranca, un respaldo cuando pueda reproducir
  video.addEventListener('canplay', ()=>{
    if(video.paused) tryPlay();
  });

  // Cuando termine el vídeo → pasa al siguiente (retoma carrusel si toca)
  video.addEventListener('ended', ()=>{ next(); });

  wrap.appendChild(video);
  wrap.appendChild(cta);
  currentVideo = video;
  return wrap;
}

function highlightThumb(){
  thumbs.querySelectorAll('.thumb').forEach((t,i)=>{
    t.classList.toggle('active', i===idx);
  });
}

function pause(){ if(timer){ clearInterval(timer); timer=null; } }
function resume(){ if(!timer){ timer = setInterval(()=> next(), INTERVAL_MS); } }

function show(i){
  if(!items.length) return;
  idx = (i + items.length) % items.length;
  const src = BASE_PATH + items[idx];

  clearViewport();
  let el;

  if(isImage(src)){
    el = createImage(src);
    viewport.appendChild(el);
    updateCounter();
    highlightThumb();
    resume();  // fotos → carrusel activo
  }
  else if(isVideo(src)){
    el = createVideo(src);
    viewport.appendChild(el);
    updateCounter();
    highlightThumb();
    pause();   // vídeo → pausa carrusel hasta terminar
  }
  else{
    el = errorBox(src);
    viewport.appendChild(el);
    updateCounter();
    highlightThumb();
    resume();
  }
}

function prev(){
  if(currentVideo){ try{ currentVideo.pause(); }catch(_){ } }
  show(idx-1);
}
function next(){
  if(currentVideo){ try{ currentVideo.pause(); }catch(_){ } }
  show(idx+1);
}

// ===== Controles =====
btnPrev.addEventListener('click', prev);
btnNext.addEventListener('click', next);
document.addEventListener('keydown', (e)=>{
  if(e.key==='ArrowLeft') prev();
  if(e.key==='ArrowRight') next();
  if(e.key===' ') { e.preventDefault(); if(timer) pause(); else resume(); }
});
// Pausar autoavance solo cuando se pasa el ratón por el visor y no hay vídeo
viewer.addEventListener('mouseenter', ()=>{ if(!currentVideo) pause(); });
viewer.addEventListener('mouseleave', ()=>{ if(!currentVideo) resume(); });

// Pausar si la pestaña no está visible (ahorra recursos)
document.addEventListener('visibilitychange', ()=>{
  if(document.hidden) pause();
  else if(!currentVideo) resume();
});

// ===== Inicio =====
(async function init(){
  items = await loadManifest();
  if(items.length===0){
    viewport.innerHTML = '<p class="video-error">No hay elementos para mostrar.</p>';
    return;
  }

  // Construir miniaturas
  items.forEach((fn,i)=>{
    const t = document.createElement('button');
    t.className = 'thumb';
    t.title = fn;

    if(isImage(fn)){
      const img = document.createElement('img');
      img.src = BASE_PATH + fn;
      img.alt = 'Miniatura';
      t.appendChild(img);
    }else if(isVideo(fn)){
      const v = document.createElement('div');
      v.className = 'thumb-video';
      v.innerHTML = '▶';
      t.appendChild(v);
    }else{
      t.textContent = fn;
    }

    t.addEventListener('click', ()=> show(i));
    thumbs.appendChild(t);
  });

  show(0);
})();
