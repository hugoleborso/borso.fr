// Direction C — Frise magazine
// Editorial spread. Instrument Serif + Space Grotesk. Big imagery. Saffron accent.

const { useState: useStateC, useMemo: useMemoC } = React;

const DIRC_ACCENT = '#e85a25'; // warm saffron
const DIRC_INK = '#171410';
const DIRC_PAPER = '#f4ede1';
const DIRC_MUTED = '#8a8175';
const DIRC_RULE = '#1a1815';

function DirC_StatusTag({ status, big }) {
  const m = window.BORSO_HELPERS.statusMeta[status];
  const colorMap = {
    ok: DIRC_INK, warn: '#a86b16', bad: '#9a3b2c',
    muted: DIRC_MUTED, live: DIRC_ACCENT, future: DIRC_MUTED
  };
  const bg = status === 'doing' ? DIRC_ACCENT : 'transparent';
  const fg = status === 'doing' ? DIRC_PAPER : colorMap[m.color];
  return (
    <span style={{
      fontFamily:'"Space Grotesk", sans-serif', fontWeight:500,
      fontSize: big ? 12 : 10, letterSpacing:'0.16em', textTransform:'uppercase',
      padding: big ? '5px 10px' : '3px 7px', background: bg, color: fg,
      border:`1px solid ${status === 'doing' ? DIRC_ACCENT : fg}`,
      display:'inline-flex', alignItems:'center', gap:6
    }}>
      {m.label}
    </span>
  );
}

function DirC_ImageSlot({ label, height, color }) {
  // Striped placeholder with monospace caption
  return (
    <div style={{
      height: height || 240, background: `repeating-linear-gradient(135deg, ${color || '#d6cdb8'} 0 8px, ${color === DIRC_ACCENT ? '#d44b1c' : '#cec4ad'} 8px 16px)`,
      position:'relative', overflow:'hidden',
      display:'flex', alignItems:'flex-end'
    }}>
      <div style={{
        fontFamily:'"Space Grotesk", monospace', fontSize:10, letterSpacing:'0.14em',
        textTransform:'uppercase', color:'#fff', background:'rgba(23,20,16,0.85)',
        padding:'4px 8px', margin:8
      }}>{label}</div>
    </div>
  );
}

function DirC_FeaturedMonth({ month, year }) {
  const score = window.BORSO_HELPERS.monthScore(month);
  const pct = score.total ? (score.done / score.total) : 0;
  const heroChallenge = month.challenges[0];

  return (
    <article style={{
      borderTop:`1px solid ${DIRC_RULE}`,
      borderBottom:`1px solid ${DIRC_RULE}`,
      padding:'32px 0 36px', display:'grid',
      gridTemplateColumns:'320px 1fr', gap:48
    }}>
      <div>
        <DirC_ImageSlot label={`photo ${month.name} · ${heroChallenge.t.slice(0,30)}`} height={420} />
      </div>
      <div>
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16
        }}>
          <div style={{display:'flex', gap:12, alignItems:'center'}}>
            <div style={{
              fontFamily:'"Space Grotesk", sans-serif', fontWeight:600, fontSize:11,
              letterSpacing:'0.22em', textTransform:'uppercase', color:DIRC_ACCENT
            }}>Mois en focus · {String(month.m).padStart(2,'0')}/{year}</div>
          </div>
          <div style={{
            fontFamily:'"Space Grotesk", sans-serif', fontSize:13, color:DIRC_MUTED
          }}>{score.done % 1 === 0 ? score.done : score.done.toFixed(1)} sur {score.total} aboutis</div>
        </div>

        <h2 style={{
          fontFamily:'"Instrument Serif", serif', fontWeight:400, fontSize:108, lineHeight:0.88,
          margin:'0 0 4px', color:DIRC_INK, letterSpacing:'-0.02em'
        }}>{month.name}.</h2>

        {/* Big progress bar */}
        <div style={{margin:'24px 0 32px'}}>
          <div style={{
            height:8, background:'#d6cdb8', position:'relative', overflow:'hidden'
          }}>
            <div style={{
              position:'absolute', left:0, top:0, bottom:0, width:`${pct*100}%`,
              background:DIRC_ACCENT, transition:'width 1s cubic-bezier(.2,.7,.3,1)'
            }} />
          </div>
        </div>

        {/* Challenges */}
        <div style={{display:'flex', flexDirection:'column', gap:20}}>
          {month.challenges.map((c, i) => (
            <div key={i} style={{
              display:'grid', gridTemplateColumns:'28px 1fr', gap:20,
              paddingBottom:20, borderBottom: i < month.challenges.length-1 ? '1px dashed #c8bea4' : 'none'
            }}>
              <div style={{
                fontFamily:'"Instrument Serif", serif', fontSize:32, color:DIRC_ACCENT,
                lineHeight:1, fontStyle:'italic'
              }}>{i+1}.</div>
              <div>
                <div style={{
                  fontFamily:'"Instrument Serif", serif', fontSize:26, lineHeight:1.15,
                  color:DIRC_INK, marginBottom:8, letterSpacing:'-0.01em'
                }}>{c.t}</div>
                <div style={{display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom: c.note ? 10 : 0}}>
                  <DirC_StatusTag status={c.status} />
                  <span style={{
                    fontFamily:'"Space Grotesk", sans-serif', fontSize:11, color:DIRC_MUTED,
                    letterSpacing:'0.12em', textTransform:'uppercase'
                  }}>{c.kind === 'daily' ? 'quotidien' : c.kind === 'count' ? 'chiffré' : 'ponctuel'}</span>
                </div>
                {c.note && (
                  <div style={{
                    fontFamily:'"Instrument Serif", serif', fontStyle:'italic', fontSize:17,
                    color:'#3a3530', lineHeight:1.4, marginBottom:10
                  }}>« {c.note} »</div>
                )}
                {c.proofs && c.proofs.length > 0 && (
                  <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                    {c.proofs.map((p, j) => (
                      <span key={j} style={{
                        fontFamily:'"Space Grotesk", sans-serif', fontSize:11,
                        color:DIRC_INK, background:'#e6dcc4', padding:'4px 9px',
                        letterSpacing:'0.02em',
                        display:'inline-flex', gap:6, alignItems:'center'
                      }}>
                        <span style={{color:DIRC_ACCENT, fontWeight:600}}>
                          {({photo:'◳', video:'▷', link:'↗', note:'¶', stat:'#'})[p.type]}
                        </span>
                        {p.type === 'stat' ? p.v : (p.type === 'link' ? (p.label || p.v) : (p.v))}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <button style={{
          all:'unset', cursor:'pointer', marginTop:20,
          fontFamily:'"Space Grotesk", sans-serif', fontSize:12, fontWeight:500,
          color:DIRC_INK, border:`1px solid ${DIRC_INK}`, padding:'10px 16px',
          letterSpacing:'0.1em', textTransform:'uppercase'
        }}>+ ajouter une preuve</button>
      </div>
    </article>
  );
}

function DirC_FilmstripCard({ month, year, active, isCurrent, onSelect }) {
  const score = window.BORSO_HELPERS.monthScore(month);
  const pct = score.total ? (score.done / score.total) : 0;
  return (
    <button onClick={onSelect} style={{
      all:'unset', cursor:'pointer', display:'flex', flexDirection:'column',
      gap:0, height:'100%',
      background: active ? DIRC_INK : 'transparent',
      color: active ? DIRC_PAPER : DIRC_INK,
      border: `1px solid ${active ? DIRC_INK : '#c8bea4'}`,
      transition:'all .15s'
    }}
    onMouseEnter={e=>{if(!active){e.currentTarget.style.borderColor=DIRC_INK;}}}
    onMouseLeave={e=>{if(!active){e.currentTarget.style.borderColor='#c8bea4';}}}
    >
      <div style={{padding:'14px 14px 10px', borderBottom:`1px solid ${active ? '#3a3530' : '#c8bea4'}`,
        display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <span style={{
          fontFamily:'"Space Grotesk", sans-serif', fontWeight:600, fontSize:10,
          letterSpacing:'0.18em', textTransform:'uppercase', opacity: active ? 0.7 : 0.55
        }}>{String(month.m).padStart(2,'0')}</span>
        {isCurrent && <span style={{
          width:6, height:6, borderRadius:'50%', background:DIRC_ACCENT
        }} />}
      </div>
      <div style={{padding:'12px 14px 14px', flex:1, display:'flex', flexDirection:'column'}}>
        <div style={{
          fontFamily:'"Instrument Serif", serif', fontSize:24, lineHeight:0.95,
          letterSpacing:'-0.01em', marginBottom:8
        }}>{month.name}</div>
        <div style={{
          fontFamily:'"Space Grotesk", sans-serif', fontSize:10,
          letterSpacing:'0.04em', opacity: active ? 0.7 : 0.55, lineHeight:1.4,
          flex:1, marginBottom:12
        }}>
          {month.challenges.slice(0,2).map(c => c.t).join(' · ')}
          {month.challenges.length > 2 && ` +${month.challenges.length-2}`}
        </div>
        <div style={{display:'flex', gap:3, marginBottom:8}}>
          {month.challenges.map((c,i)=>(
            <div key={i} style={{
              flex:1, height:3,
              background: ({done:'#7ee29a', partial:'#e8b76a', failed:'#e89090', abandoned:active?'#5a5852':'#bcb3a0', doing:DIRC_ACCENT, todo:active?'#3a3530':'#d6cdb8'})[c.status]
            }} />
          ))}
        </div>
        <div style={{
          fontFamily:'"Space Grotesk", sans-serif', fontSize:10,
          opacity: active ? 0.7 : 0.55, letterSpacing:'0.08em'
        }}>{score.done % 1 === 0 ? score.done : score.done.toFixed(1)}/{score.total}</div>
      </div>
    </button>
  );
}

function DirC_App() {
  const [year, setYear] = useStateC(2026);
  const [selected, setSelected] = useStateC(5);
  const yearData = window.BORSO_DATA.years[year];
  const allYears = Object.keys(window.BORSO_DATA.years).map(Number).sort();
  const today = window.BORSO_DATA.today;
  const score = window.BORSO_HELPERS.yearScore(yearData);
  const pct = score.total ? (score.done / score.total) : 0;
  const featured = yearData.months.find(m => m.m === selected) || yearData.months[0];

  return (
    <div style={{
      width:'100%', minHeight:'100%', background:DIRC_PAPER, color:DIRC_INK,
      fontFamily:'"Space Grotesk", sans-serif', padding:'36px 48px 48px',
      boxSizing:'border-box'
    }}>
      {/* Masthead */}
      <div style={{
        display:'flex', justifyContent:'space-between', alignItems:'center',
        paddingBottom:14, borderBottom:`1px solid ${DIRC_RULE}`
      }}>
        <div style={{display:'flex', gap:18, alignItems:'baseline'}}>
          <a href="https://borso.fr" style={{
            fontFamily:'"Space Grotesk", sans-serif', fontWeight:600, fontSize:12,
            letterSpacing:'0.18em', textTransform:'uppercase', color:DIRC_INK,
            textDecoration:'none', borderBottom:`1px solid ${DIRC_INK}`, paddingBottom:1
          }}>borso<span style={{color:DIRC_ACCENT}}>.</span>fr</a>
          <div style={{
            fontFamily:'"Space Grotesk", sans-serif', fontWeight:500, fontSize:11,
            letterSpacing:'0.18em', textTransform:'uppercase', color:DIRC_MUTED
          }}>chronique mensuelle · n° {year - 2024}</div>
        </div>
        <div style={{display:'flex', gap:0}}>
          {allYears.map(y => (
            <button key={y} onClick={()=>{setYear(y); setSelected(1);}} style={{
              all:'unset', cursor:'pointer',
              fontFamily:'"Space Grotesk", sans-serif', fontWeight:500, fontSize:12,
              padding:'8px 14px',
              background: y === year ? DIRC_INK : 'transparent',
              color: y === year ? DIRC_PAPER : DIRC_INK,
              border:`1px solid ${DIRC_INK}`, letterSpacing:'0.08em'
            }}>{y}</button>
          ))}
        </div>
      </div>

      {/* Title — Les 12 travaux */}
      <div style={{
        padding:'48px 0 28px', borderBottom:`1px solid ${DIRC_RULE}`,
        display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:32
      }}>
        <h1 style={{
          fontFamily:'"Instrument Serif", serif', fontWeight:400, fontSize:148,
          lineHeight:0.85, margin:0, letterSpacing:'-0.035em', color:DIRC_INK,
          fontStyle:'italic'
        }}>
          Les douze<br/>travaux<span style={{color:DIRC_ACCENT, fontStyle:'normal'}}>.</span>
        </h1>
        <div style={{
          textAlign:'right', maxWidth:380, paddingBottom:10
        }}>
          <div style={{
            fontFamily:'"Space Grotesk", sans-serif', fontWeight:600, fontSize:11,
            letterSpacing:'0.22em', textTransform:'uppercase', color:DIRC_ACCENT,
            marginBottom:10
          }}>Le projet</div>
          <div style={{
            fontFamily:'"Instrument Serif", serif', fontStyle:'italic', fontSize:20,
            lineHeight:1.3, color:DIRC_INK
          }}>
            Douze défis par an, un par mois. Parfois plusieurs. Parfois manqués. Toujours consignés ici.
          </div>
        </div>
      </div>

      {/* Hero — year */}
      <div className="dirc-hero" style={{
        display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:48,
        padding:'40px 0 32px', borderBottom:`1px solid ${DIRC_RULE}`,
        alignItems:'end'
      }}>
        <div>
          <div style={{
            fontFamily:'"Space Grotesk", sans-serif', fontWeight:600, fontSize:12,
            letterSpacing:'0.22em', textTransform:'uppercase', color:DIRC_MUTED,
            marginBottom:10
          }}>Édition</div>
          <h2 style={{
            fontFamily:'"Instrument Serif", serif', fontWeight:400, fontSize:220,
            lineHeight:0.82, margin:0, letterSpacing:'-0.045em', color:DIRC_INK
          }}>{year}</h2>
          <div style={{
            fontFamily:'"Instrument Serif", serif', fontStyle:'italic', fontSize:30,
            color:DIRC_INK, marginTop:18, maxWidth:520, lineHeight:1.2
          }}>{yearData.title}<span style={{color:DIRC_ACCENT}}>.</span></div>
          <div style={{
            fontFamily:'"Space Grotesk", sans-serif', fontSize:14, color:'#3a3530',
            marginTop:12, maxWidth:520, lineHeight:1.5
          }}>{yearData.subtitle}</div>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:14}}>
          <div style={{
            display:'flex', justifyContent:'space-between', alignItems:'baseline'
          }}>
            <div style={{
              fontFamily:'"Space Grotesk", sans-serif', fontWeight:500, fontSize:11,
              letterSpacing:'0.18em', textTransform:'uppercase', color:DIRC_MUTED
            }}>Bilan en cours</div>
            <div style={{
              fontFamily:'"Instrument Serif", serif', fontSize:72, lineHeight:0.9,
              color:DIRC_INK
            }}>
              {score.done % 1 === 0 ? score.done : score.done.toFixed(1)}<span style={{color:DIRC_ACCENT}}>/</span>{score.total}
            </div>
          </div>
          <div style={{height:10, background:'#d6cdb8', position:'relative', overflow:'hidden'}}>
            <div style={{
              position:'absolute', left:0, top:0, bottom:0, width:`${pct*100}%`,
              background:DIRC_INK, transition:'width 1s cubic-bezier(.2,.7,.3,1)'
            }} />
            <div style={{
              position:'absolute', left:`${pct*100}%`, top:-3, bottom:-3, width:2,
              background:DIRC_ACCENT
            }} />
          </div>
          <div style={{
            display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginTop:6
          }}>
            <DirC_MiniStat label="Quotidiens" value={yearData.months.reduce((a,m)=>a+m.challenges.filter(c=>c.kind==='daily').length,0)} />
            <DirC_MiniStat label="Ponctuels" value={yearData.months.reduce((a,m)=>a+m.challenges.filter(c=>c.kind==='oneshot').length,0)} />
            <DirC_MiniStat label="Restants" value={yearData.months.reduce((a,m)=>a+m.challenges.filter(c=>c.status==='todo'||c.status==='doing').length,0)} accent />
          </div>
        </div>
      </div>

      {/* Featured */}
      <DirC_FeaturedMonth month={featured} year={year} />

      {/* Filmstrip */}
      <div style={{marginTop:32}}>
        <div style={{
          display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14
        }}>
          <div style={{
            fontFamily:'"Space Grotesk", sans-serif', fontWeight:600, fontSize:11,
            letterSpacing:'0.22em', textTransform:'uppercase', color:DIRC_INK
          }}>L'année en douze chapitres</div>
          <div style={{
            fontFamily:'"Space Grotesk", sans-serif', fontSize:11, color:DIRC_MUTED,
            letterSpacing:'0.04em'
          }}>cliquer pour mettre en focus</div>
        </div>
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(12, minmax(0, 1fr))', gap:8,
          minHeight:200
        }}>
          {yearData.months.map(m => (
            <DirC_FilmstripCard
              key={m.m} month={m} year={year}
              active={selected === m.m}
              isCurrent={year === today.year && m.m === today.month}
              onSelect={()=>setSelected(m.m)}
            />
          ))}
        </div>
      </div>

      {/* Footer rule */}
      <div style={{
        marginTop:36, paddingTop:14, borderTop:`1px solid ${DIRC_RULE}`,
        display:'flex', justifyContent:'space-between',
        fontFamily:'"Space Grotesk", sans-serif', fontSize:11, color:DIRC_MUTED,
        letterSpacing:'0.06em'
      }}>
        <span>borso.fr · les 12 travaux</span>
        <span>Reprise de la mesure le 1<sup>er</sup> de chaque mois.</span>
      </div>
    </div>
  );
}

function DirC_MiniStat({ label, value, accent }) {
  return (
    <div style={{
      borderTop:`1px solid ${DIRC_RULE}`, paddingTop:8
    }}>
      <div style={{
        fontFamily:'"Space Grotesk", sans-serif', fontWeight:500, fontSize:10,
        letterSpacing:'0.16em', textTransform:'uppercase', color:DIRC_MUTED, marginBottom:4
      }}>{label}</div>
      <div style={{
        fontFamily:'"Instrument Serif", serif', fontSize:36, lineHeight:1,
        color: accent ? DIRC_ACCENT : DIRC_INK
      }}>{value}</div>
    </div>
  );
}

window.DirC_App = DirC_App;
