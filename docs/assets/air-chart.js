const chart = document.querySelector('[data-air-chart]');
const canvas = chart.querySelector('canvas');
const context = canvas.getContext('2d');
const range = chart.querySelector('input[type="range"]');
const output = chart.querySelector('output');
const formatDate = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' });
const formatNumber = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });
const colors = ['#236456', '#a44835'];
const fills = ['#23645665', '#a4483565'];
const day = 86_400_000;

async function enableChart() {
  const response = await fetch('chart-data.json');
  if (!response.ok) throw new Error(`Chart data unavailable (${response.status})`);
  const { start, values } = await response.json();
  const startDate = Date.parse(`${start}T00:00:00Z`);
  const dateAt = index => new Date(startDate + index * day);
  const peak = Math.max(100, ...values.flat().filter(Number.isFinite));
  const step = [50, 100, 200, 250, 500, 1000].find(interval => peak / interval <= 4) ?? 2000;
  const ceiling = Math.ceil(peak / step) * step;
  const years = [];
  for (let year = dateAt(0).getUTCFullYear() + 1; year <= dateAt(values.length - 1).getUTCFullYear(); year++) {
    years.push({year, index: (Date.UTC(year, 0, 1) - startDate) / day});
  }
  const describe = value => Number.isFinite(value) ? formatNumber.format(value) : 'unavailable';
  const panelMode = () => chart.querySelector('input[name="chart-view"]:checked').value === 'panels';

  range.max = values.length - 1;
  range.value = values.length - 1;
  chart.hidden = false;
  chart.parentElement.querySelector('[data-static-chart]').hidden = true;

  function draw() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const left = 47;
    const right = width - 18;
    const margin = 35;
    const center = height / 2;
    const panels = panelMode();
    const panelHeight = center - margin - (panels ? 18 : 0);
    const baselines = panels ? [center - 18, height - margin] : [center, center];
    const direction = panels ? [-1, -1] : [-1, 1];
    const x = index => left + (right - left) * index / (values.length - 1);
    const y = (side, value) => baselines[side] + direction[side] * panelHeight * value / ceiling;

    function line(x1, y1, x2, y2, color) {
      context.strokeStyle = color;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
    }

    context.font = '11px ui-monospace, monospace';
    context.textBaseline = 'middle';
    context.textAlign = 'right';
    context.fillStyle = '#526056';
    for (let side = 0; side < 2; side++) {
      for (let value = 0; value <= ceiling; value += step) {
        if (side === 1 && value === 0 && !panels) continue;
        const py = y(side, value);
        line(left, py, right, py, value === 0 ? '#7c887e' : '#d7dacf');
        context.fillText(formatNumber.format(value), left - 7, py);
      }
    }

    context.textAlign = 'center';
    for (const {index} of years) {
      const px = x(index);
      line(px, margin, px, height - margin, '#e4e6de');
    }

    function plot(column, trend) {
      const side = Math.floor(column / 2);
      context.strokeStyle = trend ? colors[side] : fills[side];
      context.fillStyle = context.strokeStyle;
      context.lineWidth = trend ? 2.2 : 1;
      context.beginPath();
      let previous = false;
      values.forEach((row, index) => {
        const value = row[column];
        if (Number.isFinite(value)) {
          const px = x(index);
          const py = y(side, value);
          if (previous) context.lineTo(px, py);
          else {
            context.moveTo(px, py);
            if (!Number.isFinite(values[index + 1]?.[column])) context.fillRect(px - 1, py - 1, 2, 2);
          }
          previous = true;
        } else previous = false;
      });
      context.stroke();
    }

    [0, 2, 1, 3].forEach(column => plot(column, column % 2 === 1));
    const selected = Number(range.value);
    line(x(selected), margin, x(selected), height - margin, '#7c887e');
    values[selected].forEach((value, column) => {
      if (!Number.isFinite(value)) return;
      const side = Math.floor(column / 2);
      context.fillStyle = colors[side];
      context.beginPath();
      context.arc(x(selected), y(side, value), column % 2 ? 3.4 : 2.4, 0, 2 * Math.PI);
      context.fill();
    });

    for (const {year, index} of years) {
      const px = x(index);
      const py = panels ? height - 13 : center + 10;
      context.fillStyle = '#fffdf7';
      context.fillRect(px - 15, py - 6, 30, 12);
      context.fillStyle = '#526056';
      context.fillText(year, px, py);
    }
  }

  function showDate() {
    const index = Number(range.value);
    const [russian, russianAverage, ukrainian, ukrainianAverage] = values[index];
    const date = formatDate.format(dateAt(index));
    range.setAttribute('aria-valuetext', date);
    output.textContent = `${date} · Russian launches ${describe(russian)} (30-day avg ${describe(russianAverage)}) · Ukrainian drone interception claims ${describe(ukrainian)} (30-day avg ${describe(ukrainianAverage)})`;
    draw();
  }

  new ResizeObserver(draw).observe(canvas);
  range.addEventListener('input', showDate);
  chart.addEventListener('change', draw);
  canvas.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const { left, width } = canvas.getBoundingClientRect();
    const fraction = (event.clientX - left - 47) / (width - 65);
    range.value = Math.round(fraction * (values.length - 1));
    showDate();
  });
  showDate();
}

if (context) enableChart().catch(error => console.error(error));
