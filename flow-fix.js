(() => {
  // ELK handles node ordering and orthogonal edge routing. The existing SVG
  // renderer remains responsible for labels, click handlers, and PNG export.
  const ELK_URL = 'https://cdn.jsdelivr.net/npm/elkjs@0.10.0/lib/elk.bundled.js';
  let elkPromise;

  function getElk() {
    if (window.ELK) return Promise.resolve(new window.ELK());
    if (!elkPromise) {
      elkPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const timer = setTimeout(() => reject(new Error('ELK timeout')), 15000);
        script.src = ELK_URL;
        script.onload = () => { clearTimeout(timer); resolve(new window.ELK()); };
        script.onerror = () => { clearTimeout(timer); reject(new Error('ELK unavailable')); };
        document.head.appendChild(script);
      }).catch(error => { elkPromise = null; throw error; });
    }
    return elkPromise;
  }

  const num = (element, attribute) => Number(element.getAttribute(attribute) || 0);

  function capture(svg) {
    const nodes = [...svg.querySelectorAll(':scope > g')].map((group, index) => {
      const rect = group.querySelector(':scope > rect');
      if (!rect) return null;
      return {
        id: `node-${index}`,
        group,
        oldX: num(rect, 'x'),
        oldY: num(rect, 'y'),
        width: num(rect, 'width'),
        height: num(rect, 'height')
      };
    }).filter(Boolean);
    const findPort = (x, y, right) => nodes.find(node =>
      Math.abs(node.oldX + (right ? node.width : 0) - x) < 1 &&
      Math.abs(node.oldY + node.height / 2 - y) < 1);
    const edges = [...svg.querySelectorAll(':scope > path[marker-end]')].map((path, index) => {
      const match = (path.getAttribute('d') || '').match(/^M([\d.+-]+)\s+([\d.+-]+)\s+H[\d.+-]+\s+V([\d.+-]+)\s+H([\d.+-]+)/);
      if (!match) return null;
      const from = findPort(Number(match[1]), Number(match[2]), true);
      const to = findPort(Number(match[4]), Number(match[3]), false);
      return from && to ? { id: `edge-${index}`, path, from, to } : null;
    }).filter(Boolean);
    return { nodes, edges };
  }

  function sectionsToPath(sections) {
    return sections.map(section => {
      const points = [section.startPoint, ...(section.bendPoints || []), section.endPoint];
      return points.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point.y}`).join(' ');
    }).join(' ');
  }

  function install(svg, exportButtonId) {
    let revision = 0;
    let snapshot = capture(svg);
    const note = document.createElement('p');
    note.className = 'muted flow-layout-note';
    note.setAttribute('role', 'status');
    svg.closest('.flow-layout')?.before(note);
    const exportButton = document.getElementById(exportButtonId);
    const diagram = svg.closest('.flow-layout');
    const passiveToggle = svg.id === 'passiveFlowSvg' ? document.getElementById('passiveFlowToggle') : null;

    const syncVisibility = hasFlow => {
      diagram?.classList.toggle('has-flow', hasFlow);
      if (passiveToggle) passiveToggle.disabled = !hasFlow;
    };

    async function relayout() {
      const currentRevision = ++revision;
      const data = snapshot;
      const hasFlow = data.nodes.length >= 2 && data.edges.length > 0;
      syncVisibility(hasFlow);
      if (!hasFlow) { note.textContent = ''; return; }
      note.textContent = '矢印を自動配置しています…';
      if (exportButton) exportButton.disabled = true;
      try {
        const elk = await getElk();
        const mobile = matchMedia('(max-width:900px)').matches;
        const graph = await elk.layout({
          id: 'flow-root',
          layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': mobile ? 'DOWN' : 'RIGHT',
            'elk.edgeRouting': 'ORTHOGONAL',
            'elk.spacing.nodeNode': mobile ? '42' : '64',
            'elk.layered.spacing.nodeNodeBetweenLayers': mobile ? '82' : '112',
            'elk.spacing.edgeNode': mobile ? '28' : '34',
            'elk.spacing.edgeEdge': mobile ? '26' : '24',
            'elk.layered.mergeEdges': 'false',
            'elk.layered.nodePlacement.favorStraightEdges': 'true',
            'elk.padding': '[top=30,left=30,bottom=30,right=30]'
          },
          children: data.nodes.map(node => ({id: node.id, width: node.width, height: node.height})),
          edges: data.edges.map(edge => ({id: edge.id, sources: [edge.from.id], targets: [edge.to.id]}))
        });
        if (currentRevision !== revision || !data.nodes[0].group.isConnected) return;
        for (const node of graph.children || []) {
          const original = data.nodes.find(item => item.id === node.id);
          original.group.setAttribute('transform', `translate(${node.x - original.oldX} ${node.y - original.oldY})`);
        }
        for (const edge of graph.edges || []) {
          const original = data.edges.find(item => item.id === edge.id);
          if (original && edge.sections) original.path.setAttribute('d', sectionsToPath(edge.sections));
        }
        svg.setAttribute('viewBox', `0 0 ${graph.width} ${graph.height}`);
        svg.setAttribute('width', graph.width);
        svg.setAttribute('height', graph.height);
        note.textContent = '親から子へ矢印をたどれます。';
      } catch (_) {
        if (currentRevision === revision) note.textContent = '自動配置を利用できないため、通常の図を表示しています。';
      } finally {
        if (currentRevision === revision && exportButton) exportButton.disabled = false;
      }
    }

    new MutationObserver(() => { snapshot = capture(svg); relayout(); }).observe(svg, {childList: true});
    matchMedia('(max-width:900px)').addEventListener?.('change', relayout);
    relayout();
  }

  function start() {
    const normal = document.getElementById('flowSvg');
    const passive = document.getElementById('passiveFlowSvg');
    if (normal) install(normal, 'pngBtn');
    if (passive) install(passive, 'passivePngBtn');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();
