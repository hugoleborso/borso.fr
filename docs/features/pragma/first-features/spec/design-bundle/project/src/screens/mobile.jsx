// Pragma — Mobile screens (catalog, setlist, sessions, bars)
// These render inside an iOS frame. Same data, mobile-first layout.

const MobileCatalog = ({ songs, members, instruments, defaultLineup, memberStyle, onOpen }) => {
  const [q, setQ] = React.useState('');
  const filtered = songs.filter(s =>
    s.title.toLowerCase().includes(q.toLowerCase()) || s.artist.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="mob">
      <div className="mob-head" style={{flexDirection:'column',alignItems:'stretch',gap:10,paddingBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <h1 style={{flex:1}}>Catalogue</h1>
          <button className="btn ghost sm" style={{padding:6}}><Icon name="filter" size={16}/></button>
          <button className="btn accent sm" style={{padding:'6px 10px'}}><Icon name="plus" size={14}/></button>
        </div>
        <div style={{position:'relative'}}>
          <div style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--ink-400)'}}>
            <Icon name="search" size={14}/></div>
          <input className="input" placeholder="Chercher..." value={q} onChange={e=>setQ(e.target.value)}
            style={{paddingLeft:32,fontSize:13}}/>
        </div>
      </div>
      <div className="mob-body">
        <div style={{padding:12,display:'flex',flexDirection:'column',gap:8}}>
          {filtered.map(s => (
            <div key={s.id} className="song-card" style={{padding:12,cursor:'default'}}
              onClick={()=>onOpen(s.id)}>
              <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div className="ttl" style={{fontSize:19,whiteSpace:'nowrap',
                    overflow:'hidden',textOverflow:'ellipsis'}}>{s.title}</div>
                  <div className="meta" style={{marginTop:2}}>
                    <span>{s.artist}</span>
                    <span style={{color:'var(--ink-300)'}}>·</span>
                    <span className="mono" style={{fontSize:10}}>{s.tonalityStart}</span>
                  </div>
                  <div className="lineup" style={{marginTop:8}}>
                    <Lineup lineup={defaultLineup[s.id]} members={members}
                      instruments={instruments} style={memberStyle} bare/>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}>
                  <StatusChip status={s.status}/>
                  <div style={{color:'var(--ink-400)'}}>
                    {s.chartKind === 'chordpro' && <Icon name="text" size={14}/>}
                    {s.chartKind === 'pdf'      && <Icon name="pdf"  size={14}/>}
                    {s.chartKind === 'image'    && <Icon name="image" size={14}/>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MobileSongDetail = ({ song, members, instruments, lineup, memberStyle, onBack, onPerf }) => (
  <div className="mob">
    <div className="mob-head" style={{flexDirection:'column',alignItems:'stretch'}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <button className="btn ghost sm" style={{padding:6}} onClick={onBack}>
          <Icon name="chevL" size={16}/></button>
        <span className="crumb" style={{marginBottom:0,flex:1}}>{song.artist}</span>
        <button className="btn ghost sm" style={{padding:6}}><Icon name="more" size={16}/></button>
      </div>
      <h1 style={{fontSize:30,paddingTop:6}}>{song.title}</h1>
      <div style={{display:'flex',gap:8,alignItems:'center',paddingBottom:6,flexWrap:'wrap'}}>
        <StatusChip status={song.status}/>
        <span className="tag-mono">{song.tonalityStart}</span>
        <Lineup lineup={lineup} members={members} instruments={instruments} style={memberStyle} bare/>
      </div>
    </div>
    <div className="mob-body" style={{padding:'14px 14px 80px'}}>
      <button className="btn accent" style={{width:'100%',justifyContent:'center',padding:12,marginBottom:14}}
        onClick={onPerf}>
        <Icon name="play" size={14}/>Mode scène
      </button>

      <div style={{fontSize:11,letterSpacing:'0.14em',textTransform:'uppercase',
        color:'var(--ink-400)',margin:'6px 4px 8px',fontWeight:600}}>Grille d'accords</div>
      <pre className="chord-pre" style={{margin:0,fontSize:12.5,padding:14}}
        dangerouslySetInnerHTML={{__html:
          CHORDPRO_SAMPLE.split('\n').slice(0, 10).join('\n').replace(/\[([^\]]+)\]/g, '<span class="ch">[$1]</span>')
        }}/>
      <div style={{textAlign:'center',padding:'8px 0',color:'var(--ink-400)',fontSize:11}}>
        Touchez pour voir tout en plein écran
      </div>

      <div style={{fontSize:11,letterSpacing:'0.14em',textTransform:'uppercase',
        color:'var(--ink-400)',margin:'18px 4px 8px',fontWeight:600}}>Lineup</div>
      <div className="card" style={{padding:12}}>
        {Object.entries(lineup).map(([mid, iid], i, arr) => {
          const m = members.find(x=>x.id===mid);
          const inst = instruments.find(x=>x.id===iid);
          return (
            <div key={mid} style={{display:'flex',alignItems:'center',gap:10,
              padding:'8px 0',borderBottom: i<arr.length-1?'1px dashed var(--line)':'none'}}>
              <MemberChip member={m} style={memberStyle} bare members={members}/>
              <span style={{fontSize:13,flex:1}}>{m.name}</span>
              <span className="tag-mono">{inst?.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

// ---- Mobile setlist (3 drag patterns) ----

const MobileSetlist = ({
  songs, members, instruments, defaultLineup, memberStyle,
  initialSetlist, badTransitions, mobileDragMode='handle', energyViz='sparkline',
}) => {
  const [entries, setEntries] = React.useState(initialSetlist);
  const [grabbing, setGrabbing] = React.useState(null); // id when in long-press grab state
  const [collapsed, setCollapsed] = React.useState({});

  const onReorder = (from, to) => {
    setEntries(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  // shared pointer drag
  const stateRef = React.useRef({});
  const onDragStart = (id, idx, e, useLongPress) => {
    if (e.target.closest('.no-drag, input, button')) return;
    const start = () => {
      stateRef.current = { id, idx };
      setGrabbing(id);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp, { once: true });
    };
    if (useLongPress) {
      const t = setTimeout(start, 320);
      const cancel = () => { clearTimeout(t); window.removeEventListener('pointerup', cancel);
        window.removeEventListener('pointermove', cancel); };
      window.addEventListener('pointerup', cancel, { once:true });
      window.addEventListener('pointermove', cancel, { once:true });
    } else { start(); }
  };
  const onMove = (e) => {
    const els = document.querySelectorAll('[data-msl]');
    let bestIdx = stateRef.current.idx, bestDist = Infinity;
    els.forEach(el => {
      const r = el.getBoundingClientRect();
      const d = Math.abs((r.top+r.height/2) - e.clientY);
      if (d < bestDist) { bestDist = d; bestIdx = parseInt(el.dataset.msl); }
    });
    stateRef.current.over = bestIdx;
  };
  const onUp = () => {
    const { idx, over } = stateRef.current;
    if (over != null && over !== idx) onReorder(idx, over);
    setGrabbing(null);
    window.removeEventListener('pointermove', onMove);
  };

  const onEnergyChange = (idx, val) => {
    setEntries(prev => prev.map((e,i) => i===idx ? {...e, energy: val} : e));
  };

  const warnings = [];
  for (let i = 0; i < entries.length - 1; i++) {
    const k = `${entries[i].song}>${entries[i+1].song}`;
    if (badTransitions[k]) warnings.push({ idx: i, ...badTransitions[k] });
  }
  const values = entries.map(e => e.energy);

  return (
    <div className="mob">
      <div className="mob-head" style={{flexDirection:'column',alignItems:'stretch'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button className="btn ghost sm" style={{padding:6}}><Icon name="chevL" size={16}/></button>
          <span className="crumb" style={{marginBottom:0,flex:1}}>Concert · 13 sept.</span>
          <button className="btn ghost sm" style={{padding:6}}><Icon name="more" size={16}/></button>
        </div>
        <h1 style={{fontSize:26,paddingTop:6}}>Les Disquaires</h1>
        <div style={{display:'flex',gap:8,alignItems:'center',paddingBottom:8,fontSize:11,color:'var(--ink-500)'}}>
          <span>{entries.length} titres</span>
          <span style={{color:'var(--ink-300)'}}>·</span>
          <span>≈ {Math.round(entries.length*3.4)} min</span>
          {warnings.length>0 && <>
            <span style={{color:'var(--ink-300)'}}>·</span>
            <span style={{color:'var(--warn)',display:'flex',alignItems:'center',gap:4}}>
              <Icon name="warn" size={11}/>{warnings.length} transition{warnings.length>1?'s':''}
            </span>
          </>}
        </div>
      </div>

      <div className="mob-body" style={{padding: 0}}>
        {/* horizontal energy strip — mobile */}
        <div style={{padding:'10px 14px 6px',background:'var(--bg-sunk)',
          borderBottom:'1px solid var(--line)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
            <span style={{fontSize:10,letterSpacing:'0.14em',textTransform:'uppercase',
              color:'var(--ink-500)',fontWeight:600}}>Courbe d'énergie</span>
            <span className="tag-mono">{energyViz}</span>
          </div>
          <EnergySparkline values={values} h={56} w={340}/>
        </div>

        <div style={{padding:'12px 14px 90px',position:'relative'}}>
          {mobileDragMode === 'longpress' && (
            <div style={{fontSize:11,color:'var(--ink-400)',marginBottom:8,padding:'0 4px',
              display:'flex',alignItems:'center',gap:6}}>
              <Icon name="more" size={14}/>
              Appuie longuement sur une ligne pour la déplacer.
            </div>
          )}

          {/* warning gutter */}
          <div style={{position:'absolute',left:0,top:42,bottom:0,width:14}}>
            {warnings.map(w => {
              const ROW = mobileDragMode==='card' ? 92 : 74;
              const GAP = 8;
              const top = (w.idx+1)*ROW + w.idx*GAP - 10;
              return (
                <div key={w.idx} style={{position:'absolute',top,left:0,
                  display:'flex',flexDirection:'column',alignItems:'center'}}>
                  <div style={{width:2,height:12,background:w.severity==='hard'?'var(--danger)':'var(--warn)',opacity:0.5}}/>
                  <div className="sl-warn-mark" style={{position:'relative',transform:'none',
                    background:w.severity==='hard'?'var(--danger)':'var(--warn)',
                    width:14,height:14,fontSize:9}}>!</div>
                </div>
              );
            })}
          </div>

          <div style={{paddingLeft:18,display:'flex',flexDirection:'column',gap:8}}>
            {entries.map((e, i) => {
              const song = songs.find(s => s.id === e.song);
              const lineup = defaultLineup[song.id];
              const isGrab = grabbing === song.id;
              const cardMode = mobileDragMode === 'card';
              const longPress = mobileDragMode === 'longpress';
              return (
                <MobileSetlistRow key={song.id+i} idx={i} song={song} entry={e}
                  data-msl={i}
                  lineup={lineup} members={members} instruments={instruments}
                  memberStyle={memberStyle}
                  grabbing={isGrab}
                  mode={mobileDragMode}
                  onPointerDown={(ev) => onDragStart(song.id, i, ev, longPress)}
                  onEnergyChange={(v) => onEnergyChange(i, v)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const MobileSetlistRow = ({ idx, song, entry, lineup, members, instruments,
    memberStyle, grabbing, mode, onPointerDown, onEnergyChange }) => {
  const cardMode = mode === 'card';
  const showHandle = mode === 'handle' || mode === 'longpress';
  return (
    <div data-msl={idx} onPointerDown={onPointerDown} className={grabbing?'dragging':''}
      style={{
        background:'var(--bg-elev)',border:'1px solid var(--line)',
        borderColor: grabbing ? 'var(--ink-700)':'var(--line)',
        borderRadius: 10, padding: cardMode ? '12px 12px 10px' : '10px 12px',
        boxShadow: grabbing ? '0 12px 32px rgba(26,22,18,0.18)':'none',
        transform: grabbing ? 'scale(1.02)' : 'none',
        transition: 'box-shadow 0.12s, transform 0.12s, border-color 0.12s',
        position: 'relative', overflow:'hidden',
        userSelect:'none', touchAction: mode==='longpress' ? 'pan-y' : 'none',
      }}>
      {/* left energy stripe */}
      {!cardMode && (
        <div style={{position:'absolute',left:0,top:8,bottom:8,width:3,
          background: energyColor(entry.energy),borderRadius:'0 2px 2px 0'}}/>
      )}
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{font:'500 11px/1 var(--t-mono)',color:'var(--ink-400)',
          width:18,textAlign:'center',flex:'0 0 18px'}}>{idx+1}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:'var(--t-display)',fontStyle:'italic',fontSize:18,lineHeight:1.1,
            letterSpacing:'-0.01em',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.title}</div>
          <div style={{fontSize:11,color:'var(--ink-500)',marginTop:2,display:'flex',
            gap:6,alignItems:'center',flexWrap:'wrap'}}>
            <span>{song.artist}</span>
            <span style={{color:'var(--ink-300)'}}>·</span>
            <span className="tag-mono" style={{fontSize:10}}>{song.tonalityStart}</span>
            <span style={{color:'var(--ink-300)'}}>·</span>
            <span style={{display:'flex',alignItems:'center',gap:3}}>
              <Icon name="bolt" size={11}/><span className="mono" style={{fontSize:10.5}}>{entry.energy}</span>
            </span>
          </div>
        </div>
        {showHandle && (
          <div style={{
            color:'var(--ink-300)', padding:8,
            background: grabbing ? 'var(--accent-soft)' : 'transparent',
            borderRadius:6
          }}>
            <Icon name="drag" size={16}/>
          </div>
        )}
      </div>
      {cardMode && (
        <div style={{display:'flex',gap:8,alignItems:'center',marginTop:10}}>
          <Lineup lineup={lineup} members={members} instruments={instruments} style={memberStyle} bare/>
          <span className="spacer"></span>
          <input type="range" className="rs no-drag" min="1" max="10" value={entry.energy}
            onChange={e=>onEnergyChange(parseInt(e.target.value))} style={{width:100}}/>
        </div>
      )}
    </div>
  );
};

// Mobile sessions / bars — simplified
const MobileSessions = ({ sessions, members, memberStyle, onOpen }) => {
  const upcoming = sessions.filter(s=>s.status!=='past').sort((a,b)=>a.date.localeCompare(b.date));
  return (
    <div className="mob">
      <div className="mob-head" style={{flexDirection:'column',alignItems:'stretch'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <h1 style={{flex:1}}>Sessions</h1>
          <button className="btn accent sm" style={{padding:'6px 10px'}}><Icon name="plus" size={14}/></button>
        </div>
      </div>
      <div className="mob-body" style={{padding:'12px 14px'}}>
        <div style={{fontSize:10,letterSpacing:'0.14em',textTransform:'uppercase',
          color:'var(--ink-400)',marginBottom:8,fontWeight:600,paddingLeft:4}}>À venir</div>
        <div className="col" style={{gap:10}}>
          {upcoming.map(s => (
            <div key={s.id} className="card" style={{padding:12,cursor:'default'}}
              onClick={()=>onOpen(s.id)}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                <span className="chip" style={{
                  background: s.kind==='concert' ? 'var(--ink-900)' : 'var(--bg-sunk)',
                  color: s.kind==='concert' ? 'var(--bg)' : 'var(--ink-500)',
                  borderColor: s.kind==='concert' ? 'var(--ink-900)' : 'var(--line)'
                }}>{s.kind==='concert' ? 'Concert' : 'Répèt.'}</span>
                <span className="mono" style={{fontSize:11,color:'var(--ink-500)'}}>{fmtDateShort(s.date)}</span>
                <span className="spacer"></span>
                <Icon name="chevR" size={14}/>
              </div>
              <div style={{fontFamily:'var(--t-display)',fontStyle:'italic',fontSize:19,lineHeight:1.1}}>
                {s.kind==='concert' ? s.venue : 'Répétition'}
              </div>
              {s.kind==='concert' && (
                <div style={{fontSize:11,color:'var(--ink-500)',marginTop:4}}>
                  {s.capacity} pers. · {Object.values(s.friends||{}).reduce((a,b)=>a+b,0)} amis attendus
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MobileBars = ({ bars, members, memberStyle }) => {
  const [tab, setTab] = React.useState('booked');
  const filtered = bars.filter(b => b.status === tab);
  return (
    <div className="mob">
      <div className="mob-head" style={{flexDirection:'column',alignItems:'stretch'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <h1 style={{flex:1}}>Bars</h1>
          <button className="btn accent sm" style={{padding:'6px 10px'}}><Icon name="plus" size={14}/></button>
        </div>
        <div style={{display:'flex',gap:4,overflowX:'auto',paddingBottom:6,marginTop:6}}>
          {BAR_COLS.map(c => (
            <button key={c.id} onClick={()=>setTab(c.id)}
              style={{appearance:'none',border:'1px solid var(--line)',background: tab===c.id?'var(--ink-900)':'var(--bg-elev)',
                color: tab===c.id?'var(--bg)':'var(--ink-700)', flex:'0 0 auto',
                padding:'6px 10px',borderRadius:999,fontSize:11.5,fontWeight:500,cursor:'pointer'}}>
              {c.label} · {bars.filter(b=>b.status===c.id).length}
            </button>
          ))}
        </div>
      </div>
      <div className="mob-body" style={{padding:'12px 14px'}}>
        <div className="col" style={{gap:8}}>
          {filtered.map(b => (
            <div key={b.id} className="card" style={{padding:12}}>
              <div style={{fontSize:14,fontWeight:500,marginBottom:4}}>{b.name}</div>
              <div className="kmeta" style={{marginBottom:6}}>
                <span>{b.last ? fmtDateShort(b.last) : 'jamais'}</span>
                <span style={{color:'var(--ink-300)'}}>·</span>
                <span>{b.contact}</span>
              </div>
              <div style={{fontSize:12,color:'var(--ink-500)',lineHeight:1.4}}>{b.notes}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { MobileCatalog, MobileSongDetail, MobileSetlist, MobileSessions, MobileBars });
