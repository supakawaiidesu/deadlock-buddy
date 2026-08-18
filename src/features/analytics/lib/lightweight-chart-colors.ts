const CSS_SRGB_COLOR_PATTERN = new RegExp(
  String.raw`^color\s*\(\s*srgb\s+([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s+([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s+([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)(?:\s*\/\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?))?\s*\)$`,
  'i',
);

export function normalizeChartColor(value: string): string {
  const match = CSS_SRGB_COLOR_PATTERN.exec(value);
  if (!match) return value;

  const channel = (component: string) => (
    Math.round(Math.min(1, Math.max(0, Number(component))) * 255)
  );
  const red = channel(match[1]);
  const green = channel(match[2]);
  const blue = channel(match[3]);
  const alpha = match[4] === undefined
    ? 1
    : Math.min(1, Math.max(0, Number(match[4])));

  return alpha < 1
    ? `rgba(${red}, ${green}, ${blue}, ${alpha})`
    : `rgb(${red}, ${green}, ${blue})`;
}

export function resolveCssColor(owner: HTMLElement, value: string): string {
  const probe = owner.ownerDocument.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.display = 'none';
  probe.style.color = value;
  owner.ownerDocument.body.append(probe);

  try {
    return normalizeChartColor(getComputedStyle(probe).color);
  } finally {
    probe.remove();
  }
}
