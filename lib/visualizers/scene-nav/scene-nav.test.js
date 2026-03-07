/**
 * Scene Nav Visualizer — Tests
 * Covers parser.js and renderer.js
 */

import { describe, it, expect } from 'vitest';
import { parse }  from './parser.js';
import { render } from './renderer.js';

// ── Parser ────────────────────────────────────────────────────────────────────

describe('parse', () => {
  it('returns empty scene for blank input', () => {
    const s = parse('');
    expect(s.aspectRatio).toBeNull();
    expect(s.backgrounds).toEqual([]);
    expect(s.elements).toEqual([]);
    expect(s.mobile).toBeNull();
  });

  it('parses aspectRatio and single background shorthand', () => {
    const s = parse('aspectRatio: 16/9\nbackground: room.png\n');
    expect(s.aspectRatio).toBe('16/9');
    expect(s.backgrounds).toHaveLength(1);
    expect(s.backgrounds[0].image).toBe('room.png');
    expect(s.backgrounds[0].x).toBe(0);
  });

  it('parses backgrounds array', () => {
    const yaml = `
backgrounds:
  - image: sky.png
    scale: 120
  - image: floor.png
    x: 10
    y: 5
`;
    const s = parse(yaml);
    expect(s.backgrounds).toHaveLength(2);
    expect(s.backgrounds[0].scale).toBe(120);
    expect(s.backgrounds[1].x).toBe(10);
  });

  it('parses elements with defaults', () => {
    const s = parse('elements:\n  - image: cat.png\n    x: 30\n    y: 40\n');
    expect(s.elements).toHaveLength(1);
    const el = s.elements[0];
    expect(el.type).toBe('image');
    expect(el.image).toBe('cat.png');
    expect(el.x).toBe(30);
    expect(el.glow).toBe('#FFD700');
    expect(el.action).toBe('filter');
    expect(el.onlyShowOn).toBeNull();
    expect(el.mobileOverride).toBeNull();
  });

  it('parses element type field', () => {
    const s = parse('elements:\n  - type: text\n    image: \n    x: 50\n    y: 50\n');
    expect(s.elements[0].type).toBe('text');
  });

  it('parses onlyShowOn field', () => {
    const yaml = `
elements:
  - image: cat.png
    x: 10
    y: 10
    onlyShowOn: desktop
  - image: btn.png
    x: 50
    y: 80
    onlyShowOn: mobile, tablet
`;
    const s = parse(yaml);
    expect(s.elements[0].onlyShowOn).toEqual(['desktop']);
    expect(s.elements[1].onlyShowOn).toEqual(['mobile', 'tablet']);
  });

  it('parses mobile top-level block', () => {
    const yaml = `
aspectRatio: 16/9
mobile:
  breakpoint: 640
  aspectRatio: 9/16
  background: portrait.png
`;
    const s = parse(yaml);
    expect(s.mobile).not.toBeNull();
    expect(s.mobile.breakpoint).toBe(640);
    expect(s.mobile.aspectRatio).toBe('9/16');
    expect(s.mobile.backgrounds).toHaveLength(1);
    expect(s.mobile.backgrounds[0].image).toBe('portrait.png');
  });

  it('defaults mobile breakpoint to 768 when not set', () => {
    const s = parse('mobile:\n  aspectRatio: 9/16\n');
    expect(s.mobile.breakpoint).toBe(768);
  });

  it('parses per-element mobile override block', () => {
    const yaml = `
elements:
  - image: cat.png
    x: 30
    y: 40
    scale: 20
    mobile:
      x: 50
      y: 60
      scale: 30
`;
    const s = parse(yaml);
    const el = s.elements[0];
    expect(el.x).toBe(30);
    expect(el.mobileOverride).toEqual({ x: 50, y: 60, scale: 30 });
  });

  it('strips Obsidian image syntax in element images', () => {
    const s = parse('elements:\n  - image: ![](../media/cat.png)\n    x: 0\n    y: 0\n');
    expect(s.elements[0].image).toBe('../media/cat.png');
  });

  it('strips Obsidian image syntax in background shorthand', () => {
    const s = parse('background: ![](room.png)\n');
    expect(s.backgrounds[0].image).toBe('room.png');
  });

  it('returns safe defaults on YAML parse error', () => {
    const s = parse('{{invalid: yaml::: !!!');
    expect(s.elements).toEqual([]);
    expect(s.backgrounds).toEqual([]);
    expect(s.mobile).toBeNull();
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

  it('renders SVG Gaussian mask when edgeFade is set', () => {
    const scene = { ...basicScene, edgeFade: 0.3 };
    const html = render(scene);
    expect(html).toContain('feGaussianBlur');
    expect(html).toContain('snav-mask-');
    expect(html).toContain('mask:url(#snav-mask-');
    expect(html).toContain('maskContentUnits="objectBoundingBox"');
  });

  it('renders no mask when edgeFade is 0', () => {
    const scene = { ...basicScene, edgeFade: 0 };
    const html = render(scene);
    expect(html).not.toContain('feGaussianBlur');
    expect(html).not.toContain('mask:url(');
  });

  it('mobile container uses mobile aspectRatio', () => {
    const scene = { ...basicScene, mobile: { breakpoint: 768, aspectRatio: '4/5', backgrounds: [] } };
    const html  = render(scene);
    const mobileIdx = html.indexOf('scene-nav--mobile');
    const mobileHtml = html.slice(mobileIdx);
    expect(mobileHtml).toContain('aspect-ratio:4/5');
  });
});
