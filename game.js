export const rooms = [
  {
    id: 'foyer', name: 'The Foyer', symbol: '⌂', label: 'The welcome',
    alt: 'A crooked house against an amber dusk, watched by bare trees and a pair of jack-o’-lanterns.',
    description: 'The windows are lit, but nobody answers. At the threshold, a clock ticks backward and the welcome mat looks freshly disturbed.',
    clue: { name: 'Caretaker’s note', text: '“I wound the clock at midnight. It stopped exactly one hour later.”' },
    item: { name: 'Brass key', text: 'Cold enough to sting. It fits the clock’s winding slot.' },
    seal: {
      title: 'The stopped clock', prompt: 'Set the hour at which the clock stopped.',
      choices: ['11:00 PM', '12:00 AM', '1:00 AM'], answer: '1:00 AM',
      reward: 'The clock strikes once. The foyer’s memory settles into place.',
    },
    points: [['Read the note', 34, 53], ['Lift the mat', 66, 75], ['Set the clock', 51, 44]],
  },
  {
    id: 'library', name: 'The Library', symbol: '▤', label: 'The whisper',
    alt: 'Rosewood bookcases flank a moonlit window; on a reading table, an open book sits beside a candle.',
    description: 'Someone has turned every portrait to the wall. A reading lamp still burns beside an open book, and a portrait can be heard whispering.',
    clue: { name: 'Library register', text: '“Agnes, our librarian, is the only one who never left.”' },
    item: { name: 'Silver bookmark', text: 'The portrait’s frame has a silver slot exactly this wide.' },
    seal: {
      title: 'The nameless portrait', prompt: 'Name the librarian who remained in the house.',
      choices: ['Edgar', 'Agnes', 'Mabel'], answer: 'Agnes',
      reward: '“Someone remembers,” says the portrait. The library’s memory is restored.',
    },
    points: [['Read the register', 51, 60], ['Take the bookmark', 65, 48], ['Name the portrait', 80, 68]],
  },
  {
    id: 'conservatory', name: 'The Conservatory', symbol: '☾', label: 'The reflection',
    alt: 'Moonlight filters through a glass conservatory onto ferns and a shallow stone fountain.',
    description: 'Moonlight reaches every glass pane except one. The fountain is still as a mirror. Something silver waits on its rim.',
    clue: { name: 'Gardener’s tag', text: '“When the moon looks like a perfect silver coin, the fountain opens.”' },
    item: { name: 'Moonstone', text: 'This small stone is the missing weight in the fountain’s mechanism.' },
    seal: {
      title: 'The moon dial', prompt: 'Turn the dial to the moon that wakes the fountain.',
      choices: ['Crescent', 'New moon', 'Full moon'], answer: 'Full moon',
      reward: 'The fountain ripples with silver light. The conservatory’s memory comes awake.',
    },
    points: [['Read the tag', 30, 47], ['Lift the moonstone', 69, 70], ['Turn the moon dial', 50, 52]],
  },
];

export const tasks = [
  ['invites', 'Send costume-friendly invites'],
  ['lanterns', 'Set out lanterns along the path'],
  ['treats', 'Label treats and allergens'],
  ['story', 'Queue a story for midnight'],
  ['costume', 'Pick a costume and a spare layer'],
];

const storageKey = 'haunted-hollow-v1';
const roomIds = rooms.map(room => room.id);
const taskIds = tasks.map(([id]) => id);

export function freshProgress() {
  return { room: rooms[0].id, clues: [], items: [], seals: [], tasks: [] };
}

export function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (!saved) return freshProgress();
    const keep = (key, allowed) => Array.isArray(saved[key])
      ? allowed.filter(id => saved[key].includes(id)) : [];
    const items = keep('items', roomIds);
    return {
      room: roomIds.includes(saved.room) ? saved.room : rooms[0].id,
      clues: keep('clues', roomIds),
      items,
      seals: keep('seals', items),
      tasks: keep('tasks', taskIds),
    };
  } catch {
    return freshProgress();
  }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    // A full or unavailable store must not prevent playing in this tab.
  }
}

export function scoreOf({ clues, items, seals }) {
  return 10 * clues.length + 15 * items.length + 25 * seals.length;
}

const visitors = {
  caretaker: 'The last caretaker arrived carrying a ring with one key too many',
  witch: 'A runaway witch arrived with a suitcase that purred',
  ghost: 'A ghost with no name arrived wearing a borrowed coat',
};

const moments = {
  eerie: [
    ['A door that had been painted shut opened onto a second front hall', 'By dawn, every mirror in town showed the door standing just a little wider.'],
    ['The clock struck thirteen, and a second set of footsteps joined the first', 'Only one set of footprints left the house. It was the one facing in.'],
  ],
  cozy: [
    ['A candle in the library lit itself beside two cups of cider', 'At dawn, a new friend wrote the recipe on the back of the visitor’s invitation.'],
    ['A shy little ghost put a wool blanket around the visitor’s shoulders', 'They stayed up until sunrise naming the stars nobody else had bothered to name.'],
  ],
  strange: [
    ['The conservatory’s ferns voted to cancel Thursday', 'By breakfast, every calendar in town had replaced it with a picture of a snail.'],
    ['The front hall sneezed and all the pumpkins briefly changed places with the stars', 'The house now requires every new visitor to bring a handkerchief.'],
  ],
};

export function makeStory(visitor, mood, take) {
  const events = moments[mood];
  const [event, ending] = events[take % events.length];
  return `${visitors[visitor]} on the last night of October. ${event}. ${ending}`;
}
