/**
 * Scene Nav Visualizer — Tests
 * Covers parser.js and renderer.js
 */

import { describe, it, expect } from 'vitest';
import { parse, serializeBlock } from './parser.js';
import { render } from './renderer.js';

// ── Parser ────────────────────────────────────────────────────────────────────

const FULL = `aspectRatio: 16/9
edgeFade: 0.05
mobile: breakpoint 768, aspectRatio 9/16
debug: on

- [A watercolor beach](../media/bg-beach.png)
\t- background
\t- at: 25.1, 30
\t- scale: 75
- [Resources — a glowing bubble](Resources.png)
\t- at: 45.8, -3.6
\t- scale: 18
\t- rotation: 36
\t- glow: #00E5FF
\t- glowIntensity: 1.5
\t- goto: [Resources](/resources/)
\t- mobile:
\t\t- at: 58, 10.3
\t\t- scale: 29.5
- [[Sign up bubble.png]]
    - at: 33.3, 25.3
    - goto: #signup
- [Shop item](shop.png)
\t- filter: character:bloob
`;

describe('scene-nav v2 parser', () => {
  it('parses header settings incl. compact mobile and debug', () => {
    const d = parse(FULL);
    expect(d.aspectRatio).toBe('16/9');
    expect(d.edgeFade).toBeCloseTo(0.05);
    expect(d.mobile).toEqual(expect.objectContaining({ breakpoint: 768, aspectRatio: '9/16' }));
    expect(d.debug).toBe(true);
  });
  it('background flag element lands in backgrounds with alt', () => {
    const d = parse(FULL);
    expect(d.backgrounds).toHaveLength(1);
    expect(d.backgrounds[0]).toEqual(expect.objectContaining({
      image: '../media/bg-beach.png', alt: 'A watercolor beach', x: 25.1, y: 30, scale: 75 }));
    expect(d.elements.map(e => e.image)).not.toContain('../media/bg-beach.png');
  });
  it('md-link element: alt, at, goto→link action, nested-bullet mobile override', () => {
    const el = parse(FULL).elements[0];
    expect(el).toEqual(expect.objectContaining({
      image: 'Resources.png', alt: 'Resources — a glowing bubble',
      x: 45.8, y: -3.6, scale: 18, rotation: 36,
      glow: '#00E5FF', glowIntensity: 1.5,
      action: 'link', value: '/resources/' }));
    expect(el.label).toBe('Resources — a glowing bubble'); // alt doubles as default label
    expect(el.mobileOverride).toEqual({ x: 58, y: 10.3, scale: 29.5 });
  });
  it('wiki-link image + space-indented props + #anchor goto', () => {
    const el = parse(FULL).elements[1];
    expect(el.image).toBe('Sign up bubble.png');
    expect(el.alt).toBeNull();
    expect(el).toEqual(expect.objectContaining({ x: 33.3, y: 25.3, action: 'anchor', value: 'signup' }));
  });
  it('filter property → filter action', () => {
    expect(parse(FULL).elements[2]).toEqual(
      expect.objectContaining({ action: 'filter', value: 'character:bloob' }));
  });
  it('percent-encoded md-link path is decoded', () => {
    const d = parse('- [x](Sign%20up.png)\n\t- at: 1, 2\n');
    expect(d.elements[0].image).toBe('Sign up.png');
  });
  it('old YAML grammar fails safe with a warning, returns empty scene', () => {
    const d = parse('elements:\n  - image: a.png\n    x: 1\n');
    expect(d.elements).toEqual([]);
    expect(d.backgrounds).toEqual([]);
  });
  it('serializeBlock round-trips through parse', () => {
    const d = parse(FULL);
    const text = serializeBlock(d);
    expect(text.startsWith('::: scene-nav')).toBe(true);
    const d2 = parse(text.replace(/^::: scene-nav\n/, '').replace(/\n:::\s*$/, ''));
    expect(d2.elements).toEqual(d.elements);
    expect(d2.backgrounds).toEqual(d.backgrounds);
    expect(d2.mobile).toEqual(d.mobile);
  });
});

// ── Renderer ──────────────────────────────────────────────────────────────────

describe('render', () => {
  const basicScene = {
    aspectRatio: '16/9',
    backgrounds: [{ image: 'room.png', x: 0, y: 0, scale: 100 }],
    elements: [
      { type: 'image', image: 'cat.png', x: 30, y: 40, scale: 20, rotation: 0, resetRotationOnHover: true, label: 'Ceramics', glow: '#FFD700', glowIntensity: 1, action: 'filter', value: 'ceramics', onlyShowOn: null, mobileOverride: null },
    ],
    mobile: null,
  };

  it('renders a single container when mobile is null', () => {
    const html = render(basicScene);
    expect(html).toContain('scene-nav-container');
    expect(html).not.toContain('scene-nav--desktop');
    expect(html).not.toContain('scene-nav--mobile');
    expect(html).not.toContain('<style>');
  });

  it('includes aspect-ratio in container style', () => {
    const html = render(basicScene);
    expect(html).toContain('aspect-ratio:16/9');
  });

  it('renders background layer', () => {
    const html = render(basicScene);
    expect(html).toContain('scene-nav-bg-layer');
    expect(html).toContain('room.png');
  });

  it('renders element with data attributes', () => {
    const html = render(basicScene);
    expect(html).toContain('scene-nav-el');
    expect(html).toContain('data-glow="#FFD700"');
    expect(html).toContain('data-action="filter"');
    expect(html).toContain('left:30%');
    expect(html).toContain('top:40%');
  });

  it('renders label span when label is set', () => {
    const html = render(basicScene);
    expect(html).toContain('scene-nav-label');
    expect(html).toContain('Ceramics');
  });

  it('renders two containers when mobile is set', () => {
    const scene = { ...basicScene, mobile: { breakpoint: 768, aspectRatio: '9/16', backgrounds: [] } };
    const html  = render(scene);
    expect(html).toContain('scene-nav--desktop');
    expect(html).toContain('scene-nav--mobile');
    expect(html).toContain('@media (max-width:768px)');
    expect(html).toContain('@media (min-width:769px)');
    expect(html).toContain('scene-nav-wrapper');
  });

  // Helper: split rendered html into desktop/mobile sections by container div class
  function splitContainers(html) {
    const MOBILE_DIV = 'class="scene-nav-container scene-nav--mobile"';
    const idx = html.indexOf(MOBILE_DIV);
    return { desktopHtml: html.slice(0, idx), mobileHtml: html.slice(idx) };
  }

  it('mobile container uses mobileOverride positions', () => {
    const scene = {
      ...basicScene,
      elements: [{ ...basicScene.elements[0], x: 30, y: 40, mobileOverride: { x: 80, y: 90 } }],
      mobile: { breakpoint: 768, aspectRatio: '9/16', backgrounds: [] },
    };
    const html = render(scene);
    expect(html).toContain('scene-nav--desktop');
    const { mobileHtml } = splitContainers(html);
    expect(mobileHtml).toContain('left:80%');
    expect(mobileHtml).toContain('top:90%');
  });

  it('hides desktop-only elements from mobile container', () => {
    const scene = {
      ...basicScene,
      elements: [{ ...basicScene.elements[0], onlyShowOn: ['desktop'] }],
      mobile: { breakpoint: 768, aspectRatio: '9/16', backgrounds: [] },
    };
    const { mobileHtml } = splitContainers(render(scene));
    expect(mobileHtml).not.toContain('scene-nav-el');
  });

  it('hides mobile-only elements from desktop container', () => {
    const scene = {
      ...basicScene,
      elements: [{ ...basicScene.elements[0], onlyShowOn: ['mobile'] }],
      mobile: { breakpoint: 768, aspectRatio: '9/16', backgrounds: [] },
    };
    const { desktopHtml } = splitContainers(render(scene));
    expect(desktopHtml).not.toContain('scene-nav-el');
  });

  it('mobile container uses mobile backgrounds when provided', () => {
    const scene = {
      ...basicScene,
      mobile: { breakpoint: 768, aspectRatio: '9/16', backgrounds: [{ image: 'portrait.png', x: 0, y: 0, scale: 100 }] },
    };
    const { desktopHtml, mobileHtml } = splitContainers(render(scene));
    expect(mobileHtml).toContain('portrait.png');
    expect(desktopHtml).toContain('room.png');
  });

  it('mobile container falls back to desktop backgrounds when none set', () => {
    const scene = {
      ...basicScene,
      mobile: { breakpoint: 768, aspectRatio: '9/16', backgrounds: [] },
    };
    const { mobileHtml } = splitContainers(render(scene));
    expect(mobileHtml).toContain('room.png');
  });

  it('uses custom maxWidth from settings', () => {
    const html = render(basicScene, { maxWidth: '1200px' });
    expect(html).toContain('max-width:1200px');
  });

  it('renders linear-gradient edge fade mask when edgeFade is set', () => {
    const scene = { ...basicScene, edgeFade: 0.3 };
    const html = render(scene);
    expect(html).toContain('mask-image');
    expect(html).toContain('linear-gradient(to right');
    expect(html).toContain('linear-gradient(to bottom');
    expect(html).toContain('mask-composite:intersect');
    expect(html).toContain('30px');
  });

  it('renders no mask when edgeFade is 0', () => {
    const scene = { ...basicScene, edgeFade: 0 };
    const html = render(scene);
    expect(html).not.toContain('mask-image');
    expect(html).not.toContain('linear-gradient');
  });

  it('mobile container uses mobile aspectRatio', () => {
    const scene = { ...basicScene, mobile: { breakpoint: 768, aspectRatio: '4/5', backgrounds: [] } };
    const html  = render(scene);
    const mobileIdx = html.indexOf('scene-nav--mobile');
    const mobileHtml = html.slice(mobileIdx);
    expect(mobileHtml).toContain('aspect-ratio:4/5');
  });
});
