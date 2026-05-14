// landing.jsx — borso.fr : juste un titre, quelques liens. Rien de plus.

const { useEffect, useState } = React;

const LINKS = [
  { label: 'Maman',                   href: 'family/mom.html' },
  { label: 'Les sœurs',               href: 'family/les-filles.html' },
  { label: 'Art',                     href: 'art/mondrian' },
  { label: 'Demande de date',         href: "mailto:hugo.borsoni@gmail.com?subject=Demande de date Nom Prénom&body=Coucou tu m'as tapé dans l'oeil allons siroter un verre en terrasse" },
  { label: 'Les 12 travaux de Borso', href: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
];

function Landing(){
  const [open, setOpen] = useState(true);

  // close on Escape
  useEffect(() => {
    const onKey = (e) => { if(e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Reflect open-state on <body> so CSS can react.
  useEffect(() => {
    document.body.classList.toggle('menu-open', open);
  }, [open]);

  return (
    <>
      {/* Title centered, full-screen */}
      <main className="stage">
        <div className="welcome">Bienvenue sur</div>
        <h1 className="title">borso.fr</h1>
      </main>

      {/* Burger toggle (top-left) */}
      <button
        className={`burger ${open ? 'is-open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <line x1="4" y1="4" x2="18" y2="18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <line x1="18" y1="4" x2="4" y2="18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <line x1="3" y1="7" x2="19" y2="7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <line x1="3" y1="15" x2="19" y2="15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      {/* Vertical menu on the right */}
      <nav className={`menu ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <ul>
          {LINKS.map((l, i) => (
            <li key={l.label} style={{ transitionDelay: open ? `${80 + i * 60}ms` : '0ms' }}>
              <a href={l.href}>{l.label}</a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

window.Landing = Landing;
