export function cssDeclarations(css) {
  const declarations = [];
  const blocks = [];
  let selector = '';
  let pending = null;
  let inComment = false;
  for (const raw of css.split('\n')) {
    let line = raw.trim();
    if (inComment) {
      if (line.includes('*/')) inComment = false;
      continue;
    }
    if (line.startsWith('/*')) {
      inComment = !line.includes('*/');
      continue;
    }
    if (!line) continue;
    if (pending) {
      pending.value += ' ' + line;
      if (line.endsWith(';')) {
        declarations.push(finish(pending));
        pending = null;
      }
      continue;
    }
    if (line.endsWith('{')) {
      blocks.push((selector + ' ' + line.slice(0, -1)).trim());
      selector = '';
      continue;
    }
    if (line === '}') {
      blocks.pop();
      continue;
    }
    const declaration = line.match(/^(--[\w-]+|[a-z-]+):\s*(.*)$/);
    if (declaration && blocks.length && (line.endsWith(';') || line.endsWith(':'))) {
      const current = { within: [...blocks], property: declaration[1], value: declaration[2] };
      if (line.endsWith(';')) declarations.push(finish(current));
      else pending = current;
      continue;
    }
    selector += ' ' + line;
  }
  return declarations;
}

function finish(declaration) {
  return {
    within: declaration.within,
    selector: declaration.within.at(-1),
    property: declaration.property,
    value: declaration.value.replace(/;$/, '').trim(),
  };
}
