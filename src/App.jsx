import React, { useEffect, useRef, useState } from 'react';
import { Upload, Search, Loader2, X, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { Section, Card, Button } from './ui.jsx';
import IMG from './images.js';

const cls = (...xs) => xs.filter(Boolean).join(' ');

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { 'Accept': 'application/json', ...(opts.headers||{}) } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}
async function postForm(url, formData, onProgress) {
  const xhr = new XMLHttpRequest();
  const promise = new Promise((resolve, reject) => {
    xhr.open('POST', url);
    xhr.responseType = 'json';
    xhr.upload.onprogress = (evt) => {
      if (onProgress && evt.lengthComputable && evt.total > 0) onProgress(evt.loaded / evt.total);
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response);
      else reject(new Error(`${xhr.status} ${xhr.statusText}`));
    };
  });
  xhr.send(formData);
  return promise;
}
function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(state)); } catch {} }, [key, state]);
  return [state, setState];
}

function DropZone({ multiple=false, onFiles }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length) onFiles(files);
  };
  return (
    <div
      onDragOver={(e)=>{e.preventDefault(); setDragOver(true);}}
      onDragLeave={()=>setDragOver(false)}
      onDrop={onDrop}
      className={cls(
        'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all duration-200',
        dragOver ? 'scale-[1.01] border-emerald-400 shadow-[0_0_0_2px_rgba(52,211,153,.15)] bg-emerald-400/5' : 'border-neutral-700 hover:border-neutral-600'
      )}
      onClick={()=>inputRef.current?.click()}
    >
      <Upload className="w-5 h-5 text-neutral-300"/>
      <div className="text-sm text-neutral-300">Перетащите изображения сюда или нажмите для выбора</div>
      <input ref={inputRef} type="file" accept="image/*" multiple={multiple} hidden onChange={(e)=>{ const files = Array.from(e.target.files||[]); if(files.length) onFiles(files); }}/>
    </div>
  );
}

function Thumb({ src, alt, onRemove }) {
  return (
    <div className="relative">
      <img src={src} alt={alt} className="w-24 h-24 object-cover rounded-md border border-neutral-800" />
      {onRemove && (
        <button className="absolute -top-2 -right-2 bg-neutral-900 border border-neutral-800 rounded-full p-1 hover:bg-neutral-800" onClick={onRemove} title="Удалить">
          <X className="w-3 h-3"/>
        </button>
      )}
    </div>
  );
}

// Умный слот для изображений (показывает fallback, если файл не найден)
function ImgSlot({ src, alt = '', className = '', fallbackClass = 'bg-neutral-900/80', style = {} }){
  const [visible, setVisible] = useState(true);
  if (!src) return <div className={fallbackClass} style={style} aria-hidden />;
  return visible ? (
    <img src={src} alt={alt} className={className} style={style} onError={()=>setVisible(false)} />
  ) : (
    <div className={fallbackClass} style={style} aria-label={alt} />
  );
}

// Карточка результата с лёгким параллаксом по курсору
function ResultCard({ item, onOpen }){
  return (
    <motion.button
      onClick={onOpen}
      whileHover={{ scale: 1.01 }}
      onMouseMove={(e)=>{
        const r = e.currentTarget.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width/2)/r.width;
        const dy = (e.clientY - r.top - r.height/2)/r.height;
        e.currentTarget.style.transform = `translateY(${dy*2}px) rotateX(${dy*2}deg) rotateY(${dx*3}deg)`;
      }}
      onMouseLeave={(e)=>{ e.currentTarget.style.transform = 'none'; }}
      className="group text-left bg-neutral-900/70 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-700 transition shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_10px_30px_-15px_rgba(0,0,0,.5)]"
    >
      <div className="aspect-[4/3] bg-neutral-900 overflow-hidden relative">
        <img src={item.thumbUrl || '/placeholders/thumb-fallback.png'} alt={item.meta?.name||item.id}
             className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-t from-black/30 to-transparent" />
        <ImgSlot src={IMG.resultWatermark} alt="" className="absolute bottom-2 right-2 w-8 h-8 opacity-60" fallbackClass="hidden" />
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-medium text-neutral-100 truncate max-w-[70%]">
            {item.meta?.name || item.id}
          </div>
          <div className="text-xs text-neutral-400">{Number.isFinite(Number(item.score)) ? (Number(item.score) * 100).toFixed(1) : '—'}%</div>
        </div>
        <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(1, Number(item.score) || 0))*100}%` }} />
        </div>
      </div>
    </motion.button>
  );
}

async function pickDemoAsFile(url, filename='demo.svg'){
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
}

export default function App(){
  const baseUrl = import.meta.env.VITE_API_BASE ?? 'http://localhost:5000';
  const [activeTab, setActiveTab] = useLocalStorage('ui.tab', 'search');

  const [queryFile, setQueryFile] = useState(null);
  const [queryPreview, setQueryPreview] = useState(null);
  const [k, setK] = useLocalStorage('search.k', 12);
  const [threshold, setThreshold] = useLocalStorage('search.th', 0.35);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');


  const [library, setLibrary] = useState({ items: [], total: 0 });
  const [libLoading, setLibLoading] = useState(false);

  const [metrics, setMetrics] = useState(null);
  const [metLoading, setMetLoading] = useState(false);

  // анимация счётчика среднего времени ответа
  const [ms, setMs] = useState(0);

  useEffect(()=>{
    if(!queryFile) return;
    const url = URL.createObjectURL(queryFile);
    setQueryPreview(url);
    return ()=>URL.revokeObjectURL(url);
  }, [queryFile]);

  useEffect(()=>{
    const target = metrics?.responseMsAvg ?? 120;
    const t0 = performance.now();
    let raf;
    const tick = (t)=>{
      const p = Math.min(1, (t - t0)/450);
      setMs(Math.round(target * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return ()=> cancelAnimationFrame(raf);
  }, [metrics]);

  const handleSearch = async () => {
    if (!queryFile) return;
    setError(''); setLoading(true); setProgress(0); setResults([]);
    try{
      const fd = new FormData();
      fd.append('image', queryFile);
      fd.append('k', String(k));
      fd.append('threshold', String(threshold));
      const data = await postForm(`${baseUrl}/api/assets/search`, fd, (p)=>setProgress(p));
      setResults(Array.isArray(data?.topK) ? data.topK : []);
    }catch(e){ setError(e.message||'Ошибка запроса'); }
    finally{ setLoading(false); setTimeout(()=>setProgress(0), 400); }
  };


  const loadLibrary = async () => {
    setLibLoading(true);
    try{
      const data = await fetchJSON(`${baseUrl}/api/assets/list?skip=0&take=50`);
      setLibrary({ items: data.items||[], total: data.total||0 });
    }catch(e){ setError(e.message||'Ошибка загрузки библиотеки'); }
    finally{ setLibLoading(false); }
  };

  const loadMetrics = async () => {
    setMetLoading(true);
    try{ const data = await fetchJSON(`${baseUrl}/api/metrics`); setMetrics(data); }
    catch(e){ setError(e.message||'Ошибка метрик'); }
    finally{ setMetLoading(false); }
  };

  useEffect(()=>{ if(activeTab==='library') loadLibrary(); }, [activeTab]);
  useEffect(()=>{ if(activeTab==='metrics') loadMetrics(); }, [activeTab]);

  return (
    <div className="min-h-screen text-neutral-200">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-neutral-950/70 border-b border-neutral-900 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <ImgSlot src={IMG.brandLogo} alt="Brand" className="w-5 h-5" fallbackClass="w-5 h-5 rounded bg-emerald-500/30" />
          <h1 className="font-semibold tracking-tight">Asset Similarity</h1>
          <nav className="ml-6 flex gap-1 text-sm">
            {['search','library','metrics'].map(tab => (
              <button key={tab} onClick={()=>setActiveTab(tab)} className={cls('px-3 py-1.5 rounded-lg', activeTab===tab ? 'bg-neutral-800 text-neutral-50' : 'hover:bg-neutral-900')}>
                {tab==='search'?'Поиск':tab==='library'?'Библиотека':tab==='metrics'?'Метрики':''}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {}
        {activeTab==='search' && (
          <motion.div initial={{opacity:0, scale:0.98}} animate={{opacity:1, scale:1}} transition={{duration:0.35}}
            className="mb-6 rounded-2xl overflow-hidden border border-neutral-800 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_10px_30px_-15px_rgba(0,0,0,.5)]">
            <ImgSlot src={IMG.heroSearch} alt="Search hero" className="w-full h-36 md:h-44 object-cover" fallbackClass="w-full h-36 md:h-44 bg-gradient-to-r from-emerald-500/10 to-blue-500/10" />
          </motion.div>
        )}
        {activeTab==='library' && (
          <motion.div initial={{opacity:0, scale:0.98}} animate={{opacity:1, scale:1}} transition={{duration:0.35}}
            className="mb-6 rounded-2xl overflow-hidden border border-neutral-800 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_10px_30px_-15px_rgba(0,0,0,.5)]">
            <ImgSlot src={IMG.heroLibrary} alt="Library hero" className="w-full h-36 md:h-44 object-cover" fallbackClass="w-full h-36 md:h-44 bg-gradient-to-r from-fuchsia-500/10 to-emerald-500/10" />
          </motion.div>
        )}
        {activeTab==='metrics' && (
          <motion.div initial={{opacity:0, scale:0.98}} animate={{opacity:1, scale:1}} transition={{duration:0.35}}
            className="mb-6 rounded-2xl overflow-hidden border border-neutral-800 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_10px_30px_-15px_rgba(0,0,0,.5)]">
            <ImgSlot src={IMG.heroMetrics} alt="Metrics hero" className="w-full h-36 md:h-44 object-cover" fallbackClass="w-full h-36 md:h-44 bg-gradient-to-r from-amber-500/10 to-rose-500/10" />
          </motion.div>
        )}

        {activeTab==='search' && (
          <>
            <Section title="Запрос по изображению">
              {/* Лента примеров */}
              <div className="mb-4 -mt-2">
                <div className="text-xs text-neutral-400 mb-2">Примеры:</div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {[1,2,3,4,5,6].map((n)=> (
                    <motion.button key={n}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
                      onClick={async()=>{ const f = await pickDemoAsFile(`/demo/${n}.svg`, `demo-${n}.svg`); setQueryFile(f); }}
                      className="relative border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900">
                      <img src={`/demo/${n}.svg`} className="w-28 h-20 object-cover" alt={`demo ${n}`} />
                    </motion.button>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Параметры запроса" right={<div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-neutral-400">N</span>
                <input type="number" className="w-16 bg-neutral-900 border border-neutral-800 rounded-md px-2 py-1" value={k} min={1} max={50} onChange={e=>setK(parseInt(e.target.value||'1'))}/>
                <span className="text-neutral-400">Порог</span>
                <input type="number" step="0.01" className="w-20 bg-neutral-900 border border-neutral-800 rounded-md px-2 py-1" value={threshold} onChange={e=>setThreshold(parseFloat(e.target.value||'0'))}/>
              </div>
              <motion.div whileTap={{ scale: 0.98 }}>
                <Button onClick={handleSearch} disabled={!queryFile||loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4"/>} Найти похожие
                </Button>
              </motion.div>
            </div>}>
              {!queryFile ? (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                  <DropZone multiple={false} onFiles={(fs)=>setQueryFile(fs[0])} />
                </motion.div>
              ) : (
                <div className="flex items-start gap-4">
                  <Thumb src={queryPreview} alt="query" onRemove={()=>{setQueryFile(null); setResults([]);}}/>
                  <div className="flex-1">
                    <div className="text-sm text-neutral-300 mb-2">Выбрано изображение. Нажмите «Найти похожие».</div>
                    {!!progress && loading && (
                      <div className="flex items-center gap-3 text-sm text-neutral-300">
                        <div className="w-64 h-2 bg-neutral-800 rounded overflow-hidden">
                          <motion.div className="h-2 bg-emerald-500" animate={{ width: `${Math.round(progress*100)}%` }} transition={{ type:'tween', duration:0.15 }} />
                        </div>
                        {Math.round(progress*100)}%
                      </div>
                    )}
                    {error && <div className="mt-2 text-red-400 text-sm">{error}</div>}
                  </div>
                </div>
              )}
            </Section>

            <Section title="Результаты">
              {loading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {Array.from({length: 12}).map((_,i)=> (
                    <Card key={i}>
                      <div className="aspect-[4/3] bg-neutral-800/80 skeleton-shimmer" />
                      <div className="p-3">
                        <div className="h-4 w-2/3 bg-neutral-800/80 rounded mb-2 skeleton-shimmer" />
                        <div className="h-2 w-full bg-neutral-800/80 rounded skeleton-shimmer" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
              {!results.length && !loading && (
                <div className="flex items-center gap-4 text-sm text-neutral-400">
                  <ImgSlot src={IMG.emptySearch} alt="Empty search" className="w-24 h-24 object-contain" fallbackClass="w-24 h-24 rounded bg-neutral-900/60" />
                  <div>Пока нет результатов. Загрузите изображение и выполните поиск.</div>
                </div>
              )}
              {!!results.length && (
                <motion.div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"
                  initial="hidden" animate="show"
                  variants={{ hidden:{opacity:0}, show:{opacity:1, transition:{staggerChildren:0.04}} }}>
                  {results.map((it, idx)=>(
                    <motion.div key={it.id+idx} variants={{ hidden:{opacity:0, y:6}, show:{opacity:1, y:0} }}>
                      <ResultCard item={it} onOpen={()=>window.open(it.thumbUrl, '_blank')} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </Section>
          </>
        )}


        {activeTab==='library' && (
          <Section title="Библиотека">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-neutral-400">Всего: {library.total}</div>
              <button onClick={loadLibrary} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm"><RefreshCw className="w-4 h-4"/>Обновить</button>
            </div>
            {libLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2">
                {Array.from({length: 16}).map((_,i)=> <div key={i} className="aspect-square bg-neutral-800/80 rounded-xl skeleton-shimmer" />)}
              </div>
            )}
            {!libLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2">
                {library.items.map(it => (
                  <div key={it.id} className="bg-neutral-900/70 border border-neutral-800 rounded-xl overflow-hidden">
                    <div className="aspect-square">
                      <img src={it.thumbUrl} alt={it.name||it.id} className="w-full h-full object-cover"/>
                    </div>
                    <div className="p-2 text-xs truncate">{it.name||it.id}</div>
                  </div>
                ))}
              </div>
            )}
            {!libLoading && library.total === 0 && (
              <div className="flex items-center gap-4 text-sm text-neutral-400 mt-4">
                <ImgSlot src={IMG.emptyLibrary} alt="Empty library" className="w-24 h-24 object-contain" fallbackClass="w-24 h-24 rounded bg-neutral-900/60" />
                <div>Библиотека пуста.</div>
              </div>
            )}
          </Section>
        )}

        {activeTab==='metrics' && (
          <Section title="Метрики качества">
            {metLoading && <div className="text-sm text-neutral-400">Загрузка…</div>}
            {!metLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-3">
                  <div className="text-sm font-medium mb-2">Порог</div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metrics?.precisionAtK || [{k:1,value:0.88},{k:3,value:0.85},{k:5,value:0.83},{k:10,value:0.80}] }>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                        <XAxis dataKey="k" stroke="#a3a3a3"/>
                        <YAxis domain={[0,1]} stroke="#a3a3a3"/>
                        <Tooltip contentStyle={{ background:'#0a0a0a', border:'1px solid #262626' }} />
                        <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="text-sm font-medium mb-2">Время отклика (среднее)</div>
                  <div className="text-3xl font-semibold">{ms} <span className="text-sm text-neutral-400">мс</span></div>
                  <div className="mt-4 text-sm text-neutral-400">Индексировано изображений: <span className="text-neutral-200 font-medium">{metrics?.indexed ?? 5000}</span></div>
                </Card>
              </div>
            )}
          </Section>
        )}

      </main>

      <footer className="max-w-7xl mx-auto px-4 py-6 text-xs text-neutral-500">
        ⓒ Asset Similarity • React + Tailwind
      </footer>
    </div>
  );
}