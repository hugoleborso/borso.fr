const STYLE = `
:root{--bg:#fbfaf7;--fg:#1d1d1b;--muted:#6b6a65;--line:#dedbd2;--dot:#8a8780;--hot:#c2410c;--cell:#f1efe8;--stage-a:#5f8a75;--stage-b:#3a76a0;--stage-c:#c08a12;--stage-d:#d0561f;--stage-e:#a8201a;--good:#2f7d4f;--bad:#b42318}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#161614;--fg:#ecebe6;--muted:#a3a19a;--line:#3a3935;--dot:#8f8c84;--hot:#fb923c;--cell:#211f1c;--stage-a:#82b29b;--stage-b:#6aa6d4;--stage-c:#e3b341;--stage-d:#f08a4b;--stage-e:#f06b5f;--good:#5fbf86;--bad:#f2766b;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#161614;--fg:#ecebe6;--muted:#a3a19a;--line:#3a3935;--dot:#8f8c84;--hot:#fb923c;--cell:#211f1c;--stage-a:#82b29b;--stage-b:#6aa6d4;--stage-c:#e3b341;--stage-d:#f08a4b;--stage-e:#f06b5f;--good:#5fbf86;--bad:#f2766b;color-scheme:dark}
body{margin:0;padding-block:24px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}
main{max-width:1280px;margin:0 auto}h1{font-size:26px;margin:0 0 4px}h2{font-size:19px;margin:32px 0 8px}h3{font-size:16px;margin:20px 0 4px}
p{color:var(--muted);max-width:70ch}.scroll{overflow-x:auto}table{border-collapse:collapse}
th,td{border:1px solid var(--line);padding:6px 8px;vertical-align:top;text-align:left;font-size:13px}
td.cell{background:var(--cell);min-width:64px}.dot{display:inline-block;width:11px;height:11px;border-radius:50%;
background:var(--dot);margin:1px;opacity:.45}.dot.recent{opacity:1}.dot.engaged{box-shadow:0 0 0 2px var(--fg)}
.stage-a{background:var(--stage-a)}.stage-b{background:var(--stage-b)}.stage-c{background:var(--stage-c)}.stage-d{background:var(--stage-d)}.stage-e{background:var(--stage-e)}
.legend{display:flex;flex-wrap:wrap;gap:12px;font-size:13px;color:var(--muted)}.legend .dot{opacity:1}
.bars{display:flex;gap:2px;align-items:flex-end;height:48px}.bar{width:10px;background:var(--hot);min-height:1px}
.bar.zero{background:var(--line)}.bar.missing{background:none;border-bottom:1px dashed var(--line)}
.sections{display:grid;grid-template-columns:1fr;gap:12px;margin-top:12px}
details.section{margin:0;border:1px solid var(--line);border-radius:8px;min-width:0}
details.section>summary{display:flex;align-items:center;gap:10px;padding:10px 12px}
details.section>summary h2{margin:0;font-size:18px}
summary::-webkit-details-marker{display:none}summary::marker{content:""}
.score{margin-left:auto;font-size:13px;font-variant-numeric:tabular-nums;border:1px solid var(--line);border-radius:999px;padding:1px 8px;white-space:nowrap}
.score.ok{color:var(--good);border-color:var(--good)}.score.ko{color:var(--bad);border-color:var(--bad)}.score.unjudged{color:var(--muted)}
.warn{color:var(--stage-c);font-size:14px;cursor:help;line-height:1}
.rows{padding:0 12px 10px}
.row{margin:0;border-top:1px solid var(--line)}
.row>summary{display:flex;align-items:center;gap:12px;padding:9px 0;min-width:0}
.row-name{font-size:13px;font-weight:600;flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pips{display:flex;gap:5px;align-items:center;flex:1;flex-wrap:wrap;min-width:0}
.tiles{display:flex;gap:6px;overflow-x:auto;padding:2px 0 6px}
.tile{flex:none;border:1px solid var(--line);border-radius:6px;padding:3px 8px;min-width:88px;display:flex;flex-direction:column;cursor:help}
.tile-head{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted);white-space:nowrap}
.tile-value{font-size:15px;font-variant-numeric:tabular-nums;white-space:nowrap}
.tile-goal{font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap}
.flag{width:9px;height:9px;border-radius:50%;background:var(--dot);flex:none}
.flag.ok{background:var(--good)}.flag.ko{background:var(--bad)}
.charts{display:flex;flex-wrap:wrap;gap:10px;padding:2px 0 10px}
.chart{border:1px solid var(--line);border-radius:6px;padding:6px 8px;cursor:zoom-in;color:inherit;text-decoration:none;display:block}
.chart-app{display:block;font-size:11px;color:var(--muted);margin-bottom:3px}
.chart .bars{height:32px;gap:2px;border-bottom:1px solid var(--line)}.chart .bar{width:6px}
.bar.zero{min-height:2px}
.map{padding-bottom:10px}
.zoom{display:none}
.zoom:target{display:flex;position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.62);align-items:center;justify-content:center;padding:16px;text-decoration:none;color:inherit;cursor:zoom-out}
.zoom-card{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:16px 20px 12px;width:min(1600px,97vw);height:min(900px,90vh);display:flex;flex-direction:column;gap:10px}
.zoom-title{font-size:15px;font-weight:600}
.zoom-plot{position:relative;flex:1;min-height:0;border-bottom:1px solid var(--line)}
.zoom-plot .bars{height:100%;width:100%;gap:6px}
.zoom-plot .bar{width:auto;flex:1;min-width:6px}
.ceiling{position:absolute;left:0;right:0;border-top:1px dashed var(--bad)}
.ticks{display:flex;gap:6px;font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums}
.ticks span{flex:1;text-align:center;min-width:0;overflow:hidden}
@media (max-width:640px){.row>summary{flex-wrap:wrap}.row-name{flex:1 0 100%;white-space:normal;overflow:visible}.zoom-card{height:70vh;padding:12px}}
.bars.small{height:24px}.bars.small .bar{width:6px}ol li,ul li{margin-bottom:6px}details{margin:4px 0 12px}summary{cursor:pointer}`;

export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderQualityPage(title: string, body: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark"><title>${escapeHtml(title)}</title><style>${STYLE}</style></head>
<body><main>
<h1>${escapeHtml(title)}</h1>
${body}
</main></body></html>
`;
}

export function renderQualityFragment(title: string, note: string, body: string): string {
  return `<title>${escapeHtml(title)}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${STYLE}</style>
<main>
<h1 title="${escapeHtml(note)}">${escapeHtml(title)}</h1>
${body}
</main>
`;
}
