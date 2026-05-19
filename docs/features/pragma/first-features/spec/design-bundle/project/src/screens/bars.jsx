// Pragma — Bars: kanban + list + stale-bar banner

const BAR_COLS = [
  { id: 'lead',      label: 'Pistes',     hint: 'Repérés' },
  { id: 'contacted', label: 'Contactés',  hint: 'En attente de réponse' },
  { id: 'booked',    label: 'Bookés',     hint: 'Date confirmée' },
  { id: 'played',    label: 'Joués',      hint: 'À relancer' },
  { id: 'cold',      label: 'En froid',   hint: 'Refus / pas pour nous' },
];

const isStale = (b) => {
  if (b.status === 'cold' || b.status === 'lead') return false;
  if (!b.last) return true;
  const days = (Date.now() - new Date(b.last))/86400000;
  return days > 60;
};

const BarsView = ({ bars, setBars, view, setView, members, memberStyle }) => {
  const stale = bars.filter(isStale);
  return (
    <div className="page" style={{maxWidth:'none', paddingRight:36}}>
      <div className="crumb">Réseau</div>
      <div className="ph">
        <div>
          <h1>Bars</h1>
          <div className="ph-sub">{bars.length} salles · 2 dates bookées pour septembre</div>
        </div>
        <div className="ph-actions">
          <div style={{display:'flex',gap:4,padding:3,background:'var(--bg-sunk)',borderRadius:8}}>
            <button onClick={()=>setView('kanban')}
              style={{appearance:'none',border:0,cursor:'pointer',
                background: view==='kanban' ? 'var(--bg-elev)' : 'transparent',
                color: view==='kanban' ? 'var(--ink-900)' : 'var(--ink-500)',
                font:'500 12px var(--t-ui)',padding:'5px 10px',borderRadius:6}}>
              Kanban
            </button>
            <button onClick={()=>setView('list')}
              style={{appearance:'none',border:0,cursor:'pointer',
                background: view==='list' ? 'var(--bg-elev)' : 'transparent',
                color: view==='list' ? 'var(--ink-900)' : 'var(--ink-500)',
                font:'500 12px var(--t-ui)',padding:'5px 10px',borderRadius:6}}>
              Liste
            </button>
          </div>
          <button className="btn accent"><Icon name="plus"/>Nouveau bar</button>
        </div>
      </div>

      {stale.length > 0 && (
        <div className="card" style={{
          background:'var(--warn-soft)', border:'1px solid color-mix(in oklab, var(--warn) 30%, transparent)',
          padding:'10px 14px', marginBottom:18, display:'flex',alignItems:'center',gap:10,
        }}>
          <Icon name="warn" size={16} style={{color:'var(--warn)'}}/>
          <div style={{flex:1,fontSize:12.5}}>
            <span style={{fontWeight:500}}>{stale.length} bar{stale.length>1?'s':''} sans nouvelles depuis +60 jours.</span>
            <span className="muted" style={{marginLeft:6}}>
              {stale.map(b=>b.name).join(', ')}.
            </span>
          </div>
          <button className="btn sm">Voir</button>
        </div>
      )}

      {view === 'kanban' ? (
        <BarsKanban bars={bars} setBars={setBars} memberStyle={memberStyle} members={members}/>
      ) : (
        <BarsTable bars={bars} memberStyle={memberStyle} members={members}/>
      )}
    </div>
  );
};

// ----- Kanban -----

const BarsKanban = ({ bars, setBars, members, memberStyle }) => {
  const [draggingId, setDraggingId] = React.useState(null);
  const [hoverCol, setHoverCol] = React.useState(null);

  const onDragStart = (e, id) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };
  const onDragEnd = () => { setDraggingId(null); setHoverCol(null); };
  const onDragOver = (e, col) => { e.preventDefault(); setHoverCol(col); };
  const onDrop = (e, col) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    setBars(prev => prev.map(b => b.id === id ? {...b, status: col, last: new Date().toISOString().slice(0,10)} : b));
    setDraggingId(null); setHoverCol(null);
  };

  return (
    <div style={{overflowX:'auto', margin:'0 -36px',padding:'0 36px'}}>
      <div className="kanban">
        {BAR_COLS.map(col => {
          const items = bars.filter(b => b.status === col.id);
          return (
            <div key={col.id}
              className={`kanban-col ${hoverCol===col.id?'drop-active':''}`}
              onDragOver={(e)=>onDragOver(e, col.id)}
              onDragLeave={()=>setHoverCol(null)}
              onDrop={(e)=>onDrop(e, col.id)}>
              <h3>
                {col.label}
                <span className="ct">{items.length}</span>
              </h3>
              <div style={{fontSize:10.5,color:'var(--ink-400)',marginBottom:6,marginLeft:4,letterSpacing:'0.02em'}}>
                {col.hint}
              </div>
              {items.map(b => (
                <div key={b.id} className={`kcard ${draggingId===b.id?'dragging':''}`}
                  draggable
                  onDragStart={(e)=>onDragStart(e, b.id)}
                  onDragEnd={onDragEnd}>
                  <div className="kname">{b.name}</div>
                  <div className="kmeta">
                    <span>{b.last ? fmtDateShort(b.last) : 'jamais'}</span>
                    <span style={{color:'var(--ink-300)'}}>·</span>
                    <span>{b.contact}</span>
                    {isStale(b) && <>
                      <span style={{color:'var(--ink-300)'}}>·</span>
                      <span style={{color:'var(--warn)'}}>vieux</span>
                    </>}
                  </div>
                  {b.notes && <div className="knote">{b.notes}</div>}
                </div>
              ))}
              {items.length === 0 && (
                <div style={{padding:'30px 8px',textAlign:'center',color:'var(--ink-300)',
                  fontSize:11.5,border:'1px dashed var(--line-strong)',borderRadius:8,
                  fontStyle:'italic'}}>
                  vide
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BarsTable = ({ bars, members, memberStyle }) => (
  <div className="card" style={{padding:0,overflow:'hidden'}}>
    <table className="tbl">
      <thead><tr>
        <th>Bar</th><th>Statut</th><th>Dernière interaction</th><th>Contact</th><th>Note</th><th></th>
      </tr></thead>
      <tbody>
        {bars.map(b => {
          const stale = isStale(b);
          return (
            <tr key={b.id} style={stale ? {background:'rgba(184,132,26,0.04)'}: undefined}>
              <td><span style={{fontWeight:500}}>{b.name}</span>
                {stale && <span style={{marginLeft:8,color:'var(--warn)',fontSize:11}}>● vieux</span>}
              </td>
              <td><span className="chip">{BAR_COLS.find(c=>c.id===b.status)?.label}</span></td>
              <td className="mono" style={{fontSize:12}}>{b.last ? fmtDate(b.last) : '—'}
                <span className="muted" style={{marginLeft:6,fontSize:11}}>({fmtDateRel(b.last)})</span></td>
              <td>{b.contact}</td>
              <td className="muted" style={{fontSize:12.5,maxWidth:380,
                overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.notes}</td>
              <td><Icon name="more" size={14}/></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

Object.assign(window, { BarsView });
