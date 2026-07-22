/**
 * Scene Nav Visualizer — Tests
 * Covers parser.js and renderer.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parse, serializeBlock } from './parser.js';
import { render } from './renderer.js';
import { transform } from './index.js';
import { hoverStyles } from './browser.js';
import { resolveImageRef } from './resolve.js';

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
  it('CRLF input (Windows line endings) parses identically to LF', () => {
    const lfText = FULL;
    const crlfText = lfText.replace(/\n/g, '\r\n');
    const d1 = parse(lfText);
    const d2 = parse(crlfText);
    expect(d2.elements).toEqual(d1.elements);
    expect(d2.backgrounds).toEqual(d1.backgrounds);
    expect(d2.mobile).toEqual(d1.mobile);
    expect(d2.aspectRatio).toEqual(d1.aspectRatio);
    expect(d2.edgeFade).toEqual(d1.edgeFade);
  });
  it('mobile header with null aspectRatio serializes and re-parses correctly', () => {
    const text = 'mobile: breakpoint 700\n- [a](x.png)\n\t- at: 1, 2\n';
    const d = parse(text);
    expect(d.mobile).toEqual({ breakpoint: 700, aspectRatio: null, backgrounds: [] });
    const serialized = serializeBlock(d);
    const d2 = parse(serialized.replace(/^::: scene-nav\n/, '').replace(/\n:::\s*$/, ''));
    expect(d2.mobile).toEqual({ breakpoint: 700, aspectRatio: null, backgrounds: [] });
  });
});

describe('scene-nav v2.1 — hover toggles', () => {
  it('elements default hoverGlow and hoverScale to true', () => {
    const el = parse('- [a](x.png)\n\t- at: 1, 2\n').elements[0];
    expect(el.hoverGlow).toBe(true);
    expect(el.hoverScale).toBe(true);
  });
  it('hoverGlow: off / hoverScale: false disable the effects (case-insensitive)', () => {
    const el = parse('- [a](x.png)\n\t- at: 1, 2\n\t- hoverGlow: off\n\t- hoverScale: FALSE\n').elements[0];
    expect(el.hoverGlow).toBe(false);
    expect(el.hoverScale).toBe(false);
  });
  it('hoverGlow: on / true keep the effect enabled', () => {
    const el = parse('- [a](x.png)\n\t- at: 1, 2\n\t- hoverGlow: on\n').elements[0];
    expect(el.hoverGlow).toBe(true);
  });
});

describe('scene-nav v2.1 — label tri-state', () => {
  it('label defaults to the alt text', () => {
    const el = parse('- [Contact us](x.png)\n\t- at: 1, 2\n').elements[0];
    expect(el.label).toBe('Contact us');
  });
  it('label: false suppresses the label', () => {
    const el = parse('- [Contact us](x.png)\n\t- at: 1, 2\n\t- label: false\n').elements[0];
    expect(el.label).toBe(false);
  });
  it('label: off suppresses the label (case-insensitive)', () => {
    const el = parse('- [Contact us](x.png)\n\t- at: 1, 2\n\t- label: OFF\n').elements[0];
    expect(el.label).toBe(false);
  });
  it('label: text overrides the label', () => {
    const el = parse('- [Contact us](x.png)\n\t- at: 1, 2\n\t- label: Say hi\n').elements[0];
    expect(el.label).toBe('Say hi');
  });
});

describe('scene-nav v2.1 — wiki goto', () => {
  it('goto: [[note]] is treated as a link to that note', () => {
    const el = parse('- [a](x.png)\n\t- at: 1, 2\n\t- goto: [[About MELT]]\n').elements[0];
    expect(el.action).toBe('link');
    expect(el.value).toBe('About MELT');
  });
  it('markdown and bare goto still work', () => {
    const md = parse('- [a](x.png)\n\t- goto: [x](/y/)\n').elements[0];
    expect(md.value).toBe('/y/');
    const bare = parse('- [a](x.png)\n\t- goto: /host/\n').elements[0];
    expect(bare.value).toBe('/host/');
  });
  it('serializeBlock round-trips the exact authored goto (gotoRaw)', () => {
    const block = '- [Sign up](media/x.png)\n\t- at: 1, 2\n\t- goto: [Sign-up-for-a-MELT](Sign-up-for-a-MELT.md)\n';
    const d = parse(block);
    expect(d.elements[0].gotoRaw).toBe('[Sign-up-for-a-MELT](Sign-up-for-a-MELT.md)');
    const text = serializeBlock(d);
    expect(text).toContain('- goto: [Sign-up-for-a-MELT](Sign-up-for-a-MELT.md)');
    const d2 = parse(text.replace(/^::: scene-nav\n/, '').replace(/\n:::\s*$/, ''));
    expect(d2.elements).toEqual(d.elements);
  });
});

describe('scene-nav v2.1 — serialize round-trip of new keys', () => {
  function roundTrip(block) {
    const d = parse(block);
    const text = serializeBlock(d);
    const d2 = parse(text.replace(/^::: scene-nav\n/, '').replace(/\n:::\s*$/, ''));
    return { d, d2 };
  }
  it('round-trips label: false, hoverGlow: off, hoverScale: off', () => {
    const { d, d2 } = roundTrip(
      '- [Contact us](Contact us.png)\n\t- at: 1, 2\n\t- label: false\n\t- hoverGlow: off\n\t- hoverScale: off\n'
    );
    expect(d2.elements).toEqual(d.elements);
    expect(d.elements[0].label).toBe(false);
    expect(d.elements[0].hoverGlow).toBe(false);
  });
  it('does not emit hover/label keys when at defaults', () => {
    const d = parse('- [Contact us](Contact us.png)\n\t- at: 1, 2\n');
    const text = serializeBlock(d);
    expect(text).not.toContain('hoverGlow');
    expect(text).not.toContain('hoverScale');
    expect(text).not.toContain('label:');
  });
});

describe('scene-nav — resolveImageRef', () => {
  const index = {
    byBasename: {
      'Contact us.png': '/media/menu-images/Contact%20us.png',
      'bg-beach.png': '/media/bg-beach.png',
    },
    byVaultPath: {
      'media/menu-images/Sign up.png': '/media/menu-images/Sign%20up.png',
    },
  };
  it('resolves a bare basename ref (Obsidian model)', () => {
    expect(resolveImageRef('Contact us.png', index)).toBe('/media/menu-images/Contact%20us.png');
  });
  it('decodes %20 in the ref before basename lookup', () => {
    expect(resolveImageRef('Contact%20us.png', index)).toBe('/media/menu-images/Contact%20us.png');
  });
  it('resolves a full vault path (path-aware)', () => {
    expect(resolveImageRef('media/menu-images/Sign up.png', index)).toBe('/media/menu-images/Sign%20up.png');
  });
  it('falls back to basename for an Obsidian-relative ../ path', () => {
    expect(resolveImageRef('../media/bg-beach.png', index)).toBe('/media/bg-beach.png');
  });
  it('leaves already root-relative / absolute refs untouched', () => {
    expect(resolveImageRef('/media/x.png', index)).toBe('/media/x.png');
    expect(resolveImageRef('https://cdn/x.png', index)).toBe('https://cdn/x.png');
  });
  it('returns the ref verbatim when unknown (never breaks a correct ref)', () => {
    expect(resolveImageRef('unknown.png', index)).toBe('unknown.png');
    expect(resolveImageRef('unknown.png', {})).toBe('unknown.png');
  });
});

describe('scene-nav browser — hoverStyles', () => {
  const glow = 'drop-shadow(x)';
  it('applies glow + scale by default', () => {
    expect(hoverStyles({ hoverGlow: true, hoverScale: true, glowFilter: glow, baseTransform: 'rotate(10deg)', resetRot: true }))
      .toEqual({ filter: glow, transform: 'scale(1.06)' });
  });
  it('drops glow when hoverGlow is false', () => {
    expect(hoverStyles({ hoverGlow: false, hoverScale: true, glowFilter: glow, baseTransform: '', resetRot: true }).filter).toBe('');
  });
  it('drops the scale when hoverScale is false, keeping rotation if not reset', () => {
    expect(hoverStyles({ hoverGlow: true, hoverScale: false, glowFilter: glow, baseTransform: 'rotate(10deg)', resetRot: false }).transform)
      .toBe('rotate(10deg)');
  });
  it('empty transform when scale off and rotation reset', () => {
    expect(hoverStyles({ hoverGlow: true, hoverScale: false, glowFilter: glow, baseTransform: 'rotate(10deg)', resetRot: true }).transform)
      .toBe('');
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

  it('renders no label span when label is false', () => {
    const scene = { ...basicScene, elements: [{ ...basicScene.elements[0], label: false }] };
    const html = render(scene);
    expect(html).not.toContain('scene-nav-label');
  });

  it('omits hover attrs when effects enabled (default)', () => {
    const scene = { ...basicScene, elements: [{ ...basicScene.elements[0], hoverGlow: true, hoverScale: true }] };
    const html = render(scene);
    expect(html).not.toContain('data-hover-glow');
    expect(html).not.toContain('data-hover-scale');
  });

  it('emits data-hover-glow="false" / data-hover-scale="false" when disabled', () => {
    const scene = { ...basicScene, elements: [{ ...basicScene.elements[0], hoverGlow: false, hoverScale: false }] };
    const html = render(scene);
    expect(html).toContain('data-hover-glow="false"');
    expect(html).toContain('data-hover-scale="false"');
  });

  it('applies settings.resolveImage to <img src> but keeps the debug blob ref raw', () => {
    const scene = {
      aspectRatio: null, edgeFade: 0, debug: true, mobile: null, backgrounds: [],
      elements: [{ ...basicScene.elements[0], image: 'Contact us.png', label: null }],
    };
    const resolveImage = (r) => (r === 'Contact us.png' ? '/media/menu-images/Contact%20us.png' : r);
    const html = render(scene, { resolveImage });
    expect(html).toContain('src="/media/menu-images/Contact%20us.png"');
    const m = html.match(/<script type="application\/json" class="scene-nav-data">([\s\S]*?)<\/script>/);
    expect(JSON.parse(m[1]).elements[0].image).toBe('Contact us.png'); // blob stays raw
  });

  it('defaults resolveImage to identity (verbatim src) when no setting given', () => {
    const scene = { ...basicScene, elements: [{ ...basicScene.elements[0], image: 'media/x.png' }] };
    const html = render(scene);
    expect(html).toContain('src="media/x.png"');
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

  it('renders element with alt text from alt field, falls back to label', () => {
    const scene = {
      ...basicScene,
      elements: [{ ...basicScene.elements[0], alt: 'Resources — a glowing bubble' }],
    };
    const html = render(scene);
    expect(html).toContain('alt="Resources — a glowing bubble"');
  });

  it('background img has alt="" and aria-hidden="true"', () => {
    const html = render(basicScene);
    expect(html).toContain('alt="" aria-hidden="true"');
  });

  it('includes data-scene-debug="true" on container when debug is true (no mobile)', () => {
    const scene = { ...basicScene, debug: true };
    const html = render(scene);
    expect((html.match(/data-scene-debug/g) || []).length).toBe(1);
    expect(html).toContain('class="scene-nav-container"');
    expect(html).toContain('data-scene-debug="true"');
  });

  it('includes data-scene-debug="true" on wrapper only when debug is true (with mobile)', () => {
    const scene = { ...basicScene, mobile: { breakpoint: 768, aspectRatio: '9/16', backgrounds: [] }, debug: true };
    const html = render(scene);
    // Assert exactly one occurrence of data-scene-debug
    expect((html.match(/data-scene-debug/g) || []).length).toBe(1);
    // Assert it's on the wrapper, not the inner containers
    expect(html).toContain('class="scene-nav-wrapper"');
    // Extract the wrapper div and verify it has the attribute
    const wrapperIdx = html.indexOf('class="scene-nav-wrapper"');
    const wrapperSection = html.slice(wrapperIdx - 100, wrapperIdx + 200);
    expect(wrapperSection).toContain('data-scene-debug="true"');
  });

  it('does not include data-scene-debug when debug is not set', () => {
    const scene = { ...basicScene };
    const html = render(scene);
    expect(html).not.toContain('data-scene-debug');
  });

  it('does not include data-scene-debug when debug is false', () => {
    const scene = { ...basicScene, debug: false };
    const html = render(scene);
    expect(html).not.toContain('data-scene-debug');
  });
});

// ── Build-time Transform (index.js) ───────────────────────────────────────────

describe('transform', () => {

  it('replaces ::: container section via data-vis-raw', () => {
    const raw = Buffer.from('- [a](x.png)\n\t- at: 1, 2\n').toString('base64');
    const html = `<section class="scene-nav" data-vis-settings='{}' data-vis-raw="${raw}"><p>ignored</p></section>`;
    const out = transform(html);
    expect(out).toContain('scene-nav-container');
    expect(out).not.toContain('data-vis-raw');
  });

  it('leaves legacy code fences untouched but warns once per transform call', () => {
    const legacyHtml = '<pre><code class="language-scene-nav">elements:</code></pre>';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // First call should warn
    const result1 = transform(legacyHtml);
    expect(result1).toBe(legacyHtml);

    // Second call should also warn (proving per-call behavior, not per-session)
    const result2 = transform(legacyHtml);
    expect(result2).toBe(legacyHtml);

    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledWith('[scene-nav] legacy ```scene-nav code fence found — migrate to ::: scene-nav (v2)');

    warnSpy.mockRestore();
  });
});

describe('renderer scene-data blob (debug hand-off)', () => {
  it('emits a parseable JSON blob inside the container when debug is on', () => {
    const scene = {
      aspectRatio: '16/9', edgeFade: 0, debug: true, mobile: null,
      backgrounds: [], elements: [{
        type: 'image', image: 'a</script>.png', alt: null, x: 1, y: 2, scale: 18,
        rotation: 0, resetRotationOnHover: true, label: null, glow: '#FFD700',
        glowIntensity: 1, action: 'link', value: null, flipH: false, flipV: false,
        onlyShowOn: null, mobileOverride: null,
      }],
    };
    const html = render(scene);
    const m = html.match(/<script type="application\/json" class="scene-nav-data">([\s\S]*?)<\/script>/);
    expect(m).not.toBeNull();
    // "</" must be escaped so the payload cannot close the script tag early
    expect(m[1]).not.toContain('</script>');
    const parsed = JSON.parse(m[1]);
    expect(parsed.elements[0].image).toBe('a</script>.png');
  });

  it('emits blob in the wrapper for mobile scenes with debug', () => {
    const scene = {
      aspectRatio: '16/9', edgeFade: 0, debug: true,
      mobile: { breakpoint: 768, aspectRatio: '9/16', backgrounds: [] },
      backgrounds: [], elements: [],
    };
    const html = render(scene);
    expect((html.match(/scene-nav-data/g) || []).length).toBe(1);
  });

  it('emits no blob when debug is off', () => {
    const html = render({ aspectRatio: null, edgeFade: 0, debug: false, mobile: null, backgrounds: [], elements: [] });
    expect(html).not.toContain('scene-nav-data');
  });
});
