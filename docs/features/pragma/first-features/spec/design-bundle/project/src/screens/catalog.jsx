// Pragma — Catalog list + Song detail (with chord chart viewer)

const CHORDPRO_SAMPLE = `{title: Valerie}
{artist: Amy Winehouse}
{key: Bb}

[Bb]Well sometimes I [Dm]go out by my[Gm]self
And I [Eb]look across the [Bb]water
[Bb]And I think of [Dm]all the things, what [Gm]you're doing
And in [Eb]my head I make a [Bb]picture

[Eb]'Cos since I've come on [F]home
Well my [Dm]body's been a [Gm]mess
And I've [Eb]missed your ginger [F]hair
And the [Dm]way you like to [Gm]dress

[Bb]Won't you come on over
[Eb]Stop making a [F]fool out of [Bb]me
Why don't you come on over Vale[Dm]rie?  Vale[Gm]rie...`;

const CatalogList = ({ songs, members, instruments, defaultLineup, onOpen, density, memberStyle }) => {
  const [q, setQ] = React.useState('');
  const [status, setStatus] = React.useState('all');
  const filtered = songs.filter(s =>
    (status === 'all' || s.status === status) &&
    (s.title.toLowerCase().includes(q.toLowerCase()) || s.artist.toLowerCase().includes(q.toLowerCase()))
  );
  const STATUSES = [
    {id:'all',l:'Toutes',c:songs.length},
    {id:'concert_ready',l:'Prêtes scène',c:songs.filter(s=>s.status==='concert_ready').length},
    {id:'rehearsed',l:'Répétées',c:songs.filter(s=>s.status==='rehearsed').length},
    {id:'wip',l:'En travail',c:songs.filter(s=>s.status==='wip').length},
    {id:'idea',l:'Idées',c:songs.filter(s=>s.status==='idea').length},
  ];
  return (
    <div className="page">
      <div className="crumb">Répertoire</div>
      <div className="ph">
        <div>
          <h1>Catalogue</h1>
          <div className="ph-sub">25 titres, dont 5 prêts pour la scène · dernière mise à jour aujourd'hui</div>
        </div>
        <div className="ph-actions">
          <button className="btn"><Icon name="filter"/>Filtres</button>
          <button className="btn accent"><Icon name="plus"/>Nouveau titre</button>
        </div>
      </div>

      <div style={{display:'flex',gap:14,alignItems:'center',marginBottom:18,flexWrap:'wrap'}}>
        <div style={{position:'relative',flex:'1 1 280px',maxWidth:380}}>
          <div style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--ink-400)'}}>
            <Icon name="search"/>
          </div>
          <input className="input" value={q} onChange={e=>setQ(e.target.value)}
            placeholder="Chercher un titre, un artiste..." style={{paddingLeft:34}}/>
        </div>
        <div style={{display:'flex',gap:4,padding:3,background:'var(--bg-sunk)',borderRadius:8}}>
          {STATUSES.map(s => (
            <button key={s.id} onClick={()=>setStatus(s.id)}
              style={{
                appearance:'none',border:0,cursor:'pointer',
                background: status===s.id ? 'var(--bg-elev)' : 'transparent',
                color: status===s.id ? 'var(--ink-900)' : 'var(--ink-500)',
                font:'500 12px var(--t-ui)',padding:'5px 10px',borderRadius:6,
                boxShadow: status===s.id ? '0 1px 2px rgba(26,22,18,0.06)' : 'none',
                display:'flex',gap:6,alignItems:'center',
              }}>
              {s.l}<span className="mono" style={{color:'var(--ink-400)',fontSize:10.5}}>{s.c}</span>
            </button>
          ))}
        </div>
      </div>

      {density === 'compact' ? (
        <CatalogTable songs={filtered} members={members} instruments={instruments}
          defaultLineup={defaultLineup} onOpen={onOpen} memberStyle={memberStyle}/>
      ) : (
        <div className="cat-grid">
          {filtered.map(s => (
            <SongCard key={s.id} song={s} members={members} instruments={instruments}
              lineup={defaultLineup[s.id]} onOpen={()=>onOpen(s.id)} memberStyle={memberStyle}/>
          ))}
        </div>
      )}
    </div>
  );
};

const SongCard = ({ song, members, instruments, lineup, onOpen, memberStyle }) => (
  <div className="song-card" onClick={onOpen}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,marginBottom:8}}>
      <StatusChip status={song.status}/>
      <div style={{display:'flex',gap:6,alignItems:'center',color:'var(--ink-400)'}}>
        {song.chartKind === 'chordpro' && <Icon name="text" size={14}/>}
        {song.chartKind === 'pdf'      && <Icon name="pdf"  size={14}/>}
        {song.chartKind === 'image'    && <Icon name="image" size={14}/>}
        {!song.chartKind && <span style={{fontSize:10,color:'var(--ink-300)'}}>pas d'accord</span>}
      </div>
    </div>
    <div className="ttl">{song.title}</div>
    <div className="meta">
      <span>{song.artist}</span>
      <span style={{color:'var(--ink-300)'}}>·</span>
      <span className="mono" style={{fontSize:11}}>{song.tonalityStart}{song.tonalityStart !== song.tonalityEnd ? ` → ${song.tonalityEnd}` : ''}</span>
    </div>
    <div className="lineup">
      <Lineup lineup={lineup} members={members} instruments={instruments} style={memberStyle} bare/>
    </div>
  </div>
);

const CatalogTable = ({ songs, members, instruments, defaultLineup, onOpen, memberStyle }) => (
  <div className="card" style={{padding:0,overflow:'hidden'}}>
    <table className="tbl">
      <thead><tr>
        <th>Titre</th><th>Artiste</th><th>Statut</th><th>Tonalité</th><th>Lineup</th><th>Accords</th>
      </tr></thead>
      <tbody>
        {songs.map(s => (
          <tr key={s.id} onClick={()=>onOpen(s.id)}>
            <td><span style={{fontFamily:'var(--t-display)', fontStyle:'italic',fontSize:17}}>{s.title}</span></td>
            <td className="muted">{s.artist}</td>
            <td><StatusChip status={s.status}/></td>
            <td className="mono" style={{fontSize:12}}>{s.tonalityStart}{s.tonalityStart !== s.tonalityEnd ? ` → ${s.tonalityEnd}` : ''}</td>
            <td><Lineup lineup={defaultLineup[s.id]} members={members} instruments={instruments} style={memberStyle} bare/></td>
            <td>
              {s.chartKind === 'chordpro' && <span className="tag-mono">ChordPro</span>}
              {s.chartKind === 'pdf'      && <span className="tag-mono">PDF</span>}
              {s.chartKind === 'image'    && <span className="tag-mono">Image</span>}
              {!s.chartKind && <span style={{color:'var(--ink-300)',fontSize:11}}>—</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ───────────────────────── Song detail ─────────────────────────

const SongDetail = ({ songId, songs, members, instruments, defaultLineup, onBack, memberStyle, onPerf }) => {
  const song = songs.find(s => s.id === songId);
  if (!song) return null;
  const lineup = defaultLineup[song.id];
  return (
    <div className="page">
      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:14}}>
        <button className="btn ghost sm" onClick={onBack}><Icon name="chevL" size={14}/>Catalogue</button>
        <span style={{color:'var(--ink-300)'}}>/</span>
        <span className="crumb" style={{marginBottom:0}}>{song.artist}</span>
      </div>

      <div className="ph" style={{marginBottom:8}}>
        <div>
          <h1>{song.title}</h1>
          <div className="ph-sub" style={{display:'flex',gap:10,alignItems:'center',marginTop:6}}>
            <span>{song.artist}</span>
            <span style={{color:'var(--ink-300)'}}>·</span>
            <span className="mono">{song.tonalityStart}{song.tonalityStart !== song.tonalityEnd ? ` → ${song.tonalityEnd}` : ''}</span>
            <span style={{color:'var(--ink-300)'}}>·</span>
            <StatusChip status={song.status}/>
          </div>
        </div>
        <div className="ph-actions">
          <button className="btn"><Icon name="edit" size={14}/>Éditer</button>
          <button className="btn accent" onClick={onPerf}><Icon name="play" size={14}/>Mode scène</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 280px', gap:24, alignItems:'flex-start',marginTop:24}}>
        <div className="col" style={{gap:16}}>
          {/* Chart preview */}
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',
              borderBottom:'1px solid var(--line)',background:'var(--bg-sunk)'}}>
              <Icon name="text" size={14}/>
              <span style={{fontSize:12,fontWeight:500}}>Grille d'accords — ChordPro</span>
              <span className="spacer"></span>
              <button className="btn sm ghost"><Icon name="edit" size={12}/>Éditer</button>
              <button className="btn sm ghost" onClick={onPerf}><Icon name="play" size={12}/>Plein écran</button>
            </div>
            <div style={{padding:18}}>
              <pre className="chord-pre" style={{margin:0}} dangerouslySetInnerHTML={{__html:
                CHORDPRO_SAMPLE.replace(/\[([^\]]+)\]/g, '<span class="ch">[$1]</span>')
              }}/>
            </div>
          </div>

          {/* Liens externes */}
          <div className="card">
            <div style={{fontSize:11,letterSpacing:'0.14em',textTransform:'uppercase',
              color:'var(--ink-400)',marginBottom:10}}>Liens</div>
            <div className="col" style={{gap:6}}>
              <ExtLink provider="spotify" url="spotify:track:38..." comment="Version studio Back to Black"/>
              <ExtLink provider="youtube" url="https://youtu.be/..." comment="Live Royal Albert Hall — meilleure prise"/>
            </div>
          </div>
        </div>

        <aside className="col" style={{gap:16}}>
          <div className="card">
            <div style={{fontSize:11,letterSpacing:'0.14em',textTransform:'uppercase',
              color:'var(--ink-400)',marginBottom:10}}>Lineup par défaut</div>
            <div className="col" style={{gap:6}}>
              {Object.entries(lineup).map(([mid, iid]) => {
                const m = members.find(x=>x.id===mid);
                const inst = instruments.find(x=>x.id===iid);
                return (
                  <div key={mid} style={{display:'flex',alignItems:'center',gap:10,
                    padding:'6px 4px',borderBottom:'1px dashed var(--line)'}}>
                    <MemberChip member={m} style={memberStyle} bare members={members}/>
                    <span style={{fontSize:12.5}}>{m.name}</span>
                    <span className="spacer"></span>
                    <span className="tag-mono">{inst?.name ?? '—'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div style={{fontSize:11,letterSpacing:'0.14em',textTransform:'uppercase',
              color:'var(--ink-400)',marginBottom:10}}>Maîtrise</div>
            <div className="col" style={{gap:8}}>
              {Object.keys(lineup).map((mid) => {
                const m = members.find(x=>x.id===mid);
                const score = [9,7,10,8,6][Object.keys(lineup).indexOf(mid)];
                return (
                  <div key={mid} style={{display:'flex',alignItems:'center',gap:10}}>
                    <MemberChip member={m} style={memberStyle} bare members={members}/>
                    <span style={{fontSize:12.5,flex:1}}>{m.name}</span>
                    <div style={{display:'flex',gap:2}}>
                      {Array.from({length:10}).map((_,i)=>(
                        <div key={i} style={{
                          width:6,height:14,borderRadius:1,
                          background: i<score ? `var(${m.colorVar})` : 'var(--bg-sunk)',
                          opacity: i<score ? 0.85 : 1,
                        }}/>
                      ))}
                    </div>
                    <span className="mono" style={{fontSize:11,color:'var(--ink-400)',minWidth:24,textAlign:'right'}}>{score}/10</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card flat" style={{background:'var(--bg-sunk)',border:'none'}}>
            <div style={{fontSize:11,letterSpacing:'0.14em',textTransform:'uppercase',
              color:'var(--ink-400)',marginBottom:6}}>Joué récemment</div>
            <div style={{fontSize:12.5,color:'var(--ink-700)'}}>
              <div>21 juin 2025 · Fête de la musique</div>
              <div className="muted" style={{fontSize:11}}>3 fois en concert · 8 fois en répèt'</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

const ExtLink = ({ provider, comment }) => (
  <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',
    border:'1px solid var(--line)',borderRadius:8}}>
    <Icon name={provider} size={16}/>
    <div style={{flex:1,fontSize:12.5}}>
      <div style={{fontWeight:500,textTransform:'capitalize'}}>{provider}</div>
      <div className="muted" style={{fontSize:11}}>{comment}</div>
    </div>
    <Icon name="external" size={14}/>
  </div>
);

// ───────────────────────── Perf mode (fullscreen chart) ─────────────────────────

const PerfMode = ({ song, onClose }) => {
  const [autoScroll, setAutoScroll] = React.useState(false);
  const [zoom, setZoom] = React.useState(1);
  React.useEffect(() => {
    if (!autoScroll) return;
    const el = document.getElementById('perf-scroll');
    if (!el) return;
    const id = setInterval(() => { el.scrollTop += 1; }, 40);
    return () => clearInterval(id);
  }, [autoScroll]);
  return (
    <div className="perf-mode" id="perf-scroll" style={{fontSize: `${22*zoom}px`}}>
      <div className="perf-bar">
        <button className="btn sm" style={{background:'rgba(255,255,255,0.1)',
          border:'1px solid rgba(255,255,255,0.16)',color:'#f1e9d8'}}
          onClick={()=>setZoom(z=>Math.max(0.7,z-0.1))}>A−</button>
        <button className="btn sm" style={{background:'rgba(255,255,255,0.1)',
          border:'1px solid rgba(255,255,255,0.16)',color:'#f1e9d8'}}
          onClick={()=>setZoom(z=>Math.min(1.8,z+0.1))}>A+</button>
        <button className="btn sm" style={{background:'rgba(255,255,255,0.1)',
          border:'1px solid rgba(255,255,255,0.16)',color:'#f1e9d8'}}
          onClick={()=>setAutoScroll(a=>!a)}>
          <Icon name={autoScroll?'pause':'play'} size={12}/>{autoScroll?'Stop':'Auto-scroll'}
        </button>
        <button className="btn sm" style={{background:'rgba(255,255,255,0.1)',
          border:'1px solid rgba(255,255,255,0.16)',color:'#f1e9d8'}}
          onClick={onClose}>Fermer</button>
      </div>
      <div style={{fontFamily:'var(--t-display)',fontStyle:'italic',fontSize:`${48*zoom}px`,
        lineHeight:1,marginBottom:32,color:'#f1e9d8'}}>{song.title}</div>
      <div style={{color:'rgba(241,233,216,0.55)',fontFamily:'var(--t-ui)',fontSize:`${14*zoom}px`,
        marginBottom:24,letterSpacing:'0.02em'}}>
        {song.artist} · {song.tonalityStart} · énergie {song.energy}/10
      </div>
      <pre style={{fontFamily:'var(--t-mono)',whiteSpace:'pre',lineHeight:2,margin:0}}
        dangerouslySetInnerHTML={{__html:
          CHORDPRO_SAMPLE.replace(/\{[^}]+\}\n/g,'').replace(/\[([^\]]+)\]/g, '<span class="ch">[$1]</span>')
        }}/>
    </div>
  );
};

Object.assign(window, { CatalogList, SongDetail, PerfMode });
