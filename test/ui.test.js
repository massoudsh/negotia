import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import babel from '../web/node_modules/next/dist/compiled/babel/bundle.js';
import React from '../web/node_modules/react/index.js';
import { renderToStaticMarkup } from '../web/node_modules/react-dom/server.node.js';
import { api, ERRORS } from '../web/lib/api.js';

const file = new URL('../web/app/components/glass.js', import.meta.url);
const output = babel.core().transformSync(readFileSync(file, 'utf8'), { filename: file.pathname, configFile: false, babelrc: false, presets: [[babel.presetReact(), { runtime: 'automatic' }]], plugins: [babel.pluginTransformModulesCommonjs()] });
const components = {};
new Function('require', 'exports', output.code)(createRequire(file), components);
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));

test('shared fields associate labels and errors, and busy buttons disable actions', () => {
  const field = render(components.Field, { label: 'مقدار', error: 'مقدار معتبر نیست', value: '', readOnly: true });
  const id = field.match(/<input id="([^"]+)"/)[1];
  assert.ok(field.includes(`for="${id}"`));
  assert.ok(field.includes('aria-invalid="true"'));
  assert.ok(field.includes(`aria-describedby="${id}-error"`));
  const button = render(components.GlassButton, { busy: true, children: 'Save' });
  assert.match(button, /disabled=""/);
  assert.match(button, /aria-busy="true"/);
});

test('table renders at most twenty of ten thousand rows and uses semantic sorting controls', () => {
  const rows = Array.from({ length: 10000 }, (_, id) => ({ id: String(id), name: `row-${id}` }));
  const html = render(components.DataTable, { rows, columns: [{ key: 'name', label: 'Name', value: row => row.name }], caption: 'Deals' });
  assert.equal((html.match(/<tr>/g) ?? []).length, 21);
  assert.match(html, /<caption>/);
  assert.match(html, /scope="col"/);
  assert.match(html, /aria-sort="none"/);
  assert.ok(!html.includes('row-9999'));
});

test('AI and status indicators convey meaning without color and escape user content', () => {
  assert.match(render(components.AISuggestionBadge), /نیازمند بررسی انسان/);
  assert.match(render(components.DealStatusBadge, { status: 'approved' }), /تأییدشده/);
  assert.match(render(components.GlassSurface, { children: '<script>alert(1)</script>' }), /&lt;script&gt;/);
});

test('error catalog handles network, session, permission and server failures without leaking server details', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => { throw new Error('internal'); };
  await assert.rejects(api('/test'), { message: ERRORS.fa.network });
  for (const status of [401, 403, 404, 409, 500]) {
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'internal-secret-detail' }), { status });
    await assert.rejects(api('/test', { locale: 'en' }), { message: ERRORS.en[status] ?? ERRORS.en.server });
  }
});

function luminance(hex) { const channels = hex.match(/[a-f0-9]{2}/gi).slice(0, 3).map(channel => parseInt(channel, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4); return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722; }
function contrast(a, b) { const x = luminance(a); const y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
test('theme text and semantic badge token pairs meet AA contrast on solid fallback surfaces', () => {
  const css = readFileSync(new URL('../web/app/theme.css', import.meta.url), 'utf8');
  for (const block of css.matchAll(/:root[^\{]+\{([^}]+)\}/g)) {
    const tokens = Object.fromEntries([...block[1].matchAll(/--([\w-]+):\s*(#[a-fA-F0-9]{6})(?:;|\s)/g)].map(match => [match[1], match[2]]));
    for (const text of ['foreground', 'muted', 'subtle']) for (const surface of ['background', 'surface', 'surface-raised', 'surface-soft']) assert.ok(contrast(tokens[text], tokens[surface]) >= 4.5, `${text}/${surface}`);
    for (const semantic of ['success', 'danger', 'warning', 'info']) assert.ok(contrast(tokens[semantic], tokens[`${semantic}-soft`]) >= 4.5, semantic);
    assert.ok(contrast(tokens.brand, tokens['on-brand']) >= 4.5);
  }
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@supports \(backdrop-filter/);
});
