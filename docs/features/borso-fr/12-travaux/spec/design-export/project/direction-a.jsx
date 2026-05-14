// Direction A — Stèle éditoriale
// Sobre, serif Newsreader, palette ivoire/encre, chiffres romains.
// Clin d'œil mythologique sans le costume.

const { useState, useMemo } = React;

function DirA_StatusPip({ status }) {
  const m = window.BORSO_HELPERS.statusMeta[status];
  const color = {
    ok: '#3b6b3b', warn: '#b07a1a', bad: '#9a3b2c',
    muted: '#8a8377', live: '#2c5a8a', future: '#bcb3a0'
  }[m.color];
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:18, height:18, borderRadius:'50%',
      border:`1px solid ${color}`,
      color:color, fontFamily:'"JetBrains Mono", monospace', fontSize:11, lineHeight:1,
      flexShrink:0
    }}>{m.short}</span>
  );
}

function DirA_MonthStele({ month, isActive, isCurrent, onOpen }) {
  const score = window.BORSO_HELPERS.monthScore(month);
  const pct = score.total ? (score.done / score.total) : 0;
  const roman = window.BORSO_HELPERS.romanNumeral(month.m);

  return (
    <button onClick={onOpen} style={{
      all:'unset', cursor:'pointer', display:'block',
      background: isActive ? '#f3ede0' : '#ece4d2',
      border:`1px solid ${isActive ? '#1a1815' : '#d4caaf'}`,
      padding:'22px 22px 18px', height:'100%', position:'relative',
      transition:'background .15s, border-color .15s',
      boxSizing:'border-box'
    }}
    onMouseEnter={e=>{e.currentTarget.style.background='#f3ede0';}}
    onMouseLeave={e=>{if(!isActive) e.currentTarget.style.background='#ece4d2';}}
    >
      {/* Roman numeral + month name */}
      <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:14}}>
        <div style={{fontFamily:'"Newsreader", serif', fontSize:44, lineHeight:1, color:'#1a1815', fontWeight:300, letterSpacing:'-0.02em'}}>
          {roman}
        </div>
        {isCurrent && <span style={{
          fontFamily:'"JetBrains Mono", monospace', fontSize:9, letterSpacing:'0.12em',
          textTransform:'uppercase', color:'#9a3b2c', border:'1px solid #9a3b2c',
          padding:'2px 6px', borderRadius:2
        }}>en cours</span>}
      </div>
      <div style={{
        fontFamily:'"JetBrains Mono", monospace', fontSize:10, letterSpacing:'0.18em',
        textTransform:'uppercase', color:'#6b6356', marginBottom:18
      }}>
        {month.name}
      </div>

      {/* Challenge list */}
      <div style={{display:'flex', flexDirection:'column', gap:10, minHeight:120}}>
        {month.challenges.map((c, i) => (
          <div key={i} style={{display:'flex', gap:10, alignItems:'flex-start'}}>
            <div style={{paddingTop:1}}><DirA_StatusPip status={c.status} /></div>
            <div style={{
              fontFamily:'"Newsreader", serif', fontSize:15, lineHeight:1.3,
              color:'#1a1815', flex:1
            }}>{c.t}</div>
          </div>
        ))}
      </div>

      {/* Progress bar — bottom */}
      <div style={{position:'absolute', left:22, right:22, bottom:14}}>
        <div style={{
          height:2, background:'#d4caaf', position:'relative', overflow:'hidden'
        }}>
          <div style={{
            position:'absolute', left:0, top:0, bottom:0, width:`${pct*100}%`,
            background:'#1a1815', transition:'width .6s cubic-bezier(.2,.7,.3,1)'
          }} />
        </div>
        <div style={{
          display:'flex', justifyContent:'space-between',
          fontFamily:'"JetBrains Mono", monospace', fontSize:9, color:'#6b6356',
          marginTop:6, letterSpacing:'0.08em'
        }}>
          <span>{month.challenges.length} défi{month.challenges.length>1?'s':''}</span>
          <span>{score.done % 1 === 0 ? score.done : score.done.toFixed(1)} / {score.total}</span>
        </div>
      </div>
    </button>
  );
}

function DirA_DetailPanel({ month, year, onClose }) {
  if (!month) return null;
  const score = window.BORSO_HELPERS.monthScore(month);

  return (
    <div style={{
      position:'absolute', inset:0, background:'rgba(26,24,21,0.4)',
      zIndex:10, display:'flex', justifyContent:'flex-end'
    }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:540, height:'100%', background:'#f6efde', overflowY:'auto',
        borderLeft:'1px solid #1a1815', padding:'40px 44px',
        boxShadow:'-30px 0 60px rgba(26,24,21,0.15)'
      }}>
        <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:4}}>
          <div style={{
            fontFamily:'"JetBrains Mono", monospace', fontSize:10, letterSpacing:'0.18em',
            textTransform:'uppercase', color:'#6b6356'
          }}>
            Travail {window.BORSO_HELPERS.romanNumeral(month.m)} · {year}
          </div>
          <button onClick={onClose} style={{
            all:'unset', cursor:'pointer', fontFamily:'"JetBrains Mono", monospace',
            fontSize:11, color:'#1a1815', borderBottom:'1px solid #1a1815', paddingBottom:1
          }}>fermer ✕</button>
        </div>

        <h2 style={{
          fontFamily:'"Newsreader", serif', fontWeight:300, fontSize:64, lineHeight:1,
          color:'#1a1815', margin:'8px 0 8px', letterSpacing:'-0.02em'
        }}>{month.name}</h2>
        <div style={{
          fontFamily:'"JetBrains Mono", monospace', fontSize:11, color:'#6b6356',
          marginBottom:36, letterSpacing:'0.04em'
        }}>
          {score.done % 1 === 0 ? score.done : score.done.toFixed(1)} défis sur {score.total} aboutis
        </div>

        <div style={{borderTop:'1px solid #d4caaf'}}>
          {month.challenges.map((c, i) => {
            const m = window.BORSO_HELPERS.statusMeta[c.status];
            return (
              <div key={i} style={{borderBottom:'1px solid #d4caaf', padding:'22px 0'}}>
                <div style={{display:'flex', gap:14, alignItems:'flex-start', marginBottom:10}}>
                  <DirA_StatusPip status={c.status} />
                  <div style={{flex:1}}>
                    <div style={{
                      fontFamily:'"Newsreader", serif', fontSize:21, lineHeight:1.25,
                      color:'#1a1815', marginBottom:4
                    }}>{c.t}</div>
                    <div style={{
                      fontFamily:'"JetBrains Mono", monospace', fontSize:10,
                      letterSpacing:'0.12em', textTransform:'uppercase', color:'#6b6356'
                    }}>{m.label} · {c.kind === 'daily' ? 'quotidien' : c.kind === 'count' ? 'objectif chiffré' : 'ponctuel'}</div>
                  </div>
                </div>
                {c.note && (
                  <div style={{
                    fontFamily:'"Newsreader", serif', fontSize:15, lineHeight:1.5,
                    color:'#3a3530', fontStyle:'italic', paddingLeft:32
                  }}>« {c.note} »</div>
                )}
                {c.proofs && c.proofs.length > 0 && (
                  <div style={{paddingLeft:32, marginTop:14, display:'flex', flexWrap:'wrap', gap:8}}>
                    {c.proofs.map((p, j) => (
                      <DirA_ProofChip key={j} p={p} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button style={{
          all:'unset', cursor:'pointer', marginTop:24,
          fontFamily:'"JetBrains Mono", monospace', fontSize:11, color:'#1a1815',
          border:'1px dashed #1a1815', padding:'10px 14px', letterSpacing:'0.08em'
        }}>+ ajouter une preuve</button>
      </div>
    </div>
  );
}

function DirA_ProofChip({ p }) {
  const icons = { photo:'⊡', video:'▷', link:'↗', note:'☰', stat:'#' };
  const labels = { photo:'photo', video:'vidéo', link:p.label||'lien', note:'note', stat:p.v };
  return (
    <span style={{
      fontFamily:'"JetBrains Mono", monospace', fontSize:10, letterSpacing:'0.04em',
      color:'#1a1815', background:'#ece4d2', border:'1px solid #d4caaf',
      padding:'4px 8px', display:'inline-flex', gap:6, alignItems:'center'
    }}>
      <span style={{opacity:0.6}}>{icons[p.type]}</span>
      {p.type === 'stat' ? p.v : (p.type === 'link' ? (p.label || p.v) : (p.v))}
    </span>
  );
}

function DirA_YearHeader({ year, yearData, onSwitch, allYears }) {
  const score = window.BORSO_HELPERS.yearScore(yearData);
  const pct = score.total ? (score.done / score.total) : 0;
  return (
    <div style={{padding:'48px 56px 36px', borderBottom:'1px solid #d4caaf'}}>
      <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:48}}>
        <div style={{flex:1}}>
          <div style={{
            fontFamily:'"JetBrains Mono", monospace', fontSize:11, letterSpacing:'0.2em',
            textTransform:'uppercase', color:'#6b6356', marginBottom:8
          }}>Les douze travaux de Borso</div>
          <h1 style={{
            fontFamily:'"Newsreader", serif', fontWeight:300, fontSize:120, lineHeight:0.9,
            color:'#1a1815', margin:0, letterSpacing:'-0.04em'
          }}>{year}</h1>
          <div style={{
            fontFamily:'"Newsreader", serif', fontStyle:'italic', fontSize:20,
            color:'#3a3530', marginTop:14, maxWidth:520, lineHeight:1.4
          }}>{yearData.subtitle}</div>
        </div>
        <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:24}}>
          <div style={{display:'flex', gap:0}}>
            {allYears.map(y => (
              <button key={y} onClick={()=>onSwitch(y)} style={{
                all:'unset', cursor:'pointer',
                fontFamily:'"JetBrains Mono", monospace', fontSize:11, letterSpacing:'0.12em',
                padding:'8px 16px',
                background: y === year ? '#1a1815' : 'transparent',
                color: y === year ? '#f6efde' : '#1a1815',
                border:'1px solid #1a1815'
              }}>{y}</button>
            ))}
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{
              fontFamily:'"Newsreader", serif', fontSize:72, lineHeight:1, color:'#1a1815',
              fontWeight:300, letterSpacing:'-0.02em'
            }}>
              {score.done % 1 === 0 ? score.done : score.done.toFixed(1)}
              <span style={{color:'#bcb3a0', fontSize:48}}> / {score.total}</span>
            </div>
            <div style={{
              fontFamily:'"JetBrains Mono", monospace', fontSize:10, letterSpacing:'0.14em',
              textTransform:'uppercase', color:'#6b6356', marginTop:6
            }}>défis aboutis · {Math.round(pct*100)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DirA_App() {
  const [year, setYear] = useState(2026);
  const [activeMonth, setActiveMonth] = useState(null);
  const yearData = window.BORSO_DATA.years[year];
  const allYears = Object.keys(window.BORSO_DATA.years).map(Number).sort();
  const today = window.BORSO_DATA.today;

  return (
    <div style={{
      width:'100%', height:'100%', background:'#f6efde', position:'relative', overflow:'hidden',
      fontFamily:'"Newsreader", serif', color:'#1a1815'
    }}>
      <DirA_YearHeader year={year} yearData={yearData} onSwitch={setYear} allYears={allYears} />
      <div style={{padding:'40px 56px'}}>
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:1,
          background:'#d4caaf', border:'1px solid #d4caaf'
        }}>
          {yearData.months.map(m => (
            <div key={m.m} style={{aspectRatio:'0.85'}}>
              <DirA_MonthStele
                month={m}
                isActive={activeMonth && activeMonth.m === m.m}
                isCurrent={year === today.year && m.m === today.month}
                onOpen={()=>setActiveMonth(m)}
              />
            </div>
          ))}
        </div>
        <div style={{
          marginTop:32, display:'flex', gap:24, flexWrap:'wrap',
          fontFamily:'"JetBrains Mono", monospace', fontSize:10, letterSpacing:'0.1em',
          textTransform:'uppercase', color:'#6b6356'
        }}>
          {Object.entries(window.BORSO_HELPERS.statusMeta).map(([k,v]) => (
            <span key={k} style={{display:'inline-flex', gap:8, alignItems:'center'}}>
              <DirA_StatusPip status={k} /> {v.label}
            </span>
          ))}
        </div>
      </div>
      <DirA_DetailPanel month={activeMonth} year={year} onClose={()=>setActiveMonth(null)} />
    </div>
  );
}

window.DirA_App = DirA_App;
