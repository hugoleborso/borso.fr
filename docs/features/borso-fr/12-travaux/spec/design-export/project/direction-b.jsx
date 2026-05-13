// Direction B — Carnet de coach
// Dense, log-style. Monospace primary. Dark mode. Frise verticale + heatmap.

const { useState: useStateB, useMemo: useMemoB } = React;

function DirB_StatusBadge({ status }) {
  const m = window.BORSO_HELPERS.statusMeta[status];
  const colors = {
    ok:    { bg: '#1a3a24', fg: '#7ee29a', bd: '#2d5a3a' },
    warn:  { bg: '#3a2e14', fg: '#e8b76a', bd: '#5a4520' },
    bad:   { bg: '#3a1a1a', fg: '#e89090', bd: '#5a2828' },
    muted: { bg: '#252422', fg: '#7a766e', bd: '#3a3833' },
    live:  { bg: '#142a3a', fg: '#7ab8e8', bd: '#20425a' },
    future:{ bg: '#1c1b19', fg: '#5a5852', bd: '#2a2826' }
  }[m.color];
  return (
    <span style={{
      fontFamily:'"IBM Plex Mono", monospace', fontSize:10, letterSpacing:'0.08em',
      textTransform:'uppercase', padding:'3px 7px',
      background: colors.bg, color: colors.fg, border:`1px solid ${colors.bd}`,
      display:'inline-flex', alignItems:'center', gap:6, flexShrink:0
    }}>
      <span style={{
        width:6, height:6, borderRadius:'50%', background: colors.fg
      }} />
      {m.label}
    </span>
  );
}

function DirB_Heatmap({ yearData, currentMonth }) {
  // 12 columns × 5 rows (weeks). Cells colored by month completion.
  const cells = [];
  for (let mi = 0; mi < 12; mi++) {
    const month = yearData.months[mi];
    const score = window.BORSO_HELPERS.monthScore(month);
    const intensity = score.total ? score.done / score.total : 0;
    for (let w = 0; w < 5; w++) {
      const hasContent = w < (month.challenges.length + 1);
      let bg = '#1c1b19';
      if (hasContent) {
        const v = intensity * (0.35 + w*0.16);
        if (month.challenges.some(c=>c.status==='failed' || c.status==='abandoned') && w === month.challenges.length) {
          bg = '#3a1a1a';
        } else if (intensity > 0) {
          bg = `oklch(${0.32 + v*0.4} 0.08 145)`;
        } else if (mi + 1 < currentMonth) {
          bg = '#2a2826';
        }
      }
      cells.push(<div key={`${mi}-${w}`} style={{background:bg, aspectRatio:'1'}} />);
    }
  }
  return (
    <div style={{display:'grid', gridTemplateColumns:'repeat(12, 1fr)', gridTemplateRows:'repeat(5, 1fr)', gap:3, gridAutoFlow:'column'}}>
      {cells}
    </div>
  );
}

function DirB_ProofPill({ p }) {
  const icons = { photo:'IMG', video:'VID', link:'URL', note:'TXT', stat:'NUM' };
  return (
    <span style={{
      fontFamily:'"IBM Plex Mono", monospace', fontSize:10,
      color:'#c8c4b8', background:'#252422', border:'1px solid #3a3833',
      padding:'3px 7px', display:'inline-flex', gap:6, alignItems:'center'
    }}>
      <span style={{color:'#7a766e', letterSpacing:'0.05em'}}>{icons[p.type]}</span>
      {p.type === 'stat' ? p.v : (p.type === 'link' ? (p.label || p.v) : (p.v))}
    </span>
  );
}

function DirB_MonthRow({ month, year, expanded, isCurrent, onToggle }) {
  const score = window.BORSO_HELPERS.monthScore(month);
  const pct = score.total ? (score.done / score.total) : 0;

  return (
    <div style={{borderBottom:'1px solid #2a2826'}}>
      <button onClick={onToggle} style={{
        all:'unset', cursor:'pointer', display:'grid',
        gridTemplateColumns:'72px 1fr 220px 180px 28px',
        gap:24, alignItems:'center', width:'100%', padding:'18px 28px',
        background: expanded ? '#1c1b19' : 'transparent',
        transition:'background .12s', boxSizing:'border-box'
      }}
      onMouseEnter={e=>{if(!expanded) e.currentTarget.style.background='#161513';}}
      onMouseLeave={e=>{if(!expanded) e.currentTarget.style.background='transparent';}}
      >
        <div style={{display:'flex', flexDirection:'column', gap:2}}>
          <div style={{
            fontFamily:'"IBM Plex Mono", monospace', fontSize:11, color:'#7a766e',
            letterSpacing:'0.1em'
          }}>{String(month.m).padStart(2,'0')} · {year}</div>
          <div style={{
            fontFamily:'"IBM Plex Sans", sans-serif', fontSize:22, fontWeight:500,
            color:'#f0ebdf', textTransform:'lowercase', letterSpacing:'-0.01em'
          }}>{month.name}{isCurrent && <span style={{
            color:'#7ab8e8', fontSize:11, marginLeft:8, verticalAlign:'middle',
            fontFamily:'"IBM Plex Mono", monospace'
          }}>● now</span>}</div>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:6}}>
          {month.challenges.slice(0, expanded ? 0 : 99).map((c, i) => (
            <div key={i} style={{
              display:'flex', gap:10, alignItems:'center',
              fontFamily:'"IBM Plex Sans", sans-serif', fontSize:14, color:'#c8c4b8'
            }}>
              <span style={{
                fontFamily:'"IBM Plex Mono", monospace', fontSize:12,
                color: c.status==='done' || c.status==='partial' ? '#7ee29a' : '#5a5852', width:14
              }}>[{c.status==='done' ? 'x' : c.status==='partial' ? '~' : c.status==='failed' ? '!' : c.status==='abandoned' ? '-' : c.status==='doing' ? '>' : ' '}]</span>
              <span>{c.t}</span>
            </div>
          ))}
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:6}}>
          <div style={{height:4, background:'#2a2826', position:'relative', overflow:'hidden'}}>
            <div style={{
              position:'absolute', left:0, top:0, bottom:0, width:`${pct*100}%`,
              background: pct === 1 ? '#7ee29a' : pct > 0 ? '#e8b76a' : '#5a5852',
              transition:'width .8s cubic-bezier(.2,.7,.3,1)'
            }} />
          </div>
          <div style={{
            fontFamily:'"IBM Plex Mono", monospace', fontSize:10, color:'#7a766e',
            letterSpacing:'0.06em', display:'flex', justifyContent:'space-between'
          }}>
            <span>{score.done % 1 === 0 ? score.done : score.done.toFixed(1)}/{score.total} aboutis</span>
            <span>{Math.round(pct*100)}%</span>
          </div>
        </div>

        <div style={{display:'flex', gap:4, flexWrap:'wrap', justifyContent:'flex-end'}}>
          {month.challenges.map((c,i)=>(
            <div key={i} style={{
              width:10, height:10, borderRadius:'50%',
              background: ({done:'#7ee29a', partial:'#e8b76a', failed:'#e89090', abandoned:'#5a5852', doing:'#7ab8e8', todo:'#2a2826'})[c.status]
            }} />
          ))}
        </div>

        <div style={{
          fontFamily:'"IBM Plex Mono", monospace', fontSize:14, color:'#7a766e',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition:'transform .15s'
        }}>›</div>
      </button>

      {expanded && (
        <div style={{padding:'8px 28px 32px 124px', background:'#1c1b19'}}>
          {month.challenges.map((c, i) => (
            <div key={i} style={{
              padding:'18px 0', borderTop:'1px dashed #2a2826',
              display:'grid', gridTemplateColumns:'180px 1fr', gap:32
            }}>
              <div>
                <DirB_StatusBadge status={c.status} />
                <div style={{
                  fontFamily:'"IBM Plex Mono", monospace', fontSize:10, color:'#7a766e',
                  marginTop:8, letterSpacing:'0.06em'
                }}>{c.kind === 'daily' ? 'QUOTIDIEN' : c.kind === 'count' ? 'OBJECTIF CHIFFRÉ' : 'PONCTUEL'}</div>
              </div>
              <div>
                <div style={{
                  fontFamily:'"IBM Plex Sans", sans-serif', fontSize:18, fontWeight:500,
                  color:'#f0ebdf', marginBottom:8, lineHeight:1.3
                }}>{c.t}</div>
                {c.note && (
                  <div style={{
                    fontFamily:'"IBM Plex Sans", sans-serif', fontSize:14, color:'#a8a49a',
                    lineHeight:1.5, marginBottom:14
                  }}>{c.note}</div>
                )}
                {c.proofs && c.proofs.length > 0 ? (
                  <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                    {c.proofs.map((p,j) => <DirB_ProofPill key={j} p={p} />)}
                  </div>
                ) : (
                  <div style={{
                    fontFamily:'"IBM Plex Mono", monospace', fontSize:10, color:'#5a5852'
                  }}>// pas encore de preuve</div>
                )}
                <button style={{
                  all:'unset', cursor:'pointer', marginTop:14,
                  fontFamily:'"IBM Plex Mono", monospace', fontSize:10, color:'#7ab8e8',
                  border:'1px solid #20425a', padding:'5px 9px', letterSpacing:'0.08em',
                  textTransform:'uppercase'
                }}>+ ajouter preuve</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DirB_App() {
  const [year, setYear] = useStateB(2026);
  const [expanded, setExpanded] = useStateB(null);
  const yearData = window.BORSO_DATA.years[year];
  const allYears = Object.keys(window.BORSO_DATA.years).map(Number).sort();
  const today = window.BORSO_DATA.today;
  const score = window.BORSO_HELPERS.yearScore(yearData);
  const pct = score.total ? (score.done / score.total) : 0;

  return (
    <div style={{
      width:'100%', minHeight:'100%', background:'#0f0e0c', color:'#f0ebdf',
      fontFamily:'"IBM Plex Sans", sans-serif'
    }}>
      {/* Top bar */}
      <div style={{padding:'24px 28px', borderBottom:'1px solid #2a2826', display:'flex',
        justifyContent:'space-between', alignItems:'center'}}>
        <div style={{display:'flex', gap:24, alignItems:'baseline'}}>
          <div style={{
            fontFamily:'"IBM Plex Mono", monospace', fontSize:11, color:'#7a766e',
            letterSpacing:'0.18em', textTransform:'uppercase'
          }}>~/borso/travaux</div>
          <div style={{
            fontFamily:'"IBM Plex Mono", monospace', fontSize:11, color:'#5a5852'
          }}>last sync · 11 mai 2026 14:32</div>
        </div>
        <div style={{display:'flex', gap:0}}>
          {allYears.map(y => (
            <button key={y} onClick={()=>setYear(y)} style={{
              all:'unset', cursor:'pointer',
              fontFamily:'"IBM Plex Mono", monospace', fontSize:11, padding:'6px 12px',
              background: y === year ? '#f0ebdf' : 'transparent',
              color: y === year ? '#0f0e0c' : '#a8a49a',
              border:'1px solid #2a2826', letterSpacing:'0.1em'
            }}>{y}</button>
          ))}
        </div>
      </div>

      {/* Hero */}
      <div style={{padding:'40px 28px 28px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:48}}>
        <div>
          <div style={{
            fontFamily:'"IBM Plex Mono", monospace', fontSize:11, color:'#7a766e',
            letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:14
          }}>12 travaux · édition {year - 2024}</div>
          <h1 style={{
            fontFamily:'"IBM Plex Sans", sans-serif', fontWeight:600, fontSize:88, lineHeight:0.95,
            margin:0, letterSpacing:'-0.04em', color:'#f0ebdf'
          }}>{yearData.title.toLowerCase()}.</h1>
          <div style={{
            fontFamily:'"IBM Plex Sans", sans-serif', fontSize:16, color:'#a8a49a',
            marginTop:18, lineHeight:1.5, maxWidth:480
          }}>{yearData.subtitle}</div>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:18}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16}}>
            <DirB_Stat label="aboutis" value={`${score.done % 1 === 0 ? score.done : score.done.toFixed(1)}/${score.total}`} accent="#7ee29a" />
            <DirB_Stat label="taux" value={`${Math.round(pct*100)}%`} accent="#e8b76a" />
            <DirB_Stat label="restants" value={yearData.months.reduce((a,m)=>a+m.challenges.filter(c=>c.status==='todo'||c.status==='doing').length,0)} accent="#7ab8e8" />
          </div>
          <div>
            <div style={{
              fontFamily:'"IBM Plex Mono", monospace', fontSize:10, color:'#7a766e',
              letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:8
            }}>vue d'année — chaque colonne = un mois</div>
            <DirB_Heatmap yearData={yearData} currentMonth={year === today.year ? today.month : 13} />
          </div>
        </div>
      </div>

      {/* Header row */}
      <div style={{
        display:'grid', gridTemplateColumns:'72px 1fr 220px 180px 28px', gap:24,
        padding:'12px 28px', borderTop:'1px solid #2a2826', borderBottom:'1px solid #2a2826',
        fontFamily:'"IBM Plex Mono", monospace', fontSize:10, color:'#7a766e',
        letterSpacing:'0.14em', textTransform:'uppercase'
      }}>
        <div>mois</div>
        <div>défis</div>
        <div>progression</div>
        <div style={{textAlign:'right'}}>statuts</div>
        <div></div>
      </div>

      {/* Rows */}
      <div>
        {yearData.months.map(m => (
          <DirB_MonthRow
            key={m.m}
            month={m}
            year={year}
            expanded={expanded === m.m}
            isCurrent={year === today.year && m.m === today.month}
            onToggle={()=>setExpanded(expanded === m.m ? null : m.m)}
          />
        ))}
      </div>
    </div>
  );
}

function DirB_Stat({ label, value, accent }) {
  return (
    <div style={{border:'1px solid #2a2826', padding:'14px 16px'}}>
      <div style={{
        fontFamily:'"IBM Plex Mono", monospace', fontSize:10, color:'#7a766e',
        letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:6
      }}>{label}</div>
      <div style={{
        fontFamily:'"IBM Plex Sans", sans-serif', fontSize:32, fontWeight:500,
        color:accent, letterSpacing:'-0.02em'
      }}>{value}</div>
    </div>
  );
}

window.DirB_App = DirB_App;
