const STYLE = `
:root{--bg:#fbfaf7;--fg:#1d1d1b;--muted:#6b6a65;--line:#dedbd2;--dot:#8a8780;--hot:#c2410c;--cell:#f1efe8;--stage-a:#5f8a75;--stage-b:#3a76a0;--stage-c:#c08a12;--stage-d:#d0561f;--stage-e:#a8201a;--good:#2f7d4f;--bad:#b42318;--series-1:#2a78d6}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#161614;--fg:#ecebe6;--muted:#a3a19a;--line:#3a3935;--dot:#8f8c84;--hot:#fb923c;--cell:#211f1c;--stage-a:#82b29b;--stage-b:#6aa6d4;--stage-c:#e3b341;--stage-d:#f08a4b;--stage-e:#f06b5f;--good:#5fbf86;--bad:#f2766b;--series-1:#3987e5;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#161614;--fg:#ecebe6;--muted:#a3a19a;--line:#3a3935;--dot:#8f8c84;--hot:#fb923c;--cell:#211f1c;--stage-a:#82b29b;--stage-b:#6aa6d4;--stage-c:#e3b341;--stage-d:#f08a4b;--stage-e:#f06b5f;--good:#5fbf86;--bad:#f2766b;--series-1:#3987e5;color-scheme:dark}
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
.chips{display:flex;gap:8px;overflow-x:auto;padding:2px 0 10px}
.zoomable{margin:0;flex:none}
.chip{display:flex;flex-direction:column;gap:1px;flex:none;border:1px solid var(--line);border-radius:8px;padding:6px 10px 7px;min-width:104px}
.chip-head{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted);white-space:nowrap}
.chip-value{font-size:16px;font-variant-numeric:tabular-nums;white-space:nowrap}
.chip-goal{font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap}
.chip .bars{display:flex;gap:2px;align-items:flex-end;height:26px;margin-top:5px;border-bottom:1px solid var(--line)}
.chip .bar{width:6px;background:var(--series-1);border-radius:2px 2px 0 0}
.bar.zero{min-height:2px}
.map{padding-bottom:10px}
.zoomable>.zoom{display:none}
.zoomable[open]>summary{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.55);border:0;border-radius:0;padding:0;min-width:0;display:block}
.zoomable[open]>summary>*{display:none}
.zoomable[open]>.zoom{display:flex;position:fixed;inset:0;z-index:61;align-items:center;justify-content:center;padding:16px;pointer-events:none}
.zoom-card{pointer-events:auto;width:80vw;max-width:1500px;height:min(78vh,780px);background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:16px 20px 14px;display:flex;flex-direction:column;gap:12px;box-shadow:0 18px 50px rgba(0,0,0,.3)}
.zoom-title{font-size:15px;font-weight:600;color:var(--fg)}
.plot{display:flex;flex:1;min-height:0}
.y-axis{position:relative;width:4.5em;flex:none}
.y-axis .tick{position:absolute;right:8px;transform:translateY(50%);font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap}
.panel{position:relative;flex:1;min-width:0}
.gridline{position:absolute;left:0;right:0;height:0;border-top:1px solid var(--line);opacity:.7}
.ceiling{position:absolute;left:0;right:0;height:0;border-top:2px dashed var(--bad)}
.series{position:absolute;inset:0;display:flex;align-items:flex-end;gap:2px}
.col{position:relative;flex:1;height:100%;display:flex;align-items:flex-end;justify-content:center}
.col .bar{position:relative;width:100%;max-width:24px;background:var(--series-1);border-radius:4px 4px 0 0}
.col .bar.missing{height:0;background:none;border:0}
.week-value{position:absolute;bottom:100%;left:50%;transform:translate(-50%,-4px);font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap}
.x-axis{display:flex}
.x-pad{width:4.5em;flex:none}
.x-weeks{display:flex;flex:1;gap:2px}
.x-weeks span{flex:1;text-align:center;font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums;min-width:0;overflow:hidden}
.chart-legend{display:flex;gap:16px;font-size:12px;color:var(--muted);align-items:center}
.chart-legend i{display:inline-block;width:12px;height:10px;border-radius:2px;background:var(--series-1);margin-right:6px;vertical-align:-1px}
.chart-legend i.rule{height:0;border-top:2px dashed var(--bad);background:none;border-radius:0;vertical-align:4px}
@media (max-width:640px){.row>summary{flex-wrap:wrap}.row-name{flex:1 0 100%;white-space:normal;overflow:visible}.zoom-card{width:94vw;height:72vh;padding:12px 14px}.y-axis,.x-pad{width:3.2em}}
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
