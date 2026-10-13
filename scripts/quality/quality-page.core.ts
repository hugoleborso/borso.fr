const STYLE = `
:root{--bg:#fbfaf7;--fg:#1d1d1b;--muted:#6b6a65;--line:#dedbd2;--dot:#8a8780;--hot:#c2410c;--cell:#f1efe8;--stage-a:#5f8a75;--stage-b:#3a76a0;--stage-c:#c08a12;--stage-d:#d0561f;--stage-e:#a8201a;--good:#2f7d4f;--bad:#b42318}
@media (prefers-color-scheme:dark){:root{--bg:#161614;--fg:#ecebe6;--muted:#a3a19a;--line:#3a3935;--dot:#8f8c84;--hot:#fb923c;--cell:#211f1c;--stage-a:#82b29b;--stage-b:#6aa6d4;--stage-c:#e3b341;--stage-d:#f08a4b;--stage-e:#f06b5f;--good:#5fbf86;--bad:#f2766b}}
body{margin:0;padding:24px 16px;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}
main{max-width:1100px;margin:0 auto}h1{font-size:26px;margin:0 0 4px}h2{font-size:19px;margin:32px 0 8px}h3{font-size:16px;margin:20px 0 4px}
p{color:var(--muted);max-width:70ch}.scroll{overflow-x:auto}table{border-collapse:collapse}
th,td{border:1px solid var(--line);padding:6px 8px;vertical-align:top;text-align:left;font-size:13px}
td.cell{background:var(--cell);min-width:64px}.dot{display:inline-block;width:11px;height:11px;border-radius:50%;
background:var(--dot);margin:1px;opacity:.45}.dot.recent{opacity:1}.dot.engaged{box-shadow:0 0 0 2px var(--fg)}
.stage-a{background:var(--stage-a)}.stage-b{background:var(--stage-b)}.stage-c{background:var(--stage-c)}.stage-d{background:var(--stage-d)}.stage-e{background:var(--stage-e)}
.legend{display:flex;flex-wrap:wrap;gap:12px;font-size:13px;color:var(--muted)}.legend .dot{opacity:1}
.bars{display:flex;gap:2px;align-items:flex-end;height:48px}.bar{width:10px;background:var(--hot);min-height:1px}
.bar.zero{background:var(--line)}.bar.missing{background:none;border-bottom:1px dashed var(--line)}
.pillars{display:grid;grid-template-columns:1fr;gap:16px}@media (min-width:1024px){.pillars{grid-template-columns:repeat(3,minmax(0,1fr))}}
.pillar{border:1px solid var(--line);border-radius:8px;padding:12px;min-width:0}.pillar h2{margin:0 0 8px}
.value{font-size:18px;font-variant-numeric:tabular-nums}.value.over{color:var(--bad)}.value.within{color:var(--good)}.status{color:var(--muted);font-size:12px}
.banner{border:1px solid var(--bad);color:var(--bad);border-radius:8px;padding:8px 12px;margin:12px 0}.bars.small{height:24px}.bars.small .bar{width:6px}ol li,ul li{margin-bottom:6px}details{margin:4px 0 12px}summary{cursor:pointer}`;

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
