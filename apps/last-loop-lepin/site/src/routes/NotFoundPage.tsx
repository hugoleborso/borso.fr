export function NotFoundPage() {
  return (
    <div className="main col">
      <div className="card">
        <div className="card-body not-found">
          <img src="/404.jpeg" alt="Page introuvable" className="not-found-image" />
          <p className="muted">Page introuvable.</p>
          <a href="/" className="not-found-home">
            Retour à la course
          </a>
        </div>
      </div>
    </div>
  );
}
