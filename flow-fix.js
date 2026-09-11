(() => {
  const MIN_ROW_GAP = 122;
  const NODE_TOP = 96;
  const TOP_LANE_START = 26;
  const TOP_LANE_GAP = 14;
  const EDGE_LANE_GAP = 18;

  function num(v) { return Number.parseFloat(v || '0'); }

  function parseEdge(path) {
    const d = path.getAttribute('d') || '';
    const m = d.match(/^M\s*([\d.+-]+)\s+([\d.+-]+)\s+H\s*([\d.+-]+)\s+V\s*([\d.+-]+)\s+H\s*([\d.+-]+)/i);
    if (!m) return null;
    return { sx: +m[1], sy: +m[2], mx: +m[3], ey: +m[4], ex: +m[5] };
  }

  function findNodeByPort(nodes, x, y, side) {
    let best = null;
    let bestDist = Infinity;
    for (const n of nodes) {
      const px = side === 'right' ? n.oldX + n.w : n.oldX;
      const py = n.oldY + n.h / 2;
      const dist = Math.abs(px - x) * 2 + Math.abs(py - y);
      if (dist < bestDist) { bestDist = dist; best = n; }
    }
    return bestDist <= 12 ? best : null;
  }

  function moveNode(node, x, y) {
    const dx = x - node.oldX;
    const dy = y - node.oldY;
    node.rect.setAttribute('x', x);
    node.rect.setAttribute('y', y);
    for (const text of node.group.querySelectorAll('text')) {
      text.setAttribute('x', num(text.getAttribute('x')) + dx);
      text.setAttribute('y', num(text.getAttribute('y')) + dy);
    }
    node.x = x;
    node.y = y;
  }

  function targetPort(edge, incoming) {
    if (incoming.length <= 1) return edge.to.y + edge.to.h / 2;
    const sorted = [...incoming].sort((a, b) => a.from.y - b.from.y || a.from.idx - b.from.idx);
    const idx = sorted.indexOf(edge);
    if (sorted.length === 2) {
      return edge.to.y + edge.to.h * (idx === 0 ? 0.34 : 0.66);
    }
    const pad = edge.to.h * 0.2;
    const span = edge.to.h - pad * 2;
    return edge.to.y + pad + (span * idx / Math.max(1, sorted.length - 1));
  }

  function relayout(svg) {
    if (!svg || svg.dataset.flowFixed === 'working') return;
    const groups = [...svg.querySelectorAll(':scope > g')].filter(g => g.querySelector(':scope > rect'));
    if (groups.length < 2) return;

    svg.dataset.flowFixed = 'working';
    try {
      const nodes = groups.map((group, idx) => {
        const rect = group.querySelector(':scope > rect');
        return {
          idx, group, rect,
          oldX: num(rect.getAttribute('x')),
          oldY: num(rect.getAttribute('y')),
          w: num(rect.getAttribute('width')),
          h: num(rect.getAttribute('height'))
        };
      });

      const edges = [...svg.querySelectorAll(':scope > path')]
        .filter(p => p.getAttribute('marker-end'))
        .map(path => {
          const p = parseEdge(path);
          if (!p) return null;
          const from = findNodeByPort(nodes, p.sx, p.sy, 'right');
          const to = findNodeByPort(nodes, p.ex, p.ey, 'left');
          return from && to ? { path, from, to } : null;
        }).filter(Boolean);

      const xs = [...new Set(nodes.map(n => n.oldX))].sort((a, b) => a - b);
      const colIndex = new Map(xs.map((x, i) => [x, i]));
      for (const n of nodes) n.col = colIndex.get(n.oldX);

      const columns = xs.map(() => []);
      for (const n of nodes) columns[n.col].push(n);

      const maxRows = Math.max(...columns.map(c => c.length));
      const rowGap = Math.max(MIN_ROW_GAP, Math.max(...nodes.map(n => n.h)) + 42);
      const maxContentH = Math.max(1, maxRows - 1) * rowGap;
      for (const col of columns) {
        col.sort((a, b) => a.oldY - b.oldY || a.idx - b.idx);
        const contentH = Math.max(0, col.length - 1) * rowGap;
        const offset = (maxContentH - contentH) / 2;
        col.forEach((n, i) => moveNode(n, n.oldX, NODE_TOP + offset + i * rowGap));
      }

      const incomingByTarget = new Map();
      for (const e of edges) {
        if (!incomingByTarget.has(e.to)) incomingByTarget.set(e.to, []);
        incomingByTarget.get(e.to).push(e);
      }

      const skipEdges = edges.filter(e => e.to.col - e.from.col > 1);
      skipEdges.sort((a, b) => (a.from.col - b.from.col) || (a.from.y - b.from.y) || (a.to.y - b.to.y));
      const laneFor = new Map(skipEdges.map((e, i) => [e, TOP_LANE_START + i * TOP_LANE_GAP]));

      for (const e of edges) {
        const sx = e.from.x + e.from.w;
        const sy = e.from.y + e.from.h / 2;
        const ex = e.to.x;
        const incoming = incomingByTarget.get(e.to) || [e];
        const ey = targetPort(e, incoming);
        const sorted = [...incoming].sort((a, b) => a.from.y - b.from.y || a.from.idx - b.from.idx);
        const idx = sorted.indexOf(e);
        const centered = idx - (sorted.length - 1) / 2;
        const gap = e.to.col - e.from.col;

        if (gap > 1) {
          const laneY = laneFor.get(e);
          const leaveX = sx + 26 + centered * EDGE_LANE_GAP;
          const enterX = ex - 26 - centered * EDGE_LANE_GAP;
          e.path.setAttribute('d', `M${sx} ${sy} H${leaveX} V${laneY} H${enterX} V${ey} H${ex}`);
        } else {
          const baseMx = (sx + ex) / 2;
          const mx = baseMx + centered * EDGE_LANE_GAP;
          e.path.setAttribute('d', `M${sx} ${sy} H${mx} V${ey} H${ex}`);
        }
      }

      const maxX = Math.max(...nodes.map(n => n.x + n.w));
      const maxY = Math.max(...nodes.map(n => n.y + n.h));
      const width = maxX + 70;
      const height = maxY + 60;
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.setAttribute('width', width);
      svg.setAttribute('height', height);
      svg.dataset.flowFixed = 'done';
    } finally {
      if (svg.dataset.flowFixed === 'working') svg.dataset.flowFixed = 'done';
    }
  }

  function install() {
    const svg = document.getElementById('flowSvg');
    if (!svg) return;
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => relayout(svg));
    };
    const observer = new MutationObserver(mutations => {
      if (mutations.some(m => m.type === 'childList')) schedule();
    });
    observer.observe(svg, { childList: true, subtree: false });
    schedule();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
