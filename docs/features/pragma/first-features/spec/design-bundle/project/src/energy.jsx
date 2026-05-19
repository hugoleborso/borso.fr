// Pragma — energy curve visualization (4 styles)
// Tweakable: 'sparkline' | 'bars' | 'stripe' | 'gradient'

const energyColor = (e) => {
  // 1..10 → cool to warm in current accent's hue
  if (e == null) return 'var(--bg-sunk)';
  const t = (e - 1) / 9;
  // interpolate between sage and accent
  return `oklch(${65 + t*5}% ${0.06 + t*0.13} ${110 - t*70})`;
};

const EnergySparkline = ({ values, w = 360, h = 64, accent = 'var(--accent)' }) => {
  if (!values?.length) return null;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * w;
    const y = h - 6 - ((v ?? 5) / 10) * (h - 12);
    return [x, y];
  });
  // smooth curve via Catmull-Rom-ish
  const d = pts.map((p, i) => {
    if (i === 0) return `M ${p[0]} ${p[1]}`;
    const prev = pts[i - 1];
    const cx = (prev[0] + p[0]) / 2;
    return `Q ${prev[0]} ${prev[1]} ${cx} ${(prev[1] + p[1]) / 2} T ${p[0]} ${p[1]}`;
  }).join(' ');
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="ec-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.32"/>
          <stop offset="100%" stopColor={accent} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill="url(#ec-grad)"/>
      <path d={d} stroke={accent} strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill={accent}/>
      ))}
      {/* min/max labels */}
      {values.length > 2 && (
        <>
          <text x="2" y={h-2} fontSize="9" fontFamily="JetBrains Mono" fill="var(--ink-400)">
            début {values[0]}
          </text>
          <text x={w-2} y={h-2} fontSize="9" fontFamily="JetBrains Mono" fill="var(--ink-400)" textAnchor="end">
            fin {values[values.length-1]}
          </text>
        </>
      )}
    </svg>
  );
};

const EnergyBars = ({ values, h = 72 }) => (
  <div style={{display:'flex',alignItems:'flex-end',gap:6,height:h,padding:'4px 0'}}>
    {values.map((v, i) => (
      <div key={i} style={{
        flex:1,
        height: `${((v ?? 5) / 10) * 100}%`,
        background: energyColor(v),
        borderRadius: '3px 3px 0 0',
        opacity: v == null ? 0.3 : 1,
        position: 'relative',
      }} title={`${i+1}. énergie ${v ?? '—'}`}>
        <span style={{position:'absolute',top:-14,left:'50%',transform:'translateX(-50%)',
          fontSize:9,fontFamily:'JetBrains Mono',color:'var(--ink-400)'}}>{v ?? '—'}</span>
      </div>
    ))}
  </div>
);

// Big stage chart — used in the side panel
const EnergyStage = ({ values, songs, members, h = 280 }) => {
  if (!values?.length) return null;
  const w = 380;
  return (
    <div>
      <EnergySparkline values={values} w={w} h={h*0.45} />
      <div style={{display:'flex',gap:4,marginTop:8}}>
        {values.map((v, i) => (
          <div key={i} style={{flex:1, display:'flex',flexDirection:'column',gap:3, alignItems:'center'}}>
            <div style={{
              width:'100%', height:6, borderRadius:3,
              background: energyColor(v), opacity: v==null?0.25:1,
            }}/>
            <div style={{fontSize:9, fontFamily:'JetBrains Mono', color:'var(--ink-400)'}}>{i+1}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Vertical strip for an individual row (in 'stripe' style)
const EnergyStripe = ({ value, h = 38 }) => (
  <div style={{
    width: 4, borderRadius: 2, height: h,
    background: `linear-gradient(to top, ${energyColor(value)}, ${energyColor(value-1)})`,
  }}/>
);

// inline gradient bar across full row width (in 'gradient' style)
const EnergyGradientFill = ({ value }) => (
  <div style={{
    position:'absolute', left:0, top:0, bottom:0,
    width: `${(value/10)*100}%`,
    background: `linear-gradient(90deg, ${energyColor(value)} 0%, transparent 100%)`,
    opacity: 0.18, borderRadius:'inherit', pointerEvents:'none',
  }}/>
);

Object.assign(window, { EnergySparkline, EnergyBars, EnergyStage, EnergyStripe, EnergyGradientFill, energyColor });
