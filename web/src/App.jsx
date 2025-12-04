import { useEffect, useRef, useState } from "react";
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const WS_PATH  = import.meta.env.VITE_WS_PATH  || "/ws/heat";

export default function App() {
  const canvasRef = useRef(null);
  const [n,setN] = useState(0);

  useEffect(() => {
    const ws = new WebSocket(API_BASE.replace("http","ws") + WS_PATH);
    ws.onmessage = (e) => {
      const d = JSON.parse(e.data);
      setN(d.n);
      const cvs = canvasRef.current; if(!cvs) return;
      const ctx = cvs.getContext("2d");
      const size = Math.min(cvs.width,cvs.height);
      const cell = Math.floor(size/d.n);
      ctx.clearRect(0,0,cvs.width,cvs.height);
      for (let y=0;y<d.n;y++) for (let x=0;x<d.n;x++) {
        const v = Math.max(0, Math.min(1, d.grid[y*d.n + x] || 0));
        const val = Math.floor(255 * v);
        ctx.fillStyle = `rgb(${val}, ${Math.floor(val*0.6)}, 32)`;
        ctx.fillRect(x*cell, y*cell, cell-1, cell-1);
      }
    };
    return () => ws.close();
  }, []);

  return (
    <div style={{padding:16,color:'#ddd',background:'#111',minHeight:'100vh'}}>
      <h1 style={{margin:'8px 0'}}>Heat Monitor</h1>
      <div style={{fontSize:12, marginBottom:8}}>Grid: {n}x{n}</div>
      <canvas ref={canvasRef} width={640} height={640}
              style={{background:'#000', border:'1px solid #333'}} />
    </div>
  );
}
