// Pragma — Members, Instruments admin (with mastery matrix) + Auth screen

// ───────────────────────── Mastery matrix ─────────────────────────
// Editable grid of member × instrument scores 0..10. Centerpiece of the admin section.
const MasteryMatrix = ({ members, instruments, mastery, memberStyle }) => {
  const [m, setM] = React.useState(mastery);

  const set = (mid, iid, v) => {
    setM(prev => ({ ...prev, [mid]: { ...prev[mid], [iid]: v } }));
  };

  return (
    <div className="card" style={{padding:0,overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 18px',
        borderBottom:'1px solid var(--line)',background:'var(--bg-sunk)'}}>
        <div style={{fontSize:11,letterSpacing:'0.14em',textTransform:'uppercase',
          color:'var(--ink-500)',fontWeight:600}}>Matrice de maîtrise</div>
        <span className="muted-strong" style={{fontSize:11.5}}>
          membre × instrument · 0 = ne joue pas, 10 = niveau pro
        </span>
        <span className="spacer"></span>
        <span className="tag-mono">Σ {Object.keys(m).length}×{instruments.length}</span>
      </div>
      <div style={{overflowX:'auto'}}>
        <table className="mtx">
          <thead>
            <tr>
              <th style={{width:140}}></th>
              {instruments.map(i => (
                <th key={i.id} title={i.name}>
                  <div className="mtx-inst">
                    <span>{i.name}</span>
                    {i.harmonic && <span className="tag-mono mtx-h">H</span>}
                  </div>
                </th>
              ))}
              <th style={{width:80, textAlign:'right'}}>moy.</th>
            </tr>
          </thead>
          <tbody>
            {members.map(mb => {
              const row = m[mb.id] || {};
              const vals = Object.values(row).filter(v => v > 0);
              const avg = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
              return (
                <tr key={mb.id}>
                  <td className="mtx-name">
                    <MemberChip member={mb} style={memberStyle} members={members}/>
                  </td>
                  {instruments.map(inst => {
                    const v = row[inst.id] ?? 0;
                    return (
                      <td key={inst.id} className="mtx-cell">
                        <MasteryCell v={v} color={`var(${mb.colorVar})`}
                          onChange={(nv)=>set(mb.id, inst.id, nv)}/>
                      </td>
                    );
                  })}
                  <td className="mtx-avg">
                    <span style={{fontFamily:'var(--t-display)',fontStyle:'italic',
                      fontSize:22,color:`var(${mb.colorVar})`,letterSpacing:'-0.01em'}}>
                      {avg.toFixed(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
            <tr className="mtx-foot">
              <td className="mtx-name">
                <span className="muted-strong" style={{fontSize:11,letterSpacing:'0.1em',
                  textTransform:'uppercase'}}>Moyenne instrument</span>
              </td>
              {instruments.map(inst => {
                const col = members.map(mb => m[mb.id]?.[inst.id] ?? 0).filter(v=>v>0);
                const avg = col.length ? col.reduce((a,b)=>a+b,0)/col.length : 0;
                return (
                  <td key={inst.id} style={{textAlign:'center'}}>
                    <span className="mono" style={{fontSize:12,color:'var(--ink-500)'}}>
                      {avg.toFixed(1)}
                    </span>
                  </td>
                );
              })}
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Editable cell — colored dot grid + click to cycle / scroll-wheel / right-click reset
const MasteryCell = ({ v, color, onChange }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      onClick={(e)=>{
        // click in the dot strip: set value based on x position
        const r = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - r.left;
        const nv = Math.max(0, Math.min(10, Math.round((x / r.width) * 10)));
        onChange(nv);
      }}
      onContextMenu={(e)=>{ e.preventDefault(); onChange(0); }}
      onWheel={(e)=>{
        e.preventDefault();
        onChange(Math.max(0, Math.min(10, v + (e.deltaY < 0 ? 1 : -1))));
      }}
      title={`${v}/10 — clic pour ajuster, molette pour +/-, clic droit pour reset`}
      style={{
        cursor:'pointer', padding:'6px 8px', borderRadius:6,
        background: hover ? 'var(--bg-sunk)' : 'transparent',
        display:'flex', alignItems:'center', gap:6,
      }}>
      <div style={{display:'flex',gap:2,flex:1}}>
        {Array.from({length:10}).map((_,i)=>(
          <div key={i} style={{
            flex:1, height:10, borderRadius:2,
            background: i < v ? color : 'var(--bg-sunk)',
            opacity: i < v ? (0.45 + (i / 12)) : 1,
            border: i < v ? 'none' : '1px solid var(--line)',
          }}/>
        ))}
      </div>
      <span className="mono" style={{fontSize:10.5,color: v ? 'var(--ink-700)':'var(--ink-300)',
        minWidth:18, textAlign:'right'}}>{v || '—'}</span>
    </div>
  );
};

// ───────────────────────── Members admin ─────────────────────────
const MembersAdmin = ({ members, instruments, mastery, songs, defaultLineup,
                       memberStyle, onStyleChange }) => {
  const meanFor = (mid) => {
    const row = mastery[mid] || {};
    const vals = Object.values(row).filter(v=>v>0);
    return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
  };

  return (
    <div className="page">
      <div className="crumb">Administration</div>
      <div className="ph">
        <div>
          <h1>Membres</h1>
          <div className="ph-sub">
            {members.length} membres · chaque membre peut jouer chaque instrument, à des niveaux différents
          </div>
        </div>
        <div className="ph-actions">
          <button className="btn accent"><Icon name="plus"/>Inviter</button>
        </div>
      </div>

      <div className="col" style={{gap:18}}>
        <MasteryMatrix members={members} instruments={instruments}
          mastery={mastery} memberStyle={memberStyle}/>

        <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:18,alignItems:'flex-start'}}>
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <table className="tbl">
              <thead><tr>
                <th></th><th>Nom</th>
                <th>Instrument principal</th>
                <th>Maîtrise moyenne</th>
                <th></th>
              </tr></thead>
              <tbody>
                {members.map(m => {
                  const row = mastery[m.id] || {};
                  const top = Object.entries(row)
                    .sort(([,a],[,b])=>b-a)[0];
                  const topInst = instruments.find(i => i.id === top?.[0]);
                  const avg = meanFor(m.id);
                  return (
                    <tr key={m.id}>
                      <td style={{width:40}}>
                        <MemberChip member={m} style={memberStyle} size="xl" bare members={members}/>
                      </td>
                      <td style={{fontFamily:'var(--t-display)',fontStyle:'italic',fontSize:18}}>{m.name}</td>
                      <td>
                        {topInst && (
                          <span className="chip">
                            {topInst.name} <span className="mono muted" style={{fontSize:10.5}}>{top[1]}/10</span>
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{flex:1,maxWidth:120,height:5,
                            background:'var(--bg-sunk)',borderRadius:3,overflow:'hidden'}}>
                            <div style={{width: `${avg*10}%`, height:'100%',
                              background: `var(${m.colorVar})`,opacity:0.85}}/>
                          </div>
                          <span className="mono" style={{fontSize:11,color:'var(--ink-500)',minWidth:28}}>
                            {avg.toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td><Icon name="more" size={14}/></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <aside className="col" style={{gap:14}}>
            <div className="card">
              <div style={{fontSize:11,letterSpacing:'0.14em',textTransform:'uppercase',
                color:'var(--ink-400)',marginBottom:10,fontWeight:600}}>Traitement visuel</div>
              <div style={{fontSize:12.5,color:'var(--ink-500)',marginBottom:12,lineHeight:1.4}}>
                Comment afficher les membres dans tout l'app.
              </div>
              <div className="col" style={{gap:8}}>
                {['chip','pill','accent','avatar'].map(s => (
                  <button key={s} onClick={()=>onStyleChange(s)}
                    style={{
                      display:'flex',alignItems:'center',gap:10, textAlign:'left',
                      appearance:'none',cursor:'pointer',
                      border: memberStyle===s ? '1.5px solid var(--ink-700)' : '1px solid var(--line)',
                      borderRadius:8,padding:'10px 12px',background:'var(--bg-elev)',
                    }}>
                    <div style={{display:'flex',gap:4,flex:1}}>
                      {members.slice(0,3).map(m => (
                        <MemberChip key={m.id} member={m} style={s} members={members}/>
                      ))}
                    </div>
                    <span className="tag-mono">{s}</span>
                    {memberStyle===s && <Icon name="check" size={14}/>}
                  </button>
                ))}
              </div>
            </div>

            <div className="card flat" style={{background:'var(--bg-sunk)',border:'none'}}>
              <div style={{fontSize:11,letterSpacing:'0.14em',textTransform:'uppercase',
                color:'var(--ink-400)',marginBottom:6,fontWeight:600}}>Note</div>
              <div style={{fontSize:12.5,lineHeight:1.45}}>
                La maîtrise moyenne d'un morceau est la moyenne des cellules de la matrice
                pour le lineup choisi. Visible sur chaque fiche morceau et dans la setlist.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

// ───────────────────────── Instruments admin ─────────────────────────
const InstrumentsAdmin = ({ instruments }) => (
  <div className="page">
    <div className="crumb">Administration</div>
    <div className="ph">
      <div>
        <h1>Instruments</h1>
        <div className="ph-sub">Les instruments harmoniques déclenchent l'algorithme d'avertissement de transition.</div>
      </div>
      <div className="ph-actions">
        <button className="btn accent"><Icon name="plus"/>Ajouter</button>
      </div>
    </div>

    <div className="card" style={{padding:0,overflow:'hidden',maxWidth:540}}>
      <table className="tbl">
        <thead><tr><th>Instrument</th><th>Type</th><th></th></tr></thead>
        <tbody>
          {instruments.map(i => (
            <tr key={i.id}>
              <td style={{fontFamily:'var(--t-display)',fontStyle:'italic',fontSize:17}}>{i.name}</td>
              <td>
                <span className="chip" style={i.harmonic ? {
                  background:'var(--accent-soft)',color:'var(--accent-ink)',borderColor:'transparent'
                } : undefined}>
                  {i.harmonic ? 'Harmonique' : 'Rythmique / voix'}
                </span>
              </td>
              <td><Icon name="more" size={14}/></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ───────────────────────── Auth ─────────────────────────
const AuthScreen = ({ onUnlock }) => {
  const [pwd, setPwd] = React.useState('');
  const [err, setErr] = React.useState(false);
  const submit = (e) => {
    e.preventDefault();
    if (pwd === 'pragma' || pwd === '') { onUnlock(); }
    else { setErr(true); setTimeout(()=>setErr(false), 1200); }
  };
  return (
    <div style={{
      position:'fixed',inset:0,zIndex:1000,
      background:'var(--bg)', display:'flex',alignItems:'center',justifyContent:'center',
      backgroundImage:'radial-gradient(circle at 30% 20%, rgba(196,88,58,0.06), transparent 50%), radial-gradient(circle at 80% 90%, rgba(61,138,138,0.05), transparent 50%)',
    }}>
      <form onSubmit={submit} style={{
        width:380, padding:'40px 36px',
        background:'var(--bg-elev)',border:'1px solid var(--line)',borderRadius:18,
        boxShadow:'0 20px 60px rgba(26,22,18,0.10)',
      }}>
        <div className="logo" style={{
          fontFamily:'var(--t-display)',fontSize:48,fontStyle:'italic',
          marginBottom:4,letterSpacing:'-0.02em',lineHeight:1
        }}>Pragma</div>
        <div style={{fontSize:11,letterSpacing:'0.18em',textTransform:'uppercase',
          color:'var(--ink-500)',marginBottom:24}}>ERP DU GROUPE · v0.1</div>
        <div style={{fontSize:13,color:'var(--ink-700)',marginBottom:18,lineHeight:1.5}}>
          Mot de passe partagé. Si tu l'as oublié, demande à Hugo.
        </div>
        <input className="input" type="password" placeholder="mot de passe"
          value={pwd} onChange={e=>setPwd(e.target.value)} autoFocus
          style={{padding:'12px 14px',fontSize:14,
            borderColor: err ? 'var(--danger)' : undefined,
            animation: err ? 'shake 0.3s' : undefined}}/>
        <button className="btn primary" type="submit"
          style={{width:'100%',justifyContent:'center',padding:'12px',marginTop:12,fontSize:14}}>
          Entrer
        </button>
        <div style={{fontSize:11,color:'var(--ink-400)',marginTop:14,textAlign:'center'}}>
          Indice : c'est le nom du groupe, tout en minuscules.
        </div>
      </form>
      <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }`}</style>
    </div>
  );
};

Object.assign(window, { MembersAdmin, InstrumentsAdmin, AuthScreen, MasteryMatrix });
