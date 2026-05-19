// Pragma — Sessions list + Concert detail + Practice detail

const SessionsList = ({ sessions, onOpen, memberStyle, members }) => {
  const upcoming = sessions.filter(s => s.status !== 'past').sort((a,b)=>a.date.localeCompare(b.date));
  const past = sessions.filter(s => s.status === 'past');
  return (
    <div className="page">
      <div className="crumb">Calendrier</div>
      <div className="ph">
        <div>
          <h1>Sessions</h1>
          <div className="ph-sub">2 concerts à venir · 3 répétitions planifiées · prochain rendez-vous lundi 8 septembre</div>
        </div>
        <div className="ph-actions">
          <button className="btn"><Icon name="calendar" size={14}/>Calendrier</button>
          <button className="btn accent"><Icon name="plus"/>Nouvelle session</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr',gap:32,alignItems:'flex-start'}}>
        <div>
          <div style={{fontSize:11,letterSpacing:'0.14em',textTransform:'uppercase',
            color:'var(--ink-400)',marginBottom:14,fontWeight:600}}>À venir</div>
          <div className="timeline">
            {upcoming.map(s => (
              <div key={s.id} className={`ts-item ${s.kind}`}>
                <div className="dt">{fmtDate(s.date, {weekday:'long', day:'numeric', month:'long'})}</div>
                <SessionCard session={s} onOpen={()=>onOpen(s.id)} members={members} memberStyle={memberStyle}/>
              </div>
            ))}
          </div>

          <div style={{fontSize:11,letterSpacing:'0.14em',textTransform:'uppercase',
            color:'var(--ink-400)',marginTop:24,marginBottom:14,fontWeight:600}}>Passées</div>
          <div className="timeline">
            {past.map(s => (
              <div key={s.id} className={`ts-item ${s.kind}`} style={{opacity:0.7}}>
                <div className="dt">{fmtDate(s.date, {weekday:'long', day:'numeric', month:'long', year:'numeric'})}</div>
                <SessionCard session={s} onOpen={()=>onOpen(s.id)} members={members} memberStyle={memberStyle}/>
              </div>
            ))}
          </div>
        </div>

        <aside className="col" style={{gap:14}}>
          <div className="card" style={{padding:18}}>
            <div className="lede" style={{marginBottom:10}}>
              "Le retour d'expérience de juin est positif — on enchaîne 2 dates en septembre."
            </div>
            <div className="muted-strong" style={{fontSize:11,letterSpacing:'0.08em',
              textTransform:'uppercase'}}>— Hugo, 28 août</div>
          </div>
          <div className="card">
            <div style={{fontSize:11,letterSpacing:'0.14em',textTransform:'uppercase',
              color:'var(--ink-400)',marginBottom:10,fontWeight:600}}>Mois en cours</div>
            <div className="col" style={{gap:8}}>
              <Stat label="Répétitions tenues"   v="3" sub="objectif 4"/>
              <Stat label="Titres travaillés"    v="9" sub="dont 2 nouveaux"/>
              <Stat label="Amis attendus"        v="32" sub="moyenne sur 2 concerts"/>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

const Stat = ({label, v, sub}) => (
  <div style={{display:'flex',alignItems:'baseline',gap:10,padding:'8px 0',
    borderBottom:'1px dashed var(--line)'}}>
    <span style={{fontSize:12.5,flex:1}}>{label}</span>
    <span style={{fontFamily:'var(--t-display)',fontStyle:'italic',fontSize:24,letterSpacing:'-0.01em'}}>{v}</span>
    <span style={{fontSize:10.5,color:'var(--ink-400)',minWidth:80,textAlign:'right'}}>{sub}</span>
  </div>
);

const SessionCard = ({ session, onOpen, members, memberStyle }) => {
  const isConcert = session.kind === 'concert';
  return (
    <div className="card" style={{cursor:'pointer',padding:14}} onClick={onOpen}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
        <span className="chip" style={{
          background: isConcert ? 'var(--ink-900)' : 'var(--bg-sunk)',
          color: isConcert ? 'var(--bg)' : 'var(--ink-500)',
          borderColor: isConcert ? 'var(--ink-900)' : 'var(--line)',
        }}>{isConcert ? 'Concert' : 'Répétition'}</span>
        {isConcert && <span className="tag-mono">{session.capacity} pers.</span>}
        <span className="spacer"></span>
        <Icon name="chevR" size={14}/>
      </div>
      {isConcert ? (
        <>
          <div style={{fontFamily:'var(--t-display)',fontStyle:'italic',fontSize:24,lineHeight:1.1,
            letterSpacing:'-0.01em'}}>{session.venue}</div>
          <div style={{fontSize:12,color:'var(--ink-500)',marginTop:4}}>{session.gear}</div>
        </>
      ) : (
        <div style={{fontFamily:'var(--t-display)',fontStyle:'italic',fontSize:22,lineHeight:1.1}}>
          Répétition · prépare {session.preparedConcertId === 'c01' ? 'Les Disquaires' : 'L\'Alimentation Générale'}
        </div>
      )}
    </div>
  );
};

// ───────────────────────── Concert detail ─────────────────────────

const ConcertDetail = ({ session, members, onBack, onOpenSetlist, memberStyle }) => {
  const totalFriends = Object.values(session.friends || {}).reduce((a,b)=>a+b, 0);
  return (
    <div className="page">
      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:14}}>
        <button className="btn ghost sm" onClick={onBack}><Icon name="chevL" size={14}/>Sessions</button>
        <span style={{color:'var(--ink-300)'}}>/</span>
        <span className="crumb" style={{marginBottom:0}}>{fmtDate(session.date)}</span>
      </div>

      <div className="ph">
        <div>
          <div className="crumb">Concert</div>
          <h1>{session.venue}</h1>
          <div className="ph-sub" style={{display:'flex',gap:14,alignItems:'center'}}>
            <span>{fmtDate(session.date, {weekday:'long',day:'numeric',month:'long'})}</span>
            <span style={{color:'var(--ink-300)'}}>·</span>
            <span>capacité {session.capacity}</span>
            <span style={{color:'var(--ink-300)'}}>·</span>
            <span>{totalFriends} amis attendus</span>
          </div>
        </div>
        <div className="ph-actions">
          <button className="btn"><Icon name="edit" size={14}/>Éditer</button>
          <button className="btn primary" onClick={onOpenSetlist}><Icon name="setlist" size={14}/>Ouvrir la setlist</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap:24,alignItems:'flex-start',marginTop:20}}>
        <div className="col" style={{gap:16}}>
          <div className="card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <div style={{fontSize:11,letterSpacing:'0.14em',textTransform:'uppercase',
                color:'var(--ink-400)',fontWeight:600}}>Amis attendus par membre</div>
              <span className="tag-mono">Σ {totalFriends}</span>
            </div>
            <div className="col" style={{gap:6}}>
              {members.map(m => {
                const n = session.friends?.[m.id] ?? 0;
                const pct = totalFriends ? (n/totalFriends)*100 : 0;
                return (
                  <div key={m.id} style={{display:'flex',alignItems:'center',gap:10}}>
                    <MemberChip member={m} style={memberStyle} bare members={members}/>
                    <span style={{fontSize:12.5,flex:'0 0 80px'}}>{m.name}</span>
                    <div style={{flex:1,height:6,background:'var(--bg-sunk)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{width:`${pct}%`,height:'100%',background:`var(${m.colorVar})`,opacity:0.85}}/>
                    </div>
                    <input className="input" type="number" min="0" defaultValue={n}
                      style={{width:60,padding:'4px 8px',fontFamily:'var(--t-mono)',
                      fontSize:12,textAlign:'right'}}/>
                  </div>
                );
              })}
            </div>
            <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid var(--line)',
              display:'flex',justifyContent:'space-between',fontSize:12.5}}>
              <span className="muted">Taux de remplissage attendu</span>
              <span style={{fontFamily:'var(--t-mono)'}}>
                {Math.round((totalFriends/session.capacity)*100)}% · {totalFriends}/{session.capacity}
              </span>
            </div>
          </div>

          <div className="card">
            <div style={{fontSize:11,letterSpacing:'0.14em',textTransform:'uppercase',
              color:'var(--ink-400)',marginBottom:10,fontWeight:600}}>Matériel</div>
            <textarea className="textarea" defaultValue={session.gear} style={{minHeight:60}}/>
          </div>
        </div>

        <aside className="col" style={{gap:16}}>
          <div className="card">
            <div style={{fontSize:11,letterSpacing:'0.14em',textTransform:'uppercase',
              color:'var(--ink-400)',marginBottom:10,fontWeight:600}}>Préparation</div>
            <div className="col" style={{gap:4}}>
              <PrepRow label="Répétition" date="Lun. 8 sept." done done2/>
              <PrepRow label="Setlist verrouillée" date="Lun. 8 sept." done/>
              <PrepRow label="Affiche envoyée" date="—"/>
              <PrepRow label="Balance" date="Sam. 13, 18h"/>
              <PrepRow label="Concert" date="Sam. 13, 21h" highlight/>
            </div>
          </div>
          <div className="card flat" style={{background:'var(--bg-sunk)',border:'none'}}>
            <div style={{fontSize:11,letterSpacing:'0.14em',textTransform:'uppercase',
              color:'var(--ink-400)',marginBottom:6,fontWeight:600}}>Note pour le groupe</div>
            <div style={{fontSize:12.5,lineHeight:1.5}}>
              Gui rappelle pour la balance vendredi. On arrive 1h avant pour l'install.
              Pensez à amener des t-shirts noirs.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

const PrepRow = ({ label, date, done, highlight }) => (
  <div style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',
    borderBottom:'1px dashed var(--line)'}}>
    <span style={{
      width:14,height:14,borderRadius:999,
      border: done ? 'none' : '1px solid var(--line-strong)',
      background: done ? 'var(--ink-900)' : 'transparent',
      display:'flex',alignItems:'center',justifyContent:'center',color:'var(--bg)',
      flex:'0 0 14px',
    }}>{done && <Icon name="check" size={9}/>}</span>
    <span style={{fontSize:12.5,flex:1, color: highlight ? 'var(--accent)':'inherit',
      fontWeight: highlight ? 600 : 400}}>{label}</span>
    <span style={{fontFamily:'var(--t-mono)',fontSize:11,color:'var(--ink-500)'}}>{date}</span>
  </div>
);

// ───────────────────────── Practice detail ─────────────────────────

const PracticeDetail = ({ session, sessions, songs, members, defaultLineup, onBack, memberStyle, onOpenSetlist }) => {
  const concert = sessions.find(s => s.id === session.preparedConcertId);
  return (
    <div className="page">
      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:14}}>
        <button className="btn ghost sm" onClick={onBack}><Icon name="chevL" size={14}/>Sessions</button>
      </div>

      <div className="ph">
        <div>
          <div className="crumb">Répétition</div>
          <h1>{fmtDate(session.date, {weekday:'long', day:'numeric', month:'long'})}</h1>
          <div className="ph-sub">
            Prépare <span style={{color:'var(--accent)',textDecoration:'underline'}}
              onClick={onOpenSetlist} role="button">{concert?.venue}</span>
            · {concert ? fmtDate(concert.date) : ''}
          </div>
        </div>
        <div className="ph-actions">
          <button className="btn primary" onClick={onOpenSetlist}><Icon name="setlist" size={14}/>Setlist du concert</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr',gap:24,marginTop:20,alignItems:'flex-start'}}>
        <div className="card">
          <div style={{fontSize:11,letterSpacing:'0.14em',textTransform:'uppercase',
            color:'var(--ink-400)',marginBottom:12,fontWeight:600}}>Plan de répèt'</div>
          <div className="col" style={{gap:10}}>
            <PracticeBlock title="Échauffement" dur="15 min" body="Gammes — fa majeur, sol majeur. Tempo 90."/>
            <PracticeBlock title="Bloc 1 — nouveautés" dur="45 min" body="Maniac (refrain), Assassymphonie (intro)."/>
            <PracticeBlock title="Pause" dur="10 min" body=""/>
            <PracticeBlock title="Bloc 2 — setlist filée" dur="60 min" body="Setlist concert dans l'ordre, sans s'arrêter."/>
            <PracticeBlock title="Debrief" dur="15 min" body="Notes de transition. Choix final."/>
          </div>
        </div>

        <aside className="card">
          <div style={{fontSize:11,letterSpacing:'0.14em',textTransform:'uppercase',
            color:'var(--ink-400)',marginBottom:10,fontWeight:600}}>Présences</div>
          <div className="col" style={{gap:6}}>
            {members.map((m, i) => (
              <div key={m.id} style={{display:'flex',alignItems:'center',gap:10,padding:'4px 0'}}>
                <MemberChip member={m} style={memberStyle} bare members={members}/>
                <span style={{fontSize:13,flex:1}}>{m.name}</span>
                <span className="dotrow">
                  <span className={`d ${i<4?'green':'red'}`}></span>
                  <span style={{fontSize:11.5}}>{i<4?'présent':'absent'}</span>
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

const PracticeBlock = ({ title, dur, body }) => (
  <div style={{display:'flex',gap:14,padding:'12px 0',borderBottom:'1px dashed var(--line)'}}>
    <div style={{flex:'0 0 80px',fontFamily:'var(--t-mono)',fontSize:11,color:'var(--ink-500)'}}>{dur}</div>
    <div style={{flex:1}}>
      <div style={{fontSize:14,fontWeight:500}}>{title}</div>
      {body && <div style={{fontSize:12.5,color:'var(--ink-500)',marginTop:2}}>{body}</div>}
    </div>
  </div>
);

Object.assign(window, { SessionsList, ConcertDetail, PracticeDetail });
