// Pragma — sidebar, mobile nav, offline banner

const NAV_ITEMS = [
  { id: 'catalog',    label: 'Catalogue',    icon: 'catalog',  badge: '25' },
  { id: 'sessions',   label: 'Sessions',     icon: 'sessions', badge: '6'  },
  { id: 'setlist',    label: 'Setlist',      icon: 'setlist',  badge: null },
  { id: 'bars',       label: 'Bars',         icon: 'bars',     badge: '10' },
];
const NAV_ADMIN = [
  { id: 'members',    label: 'Membres',      icon: 'members',  badge: '5'  },
  { id: 'instr',      label: 'Instruments',  icon: 'instr',    badge: '7'  },
];

const Sidebar = ({ route, setRoute, offline }) => (
  <nav className="sidebar">
    <div className="logo">Pragma<small>ERP DU GROUPE</small></div>
    {offline && (
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',
        background:'var(--bg-elev)',border:'1px solid var(--line)',borderRadius:8,
        fontSize:11,color:'var(--ink-500)'}}>
        <Icon name="cloudOff" size={14} />
        Hors-ligne — lecture seule
      </div>
    )}
    <div style={{display:'flex',flexDirection:'column',gap:1}}>
      {NAV_ITEMS.map(it => (
        <div key={it.id} className={`nav-item ${route.startsWith(it.id)?'active':''}`}
             onClick={() => setRoute(it.id)}>
          <Icon name={it.icon} />
          <span>{it.label}</span>
          {it.badge && <span className="badge">{it.badge}</span>}
        </div>
      ))}
    </div>
    <div className="nav-section">Administration</div>
    <div style={{display:'flex',flexDirection:'column',gap:1}}>
      {NAV_ADMIN.map(it => (
        <div key={it.id} className={`nav-item ${route.startsWith(it.id)?'active':''}`}
             onClick={() => setRoute(it.id)}>
          <Icon name={it.icon} />
          <span>{it.label}</span>
          {it.badge && <span className="badge">{it.badge}</span>}
        </div>
      ))}
    </div>
    <div className="me">
      <MemberChip member="hugo" size="lg" bare members={window.PragmaData.MEMBERS} />
      <div>
        <div className="name">Hugo</div>
        <div className="sub">Pragma · v0.1</div>
      </div>
    </div>
  </nav>
);

const MOB_NAV = [
  { id:'catalog', label:'Cat.', icon:'catalog'},
  { id:'sessions',label:'Sessions', icon:'sessions'},
  { id:'setlist', label:'Setlist', icon:'setlist'},
  { id:'bars',    label:'Bars',    icon:'bars'},
  { id:'members', label:'Plus',    icon:'more'},
];
const MobileNav = ({ route, setRoute }) => (
  <div className="mob-nav">
    {MOB_NAV.map(it => (
      <div key={it.id} className={`nb ${route.startsWith(it.id)?'active':''}`} onClick={()=>setRoute(it.id)}>
        <Icon name={it.icon} size={22}/>
        <span>{it.label}</span>
      </div>
    ))}
  </div>
);

const OfflineBanner = () => (
  <div className="banner-offline">
    <span className="pulse"></span>
    <span style={{fontWeight:500}}>Mode hors-ligne</span>
    <span style={{opacity:0.7}}>— catalogue, accords et setlist du prochain concert disponibles. Toute modification est désactivée.</span>
    <span className="spacer"></span>
    <span className="kbd" style={{background:'rgba(255,255,255,0.06)',borderColor:'rgba(255,255,255,0.12)',color:'#f4e2c8'}}>R</span>
    <span style={{opacity:0.6,fontSize:11}}>réessayer</span>
  </div>
);

const InstallPrompt = ({ onClose, onInstall }) => (
  <div style={{
    position:'absolute', left:16, right:16, bottom: 80, zIndex: 50,
    background:'var(--bg-elev)', border:'1px solid var(--line-strong)',
    borderRadius: 14, padding:'14px 14px 12px',
    boxShadow:'0 18px 50px rgba(26,22,18,0.18)',
    display:'flex', gap:12, alignItems:'flex-start',
  }}>
    <div style={{width:38,height:38,borderRadius:10,background:'var(--accent)',
      display:'flex',alignItems:'center',justifyContent:'center',color:'#fff8f3',flex:'0 0 38px'}}>
      <Icon name="install" size={20}/>
    </div>
    <div style={{flex:1}}>
      <div style={{fontWeight:600,fontSize:13.5,marginBottom:2}}>Installer Pragma</div>
      <div style={{fontSize:12,color:'var(--ink-500)',lineHeight:1.4}}>
        Accroche l'app à ton écran d'accueil pour la consulter en répèt' sans réseau.
      </div>
      <div style={{display:'flex',gap:6,marginTop:10}}>
        <button className="btn primary sm" onClick={onInstall}>Installer</button>
        <button className="btn ghost sm" onClick={onClose}>Plus tard</button>
      </div>
    </div>
  </div>
);

Object.assign(window, { Sidebar, MobileNav, OfflineBanner, InstallPrompt });
