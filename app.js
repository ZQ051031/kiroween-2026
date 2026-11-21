import { freshProgress, loadProgress, makeStory, rooms, saveProgress, scoreOf, tasks } from './game.js';

const $ = id => document.getElementById(id);
const progressTypes = ['clues', 'items', 'seals'];
const roomNumbers = ['I', 'II', 'III'];
let progress = loadProgress();
let storyTake = 0;

function activeRoom() {
  return rooms.find(room => room.id === progress.room);
}

function node(tag, content, className) {
  const element = document.createElement(tag);
  if (content) element.textContent = content;
  if (className) element.className = className;
  return element;
}

function button(content, className, onClick) {
  const control = node('button', content, className);
  control.type = 'button';
  control.addEventListener('click', onClick);
  return control;
}

function decorated(tag, content, className) {
  const element = node(tag, content, className);
  element.setAttribute('aria-hidden', 'true');
  return element;
}

const roomButtons = rooms.map((room, i) => {
  const control = button('', 'room-button', () => {
    if (room.id === progress.room) return;
    progress.room = room.id;
    saveProgress(progress);
    renderRoom();
  });
  control.dataset.room = room.id;
  const text = node('span');
  const sub = node('small');
  text.append(node('strong', room.name), sub);
  control.append(decorated('span', room.symbol, 'room-symbol'), text);
  $('rooms').append(control);
  return { control, sub, number: roomNumbers[i] };
});

const pointButtons = progressTypes.map((type, i) => {
  const hotspot = button('', 'hotspot', () => inspect(type));
  const landmark = button('', 'landmark', () => inspect(type));
  const position = decorated('span', String(i + 1).padStart(2, '0'));
  const label = node('span');
  label.className = 'landmark-title';
  landmark.append(position, label);
  $('hotspots').append(hotspot);
  $('landmarks').append(landmark);
  return { hotspot, landmark, position, label };
});

function refreshMarkers() {
  const room = activeRoom();
  roomButtons.forEach(({ control, sub, number }, i) => {
    const id = rooms[i].id;
    control.setAttribute('aria-current', String(id === room.id));
    sub.textContent = progress.seals.includes(id) ? `${number} / SEALED` : `${number} / ${rooms[i].label.toUpperCase()}`;
  });
  pointButtons.forEach(({ hotspot, landmark, position, label }, i) => {
    const [name, x, y] = room.points[i];
    const found = progress[progressTypes[i]].includes(room.id);
    const status = i === 2 ? 'sealed' : 'found';
    hotspot.style.left = `${x}%`;
    hotspot.style.top = `${y}%`;
    hotspot.textContent = found ? '✓' : String(i + 1).padStart(2, '0');
    hotspot.setAttribute('aria-label', found ? `${name} (${status})` : name);
    hotspot.title = name;
    hotspot.classList.toggle('done', found);
    position.textContent = found ? '✓' : String(i + 1).padStart(2, '0');
    label.textContent = name;
    landmark.setAttribute('aria-label', found ? `${name} (${status})` : name);
    landmark.classList.toggle('done', found);
  });
}

function renderRoom() {
  const room = activeRoom();
  const number = roomNumbers[rooms.indexOf(room)];
  $('room-art').src = `assets/${room.id}.svg`;
  $('room-art').alt = room.alt;
  $('room-number').textContent = `CHAMBER ${number} / ${room.label.toUpperCase()}`;
  $('scene-kicker').textContent = `FIG. ${number}  /  HAUNTED HOLLOW`;
  $('room-name').textContent = room.name;
  $('room-description').textContent = room.description;
  $('field-note').textContent = progress.seals.includes(room.id) ? room.seal.reward : 'Choose a numbered landmark to investigate.';
  refreshMarkers();
}

function renderRecord(type, field, empty) {
  const entries = rooms.filter(room => progress[type].includes(room.id));
  $(`${field}-count`).textContent = `${entries.length} / ${rooms.length}`;
  $(type).replaceChildren(...(entries.length ? entries.map(room => {
    const li = node('li');
    li.append(node('strong', room[field].name), node('span', room[field].text));
    return li;
  }) : [node('li', empty)]));
}

function renderJournal() {
  const score = scoreOf(progress);
  $('score').textContent = score;
  $('progress').value = score;
  $('seals').textContent = `${progress.seals.length} / ${rooms.length} MEMORY SEALS`;
  renderRecord('clues', 'clue', 'No clues found yet.');
  renderRecord('items', 'item', 'Nothing in your pockets yet.');
  $('ending').hidden = progress.seals.length !== rooms.length;
}

function record(type) {
  const id = progress.room;
  if (progress[type].includes(id)) return false;
  progress[type].push(id);
  saveProgress(progress);
  refreshMarkers();
  renderJournal();
  return true;
}

function inspect(type) {
  const room = activeRoom();
  if (type === 'seals') {
    if (progress.seals.includes(room.id)) {
      $('field-note').textContent = room.seal.reward;
    } else {
      openPuzzle(room);
    }
    return;
  }
  const entry = type === 'clues' ? room.clue : room.item;
  const added = record(type);
  $('field-note').textContent = `${added ? (type === 'clues' ? '+10' : '+15') + ' · ' : ''}${entry.name}: ${entry.text}`;
}

function choice(type, name, value, text) {
  const label = node('label');
  const input = node('input');
  Object.assign(input, { type, name, value });
  label.append(input, node('span', text));
  return { label, input };
}

function openPuzzle(room) {
  $('puzzle-title').textContent = room.seal.title;
  $('puzzle-detail').textContent = room.seal.prompt;
  $('puzzle-status').textContent = progress.items.includes(room.id)
    ? '' : `You still need the ${room.item.name.toLowerCase()} to seal this memory.`;
  const answers = room.seal.choices.map(answer => choice('radio', 'answer', answer, answer));
  answers[0].input.required = true;
  const group = $('answers');
  group.querySelectorAll('label').forEach(label => label.remove());
  group.append(...answers.map(({ label }) => label));
  $('puzzle').showModal();
}

$('puzzle-form').addEventListener('submit', event => {
  event.preventDefault();
  const room = activeRoom();
  if (!progress.items.includes(room.id)) {
    $('puzzle-status').textContent = `Find the ${room.item.name.toLowerCase()} in this room first.`;
    return;
  }
  if (new FormData(event.currentTarget).get('answer') !== room.seal.answer) {
    $('puzzle-status').textContent = 'The seal stays cold. Look for a clue in this room and try again.';
    return;
  }
  record('seals');
  $('puzzle').close();
  $('field-note').textContent = `+25 · ${room.seal.reward}${$('ending').hidden ? '' : ' All three memories returned. The ending is unlocked below.'}`;
});

document.querySelector('[data-close="puzzle"]').addEventListener('click', () => $('puzzle').close());
$('reset').addEventListener('click', () => {
  $('reset-dialog').returnValue = '';
  $('reset-dialog').showModal();
});
$('reset-dialog').addEventListener('close', event => {
  if (event.currentTarget.returnValue !== 'reset') return;
  progress = freshProgress();
  saveProgress(progress);
  renderRoom();
  renderJournal();
  renderChecklist();
  $('field-note').textContent = 'Progress reset. The house is ready for a new visitor.';
});

$('story-form').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  $('story').textContent = makeStory(data.get('visitor'), data.get('mood'), storyTake++);
});

const checks = tasks.map(([id, title]) => {
  const { label, input } = choice('checkbox', 'party-task', id, title);
  input.addEventListener('change', () => {
    progress.tasks = input.checked ? [...progress.tasks, id] : progress.tasks.filter(task => task !== id);
    saveProgress(progress);
    renderChecklist();
  });
  $('checklist').append(label);
  return input;
});

function renderChecklist() {
  checks.forEach(input => { input.checked = progress.tasks.includes(input.value); });
  $('checklist-status').textContent = `${progress.tasks.length} of ${tasks.length} ready for Halloween night.`;
}

let ambience;
let soundPending = false;

function startAmbience(Audio) {
  const context = new Audio();
  const output = context.createGain();
  output.gain.value = .075;
  output.connect(context.destination);
  [48.9, 73.4].forEach((frequency, index) => {
    const voice = context.createOscillator();
    voice.type = index ? 'sine' : 'triangle';
    voice.frequency.value = frequency;
    voice.connect(output);
    voice.start();
  });
  const tremolo = context.createOscillator();
  const depth = context.createGain();
  tremolo.frequency.value = .27;
  depth.gain.value = .024;
  tremolo.connect(depth).connect(output.gain);
  tremolo.start();
  return context;
}

$('sound').addEventListener('click', async () => {
  if (soundPending) return;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) {
    $('sound-label').textContent = 'Sound unavailable';
    $('sound').disabled = true;
    return;
  }
  soundPending = true;
  try {
    if (ambience) {
      await ambience.close();
      ambience = undefined;
    } else {
      ambience = startAmbience(Audio);
      await ambience.resume();
    }
    $('sound').setAttribute('aria-pressed', String(Boolean(ambience)));
    $('sound-label').textContent = ambience ? 'Sound on' : 'Sound off';
  } catch {
    if (ambience && ambience.state !== 'closed') await ambience.close().catch(() => {});
    ambience = undefined;
    $('sound').setAttribute('aria-pressed', 'false');
    $('sound-label').textContent = 'Sound unavailable';
  } finally {
    soundPending = false;
  }
});

renderRoom();
renderJournal();
renderChecklist();
