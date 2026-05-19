// Pragma — Setlist editor + Mode scène (sequential chord performance view)

const CHORDPRO_PAGE = `[Bb]Well sometimes I [Dm]go out by my[Gm]self
And I [Eb]look across the [Bb]water

[Bb]And I think of [Dm]all the things, what [Gm]you're doing
And in [Eb]my head I make a [Bb]picture

[Eb]'Cos since I've come on [F]home
Well my [Dm]body's been a [Gm]mess
And I've [Eb]missed your ginger [F]hair
And the [Dm]way you like to [Gm]dress

[Bb]Won't you come on over
[Eb]Stop making a [F]fool out of [Bb]me
Why don't you come on over Vale[Dm]rie?  Vale[Gm]rie...

{verse 2}
[Bb]Did you have to [Dm]go to jail, [Gm]put your house on [Eb]up for sale,
[Bb]did you get a [Dm]good lawyer? [Eb]
[Bb]I hope you didn't [Dm]catch a tan, [Gm]I hope you find the [Eb]right man
[Bb]Who'll fix it for [Dm]you. [Gm] [Eb]`;

// ───────────────────────── Setlist editor ─────────────────────────

const SetlistEditor = ({
  songs, members, instruments, badTransitions, transitionComments,
  initialSetlist, defaultLineup, mastery, meanMasteryForSong,
  memberStyle, energyViz='sparkline', density='comfortable',
}) => {
  const [entries, setEntries] = React.useState(initialSetlist);
  const [openWarning, setOpenWarning] = React.useState(null);
  const [scene, setScene] = React.useState(null); // { index } or null
  const listRef = React.useRef(null);
  const rowRefs = React.useRef({});

  // drag-reorder state
  const [dragId, setDragId] = React.useState(null);
  const [overIdx, setOverIdx] = React.useState(null);
  const dragRef = React.useRef({});

  const onReorder = (from, to) => {
    setEntries(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const onPointerDown = (e, id, idx) => {
    if (e.target.closest('.no-drag, input, button')) return;
    const isTouch = e.pointerType === 'touch';
    const start = () => {
      dragRef.current = { id, idx };
      setDragId(id); setOverIdx(idx);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp, { once: true });
    };
    if (isTouch) {
      const t = setTimeout(start, 280);
      const cancel = () => { clearTimeout(t);
        window.removeEventListener('pointerup', cancel);
        window.removeEventListener('pointermove', cancel); };
      window.addEventListener('pointerup', cancel, { once:true });
      window.addEventListener('pointermove', cancel, { once:true });
    } else { start(); }
  };
  const onMove = (e) => {
    const els = document.querySelectorAll('[data-sl-row]');
    let bestIdx = dragRef.current.idx, bestDist = Infinity;
    els.forEach(el => {
      const r = el.getBoundingClientRect();
      const d = Math.abs((r.top + r.height/2) - e.clientY);
      if (d < bestDist) { bestDist = d; bestIdx = parseInt(el.dataset.slRow); }
    });
    setOverIdx(bestIdx);
  };
  const onUp = () => {
    const { idx } = dragRef.current;
    setOverIdx((over) => {
      if (over != null && over !== idx) onReorder(idx, over);
      return null;
    });
    setDragId(null);
    window.removeEventListener('pointermove', onMove);
  };

  const onEnergyChange = (idx, val) => {
    setEntries(prev => prev.map((e,i) => i===idx ? {...e, energy: val} : e));
  };

  // Warnings: precomputed once per render of entries
  const warnings = [];
  for (let i = 0; i < entries.length - 1; i++) {
    const k = `${entries[i].song}>${entries[i+1].song}`;
    if (badTransitions[k]) warnings.push({ idx: i, ...badTransitions[k] });
  }

  // Measure row positions for warning gutter — recomputed any time the list mutates.
  const [rowTops, setRowTops] = React.useState({});
  React.useLayoutEffect(() => {
    if (!listRef.current) return;
    const measure = () => {
      const base = listRef.current.getBoundingClientRect().top;
      const next = {};
      entries.forEach((_, i) => {
        const el = rowRefs.current[i];
        if (el) {
          const r = el.getBoundingClientRect();
          next[i] = { top: r.top - base, bottom: r.bottom - base, height: r.height };
        }
      });
      setRowTops(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (listRef.current) ro.observe(listRef.current);
    Object.values(rowRefs.current).forEach(el => el && ro.observe(el));
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [entries, energyViz, density]);

  const totalDur = entries.length * 3.4;
  const avgMastery = entries
    .map(e => meanMasteryForSong(e.song))
    .filter(v => v != null);
  const overallMastery = avgMastery.length ? avgMastery.reduce((a,b)=>a+b,0)/avgMastery.length : 0;

  return (
    <div className="page">
      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:14}}>
        <button className="btn ghost sm"><Icon name="chevL" size={14}/>Sessions</button>
        <span style={{color:'var(--ink-300)'}}>/</span>
        <span className="crumb" style={{marginBottom:0}}>Concert · 13 sept. 2025</span>
      </div>

      <div className="ph">
        <div>
          <div className="crumb">Setlist · Les Disquaires</div>
          <h1>13 septembre</h1>
          <div className="ph-sub" style={{display:'flex',gap:14,alignItems:'center',flexWrap:'wrap'}}>
            <span>{entries.length} titres</span>
            <span style={{color:'var(--ink-300)'}}>·</span>
            <span>≈ {Math.round(totalDur)} min</span>
            <span style={{color:'var(--ink-300)'}}>·</span>
            <span style={{display:'flex',alignItems:'center',gap:6}}>
              <Icon name="star" size={13}/> maîtrise moyenne
              <span className="mono" style={{fontWeight:600,color:'var(--ink-900)'}}>{overallMastery.toFixed(1)}/10</span>
            </span>
            <span style={{color:'var(--ink-300)'}}>·</span>
            <span style={{display:'flex',alignItems:'center',gap:6,
              color: warnings.length ? 'var(--warn)' : 'var(--good)'}}>
              <Icon name={warnings.length?'warn':'check'} size={14}/>
              {warnings.length
                ? `${warnings.length} transition${warnings.length>1?'s':''} à valider`
                : 'Aucune transition douteuse'}
            </span>
          </div>
        </div>
        <div className="ph-actions">
          <button className="btn"><Icon name="plus" size={14}/>Ajouter</button>
          <button className="btn"><Icon name="download" size={14}/>Exporter</button>
          <button className="btn accent" onClick={()=>setScene({ index: 0 })}>
            <Icon name="play" size={14}/>Mode scène
          </button>
        </div>
      </div>

      <div className="sl-shell">
        <div style={{position:'relative'}} ref={listRef}>
          {/* warning gutter — markers positioned from measured row geometry */}
          <div style={{position:'absolute',left:-36,top:0,bottom:0,width:30,pointerEvents:'none'}}>
            {warnings.map(w => {
              const a = rowTops[w.idx], b = rowTops[w.idx+1];
              if (!a || !b) return null;
              const gapMid = (a.bottom + b.top) / 2;
              return (
                <WarningMarker key={w.idx} w={w}
                  topPx={gapMid}
                  onClick={()=>setOpenWarning(w)}
                  isOpen={openWarning?.idx === w.idx}/>
              );
            })}
          </div>

          <div className="sl-list">
            {entries.map((e, i) => {
              const song = songs.find(s => s.id === e.song);
              const lineup = defaultLineup[song.id];
              const songMast = meanMasteryForSong(song.id);
              const isDragging = dragId === song.id;
              const showOver = overIdx === i && dragId && !isDragging;
              return (
                <React.Fragment key={song.id + i}>
                  {showOver && <div style={{height:60,border:'2px dashed var(--accent)',
                    borderRadius:8,background:'var(--accent-soft)'}}/>}
                  <SetlistRow
                    idx={i} song={song} entry={e} lineup={lineup} songMast={songMast}
                    members={members} instruments={instruments}
                    rowRef={el => rowRefs.current[i] = el}
                    onPointerDown={(ev)=>onPointerDown(ev, song.id, i)}
                    onEnergyChange={(v)=>onEnergyChange(i, v)}
                    energyViz={energyViz}
                    memberStyle={memberStyle}
                    isDragging={isDragging}
                  />
                </React.Fragment>
              );
            })}
          </div>

          {openWarning && (
            <WarningDetail w={openWarning} entries={entries} songs={songs}
              rowTops={rowTops}
              transitionComments={transitionComments}
              onClose={()=>setOpenWarning(null)}/>
          )}
        </div>

        <SetlistSidePanel
          entries={entries} songs={songs} energyViz={energyViz}
          members={members} instruments={instruments} defaultLineup={defaultLineup}
          memberStyle={memberStyle} mastery={mastery}
          meanMasteryForSong={meanMasteryForSong}/>
      </div>

      {scene && (
        <SceneMode entries={entries} songs={songs} defaultLineup={defaultLineup}
          instruments={instruments} members={members} memberStyle={memberStyle}
          initialIndex={scene.index} onClose={()=>setScene(null)}/>
      )}
    </div>
  );
};

// ───────────────────────── Setlist row ─────────────────────────

const SetlistRow = ({ idx, song, entry, lineup, songMast, members, instruments,
    rowRef, onPointerDown, onEnergyChange, energyViz, memberStyle, isDragging }) => {
  return (
    <div className={`sl-row ${isDragging?'dragging':''}`} data-sl-row={idx}
      ref={rowRef}
      onPointerDown={onPointerDown}
      style={{position:'relative',overflow:'hidden'}}>
      {energyViz === 'gradient' && <EnergyGradientFill value={entry.energy}/>}

      <div className="pos">{String(idx+1).padStart(2,'0')}</div>

      {energyViz === 'stripe' || energyViz === 'bars'
        ? <EnergyStripe value={entry.energy} h={42}/>
        : <div className="handle"><Icon name="drag" size={14}/></div>}

      {(energyViz === 'stripe' || energyViz === 'bars')
        ? <div className="handle"><Icon name="drag" size={14}/></div>
        : <div></div>}

      <div style={{minWidth:0}}>
        <div className="ttl" style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.title}</div>
        <div className="submeta">
          <span className="muted">{song.artist}</span>
          <span style={{color:'var(--ink-300)'}}>·</span>
          <span className="tag-mono">{song.tonalityStart}{song.tonalityStart !== song.tonalityEnd ? ` → ${song.tonalityEnd}` : ''}</span>
          {songMast != null && <>
            <span style={{color:'var(--ink-300)'}}>·</span>
            <span style={{display:'flex',alignItems:'center',gap:3}}>
              <Icon name="star" size={11}/>
              <span className="mono">{songMast.toFixed(1)}</span>
            </span>
          </>}
          <span style={{color:'var(--ink-300)'}}>·</span>
          <Lineup lineup={lineup} members={members} instruments={instruments} style={memberStyle} bare/>
        </div>
      </div>

      <div className="no-drag" style={{display:'flex',alignItems:'center',gap:10}}>
        <span className="tag-mono" style={{minWidth:22,textAlign:'center'}}>{entry.energy ?? '—'}</span>
        <input className="rs no-drag" type="range" min="1" max="10" value={entry.energy ?? 5}
          onChange={e=>onEnergyChange(parseInt(e.target.value))} style={{width:88}}/>
        <button className="btn ghost sm no-drag" style={{padding:4}}><Icon name="more" size={14}/></button>
      </div>
    </div>
  );
};

// ───────────────────────── Warning marker + detail ─────────────────────────

const WarningMarker = ({ w, topPx, onClick, isOpen }) => (
  <div onClick={onClick} title={w.reason}
    style={{position:'absolute',top:topPx-9,right:6,
      cursor:'pointer',pointerEvents:'auto',
      display:'flex',alignItems:'center',gap:4}}>
    <div style={{
      width:18,height:18,borderRadius:999,
      background:w.severity==='hard'?'var(--danger)':'var(--warn)',color:'#fff',
      display:'flex',alignItems:'center',justifyContent:'center',
      font:'700 11px/1 var(--t-ui)',
      boxShadow: isOpen
        ? `0 0 0 4px ${w.severity==='hard'?'rgba(168,58,42,0.18)':'var(--warn-soft)'}`
        : '0 2px 6px rgba(184,132,26,0.4)',
    }}>!</div>
  </div>
);

const WarningDetail = ({ w, entries, songs, rowTops, transitionComments, onClose }) => {
  const a = songs.find(s => s.id === entries[w.idx].song);
  const b = songs.find(s => s.id === entries[w.idx+1].song);
  const existing = transitionComments[`${a.id}>${b.id}`];
  const ra = rowTops[w.idx], rb = rowTops[w.idx+1];
  const top = ra && rb ? ((ra.bottom + rb.top)/2) - 12 : 0;
  return (
    <div style={{
      position:'absolute',left:-300,width:260, top,
      background:'var(--bg-elev)',border:'1px solid var(--line-strong)',borderRadius:10,
      padding:12,boxShadow:'0 14px 40px rgba(26,22,18,0.16)', zIndex:8,
    }}>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
        <span style={{width:8,height:8,borderRadius:999,
          background:w.severity==='hard'?'var(--danger)':'var(--warn)'}}/>
        <span style={{fontSize:10.5,letterSpacing:'0.12em',textTransform:'uppercase',
          color:'var(--ink-500)',fontWeight:600}}>
          {w.severity==='hard' ? 'Transition cassée' : 'Transition à surveiller'}
        </span>
        <span className="spacer"></span>
        <button className="btn ghost sm" style={{padding:2}} onClick={onClose}>×</button>
      </div>
      <div style={{fontSize:12,lineHeight:1.45,marginBottom:10}}>
        <span style={{fontFamily:'var(--t-display)',fontStyle:'italic',fontSize:14}}>{a.title}</span>
        <span style={{color:'var(--ink-400)',margin:'0 6px'}}>→</span>
        <span style={{fontFamily:'var(--t-display)',fontStyle:'italic',fontSize:14}}>{b.title}</span>
      </div>
      <div style={{fontSize:12,color:'var(--ink-700)',marginBottom:10}}>{w.reason}</div>
      <textarea className="textarea" placeholder="Note de transition (visible en répèt')..."
        defaultValue={existing || ''} style={{fontSize:11.5}}/>
      <div style={{display:'flex',gap:6,marginTop:8}}>
        <button className="btn primary sm" style={{flex:1}}>Valider</button>
        <button className="btn sm">Ignorer</button>
      </div>
    </div>
  );
};

// ───────────────────────── Side panel ─────────────────────────

const SetlistSidePanel = ({ entries, songs, energyViz, members, instruments,
    defaultLineup, memberStyle, mastery, meanMasteryForSong }) => {
  const values = entries.map(e => e.energy);
  return (
    <aside className="col" style={{gap:16, position:'sticky', top:0}}>
      <div className="card">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div style={{fontSize:11,letterSpacing:'0.14em',textTransform:'uppercase',
            color:'var(--ink-400)',fontWeight:600}}>Courbe d'énergie</div>
          <span className="tag-mono">{energyViz}</span>
        </div>
        {energyViz === 'sparkline' && <EnergySparkline values={values} h={120} w={280}/>}
        {energyViz === 'bars'      && <EnergyBars values={values} h={140}/>}
        {energyViz === 'stripe'    && <EnergyBars values={values} h={140}/>}
        {energyViz === 'gradient'  && <EnergySparkline values={values} h={120} w={280}/>}
        <div style={{display:'flex',justifyContent:'space-between',marginTop:8,
          fontSize:10.5,fontFamily:'var(--t-mono)',color:'var(--ink-400)'}}>
          <span>début</span><span>milieu</span><span>fin</span>
        </div>
      </div>

      <div className="card">
        <div style={{fontSize:11,letterSpacing:'0.14em',textTransform:'uppercase',
          color:'var(--ink-400)',marginBottom:10,fontWeight:600}}>Charge par membre</div>
        <div className="col" style={{gap:6}}>
          {members.map(m => {
            const songsInSet = entries.filter(e => defaultLineup[e.song]?.[m.id]).length;
            const pct = (songsInSet / entries.length) * 100;
            return (
              <div key={m.id} style={{display:'flex',alignItems:'center',gap:10}}>
                <MemberChip member={m} style={memberStyle} bare members={members}/>
                <span style={{fontSize:12.5,flex:'0 0 60px'}}>{m.name}</span>
                <div style={{flex:1,height:6,background:'var(--bg-sunk)',borderRadius:3,overflow:'hidden'}}>
                  <div style={{width:`${pct}%`,height:'100%',background:`var(${m.colorVar})`,opacity:0.85}}/>
                </div>
                <span className="mono" style={{fontSize:11,color:'var(--ink-500)',minWidth:32,textAlign:'right'}}>{songsInSet}/{entries.length}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div style={{fontSize:11,letterSpacing:'0.14em',textTransform:'uppercase',
          color:'var(--ink-400)',marginBottom:10,fontWeight:600}}>Maîtrise par titre</div>
        <div className="col" style={{gap:4}}>
          {entries.slice(0,6).map((e, i) => {
            const song = songs.find(s=>s.id===e.song);
            const ms = meanMasteryForSong(e.song);
            return (
              <div key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:12}}>
                <span className="mono" style={{color:'var(--ink-400)',width:18,fontSize:10.5}}>{String(i+1).padStart(2,'0')}</span>
                <span style={{flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.title}</span>
                <span className="mono" style={{
                  fontSize:11.5,fontWeight:600,
                  color: ms >= 7 ? 'var(--good)' : ms >= 5 ? 'var(--warn)' : 'var(--danger)',
                }}>{ms?.toFixed(1) ?? '—'}</span>
              </div>
            );
          })}
          <div style={{fontSize:11,color:'var(--ink-400)',marginTop:4,paddingTop:8,borderTop:'1px dashed var(--line)'}}>
            + {entries.length - 6} autres titres…
          </div>
        </div>
      </div>
    </aside>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Mode scène — séquentiel avec accords morceau par morceau
// ─────────────────────────────────────────────────────────────────────

const SceneMode = ({ entries, songs, defaultLineup, instruments, members, memberStyle,
                    initialIndex = 0, onClose }) => {
  const [i, setI] = React.useState(initialIndex);
  const [autoScroll, setAutoScroll] = React.useState(false);
  const [zoom, setZoom] = React.useState(1);
  const bodyRef = React.useRef(null);

  const safeI = Math.max(0, Math.min(entries.length - 1, i));
  const entry = entries[safeI];
  const song = songs.find(s => s.id === entry.song);
  const next = entries[safeI + 1];
  const nextSong = next ? songs.find(s => s.id === next.song) : null;
  const lineup = defaultLineup[song.id];

  // keyboard controls
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        setI(x => Math.min(entries.length - 1, x + 1));
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setI(x => Math.max(0, x - 1));
      }
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [entries.length, onClose]);

  // auto-scroll
  React.useEffect(() => {
    if (!autoScroll || !bodyRef.current) return;
    const el = bodyRef.current;
    const id = setInterval(() => { el.scrollTop += 1; }, 40);
    return () => clearInterval(id);
  }, [autoScroll]);

  // reset scroll on song change
  React.useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [safeI]);

  const progress = ((safeI + 1) / entries.length) * 100;

  return (
    <div className="scene" data-screen-label={`Mode scène ${safeI+1}/${entries.length}`}>
      {/* header */}
      <div className="scene-head">
        <button className="scene-btn" onClick={onClose}>
          <Icon name="chevL" size={14}/>Quitter
        </button>
        <div style={{flex:1, minWidth:0}}>
          <div className="pos">
            Morceau {String(safeI+1).padStart(2,'0')} / {String(entries.length).padStart(2,'0')}
            <span style={{margin:'0 8px', opacity:0.4}}>·</span>
            Les Disquaires · 13 septembre
          </div>
          <h1 className="ttl" style={{marginTop:4}}>{song.title}</h1>
          <div className="sub">
            <span>{song.artist}</span>
            <span style={{opacity:0.4}}>·</span>
            <span className="mono" style={{color:'rgba(241,233,216,0.85)'}}>
              {song.tonalityStart}{song.tonalityStart !== song.tonalityEnd ? ` → ${song.tonalityEnd}`:''}
            </span>
            <span style={{opacity:0.4}}>·</span>
            <span style={{display:'inline-flex',alignItems:'center',gap:4}}>
              <Icon name="bolt" size={12}/>{entry.energy}/10
            </span>
          </div>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <button className="scene-btn" onClick={()=>setZoom(z=>Math.max(0.7, z-0.1))}>A−</button>
          <button className="scene-btn" onClick={()=>setZoom(z=>Math.min(1.8, z+0.1))}>A+</button>
          <button className="scene-btn" onClick={()=>setAutoScroll(a=>!a)}>
            <Icon name={autoScroll?'pause':'play'} size={12}/>
            {autoScroll?'Stop':'Défil. auto'}
          </button>
        </div>
      </div>

      {/* body — chord chart */}
      <div className="scene-body" ref={bodyRef}>
        <div className="scene-progress"><div style={{width:`${progress}%`}}/></div>
        {song.chartKind ? (
          <pre style={{fontSize: `${22*zoom}px`}}
            dangerouslySetInnerHTML={{__html:
              CHORDPRO_PAGE.replace(/\[([^\]]+)\]/g, '<span class="ch">[$1]</span>')
            }}/>
        ) : (
          <div className="no-chart">
            Pas de grille d'accords saisie pour ce morceau.<br/>
            <span style={{fontSize:14,fontStyle:'normal',fontFamily:'var(--t-ui)',
              color:'rgba(241,233,216,0.4)',marginTop:18,display:'block'}}>
              Appuie sur → pour passer au suivant
            </span>
          </div>
        )}
      </div>

      {/* footer — list of upcoming with current highlighted */}
      <div className="scene-foot">
        <button className="scene-btn" onClick={()=>setI(x=>Math.max(0, x-1))}
          disabled={safeI===0}
          style={{opacity:safeI===0?0.3:1}}>
          <Icon name="chevL" size={14}/>Préc.
        </button>

        <div className="scene-up">
          {entries.map((e, idx) => {
            const s = songs.find(x => x.id === e.song);
            return (
              <div key={idx}
                className={`scene-pill ${idx === safeI ? 'current' : ''} ${idx < safeI ? 'done' : ''}`}
                onClick={() => setI(idx)}>
                <div className="pp">{String(idx+1).padStart(2,'0')} · {idx===safeI?'maintenant':idx===safeI+1?'à suivre':''}</div>
                <div className="pt">{s.title}</div>
                <div className="pa">{s.artist} · {s.tonalityStart}</div>
              </div>
            );
          })}
        </div>

        <button className="scene-btn primary" onClick={()=>setI(x=>Math.min(entries.length-1, x+1))}
          disabled={safeI===entries.length-1}
          style={{opacity:safeI===entries.length-1?0.3:1}}>
          {nextSong ? 'Suivant' : 'Fin'}<Icon name="chevR" size={14}/>
        </button>
      </div>
    </div>
  );
};

Object.assign(window, { SetlistEditor, SceneMode });
