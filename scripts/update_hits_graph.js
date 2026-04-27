const fs = require("fs");
const path = require("path");

const API_URL = "https://hits.sh/api/urns/github.com/dukedanya/KAKOITOVPN/";
const OUT_FILE = path.join(__dirname, "..", "assets", "hits-graph.svg");

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function lastDays(days, endDay) {
  const today = new Date(`${endDay}T00:00:00Z`);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (days - index - 1));
    return date.toISOString().slice(0, 10);
  });
}

function renderSvg(payload) {
  const values = new Map();

  for (const item of payload.items || []) {
    for (const point of item.data || []) {
      values.set(point.day, (values.get(point.day) || 0) + Number(point.value || 0));
    }
  }

  const dataDays = [...values.keys()].sort();
  const endDay = dataDays.at(-1) || new Date().toISOString().slice(0, 10);
  const days = lastDays(30, endDay);
  const series = days.map((day) => ({ day, value: values.get(day) || 0 }));
  const max = Math.max(1, ...series.map((point) => point.value));
  const chart = { x: 48, y: 82, width: 724, height: 148 };
  const gap = 5;
  const barWidth = (chart.width - gap * (series.length - 1)) / series.length;

  const bars = series
    .map((point, index) => {
      const height = Math.max(point.value === 0 ? 2 : 8, (point.value / max) * chart.height);
      const x = chart.x + index * (barWidth + gap);
      const y = chart.y + chart.height - height;
      const fill = point.value === 0 ? "#d9e6f2" : "#0088cc";
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${height.toFixed(1)}" rx="3" fill="${fill}"><title>${escapeXml(point.day)}: ${point.value}</title></rect>`;
    })
    .join("\n    ");

  const monthFormatter = new Intl.DateTimeFormat("ru-RU", { month: "short", day: "numeric", timeZone: "UTC" });
  const firstLabel = monthFormatter.format(new Date(`${series[0].day}T00:00:00Z`));
  const lastLabel = monthFormatter.format(new Date(`${series.at(-1).day}T00:00:00Z`));
  const generatedAt = new Date().toISOString().replace("T", " ").slice(0, 16);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="820" height="300" viewBox="0 0 820 300" role="img" aria-labelledby="title desc">
  <title id="title">График просмотров README</title>
  <desc id="desc">Просмотры GitHub README за последние 30 дней по данным hits.sh.</desc>
  <rect width="820" height="300" rx="16" fill="#f7fbff"/>
  <rect x="1" y="1" width="818" height="298" rx="15" fill="none" stroke="#d7e6f3"/>
  <text x="48" y="44" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#102033">Просмотры README</text>
  <text x="48" y="68" font-family="Arial, sans-serif" font-size="13" fill="#5d7184">Последние 30 дней · всего ${Number(payload.total || 0)} · месяц ${Number(payload.monthly || 0)} · неделя ${Number(payload.weekly || 0)}</text>
  <line x1="${chart.x}" y1="${chart.y}" x2="${chart.x + chart.width}" y2="${chart.y}" stroke="#e4eef7"/>
  <line x1="${chart.x}" y1="${chart.y + chart.height / 2}" x2="${chart.x + chart.width}" y2="${chart.y + chart.height / 2}" stroke="#e4eef7"/>
  <line x1="${chart.x}" y1="${chart.y + chart.height}" x2="${chart.x + chart.width}" y2="${chart.y + chart.height}" stroke="#ccddea"/>
  <text x="30" y="${chart.y + 4}" font-family="Arial, sans-serif" font-size="11" fill="#7b8fa1" text-anchor="end">${max}</text>
  <text x="30" y="${chart.y + chart.height + 4}" font-family="Arial, sans-serif" font-size="11" fill="#7b8fa1" text-anchor="end">0</text>
  <g>
    ${bars}
  </g>
  <text x="${chart.x}" y="258" font-family="Arial, sans-serif" font-size="12" fill="#5d7184">${escapeXml(firstLabel)}</text>
  <text x="${chart.x + chart.width}" y="258" font-family="Arial, sans-serif" font-size="12" fill="#5d7184" text-anchor="end">${escapeXml(lastLabel)}</text>
  <text x="48" y="282" font-family="Arial, sans-serif" font-size="11" fill="#8aa0b4">Обновлено: ${generatedAt} UTC · источник: hits.sh</text>
</svg>
`;
}

async function main() {
  const response = await fetch(API_URL, { headers: { "User-Agent": "KAKOITOVPN README graph updater" } });
  if (!response.ok) {
    throw new Error(`hits.sh API returned ${response.status}`);
  }

  const payload = await response.json();
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, renderSvg(payload));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
