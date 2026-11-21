import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

const types = { html: 'text/html', css: 'text/css', js: 'text/javascript', svg: 'image/svg+xml' };
const root = new URL('../', import.meta.url);

async function staticFile(req, res) {
  const path = new URL(req.url, 'http://localhost').pathname;
  const file = path === '/' ? '/index.html' : path;
  if (!/^\/(?:assets\/)?[a-z-]+\.(html|css|js|svg)$/.test(file)) {
    res.writeHead(404).end();
    return;
  }
  try {
    const body = await readFile(new URL(file.slice(1), root));
    res.writeHead(200, { 'Content-Type': types[file.split('.').at(-1)] }).end(body);
  } catch {
    res.writeHead(404).end();
  }
}

async function openPage(t) {
  const profile = await mkdtemp(join(tmpdir(), 'hollow-chrome-'));
  const chrome = spawn(process.env.CHROME || 'google-chrome', [
    '--headless=new', '--disable-dev-shm-usage', '--no-first-run',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  const closed = new Promise(resolve => chrome.once('close', resolve));
  t.after(async () => {
    chrome.kill();
    await closed;
    await rm(profile, { recursive: true, force: true, maxRetries: 5 });
  });
  const lines = createInterface({ input: chrome.stderr });
  const endpoint = await new Promise((resolve, reject) => {
    chrome.once('error', reject);
    chrome.once('close', code => reject(new Error(`Chrome exited (${code}) before opening DevTools`)));
    lines.on('line', line => {
      const found = line.match(/DevTools listening on ws:\/\/(localhost|127\.0\.0\.1):(\d+)/);
      if (found) resolve(`http://127.0.0.1:${found[2]}`);
    });
  });
  const targets = await (await fetch(`${endpoint}/json/list`)).json();
  const socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  t.after(() => socket.close());
  await once(socket, 'open');
  let id = 0;
  const pending = new Map();
  const events = new EventTarget();
  socket.addEventListener('message', event => {
    const data = JSON.parse(event.data);
    if (!data.id) {
      events.dispatchEvent(new CustomEvent(data.method, { detail: data.params }));
      return;
    }
    const { resolve, reject } = pending.get(data.id);
    pending.delete(data.id);
    if (data.error) reject(new Error(data.error.message));
    else resolve(data.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const request = ++id;
    pending.set(request, { resolve, reject });
    socket.send(JSON.stringify({ id: request, method, params }));
  });
  return { send, events };
}

test('Haunted Hollow in headless Chrome', { timeout: 35000 }, async t => {
  const server = createServer(staticFile).listen(0, '127.0.0.1');
  t.after(() => server.close());
  await once(server, 'listening');
  const { send, events } = await openPage(t);
  const errors = [];
  events.addEventListener('Runtime.exceptionThrown', ({ detail: { exceptionDetails } }) => {
    errors.push(exceptionDetails.exception?.description ?? exceptionDetails.text);
  });
  events.addEventListener('Runtime.consoleAPICalled', ({ detail: { type, args } }) => {
    if (type === 'error') errors.push(args.map(arg => arg.value ?? arg.description).join(' '));
  });
  events.addEventListener('Log.entryAdded', ({ detail: { entry } }) => {
    if (entry.level === 'error') errors.push(entry.text);
  });
  await Promise.all(['Runtime', 'Log', 'Page'].map(domain => send(`${domain}.enable`)));
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__audio = [];
    window.AudioContext = class extends window.AudioContext {
      constructor() { super(); window.__audio.push(this); }
    };
  ` });

  async function evaluate(expression) {
    const { exceptionDetails, result } = await send('Runtime.evaluate', {
      expression, returnByValue: true, awaitPromise: true, userGesture: true,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  }
  const query = selector => `document.querySelector(${JSON.stringify(selector)})`;
  const click = selector => evaluate(`${query(selector)}.click()`);
  const text = selector => evaluate(`${query(selector)}.textContent`);
  const prop = (selector, key) => evaluate(`${query(selector)}.${key}`);
  const score = () => text('#score').then(Number);
  async function until(expression) {
    for (let tries = 0; tries < 50; tries++) {
      if (await evaluate(expression)) return;
      await delay(50);
    }
    assert.fail(`Timed out waiting for ${expression}`);
  }
  async function load(method, params) {
    const loaded = once(events, 'Page.loadEventFired');
    await send(method, params);
    await loaded;
    await until('Boolean(document.getElementById("room-name").textContent)');
  }
  async function key(key) {
    const code = { Tab: 9, Enter: 13, Escape: 27 }[key];
    const event = { key, code: key, windowsVirtualKeyCode: code };
    await send('Input.dispatchKeyEvent', key === 'Enter'
      ? { ...event, type: 'keyDown', text: '\r', unmodifiedText: '\r' }
      : { ...event, type: 'rawKeyDown' });
    await send('Input.dispatchKeyEvent', { ...event, type: 'keyUp' });
  }
  async function snapshot(name) {
    if (!process.env.SHOTS_DIR) return;
    const capture = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(process.env.SHOTS_DIR, `${name}.png`), Buffer.from(capture.data, 'base64'));
  }
  async function pointAt(selector) {
    const [x, y] = await evaluate(`(() => {
      const { x, y, width, height } = ${query(selector)}.getBoundingClientRect();
      return [x + width / 2, y + height / 2];
    })()`);
    for (const type of ['mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    }
  }

  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 960, mobile: false, deviceScaleFactor: 1 });
  await load('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
  assert.equal(await text('#room-name'), 'The Foyer');
  assert.equal(await score(), 0);
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".ghost")).animationName'), 'hover');
  assert.ok(await prop('#room-art', 'naturalWidth'));
  await snapshot('haunted-hollow-desktop');
  await t.test('Keyboard focus, navigation and hotspot activation', async () => {
    await key('Tab');
    assert.equal(await evaluate('document.activeElement.className'), 'skip');
    for (let i = 0; i < 6; i++) await key('Tab');
    assert.equal(await evaluate('document.activeElement.dataset.room'), 'library');
    await key('Enter');
    assert.equal(await text('#room-name'), 'The Library');
    await key('Tab');
    assert.equal(await evaluate('document.activeElement.dataset.room'), 'conservatory');
    await key('Tab');
    await key('Enter');
    assert.equal(await score(), 10);
    assert.match(await text('#field-note'), /Agnes/);
  });

  const route = [
    ['foyer', 'The Foyer', '11:00 PM', '1:00 AM', /midnight/, /Brass key/],
    ['library', 'The Library', 'Edgar', 'Agnes', /Agnes/, /Silver bookmark/],
    ['conservatory', 'The Conservatory', 'Crescent', 'Full moon', /silver coin/, /Moonstone/],
  ];
  const answer = async choice => {
    await click(`#answers input[value="${choice}"]`);
    await click('#submit-answer');
  };
  for (const [room, name, wrong, right, clue, item] of route) {
    await t.test(`${name}: clue and keepsake, locked seal, wrong and right answers`, async () => {
      await click(`[data-room="${room}"]`);
      assert.equal(await text('#room-name'), name);
      await until(`document.querySelector("#room-art").naturalWidth > 0 && document.querySelector("#room-art").currentSrc.endsWith("${room}.svg")`);
      assert.ok((await prop('#room-art', 'alt')).length > 20);
      await click('#hotspots button:nth-child(3)');
      assert.match(await text('#puzzle-status'), /still need/);
      await answer(right);
      assert.match(await text('#puzzle-status'), /first/);
      await key('Escape');
      assert.equal(await prop('#puzzle', 'open'), false);
      const previous = await score();
      await pointAt('#hotspots button:nth-child(1)');
      assert.match(await text('#field-note'), clue);
      await click('#landmarks button:nth-child(2)');
      assert.match(await text('#field-note'), item);
      const discovered = await score();
      assert.equal(discovered - previous, room === 'library' ? 15 : 25);
      await click('#landmarks button:nth-child(1)');
      await click('#hotspots button:nth-child(2)');
      assert.equal(await score(), discovered);
      await click('#hotspots button:nth-child(3)');
      await answer(wrong);
      assert.match(await text('#puzzle-status'), /stays cold/);
      assert.equal(await score(), discovered);
      await answer(right);
      assert.equal(await prop('#puzzle', 'open'), false);
      assert.equal(await score(), discovered + 25);
      assert.equal(await prop('#ending', 'hidden'), room !== 'conservatory');
    });
  }
  await t.test('Story generation and party checklist toggles', async () => {
    await evaluate('document.getElementById("visitor").value = "witch"; document.getElementById("mood").value = "cozy";');
    await click('#story-form button');
    const firstStory = await text('#story');
    assert.match(firstStory, /runaway witch.*cider/);
    await click('#story-form button');
    assert.notEqual(await text('#story'), firstStory);
    await click('#checklist input[value="invites"]');
    await click('#checklist input[value="lanterns"]');
    assert.match(await text('#checklist-status'), /2 of 5/);
    await click('#checklist input[value="lanterns"]');
    assert.match(await text('#checklist-status'), /1 of 5/);
  });
  await t.test('Opt-in synthesized Web Audio starts and stops', async () => {
    assert.equal(await text('#sound-label'), 'Sound off');
    await click('#sound');
    await until('document.querySelector("#sound").getAttribute("aria-pressed") === "true"');
    assert.equal(await evaluate('window.__audio.at(-1).state'), 'running');
    await click('#sound');
    await until('document.querySelector("#sound").getAttribute("aria-pressed") === "false"');
    assert.equal(await evaluate('window.__audio.at(-1).state'), 'closed');
  });
  await t.test('Journal, ending, room and checklist survive reload; confirmation resets them', async () => {
    await load('Page.reload', {});
    assert.equal(await score(), 150);
    assert.equal(await prop('#progress', 'value'), 150);
    assert.equal(await text('#room-name'), 'The Conservatory');
    assert.match(await text('#clues'), /midnight.*Agnes.*silver coin/);
    assert.match(await text('#items'), /Brass key.*Silver bookmark.*Moonstone/);
    assert.match(await text('#seals'), /3 \/ 3/);
    assert.equal(await prop('#ending', 'hidden'), false);
    assert.equal(await prop('#checklist input', 'checked'), true);
    assert.equal(await text('#sound-label'), 'Sound off');
    await click('#reset');
    await click('#reset-dialog button[value="cancel"]');
    await until('!document.querySelector("#reset-dialog").open');
    assert.equal(await score(), 150);
    await click('#reset');
    await click('#reset-dialog button[value="reset"]');
    await until('document.querySelector("#score").textContent === "0"');
    assert.equal(await prop('#ending', 'hidden'), true);
    assert.match(await text('#checklist-status'), /^0 of 5/);
    await load('Page.reload', {});
    assert.equal(await text('#room-name'), 'The Foyer');
    assert.equal(await score(), 0);
  });
  await t.test('390 px mobile layout, reduced motion, mobile controls and no console errors', async () => {
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, mobile: true, deviceScaleFactor: 1 });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    assert.equal(await evaluate('document.documentElement.scrollWidth'), 390);
    assert.equal(await evaluate('[...document.querySelectorAll(".ghost,.fog,.pumpkin")].every(el => getComputedStyle(el).animationName === "none")'), true);
    await snapshot('haunted-hollow-mobile');
    await click('[data-room="conservatory"]');
    await click('#landmarks button:nth-child(1)');
    assert.match(await text('#field-note'), /silver coin/);
    assert.deepEqual(errors, []);
  });
});
