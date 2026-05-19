// Pragma — main app

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dark": false,
  "density": "comfortable",
  "memberStyle": "chip",
  "energyViz": "sparkline",
  "frame": "desktop",
  "mobileDragMode": "handle",
  "palette": ["#c4583a", "#f4efe6", "#1a1612"],
  "offline": false,
  "showInstall": false
}/*EDITMODE-END*/;

const ROUTES = {
  catalog: 'Catalogue', song: 'Catalogue',
  sessions: 'Sessions', concert: 'Sessions', practice: 'Sessions',
  setlist: 'Setlist',
  bars: 'Bars',
  members: 'Membres',
  instr: 'Instruments',
};

const App = () => {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, _setRoute] = React.useState('catalog');
  const [subId, setSubId] = React.useState(null);
  const [authed, setAuthed] = React.useState(true);
  const [perfSong, setPerfSong] = React.useState(null);
  const [showPrompt, setShowPrompt] = React.useState(false);

  const [bars, setBars] = React.useState(window.PragmaData.BARS);
  const [barsView, setBarsView] = React.useState('kanban');

  const D = window.PragmaData;

  const setRoute = (r, id) => { _setRoute(r); setSubId(id || null); };

  // apply theme to root
  React.useEffect(() => {
    document.documentElement.dataset.theme = t.dark ? 'dark' : 'light';
    document.documentElement.dataset.density = t.density;
    // apply accent color from palette[0]
    if (t.palette && t.palette[0]) {
      document.documentElement.style.setProperty('--accent', t.palette[0]);
    }
  }, [t.dark, t.density, t.palette]);

  if (!authed) return <AuthScreen onUnlock={()=>setAuthed(true)}/>;

  // ----- desktop view inner -----
  const DesktopContent = () => {
    if (route === 'catalog')
      return <CatalogList songs={D.SONGS} members={D.MEMBERS} instruments={D.INSTRUMENTS}
        defaultLineup={D.defaultLineup} onOpen={(id)=>setRoute('song', id)}
        density={t.density} memberStyle={t.memberStyle}/>;
    if (route === 'song') {
      const song = D.SONGS.find(s => s.id === subId);
      return <SongDetail songId={subId} songs={D.SONGS} members={D.MEMBERS}
        instruments={D.INSTRUMENTS} defaultLineup={D.defaultLineup}
        onBack={()=>setRoute('catalog')} memberStyle={t.memberStyle}
        onPerf={()=>setPerfSong(song)}/>;
    }
    if (route === 'sessions')
      return <SessionsList sessions={D.SESSIONS} members={D.MEMBERS}
        memberStyle={t.memberStyle} onOpen={(id)=>{
          const s = D.SESSIONS.find(x=>x.id===id);
          setRoute(s.kind === 'concert' ? 'concert' : 'practice', id);
        }}/>;
    if (route === 'concert') {
      const session = D.SESSIONS.find(s => s.id === subId);
      return <ConcertDetail session={session} members={D.MEMBERS}
        onBack={()=>setRoute('sessions')} onOpenSetlist={()=>setRoute('setlist')}
        memberStyle={t.memberStyle}/>;
    }
    if (route === 'practice') {
      const session = D.SESSIONS.find(s => s.id === subId);
      return <PracticeDetail session={session} sessions={D.SESSIONS} songs={D.SONGS}
        members={D.MEMBERS} defaultLineup={D.defaultLineup}
        onBack={()=>setRoute('sessions')} onOpenSetlist={()=>setRoute('setlist')}
        memberStyle={t.memberStyle}/>;
    }
    if (route === 'setlist')
      return <SetlistEditor songs={D.SONGS} members={D.MEMBERS} instruments={D.INSTRUMENTS}
        badTransitions={D.BAD_TRANSITIONS} transitionComments={D.TRANSITION_COMMENTS}
        initialSetlist={D.SETLIST_SEP25} defaultLineup={D.defaultLineup}
        mastery={D.MASTERY} meanMasteryForSong={D.meanMasteryForSong}
        memberStyle={t.memberStyle} energyViz={t.energyViz} density={t.density}
        mobileDragMode={t.mobileDragMode}/>;
    if (route === 'bars')
      return <BarsView bars={bars} setBars={setBars} view={barsView} setView={setBarsView}
        members={D.MEMBERS} memberStyle={t.memberStyle}/>;
    if (route === 'members')
      return <MembersAdmin members={D.MEMBERS} instruments={D.INSTRUMENTS}
        mastery={D.MASTERY} songs={D.SONGS} defaultLineup={D.defaultLineup}
        memberStyle={t.memberStyle}
        onStyleChange={(v)=>setTweak('memberStyle', v)}/>;
    if (route === 'instr')
      return <InstrumentsAdmin instruments={D.INSTRUMENTS}/>;
    return null;
  };

  // ----- mobile view inner -----
  const MobileContent = ({ embed }) => {
    const onOpenSession = (id) => {
      const s = D.SESSIONS.find(x => x.id === id);
      setRoute(s.kind==='concert' ? 'concert' : 'practice', id);
    };
    let body;
    if (route === 'catalog')
      body = <MobileCatalog songs={D.SONGS} members={D.MEMBERS} instruments={D.INSTRUMENTS}
        defaultLineup={D.defaultLineup} memberStyle={t.memberStyle}
        onOpen={(id)=>setRoute('song', id)}/>;
    else if (route === 'song') {
      const song = D.SONGS.find(s=>s.id===subId);
      body = <MobileSongDetail song={song} members={D.MEMBERS} instruments={D.INSTRUMENTS}
        lineup={D.defaultLineup[song.id]} memberStyle={t.memberStyle}
        onBack={()=>setRoute('catalog')}
        onPerf={()=>setPerfSong(song)}/>;
    }
    else if (route === 'setlist' || route === 'concert' || route === 'practice')
      body = <MobileSetlist songs={D.SONGS} members={D.MEMBERS} instruments={D.INSTRUMENTS}
        defaultLineup={D.defaultLineup} memberStyle={t.memberStyle}
        initialSetlist={D.SETLIST_SEP25} badTransitions={D.BAD_TRANSITIONS}
        mobileDragMode={t.mobileDragMode} energyViz={t.energyViz}/>;
    else if (route === 'sessions')
      body = <MobileSessions sessions={D.SESSIONS} members={D.MEMBERS}
        memberStyle={t.memberStyle} onOpen={onOpenSession}/>;
    else if (route === 'bars')
      body = <MobileBars bars={bars} members={D.MEMBERS} memberStyle={t.memberStyle}/>;
    else if (route === 'members')
      body = <MobileCatalog songs={D.SONGS} members={D.MEMBERS} instruments={D.INSTRUMENTS}
        defaultLineup={D.defaultLineup} memberStyle={t.memberStyle} onOpen={()=>{}}/>;
    else body = <MobileCatalog songs={D.SONGS} members={D.MEMBERS} instruments={D.INSTRUMENTS}
        defaultLineup={D.defaultLineup} memberStyle={t.memberStyle} onOpen={()=>{}}/>;

    return (
      <div style={{position:'relative',height:'100%',background:'var(--bg)',overflow:'hidden'}}>
        {body}
        {t.showInstall && embed && <InstallPrompt onClose={()=>setTweak('showInstall', false)}
          onInstall={()=>setTweak('showInstall', false)}/>}
        <MobileNav route={route} setRoute={setRoute}/>
      </div>
    );
  };

  const DesktopFrame = ({ inner }) => (
    <div className="app-shell">
      <Sidebar route={route} setRoute={setRoute} offline={t.offline}/>
      <div className="main">
        {t.offline && <OfflineBanner/>}
        {inner}
      </div>
    </div>
  );

  // ─── Render frame ───
  let frame;
  if (t.frame === 'mobile') {
    frame = (
      <div className="ios-stage" style={{
        minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:30
      }}>
        <IOSDevice width={402} height={874}>
          <MobileContent embed/>
        </IOSDevice>
      </div>
    );
  } else if (t.frame === 'split') {
    frame = (
      <div className="split-stage">
        <div className="split-desk">
          <DesktopFrame inner={<DesktopContent/>}/>
        </div>
        <div className="split-mob">
          <IOSDevice width={380} height={780}>
            <MobileContent embed/>
          </IOSDevice>
        </div>
      </div>
    );
  } else {
    frame = <DesktopFrame inner={<DesktopContent/>}/>;
  }

  return (
    <>
      {frame}
      {perfSong && <PerfMode song={perfSong} onClose={()=>setPerfSong(null)}/>}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Cadre"/>
        <TweakRadio label="Format"
          value={t.frame}
          options={['desktop','mobile','split']}
          onChange={(v)=>setTweak('frame', v)}/>

        <TweakSection label="Style des membres"/>
        <TweakRadio label="Traitement"
          value={t.memberStyle}
          options={['chip','pill','accent','avatar']}
          onChange={(v)=>setTweak('memberStyle', v)}/>
        <div style={{display:'flex',gap:4,padding:'4px 0'}}>
          {window.PragmaData.MEMBERS.map(m => (
            <MemberChip key={m.id} member={m} style={t.memberStyle} members={window.PragmaData.MEMBERS}/>
          ))}
        </div>

        <TweakSection label="Courbe d'énergie"/>
        <TweakSelect label="Style"
          value={t.energyViz}
          options={['sparkline','bars','stripe','gradient']}
          onChange={(v)=>setTweak('energyViz', v)}/>

        <TweakSection label="Mobile · setlist"/>
        <TweakSelect label="Drag pattern"
          value={t.mobileDragMode}
          options={['handle','longpress','card']}
          onChange={(v)=>setTweak('mobileDragMode', v)}/>

        <TweakSection label="Thème"/>
        <TweakToggle label="Mode sombre"
          value={t.dark} onChange={(v)=>setTweak('dark', v)}/>
        <TweakRadio label="Densité"
          value={t.density}
          options={['comfortable','compact']}
          onChange={(v)=>setTweak('density', v)}/>
        <TweakColor label="Accent"
          value={t.palette[0]}
          options={['#c4583a','#3d8a8a','#c4912b','#8a4870','#6e8a48']}
          onChange={(v)=>setTweak('palette', [v, t.palette[1], t.palette[2]])}/>

        <TweakSection label="État système"/>
        <TweakToggle label="Hors-ligne"
          value={t.offline} onChange={(v)=>setTweak('offline', v)}/>
        <TweakToggle label="Prompt d'install (PWA)"
          value={t.showInstall} onChange={(v)=>setTweak('showInstall', v)}/>
        <TweakButton onClick={()=>setAuthed(false)}>Voir l'écran de connexion</TweakButton>
      </TweaksPanel>
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
