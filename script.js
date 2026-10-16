/* =====================================================================
   SnowBuddies — A Magical Winter Learning Adventure
   script.js  ·  Vanilla JavaScript, no libraries, no network requests.

   TABLE OF CONTENTS (search for the numbered banners)
     1. GAME DATA        skills, regions, levels, question content
     2. COLLECTION DATA  stickers, workshop items
     3. PERSISTENCE      localStorage load/save/validate
     4. STATE + HELPERS
     5. ART              SVG snowmen, animals, shapes, scenery
     6. AUDIO + SPEECH   optional sound, music, narration
     7. EFFECTS          snowfall, bursts, toasts, modals
     8. LEARNING         recording answers, adaptive tiers, assessment
     9. REWARDS          snowflakes, unlocks
    10. ACTIVITIES       every mini-game (generator + renderer)
    11. SESSION          running a level
    12. SCREENS          menu, map, regions, album, workshop, results
    13. PARENT CORNER    gate + dashboard
    14. INIT
   ===================================================================== */
(() => {
'use strict';

/* ===================================================================
   1. GAME DATA  —  edit this section to add levels or questions
   =================================================================== */

const SAVE_KEY = 'snowbuddies.save.v1';
const SAVE_VERSION = 1;

/** Learning skills tracked on the parent dashboard. */
const SKILLS = {
  letters:   { name: 'Letter recognition',          icon: '🔤', what: 'finding and matching uppercase and lowercase letters',
               ideas: ['Hunt for letters on cereal boxes, signs and books, and name them together.', 'Write a favorite letter with a finger in a tray of flour, sand or shaving foam.'] },
  sounds:    { name: 'Beginning sounds',            icon: '🔊', what: 'hearing the first sound in a word',
               ideas: ['Find things around your home that begin with the letter M, then pick another letter.', 'Play "I spy something that starts with sss…" on a walk or in the car.'] },
  counting:  { name: 'Counting & numbers',          icon: '🔢', what: 'counting objects and recognizing numerals',
               ideas: ['Count five household objects together (spoons, socks, blocks) and say the last number out loud.', 'Look for numbers on doors, clocks and phones and name them.'] },
  addition:  { name: 'Basic addition',              icon: '➕', what: 'putting small groups together',
               ideas: ['Put two crackers on one plate and three on another, then count them all together.', 'Use toy cars: "We had 2, one more rolled in. How many now?"'] },
  shapes:    { name: 'Shapes & colors',             icon: '🔷', what: 'naming shapes and colors and sorting by them',
               ideas: ['Sort a pile of socks or blocks by color, then by size.', 'Go on a shape hunt: find circles, squares and triangles around the home.'] },
  patterns:  { name: 'Patterns & reasoning',        icon: '🧩', what: 'spotting what repeats and what does not belong',
               ideas: ['Make a pattern with blocks or snacks (red, blue, red, blue…) and ask what comes next.', 'Clap and stomp patterns together: clap, clap, stomp, clap, clap…?'] },
  vocab:     { name: 'Vocabulary',                  icon: '📖', what: 'connecting words with pictures',
               ideas: ['Name things in a picture book and ask your child to point to them.', 'On a winter walk, describe what you see with a new word like "fluffy" or "icy".'] },
  listening: { name: 'Listening & comprehension',   icon: '👂', what: 'understanding short stories and instructions',
               ideas: ['After a short story, ask "Who was in it?" and "What happened?"', 'Give a fun two-step instruction: "Put the bear on the red blanket."'] },
  memory:    { name: 'Sequencing & memory',         icon: '🧠', what: 'remembering things and putting events in order',
               ideas: ['Retell a favorite story using "first, next, last".', 'Show three small objects, cover them, remove one, and guess which is missing.'] },
};
const SKILL_ORDER = ['letters','sounds','counting','addition','shapes','patterns','vocab','listening','memory'];

/** Regions on the world map. `needs` lists what must be finished to open the region. */
const REGIONS = [
  { id: 'alphabet', name: 'Alphabet Forest',      short: 'Letters & sounds',      guide: 'penguin', guideName: 'Pip',
    blurb: 'Pip the penguin lost his letters!', needs: [],
    gift: { cat: 'hat', id: 'topHat' } },
  { id: 'number',   name: 'Number Mountain',      short: 'Counting & adding',     guide: 'bear',    guideName: 'Bruno',
    blurb: 'Bruno needs help counting snowballs!', needs: [{ region: 'alphabet', levels: 2 }],
    gift: { cat: 'bg', id: 'forest' } },
  { id: 'pattern',  name: 'Pattern Village',      short: 'Shapes & patterns',     guide: 'rabbit',  guideName: 'Rosie',
    blurb: 'Rosie is decorating the village!', needs: [{ region: 'number', levels: 2 }],
    gift: { cat: 'acc', id: 'lantern' } },
  { id: 'story',    name: 'Storybook Snowfield',  short: 'Words & stories',       guide: 'owl',     guideName: 'Olive',
    blurb: 'Olive has stories to share!', needs: [{ region: 'pattern', levels: 2 }],
    gift: { cat: 'bg', id: 'cottage' } },
  { id: 'lake',     name: 'Frozen Lake',          short: 'Brain Quest & review',  guide: 'snowman', guideName: 'Frosty',
    blurb: 'Frosty\'s Brain Quest on the ice!', needs: [{ region: 'alphabet', levels: 1 }, { region: 'number', levels: 1 }, { region: 'pattern', levels: 1 }, { region: 'story', levels: 1 }],
    gift: { cat: 'hat', id: 'crown' } },
];

/**
 * Levels. `tier` (1–3) is the starting difficulty; the game nudges it up or down
 * per skill using recent answers. `rounds` lists activity ids (see section 10).
 * '*' means "pick a mixed review question".  To add a level, add a line here.
 */
const LEVELS = [
  // ---- Alphabet Forest
  { id: 'af1', region: 'alphabet', title: 'Snowflake Letters',  blurb: 'Find the letters hiding in the snow.',   tier: 1, rounds: ['findLetter','findLetter','findLetter','matchCase','findLetter'] },
  { id: 'af2', region: 'alphabet', title: 'Big and Little',     blurb: 'Match big letters with little letters.', tier: 1, rounds: ['matchCase','findLetter','matchCase','findLetter','matchCase'] },
  { id: 'af3', region: 'alphabet', title: 'First Sounds',       blurb: 'What sound does a word start with?',     tier: 2, rounds: ['beginSound','beginSound','findLetter','beginSound','beginSound'] },
  { id: 'af4', region: 'alphabet', title: 'Pip\'s Sound Trail', blurb: 'Follow the trail of beginning sounds.',  tier: 2, rounds: ['beginSound','matchCase','beginSound','findLetter','beginSound'] },
  // ---- Number Mountain
  { id: 'nm1', region: 'number', title: 'Snowball Counting', blurb: 'Count the snowballs on the hill.',        tier: 1, rounds: ['countObjects','countObjects','basket','whichGroup','countObjects'] },
  { id: 'nm2', region: 'number', title: 'Fill the Basket',   blurb: 'Fill the basket with just enough.',       tier: 1, rounds: ['basket','countObjects','basket','whichGroup','numberSequence'] },
  { id: 'nm3', region: 'number', title: 'Snowman Sums',      blurb: 'Put snowballs together and count.',       tier: 2, rounds: ['addVisual','addVisual','countObjects','addVisual','basket'] },
  { id: 'nm4', region: 'number', title: 'Summit Challenge',  blurb: 'A big climb with numbers up to ten!',     tier: 2, rounds: ['whichGroup','addVisual','basket','numberSequence','addVisual'] },
  // ---- Pattern Village
  { id: 'pv1', region: 'pattern', title: 'Colors and Shapes', blurb: 'Find shapes and colors in the village.',  tier: 1, rounds: ['findShape','findShape','shapeOutline','sortItems','findShape'] },
  { id: 'pv2', region: 'pattern', title: 'Pattern Path',      blurb: 'What comes next on the path?',            tier: 1, rounds: ['completePattern','completePattern','completePattern','completePattern','completePattern'] },
  { id: 'pv3', region: 'pattern', title: 'Shape Parade',      blurb: 'Match and sort the parade shapes.',       tier: 2, rounds: ['shapeOutline','sortItems','findShape','shapeOutline','sortItems'] },
  { id: 'pv4', region: 'pattern', title: 'Pattern Pro',       blurb: 'Trickier patterns to solve.',             tier: 2, rounds: ['completePattern','completePattern','sortItems','completePattern','shapeOutline'] },
  // ---- Storybook Snowfield
  { id: 'ss1', region: 'story', title: 'Picture Words',      blurb: 'Match words with pictures.',              tier: 1, rounds: ['wordPicture','wordPicture','wordPicture','wordPicture','wordPicture'] },
  { id: 'ss2', region: 'story', title: 'Story Time',         blurb: 'Listen to little stories.',               tier: 1, rounds: ['storyChoice','wordPicture','storyChoice','wordPicture','storyChoice'] },
  { id: 'ss3', region: 'story', title: 'First, Next, Last',  blurb: 'Put story pictures in order.',            tier: 2, rounds: ['sequenceStory','storyChoice','sequenceStory','followInstruction','followInstruction'] },
  { id: 'ss4', region: 'story', title: 'Follow the Directions', blurb: 'Listen carefully and help the animals.', tier: 2, rounds: ['followInstruction','followInstruction','storyChoice','sequenceStory','followInstruction'] },
  // ---- Frozen Lake
  { id: 'fl1', region: 'lake', title: 'Match the Pairs',     blurb: 'Find pairs that match.',                  tier: 1, rounds: ['memoryPairs','oddOne','memoryPairs','oddOne','numberSequence'] },
  { id: 'fl2', region: 'lake', title: 'Odd One Out',         blurb: 'Which one does not belong?',              tier: 2, rounds: ['oddOne','oddOne','memoryPairs','sequenceStory','oddOne'] },
  { id: 'fl3', region: 'lake', title: 'Frosty\'s Brain Quest', blurb: 'A little bit of everything!',           tier: 2, rounds: ['countObjects','beginSound','completePattern','oddOne','memoryPairs','wordPicture'] },
  { id: 'fl4', region: 'lake', title: 'Sparkle Pond Surprise', blurb: 'Fresh mixed puzzles every time. Free play!', tier: 2, bonus: true, rounds: ['*','*','*','*','*'] },
];

/** Activity -> skill. Used for adaptive picking and the parent dashboard. */
const ACTIVITY_SKILL = {
  findLetter: 'letters', matchCase: 'letters', beginSound: 'sounds',
  countObjects: 'counting', basket: 'counting', whichGroup: 'counting', numberSequence: 'counting',
  addVisual: 'addition',
  findShape: 'shapes', shapeOutline: 'shapes', sortItems: 'shapes',
  completePattern: 'patterns', oddOne: 'patterns',
  wordPicture: 'vocab', storyChoice: 'listening', followInstruction: 'listening',
  sequenceStory: 'memory', memoryPairs: 'memory',
};

const REWARD = { levelBase: 8, perRound: 1, perFirstTry: 1, star2: 3, star3: 3, region: 25, discover: 5 };
const MILESTONES = [
  { id: 'q25',  amount: 5,  label: '25 questions tried!',  test: s => s.stats.questions >= 25 },
  { id: 'q50',  amount: 10, label: '50 questions tried!',  test: s => s.stats.questions >= 50 },
  { id: 'q100', amount: 15, label: '100 questions tried!', test: s => s.stats.questions >= 100 },
  { id: 'lv5',  amount: 10, label: '5 levels finished!',   test: s => levelsDone(s) >= 5 },
  { id: 'lv10', amount: 15, label: '10 levels finished!',  test: s => levelsDone(s) >= 10 },
  { id: 'lvAll',amount: 30, label: 'Every level finished!',test: s => levelsDone(s) >= LEVELS.filter(l => !l.bonus).length },
];

/* ---------- Question content (all editable data) ---------- */

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const LETTER_POOL = { 1: 'ABCDMPST'.split(''), 2: 'ABCDEFGHLMNOPRSTW'.split(''), 3: LETTERS };
const CONFUSABLE = { B:['D','P','R'], D:['B','O','P'], E:['F','L'], F:['E','P'], M:['N','W'], N:['M','H'], O:['Q','C','D'], P:['B','R','F'],
                     Q:['O','G'], R:['P','B'], V:['W','U'], W:['V','M'], U:['V','N'], C:['G','O'], G:['C','Q'], I:['L','J'], L:['I','T'], T:['L','F'], H:['N','K'], K:['H','X'] };
const SAME_SOUND = { C:['K','S'], K:['C'], S:['C','Z'], G:['J'], J:['G'], Z:['S'], Q:['K'], X:['Z'] };

/** Words with pictures for "beginning sound" questions. t = starting tier. */
const BEGIN_WORDS = [
  { w:'apple',   e:'🍎', l:'A', t:1 }, { w:'bear',   e:'🐻', l:'B', t:1 }, { w:'cat',     e:'🐱', l:'C', t:1 }, { w:'duck',  e:'🦆', l:'D', t:1 },
  { w:'mitten',  e:'🧤', l:'M', t:1 }, { w:'penguin',e:'🐧', l:'P', t:1 }, { w:'sun',     e:'☀️', l:'S', t:1 }, { w:'tree',  e:'🌲', l:'T', t:1 },
  { w:'egg',     e:'🥚', l:'E', t:2 }, { w:'fish',   e:'🐟', l:'F', t:2 }, { w:'goat',    e:'🐐', l:'G', t:2 }, { w:'hat',   e:'🎩', l:'H', t:2 },
  { w:'ice',     e:'🧊', l:'I', t:2 }, { w:'lion',   e:'🦁', l:'L', t:2 }, { w:'nut',     e:'🥜', l:'N', t:2 }, { w:'owl',   e:'🦉', l:'O', t:2 },
  { w:'rabbit',  e:'🐰', l:'R', t:2 }, { w:'kite',   e:'🪁', l:'K', t:3 }, { w:'umbrella',e:'☂️', l:'U', t:3 }, { w:'whale', e:'🐳', l:'W', t:3 },
  { w:'zebra',   e:'🦓', l:'Z', t:3 }, { w:'van',    e:'🚐', l:'V', t:3 }, { w:'yarn',    e:'🧶', l:'Y', t:3 },
];

/** Picture-word vocabulary. */
const VOCAB = [
  { w:'hat', e:'🎩', t:1 }, { w:'bear', e:'🐻', t:1 }, { w:'snowman', e:'⛄', t:1 }, { w:'star', e:'⭐', t:1 }, { w:'moon', e:'🌙', t:1 }, { w:'sun', e:'☀️', t:1 },
  { w:'tree', e:'🌲', t:1 }, { w:'fish', e:'🐟', t:1 }, { w:'cat', e:'🐱', t:1 }, { w:'dog', e:'🐶', t:1 }, { w:'house', e:'🏠', t:1 }, { w:'book', e:'📖', t:1 }, { w:'snow', e:'❄️', t:1 },
  { w:'scarf', e:'🧣', t:2 }, { w:'mitten', e:'🧤', t:2 }, { w:'boot', e:'🥾', t:2 }, { w:'sled', e:'🛷', t:2 }, { w:'penguin', e:'🐧', t:2 }, { w:'rabbit', e:'🐰', t:2 },
  { w:'owl', e:'🦉', t:2 }, { w:'ice', e:'🧊', t:2 }, { w:'soup', e:'🍲', t:2 }, { w:'cocoa', e:'☕', t:2 }, { w:'cookie', e:'🍪', t:2 },
  { w:'cold', e:'🥶', t:3 }, { w:'hot', e:'🥵', t:3 }, { w:'fire', e:'🔥', t:3 }, { w:'bell', e:'🔔', t:3 }, { w:'gift', e:'🎁', t:3 }, { w:'fox', e:'🦊', t:3 }, { w:'candle', e:'🕯️', t:3 },
];

/** Short stories for listening comprehension. Wrong answers must not appear in the story. */
const STORIES = [
  { id:'s1', t:1, text:'Pip the penguin put on a red hat. Then Pip went out to play in the snow.', q:'What did Pip put on?',
    ans:{ e:'🎩', w:'hat' }, wrong:[{ e:'🥾', w:'boots' }, { e:'🧣', w:'scarf' }] },
  { id:'s2', t:1, text:'Bella the bear was hungry. She found a warm bowl of soup.', q:'What did Bella find?',
    ans:{ e:'🍲', w:'soup' }, wrong:[{ e:'🎁', w:'gift' }, { e:'🛷', w:'sled' }] },
  { id:'s3', t:1, text:'It was very cold outside. Max the rabbit wrapped a scarf around his neck.', q:'What did Max put on?',
    ans:{ e:'🧣', w:'scarf' }, wrong:[{ e:'🎩', w:'hat' }, { e:'🥾', w:'boots' }] },
  { id:'s4', t:1, text:'Lily rolled a big snowball. She rolled and rolled until she made a snowman.', q:'What did Lily make?',
    ans:{ e:'⛄', w:'snowman' }, wrong:[{ e:'🏠', w:'house' }, { e:'🛷', w:'sled' }] },
  { id:'s5', t:2, text:'The sun came out and warmed the pond. The ice began to melt.', q:'What began to melt?',
    ans:{ e:'🧊', w:'ice' }, wrong:[{ e:'🌲', w:'tree' }, { e:'🎁', w:'gift' }] },
  { id:'s6', t:2, text:'Fox and Owl looked up at the night sky. They saw a bright, round moon.', q:'What did they see?',
    ans:{ e:'🌙', w:'moon' }, wrong:[{ e:'☀️', w:'sun' }, { e:'🌈', w:'rainbow' }] },
  { id:'s7', t:2, text:'Ben took his sled to the top of the hill. Whoosh! He slid all the way down.', q:'What did Ben ride?',
    ans:{ e:'🛷', w:'sled' }, wrong:[{ e:'🚲', w:'bike' }, { e:'🚂', w:'train' }] },
  { id:'s8', t:3, text:'Ana was cold, so she drank hot cocoa. Then she read a book by the fire.', q:'What did Ana drink?',
    ans:{ e:'☕', w:'cocoa' }, wrong:[{ e:'🍲', w:'soup' }, { e:'🧃', w:'juice' }] },
  { id:'s9', t:3, text:'Sam baked cookies for his friends. He put them on a big blue plate.', q:'What did Sam bake?',
    ans:{ e:'🍪', w:'cookies' }, wrong:[{ e:'🍞', w:'bread' }, { e:'🎂', w:'cake' }] },
];

/** Things that happen in order. `steps` are already in the correct order. */
const SEQUENCES = [
  { id:'q1', t:1, title:'Making a snowman',  steps:[{ e:'🌨️', t:'Snow falls down' }, { e:'🏐', t:'Roll a big snowball' }, { e:'⛄', t:'Stack up a snowman' }] },
  { id:'q2', t:1, title:'Going out to play', steps:[{ e:'🧥', t:'Put on a coat' }, { e:'🥾', t:'Pull on boots' }, { e:'🛷', t:'Go sledding' }] },
  { id:'q3', t:1, title:'Cocoa time',        steps:[{ e:'🥛', t:'Pour milk in a mug' }, { e:'☕', t:'Stir in cocoa' }, { e:'😋', t:'Sip and smile' }] },
  { id:'q4', t:2, title:'Bedtime',           steps:[{ e:'🛁', t:'Take a warm bath' }, { e:'📖', t:'Read a story' }, { e:'😴', t:'Go to sleep' }] },
  { id:'q5', t:3, title:'A baby penguin',    steps:[{ e:'🥚', t:'An egg sits on the ice' }, { e:'🐣', t:'The egg cracks open' }, { e:'🐧', t:'A baby penguin hatches' }, { e:'🧊', t:'It slides on the ice' }] },
  { id:'q6', t:3, title:'Baking cookies',    steps:[{ e:'🥣', t:'Mix the dough' }, { e:'🔥', t:'Bake in the oven' }, { e:'🍪', t:'Take out the cookies' }, { e:'😋', t:'Eat one!' }] },
];

const ANIMALS = [ { id:'rabbit', n:'rabbit' }, { id:'penguin', n:'penguin' }, { id:'bear', n:'bear' }, { id:'fox', n:'fox' } ];
const COLORS = [
  { id:'red',    hex:'#E4574D' }, { id:'blue',   hex:'#4A8FDB' }, { id:'yellow', hex:'#F4C430' },
  { id:'green',  hex:'#3FAE7A' }, { id:'purple', hex:'#8B64C9' }, { id:'orange', hex:'#F28C38' },
];
const SHAPE_POOL = { 1: ['circle','square','triangle'], 2: ['circle','square','triangle','star','heart','rectangle'],
                     3: ['circle','square','triangle','star','heart','rectangle','oval','diamond','hexagon'] };
const COLOR_POOL = { 1: ['red','blue','yellow'], 2: ['red','blue','yellow','green'], 3: ['red','blue','yellow','green','purple','orange'] };

const WINTER_ELEMS = ['⛄','🧤','❄️','🧣','🎩','🌲','⭐','🐧'];
const MEMORY_EMOJI = ['⛄','🐧','🐻','🧤','🎩','🐰','⭐','❄️','🦊','🧣','🌲','🦉'];

/** "Which one does not belong?" sets. `odd` items come from a different group. */
const ODD_SETS = [
  { t:1, cat:'animals',        items:['🐧','🐻','🐰','🦊','🦉','🐟'], odd:['🧤','🧣','🎩','🥾'] },
  { t:1, cat:'winter clothes', items:['🧤','🧣','🎩','🥾'],            odd:['🐧','🐻','🐰','🌲'] },
  { t:2, cat:'letters',        items:['A','B','M','S','T','R'],        odd:['3','7','5','9','2'] },
  { t:2, cat:'numbers',        items:['2','4','6','8','3'],            odd:['A','M','S','T'] },
  { t:2, cat:'things in the sky', items:['☀️','🌙','⭐','☁️'],          odd:['🌲','🏠','🐟'] },
  { t:3, cat:'cold things',    items:['❄️','🧊','⛄','🥶'],             odd:['🔥','☀️','🥵'] },
  { t:3, cat:'warm things',    items:['🔥','☕','🧣','🧤','🍲'],        odd:['🧊','❄️','⛄'] },
  { t:3, cat:'animals that fly', items:['🐦','🦉','🦅','🦆'],          odd:['🐟','🐻','🐧','🐰'] },
];

/** Friendly feedback. */
const CHEERS = ['Hooray!','You got it!','Super job!','Snowtastic!','Wow, nice thinking!','Yes! Great work!','Brilliant!','Way to go!'];
const TRY_AGAIN = ['Good try! Let\'s look again.','Almost! Try another one.','Nice effort! You can find it.','Let\'s take another peek.'];

/* Small utility needed by data above */
function levelsDone(s) { return LEVELS.filter(l => s.levels[l.id] && s.levels[l.id].done).length; }

/* ===================================================================
   2. COLLECTION DATA  —  stickers and Snowman Workshop items
   =================================================================== */

const STICKER_CATS = [
  { id: 'friends', name: 'Snowman Friends',     icon: '⛄' },
  { id: 'animals', name: 'Winter Animals',      icon: '🐧' },
  { id: 'flakes',  name: 'Magical Snowflakes',  icon: '❄️' },
  { id: 'cozy',    name: 'Cozy Things',         icon: '🧤' },
  { id: 'rare',    name: 'Rare Visitors',       icon: '✨' },
];
const RARITY = { common: 'Common', shiny: 'Sparkly', rare: 'Rare' };

/**
 * Unlock conditions (`cond`):
 *   { t:'free' }                 given at the start
 *   { t:'level', id }            finish a level
 *   { t:'region', id }           finish every level in a region
 *   { t:'questions', n }         try n questions in total
 *   { t:'earned', n }            earn n snowflakes in total
 *   { t:'explorer' }             open every region on the map
 *   { t:'stickers', n }          collect n stickers
 */
const friend = look => () => Art.snowman(look, { label: 'Snowman friend' });
const STICKERS = [
  // Snowman Friends
  { id: 'frosty',    cat: 'friends', name: 'Frosty',        rarity: 'common', cond: { t: 'free' },              art: friend({ hat: 'beanie', scarf: 'coral' }) },
  { id: 'flurry',    cat: 'friends', name: 'Flurry',        rarity: 'common', cond: { t: 'level', id: 'af2' },   art: friend({ hat: 'wizard', scarf: 'lav', face: 'wink' }) },
  { id: 'icicle',    cat: 'friends', name: 'Sir Icicle',    rarity: 'shiny',  cond: { t: 'level', id: 'nm2' },   art: friend({ hat: 'topHat', scarf: 'blue', face: 'cool', buttons: 'star' }) },
  { id: 'mittens',   cat: 'friends', name: 'Miss Mittens',  rarity: 'common', cond: { t: 'level', id: 'pv3' },   art: friend({ hat: 'earmuffs', scarf: 'mint', face: 'rosy' }) },
  { id: 'cocoajoe',  cat: 'friends', name: 'Cocoa Joe',     rarity: 'common', cond: { t: 'level', id: 'ss2' },   art: friend({ hat: 'beanie', scarf: 'gold', face: 'grin', acc: 'broom' }) },
  { id: 'pippa',     cat: 'friends', name: 'Princess Pippa',rarity: 'shiny',  cond: { t: 'level', id: 'fl1' },   art: friend({ hat: 'crown', scarf: 'lav', face: 'rosy', buttons: 'rainbow', acc: 'wand' }) },
  // Winter Animals
  { id: 'penguin',   cat: 'animals', name: 'Pip the Penguin', rarity: 'common', cond: { t: 'level', id: 'af1' }, art: () => Art.animal('penguin') },
  { id: 'bear',      cat: 'animals', name: 'Bruno Bear',    rarity: 'common', cond: { t: 'level', id: 'nm1' },   art: () => Art.animal('bear') },
  { id: 'rabbit',    cat: 'animals', name: 'Rosie Rabbit',  rarity: 'common', cond: { t: 'level', id: 'pv1' },   art: () => Art.animal('rabbit') },
  { id: 'fox',       cat: 'animals', name: 'Finn Fox',      rarity: 'common', cond: { t: 'level', id: 'ss1' },   art: () => Art.animal('fox') },
  { id: 'owl',       cat: 'animals', name: 'Olive Owl',     rarity: 'shiny',  cond: { t: 'level', id: 'af4' },   art: () => Art.animal('owl') },
  { id: 'seal',      cat: 'animals', name: 'Sunny Seal',    rarity: 'shiny',  cond: { t: 'level', id: 'fl2' },   art: () => Art.animal('seal') },
  // Magical Snowflakes
  { id: 'flake1',    cat: 'flakes',  name: 'Blue Twinkle',  rarity: 'common', cond: { t: 'questions', n: 10 },  art: () => Art.flake(0) },
  { id: 'flake2',    cat: 'flakes',  name: 'Lavender Spark',rarity: 'common', cond: { t: 'questions', n: 30 },  art: () => Art.flake(1) },
  { id: 'flake3',    cat: 'flakes',  name: 'Mint Crystal',  rarity: 'shiny',  cond: { t: 'questions', n: 60 },  art: () => Art.flake(2) },
  { id: 'flake4',    cat: 'flakes',  name: 'Coral Glimmer', rarity: 'shiny',  cond: { t: 'earned', n: 100 },    art: () => Art.flake(3) },
  { id: 'flake5',    cat: 'flakes',  name: 'Golden Flake',  rarity: 'rare',   cond: { t: 'explorer' },          art: () => Art.flake(4) },
  // Cozy Things
  { id: 'boot',      cat: 'cozy',    name: 'Snow Boot',     rarity: 'common', cond: { t: 'level', id: 'af3' },   art: () => wrap100(STICKER_ART.boot, 'Snow boot') },
  { id: 'mitten',    cat: 'cozy',    name: 'Warm Mitten',   rarity: 'common', cond: { t: 'level', id: 'nm3' },   art: () => wrap100(STICKER_ART.mitten, 'Warm mitten') },
  { id: 'sled',      cat: 'cozy',    name: 'Speedy Sled',   rarity: 'common', cond: { t: 'level', id: 'pv4' },   art: () => wrap100(STICKER_ART.sled, 'Sled') },
  { id: 'cocoa',     cat: 'cozy',    name: 'Hot Cocoa',     rarity: 'common', cond: { t: 'level', id: 'ss3' },   art: () => wrap100(STICKER_ART.cocoa, 'Hot cocoa') },
  { id: 'lantern',   cat: 'cozy',    name: 'Glow Lantern',  rarity: 'shiny',  cond: { t: 'level', id: 'ss4' },   art: () => wrap100(STICKER_ART.lantern, 'Lantern') },
  // Rare Seasonal Characters
  { id: 'moonrabbit',cat: 'rare',    name: 'Moon Rabbit',   rarity: 'rare',   cond: { t: 'region', id: 'alphabet' }, art: () => wrap100(STICKER_ART.moonRabbit, 'Moon Rabbit') },
  { id: 'fairy',     cat: 'rare',    name: 'Snow Fairy',    rarity: 'rare',   cond: { t: 'region', id: 'number' },   art: () => wrap100(STICKER_ART.snowFairy, 'Snow Fairy') },
  { id: 'aurorafox', cat: 'rare',    name: 'Aurora Fox',    rarity: 'rare',   cond: { t: 'region', id: 'story' },    art: () => wrap100(STICKER_ART.auroraFox, 'Aurora Fox') },
  { id: 'yeti',      cat: 'rare',    name: 'Crystal Yeti',  rarity: 'rare',   cond: { t: 'region', id: 'lake' },     art: () => wrap100(STICKER_ART.yeti, 'Crystal Yeti') },
  { id: 'collector', cat: 'rare',    name: 'Star Collector',rarity: 'rare',   cond: { t: 'stickers', n: 15 },         art: () => wrap100(`<circle cx="50" cy="50" r="38" fill="#F6C85F" stroke="#D09A2A" stroke-width="4"/><polygon points="${starPoints(50, 52, 28, 12)}" fill="#fff" stroke="#D09A2A" stroke-width="3" stroke-linejoin="round"/>`, 'Star Collector') },
];

/** Human-readable text for an unlock condition. */
function describeCond(c) {
  const lv = id => LEVELS.find(l => l.id === id);
  const rg = id => REGIONS.find(r => r.id === id);
  switch (c.t) {
    case 'free':      return 'A gift to start your album!';
    case 'level':     return `Finish "${lv(c.id).title}" in ${rg(lv(c.id).region).name}`;
    case 'region':    return `Finish every level in ${rg(c.id).name}`;
    case 'questions': return `Try ${c.n} questions`;
    case 'earned':    return `Earn ${c.n} snowflakes`;
    case 'explorer':  return 'Visit every place on the map';
    case 'stickers':  return `Collect ${c.n} stickers`;
  }
  return '';
}

/* ---------- Snowman Workshop ---------- */
const WORKSHOP_CATS = [
  { id: 'hat',     name: 'Hats',    icon: '🎩', view: '30 6 140 100' },
  { id: 'face',    name: 'Faces',   icon: '😊', view: '50 66 100 80' },
  { id: 'scarf',   name: 'Scarves', icon: '🧣', view: '30 112 140 100' },
  { id: 'buttons', name: 'Buttons', icon: '🔘', view: '50 150 100 100' },
  { id: 'acc',     name: 'Extras',  icon: '🎈', view: '10 60 190 200' },
  { id: 'bg',      name: 'Scenes',  icon: '🏔️', view: '0 0 200 262' },
];
/** cost 0 = free from the start. Items can also be gifts (see REGIONS[].gift). */
const WORKSHOP_ITEMS = {
  hat:     [{ id: 'none', name: 'No hat', cost: 0 }, { id: 'beanie', name: 'Cozy beanie', cost: 0 }, { id: 'earmuffs', name: 'Earmuffs', cost: 12 }, { id: 'topHat', name: 'Top hat', cost: 15 }, { id: 'wizard', name: 'Wizard hat', cost: 20 }, { id: 'crown', name: 'Paper crown', cost: 25 }],
  face:    [{ id: 'smile', name: 'Smile', cost: 0 }, { id: 'grin', name: 'Big grin', cost: 0 }, { id: 'wink', name: 'Wink', cost: 8 }, { id: 'surprised', name: 'Surprised', cost: 8 }, { id: 'rosy', name: 'Rosy cheeks', cost: 12 }, { id: 'cool', name: 'Cool shades', cost: 16 }],
  scarf:   [{ id: 'none', name: 'No scarf', cost: 0 }, { id: 'coral', name: 'Coral scarf', cost: 0 }, { id: 'blue', name: 'Blue scarf', cost: 10 }, { id: 'mint', name: 'Mint scarf', cost: 10 }, { id: 'lav', name: 'Lavender scarf', cost: 14 }, { id: 'gold', name: 'Golden scarf', cost: 18 }],
  buttons: [{ id: 'coal', name: 'Coal buttons', cost: 0 }, { id: 'coral', name: 'Coral buttons', cost: 6 }, { id: 'mint', name: 'Mint buttons', cost: 6 }, { id: 'star', name: 'Star buttons', cost: 12 }, { id: 'rainbow', name: 'Rainbow buttons', cost: 16 }, { id: 'snowflake', name: 'Snowflake buttons', cost: 20 }],
  acc:     [{ id: 'none', name: 'Nothing', cost: 0 }, { id: 'broom', name: 'Broom', cost: 10 }, { id: 'balloon', name: 'Balloon', cost: 14 }, { id: 'lantern', name: 'Lantern', cost: 18 }, { id: 'bird', name: 'Bluebird friend', cost: 22 }, { id: 'wand', name: 'Star wand', cost: 26 }],
  bg:      [{ id: 'none', name: 'Plain', cost: 0 }, { id: 'sky', name: 'Snowy hills', cost: 0 }, { id: 'dusk', name: 'Moonlit dusk', cost: 14 }, { id: 'forest', name: 'Pine forest', cost: 18 }, { id: 'cottage', name: 'Cozy cottage', cost: 22 }, { id: 'aurora', name: 'Northern lights', cost: 30 }],
};
const DEFAULT_LOOK = { hat: 'beanie', face: 'smile', scarf: 'coral', buttons: 'coal', acc: 'none', bg: 'none' };
const findItem = (cat, id) => (WORKSHOP_ITEMS[cat] || []).find(i => i.id === id);

/* ===================================================================
   3. PERSISTENCE  —  localStorage with validation
   =================================================================== */

function defaultState() {
  return {
    v: SAVE_VERSION,
    snowflakes: 10,                   // a small welcome gift
    earned: 0,                        // total earned through play
    levels: {},                       // id -> { done, stars, plays }
    regionsSeen: {},
    claimed: {},                      // reward keys already paid out (prevents duplicates)
    stickers: { frosty: Date.now() },
    newStickers: {},
    workshop: { owned: {}, equipped: Object.assign({}, DEFAULT_LOOK) },
    scrapbook: [],
    skills: {},                       // skill -> { a, c, recent:[0/1], concepts:{ label:[a,c] } }
    sessions: [],
    stats: { questions: 0, correct: 0, totalMs: 0, sessions: 0 },
    playDays: [],
    settings: { sfx: true, music: false, voice: true, muted: false, reducedMotion: null },
    recentUnlocks: [],
    meta: { created: Date.now(), recovered: false },
  };
}

const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
const num = (x, min, max, def) => (typeof x === 'number' && isFinite(x)) ? Math.min(max, Math.max(min, x)) : def;
const int = (x, min, max, def) => Math.round(num(x, min, max, def));

/** Rebuild a trustworthy state object from whatever was in storage. Never throws. */
function sanitize(raw) {
  const s = defaultState();
  if (!isObj(raw)) return s;
  s.snowflakes = int(raw.snowflakes, 0, 100000, s.snowflakes);
  s.earned = int(raw.earned, 0, 100000, 0);
  if (isObj(raw.levels)) LEVELS.forEach(l => {
    const r = raw.levels[l.id];
    if (isObj(r)) s.levels[l.id] = { done: !!r.done, stars: int(r.stars, 0, 3, 0), plays: int(r.plays, 0, 100000, 0) };
  });
  if (isObj(raw.regionsSeen)) REGIONS.forEach(r => { if (raw.regionsSeen[r.id]) s.regionsSeen[r.id] = true; });
  if (isObj(raw.claimed)) Object.keys(raw.claimed).slice(0, 600).forEach(k => { if (raw.claimed[k] && k.length < 60) s.claimed[k] = true; });
  if (isObj(raw.stickers)) { s.stickers = {}; STICKERS.forEach(st => { if (raw.stickers[st.id]) s.stickers[st.id] = num(raw.stickers[st.id], 0, 9e15, Date.now()); }); if (!s.stickers.frosty) s.stickers.frosty = Date.now(); }
  if (isObj(raw.newStickers)) STICKERS.forEach(st => { if (raw.newStickers[st.id] && s.stickers[st.id]) s.newStickers[st.id] = true; });
  if (isObj(raw.workshop)) {
    if (isObj(raw.workshop.owned)) Object.keys(raw.workshop.owned).forEach(k => { const [c, i] = k.split(':'); if (raw.workshop.owned[k] && findItem(c, i)) s.workshop.owned[k] = true; });
    if (isObj(raw.workshop.equipped)) Object.keys(DEFAULT_LOOK).forEach(c => {
      const id = raw.workshop.equipped[c];
      if (typeof id === 'string' && findItem(c, id) && (findItem(c, id).cost === 0 || s.workshop.owned[c + ':' + id])) s.workshop.equipped[c] = id;
    });
  }
  if (Array.isArray(raw.scrapbook)) s.scrapbook = raw.scrapbook.slice(0, 60).filter(p => isObj(p) && STICKERS.some(st => st.id === p.id) && s.stickers[p.id])
    .map(p => ({ id: p.id, x: num(p.x, 0, 100, 50), y: num(p.y, 0, 100, 50) }));
  if (isObj(raw.skills)) SKILL_ORDER.forEach(k => {
    const r = raw.skills[k]; if (!isObj(r)) return;
    const c = {};
    if (isObj(r.concepts)) Object.keys(r.concepts).slice(0, 120).forEach(name => {
      const v = r.concepts[name];
      if (Array.isArray(v) && name.length < 50) { const a = int(v[0], 0, 99999, 0); c[name] = [a, Math.min(a, int(v[1], 0, 99999, 0))]; }
    });
    const a = int(r.a, 0, 999999, 0);
    s.skills[k] = { a, c: Math.min(a, int(r.c, 0, 999999, 0)), recent: Array.isArray(r.recent) ? r.recent.slice(-20).map(x => x ? 1 : 0) : [], concepts: c };
  });
  if (Array.isArray(raw.sessions)) s.sessions = raw.sessions.slice(-40).filter(isObj).map(x => ({
    t: num(x.t, 0, 9e15, Date.now()), level: String(x.level || '').slice(0, 40), title: String(x.title || '').slice(0, 60),
    done: !!x.done, ms: int(x.ms, 0, 1e8, 0), stars: int(x.stars, 0, 3, 0), q: int(x.q, 0, 99, 0), ft: int(x.ft, 0, 99, 0),
    skills: Array.isArray(x.skills) ? x.skills.filter(k => SKILLS[k]).slice(0, 9) : [],
  }));
  if (isObj(raw.stats)) s.stats = { questions: int(raw.stats.questions, 0, 1e7, 0), correct: int(raw.stats.correct, 0, 1e7, 0), totalMs: int(raw.stats.totalMs, 0, 1e10, 0), sessions: int(raw.stats.sessions, 0, 1e6, 0) };
  s.stats.correct = Math.min(s.stats.correct, s.stats.questions);
  if (Array.isArray(raw.playDays)) s.playDays = raw.playDays.filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(-60);
  if (isObj(raw.settings)) {
    ['sfx', 'music', 'voice', 'muted'].forEach(k => { if (typeof raw.settings[k] === 'boolean') s.settings[k] = raw.settings[k]; });
    if (typeof raw.settings.reducedMotion === 'boolean') s.settings.reducedMotion = raw.settings.reducedMotion;
  }
  if (Array.isArray(raw.recentUnlocks)) s.recentUnlocks = raw.recentUnlocks.slice(-12).filter(u => isObj(u) && (u.kind === 'sticker' || u.kind === 'item') && typeof u.id === 'string')
    .map(u => ({ kind: u.kind, id: u.id.slice(0, 40), t: num(u.t, 0, 9e15, Date.now()) }));
  if (isObj(raw.meta)) s.meta.created = num(raw.meta.created, 0, 9e15, Date.now());
  return s;
}

const Store = {
  available: true,
  memory: null,
  init() {
    try { localStorage.setItem('__sb_test', '1'); localStorage.removeItem('__sb_test'); this.available = true; }
    catch (e) { this.available = false; }
  },
  /** Returns a state object. Corrupt data is backed up and replaced with a fresh game. */
  load() {
    if (!this.available) return defaultState();
    let text = null;
    try { text = localStorage.getItem(SAVE_KEY); } catch (e) { return defaultState(); }
    if (!text) return defaultState();
    try {
      const raw = JSON.parse(text);
      if (!isObj(raw) || typeof raw.v !== 'number' || raw.v > SAVE_VERSION) throw new Error('unreadable save');
      return sanitize(raw);          // older versions are migrated by sanitize's defaults
    } catch (e) {
      console.warn('SnowBuddies: saved data could not be read; starting fresh.', e);
      try { localStorage.setItem(SAVE_KEY + '.backup', text); } catch (e2) { /* ignore */ }
      const fresh = defaultState(); fresh.meta.recovered = true; return fresh;
    }
  },
  save(state) {
    if (!this.available) return false;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); return true; }
    catch (e) { console.warn('SnowBuddies: could not save', e); this.available = false; return false; }
  },
  wipe() { try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(SAVE_KEY + '.backup'); } catch (e) { /* ignore */ } },
};

/* ===================================================================
   4. STATE + HELPERS
   =================================================================== */

let S = defaultState();         // the one source of truth for saved game state
const save = () => Store.save(S);

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const rand = n => Math.floor(Math.random() * n);
const pick = arr => arr[rand(arr.length)];
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (arr, n) => shuffle(arr).slice(0, n);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const todayStr = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plural = (n, one, many) => n === 1 ? one : (many || one + 's');

/* ---------- map/lookup helpers ---------- */
const getRegion = id => REGIONS.find(r => r.id === id);
const getLevel = id => LEVELS.find(l => l.id === id);
const regionLevels = rid => LEVELS.filter(l => l.region === rid);
const levelRec = id => S.levels[id] || { done: false, stars: 0, plays: 0 };
const regionDoneCount = rid => regionLevels(rid).filter(l => levelRec(l.id).done).length;
const regionCoreLevels = rid => regionLevels(rid).filter(l => !l.bonus);
const regionComplete = rid => regionCoreLevels(rid).every(l => levelRec(l.id).done);

function isRegionUnlocked(r) { return r.needs.every(n => regionDoneCount(n.region) >= n.levels); }
function regionLockText(r) {
  const n = r.needs.find(n => regionDoneCount(n.region) < n.levels);
  if (!n) return '';
  const need = getRegion(n.region);
  if (r.needs.length > 1) return 'Visit every other place and finish a level in each to open this.';
  return `Finish ${n.levels} ${plural(n.levels, 'level')} in ${need.name} to open this.`;
}
function isLevelUnlocked(level) {
  const r = getRegion(level.region);
  if (!isRegionUnlocked(r)) return false;
  const list = regionLevels(level.region), i = list.indexOf(level);
  return i === 0 || levelRec(list[i - 1].id).done;
}
function levelLockText(level) {
  const r = getRegion(level.region);
  if (!isRegionUnlocked(r)) return regionLockText(r);
  const list = regionLevels(level.region), prev = list[list.indexOf(level) - 1];
  return prev ? `Finish "${prev.title}" first.` : '';
}
function nextLevelAfter(level) {
  const list = regionLevels(level.region), nxt = list[list.indexOf(level) + 1];
  return nxt && isLevelUnlocked(nxt) ? nxt : null;
}

/* ---------- workshop helpers ---------- */
const isItemOwned = (cat, id) => { const it = findItem(cat, id); return !!it && (it.cost === 0 || !!S.workshop.owned[cat + ':' + id]); };
const currentLook = () => Object.assign({}, DEFAULT_LOOK, S.workshop.equipped);

/* ===================================================================
   5. ART  —  every illustration is generated SVG (no image files)
   =================================================================== */
const NAVY = '#1E2A4A';
const Art = {};

function starPoints(cx, cy, R, r, n = 5) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const rad = i % 2 === 0 ? R : r, a = Math.PI * i / n - Math.PI / 2;
    pts.push((cx + rad * Math.cos(a)).toFixed(1) + ',' + (cy + rad * Math.sin(a)).toFixed(1));
  }
  return pts.join(' ');
}

/* ---------- Snowman parts ---------- */
const SM = {
  hat: {
    none: '',
    beanie:  `<path d="M62 78 Q62 32 100 32 Q138 32 138 78 Z" fill="#EE8A78" stroke="#C96452" stroke-width="2.5"/><rect x="57" y="70" width="86" height="15" rx="7.5" fill="#F6B3A6" stroke="#C96452" stroke-width="2.5"/><circle cx="100" cy="29" r="10" fill="#fff" stroke="#A9C8E3" stroke-width="2.5"/>`,
    topHat:  `<rect x="68" y="26" width="64" height="52" rx="5" fill="#2B3A66" stroke="${NAVY}" stroke-width="2.5"/><rect x="68" y="60" width="64" height="11" fill="#EE8A78"/><ellipse cx="100" cy="78" rx="50" ry="8" fill="#2B3A66" stroke="${NAVY}" stroke-width="2.5"/>`,
    crown:   `<polygon points="64,80 62,44 82,62 100,36 118,62 138,44 136,80" fill="#F6C85F" stroke="#D09A2A" stroke-width="2.5" stroke-linejoin="round"/><circle cx="100" cy="64" r="4" fill="#EE8A78"/><circle cx="80" cy="72" r="3" fill="#7CCFB0"/><circle cx="120" cy="72" r="3" fill="#A895D6"/>`,
    earmuffs:`<path d="M58 104 Q58 52 100 52 Q142 52 142 104" fill="none" stroke="#6B8FCC" stroke-width="6" stroke-linecap="round"/><circle cx="58" cy="106" r="14" fill="#A5C8F0" stroke="#6B8FCC" stroke-width="3"/><circle cx="142" cy="106" r="14" fill="#A5C8F0" stroke="#6B8FCC" stroke-width="3"/>`,
    wizard:  `<polygon points="64,80 100,2 136,80" fill="#A895D6" stroke="#7C6BB8" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="100" cy="80" rx="48" ry="8" fill="#8B7BC4" stroke="#7C6BB8" stroke-width="2.5"/><polygon points="${starPoints(100, 46, 9, 4)}" fill="#F6C85F"/>`,
  },
  scarf: (c1, c2) => `<path d="M112 150 l5 46 q9 5 18 0 l-4 -46 z" fill="${c1}" stroke="${NAVY}" stroke-opacity=".35" stroke-width="2"/><path d="M116 180 h17 M115.500 188 h17" stroke="${c2}" stroke-width="4"/><ellipse cx="100" cy="147" rx="46" ry="13" fill="${c1}" stroke="${NAVY}" stroke-opacity=".35" stroke-width="2"/><path d="M62 143 Q100 160 138 143" fill="none" stroke="${c2}" stroke-width="4"/>`,
  buttons: {
    coal:      y => `<circle cx="100" cy="${y}" r="5.500" fill="#2B3A66"/>`,
    coral:     y => `<circle cx="100" cy="${y}" r="6.500" fill="#EE8A78" stroke="#C96452" stroke-width="1.500"/>`,
    mint:      y => `<circle cx="100" cy="${y}" r="6.500" fill="#7CCFB0" stroke="#4FA887" stroke-width="1.500"/>`,
    star:      y => `<polygon points="${starPoints(100, y, 8, 3.500)}" fill="#F6C85F" stroke="#D09A2A" stroke-width="1.200"/>`,
    rainbow:   y => `<circle cx="100" cy="${y}" r="6.500" fill="${['#EE8A78','#F6C85F','#6BA6E8'][Math.round((y - 176) / 24)] || '#EE8A78'}" stroke="${NAVY}" stroke-opacity=".3" stroke-width="1.500"/>`,
    snowflake: y => `<g stroke="#6B8FCC" stroke-width="2" stroke-linecap="round"><path d="M100 ${y - 7} v14 M93.900 ${y - 3.500} l12.200 7 M93.900 ${y + 3.500} l12.200 -7"/></g>`,
  },
  scarves: { coral: ['#EE8A78', '#F9C9BF'], blue: ['#6BA6E8', '#D4E6FA'], mint: ['#7CCFB0', '#E0F6EE'], lav: ['#A895D6', '#E6E0F7'], gold: ['#F2B93B', '#FFF0C4'] },
};
const FACES = {
  smile:     { eyes: 'dots', mouth: `<g fill="#2B3A66"><circle cx="83" cy="119" r="2.600"/><circle cx="90" cy="124" r="2.600"/><circle cx="100" cy="126" r="2.600"/><circle cx="110" cy="124" r="2.600"/><circle cx="117" cy="119" r="2.600"/></g>` },
  grin:      { eyes: 'happy', mouth: `<path d="M80 116 Q100 138 120 116 Z" fill="#2B3A66"/><path d="M90 126 Q100 132 110 126 Q100 122 90 126Z" fill="#EE8A78"/>` },
  wink:      { eyes: 'wink', mouth: `<path d="M84 118 Q100 134 116 118" fill="none" stroke="#2B3A66" stroke-width="3.500" stroke-linecap="round"/>` },
  surprised: { eyes: 'dots', mouth: `<ellipse cx="100" cy="124" rx="6" ry="7.500" fill="#2B3A66"/>` },
  rosy:      { eyes: 'dots', mouth: `<path d="M86 119 Q100 131 114 119" fill="none" stroke="#2B3A66" stroke-width="3.500" stroke-linecap="round"/><circle cx="72" cy="112" r="8" fill="#EE8A78" opacity=".55"/><circle cx="128" cy="112" r="8" fill="#EE8A78" opacity=".55"/>` },
  cool:      { eyes: 'shades', mouth: `<path d="M86 120 Q100 130 114 120" fill="none" stroke="#2B3A66" stroke-width="3.500" stroke-linecap="round"/>` },
};
function faceSVG(id) {
  const f = FACES[id] || FACES.smile;
  let eyes = '';
  if (f.eyes === 'dots')   eyes = `<ellipse class="eye" cx="86" cy="96" rx="4.500" ry="5.500" fill="#2B3A66"/><ellipse class="eye" cx="114" cy="96" rx="4.500" ry="5.500" fill="#2B3A66"/>`;
  if (f.eyes === 'happy')  eyes = `<path d="M80 99 Q86 91 92 99 M108 99 Q114 91 120 99" fill="none" stroke="#2B3A66" stroke-width="3.500" stroke-linecap="round"/>`;
  if (f.eyes === 'wink')   eyes = `<ellipse class="eye" cx="86" cy="96" rx="4.500" ry="5.500" fill="#2B3A66"/><path d="M108 97 Q114 91 120 97" fill="none" stroke="#2B3A66" stroke-width="3.500" stroke-linecap="round"/>`;
  if (f.eyes === 'shades') eyes = `<rect x="72" y="88" width="24" height="16" rx="6" fill="#2B3A66"/><rect x="104" y="88" width="24" height="16" rx="6" fill="#2B3A66"/><path d="M96 94 h8" stroke="#2B3A66" stroke-width="3"/><path d="M76 92 l8 0" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>`;
  return eyes + `<polygon points="98,106 128,112 98,116" fill="#F28C38" stroke="#C96A1E" stroke-width="1.500" stroke-linejoin="round"/>` + f.mouth;
}
const ACC = {
  none: '',
  broom:   `<line x1="188" y1="120" x2="180" y2="236" stroke="#8A6140" stroke-width="5" stroke-linecap="round"/><path d="M168 218 L196 218 L202 248 L162 248 Z" fill="#E3C27A" stroke="#B8903F" stroke-width="2.500" stroke-linejoin="round"/>`,
  lantern: `<circle cx="188" cy="196" r="26" fill="#FFE9A6" opacity=".55" class="glow"/><line x1="188" y1="166" x2="188" y2="178" stroke="${NAVY}" stroke-width="3"/><rect x="176" y="178" width="24" height="32" rx="6" fill="#F6C85F" stroke="${NAVY}" stroke-width="2.500"/><rect x="176" y="178" width="24" height="7" rx="3" fill="${NAVY}"/>`,
  balloon: `<path d="M186 164 Q176 130 178 98" fill="none" stroke="#6B7AA8" stroke-width="2"/><ellipse cx="178" cy="80" rx="19" ry="22" fill="#EE8A78" stroke="#C96452" stroke-width="2.500"/><path d="M170 70 q3 -8 10 -9" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`,
  wand:    `<line x1="188" y1="166" x2="194" y2="118" stroke="#8A6140" stroke-width="4" stroke-linecap="round"/><polygon points="${starPoints(194, 108, 14, 6)}" fill="#F6C85F" stroke="#D09A2A" stroke-width="2" stroke-linejoin="round"/>`,
};
const BIRD = `<g><ellipse cx="50" cy="146" rx="13" ry="10" fill="#6BA6E8" stroke="#3E7BC4" stroke-width="2"/><circle cx="60" cy="140" r="8" fill="#6BA6E8" stroke="#3E7BC4" stroke-width="2"/><polygon points="67,140 76,143 67,145" fill="#F6A23A"/><circle cx="62" cy="138" r="1.800" fill="${NAVY}"/><ellipse cx="46" cy="148" rx="6" ry="4" fill="#A5C8F0"/></g>`;

const BACKGROUNDS = {
  sky:     `<rect width="200" height="262" fill="#D4EAFA"/><path d="M0 196 Q50 150 110 186 T200 174 V262 H0Z" fill="#fff"/><circle cx="34" cy="38" r="3" fill="#fff"/><circle cx="160" cy="62" r="2.500" fill="#fff"/><circle cx="130" cy="26" r="2" fill="#fff"/>`,
  dusk:    `<rect width="200" height="262" fill="#5B5F9E"/><circle cx="156" cy="48" r="20" fill="#FFF3DC"/><circle cx="148" cy="42" r="20" fill="#5B5F9E"/><g fill="#fff"><circle cx="30" cy="30" r="2"/><circle cx="70" cy="52" r="1.500"/><circle cx="110" cy="22" r="2"/><circle cx="24" cy="86" r="1.500"/><circle cx="176" cy="104" r="1.500"/></g><path d="M0 200 Q60 170 120 196 T200 186 V262 H0Z" fill="#A9A6DE"/>`,
  forest:  `<rect width="200" height="262" fill="#CDEBE0"/><g fill="#6FBF9E"><polygon points="10,210 34,120 58,210"/><polygon points="150,214 172,130 196,214"/></g><g fill="#4FA887"><polygon points="44,214 64,150 84,214"/><polygon points="122,214 140,160 158,214"/></g><path d="M0 216 Q100 196 200 216 V262 H0Z" fill="#fff"/>`,
  cottage: `<rect width="200" height="262" fill="#BFD9F0"/><rect x="118" y="146" width="62" height="48" fill="#F2C9A0" stroke="#C99B6B" stroke-width="2"/><polygon points="110,148 149,114 188,148" fill="#fff" stroke="#A9C8E3" stroke-width="2.500" stroke-linejoin="round"/><rect x="132" y="160" width="14" height="14" rx="2" fill="#FFD36B" class="glow"/><rect x="154" y="166" width="14" height="28" rx="2" fill="#8A6140"/><rect x="164" y="112" width="9" height="20" fill="#C99B6B"/><path d="M0 206 Q100 188 200 206 V262 H0Z" fill="#fff"/>`,
  aurora:  `<rect width="200" height="262" fill="#25325A"/><path d="M-10 70 Q50 20 100 66 T210 50 V100 Q150 120 100 96 T-10 112Z" fill="#7CCFB0" opacity=".55"/><path d="M-10 100 Q60 60 110 98 T210 86 V120 Q150 140 100 118 T-10 134Z" fill="#A895D6" opacity=".5"/><g fill="#fff"><circle cx="24" cy="22" r="1.800"/><circle cx="80" cy="14" r="1.500"/><circle cx="150" cy="22" r="2"/><circle cx="182" cy="100" r="1.500"/></g><path d="M0 208 Q100 190 200 208 V262 H0Z" fill="#E7F1FA"/>`,
};

/** Draws a snowman. look = { hat, scarf, buttons, face, acc, bg } (item ids). opts: { wave, cls, label } */
Art.snowman = function (look = {}, opts = {}) {
  const L = Object.assign({ hat: 'none', scarf: 'none', buttons: 'coal', face: 'smile', acc: 'none', bg: 'none' }, look);
  const sc = SM.scarves[L.scarf];
  const accIsHeld = ['broom', 'lantern', 'balloon', 'wand'].includes(L.acc);
  return `<svg class="snowman ${opts.cls || ''}" viewBox="${opts.view || '0 0 200 262'}" role="img" aria-label="${opts.label || 'A friendly snowman'}" xmlns="http://www.w3.org/2000/svg">
    <defs><clipPath id="sbclip"><rect width="200" height="262" rx="22"/></clipPath></defs>
    ${L.bg !== 'none' ? `<g clip-path="url(#sbclip)">${BACKGROUNDS[L.bg] || ''}</g>` : ''}
    <ellipse cx="100" cy="255" rx="62" ry="6" fill="#8EC3E8" opacity=".45"/>
    <g class="arm-l" stroke="#8A6140" stroke-width="5" stroke-linecap="round" fill="none"><path d="M52 192 L14 164 M26 173 L12 172 M33 179 L24 192"/></g>
    <circle cx="100" cy="198" r="55" fill="#fff" stroke="#A9C8E3" stroke-width="3"/>
    <path d="M62 178 Q58 204 72 226" fill="none" stroke="#E4F1FB" stroke-width="7" stroke-linecap="round"/>
    <circle cx="100" cy="104" r="41" fill="#fff" stroke="#A9C8E3" stroke-width="3"/>
    <path d="M70 92 Q66 106 74 122" fill="none" stroke="#E4F1FB" stroke-width="6" stroke-linecap="round"/>
    ${SM.buttons[L.buttons] ? [176, 200, 224].map(SM.buttons[L.buttons]).join('') : ''}
    ${faceSVG(L.face)}
    ${sc ? SM.scarf(sc[0], sc[1]) : ''}
    ${SM.hat[L.hat] || ''}
    ${L.acc === 'bird' ? BIRD : ''}
    <g class="arm-r" style="transform-origin:150px 192px"><g stroke="#8A6140" stroke-width="5" stroke-linecap="round" fill="none"><path d="M148 192 L186 164 M176 171 L192 174 M169 177 L178 190"/></g>${accIsHeld ? ACC[L.acc] : ''}</g>
  </svg>`;
};

/* ---------- Animals (100x100) ---------- */
const AN = {
  penguin: `<ellipse cx="50" cy="93" rx="22" ry="4" fill="#8EC3E8" opacity=".5"/><ellipse cx="29" cy="62" rx="7" ry="17" fill="#25325A" transform="rotate(18 29 62)"/><ellipse cx="71" cy="62" rx="7" ry="17" fill="#25325A" transform="rotate(-18 71 62)"/><ellipse cx="50" cy="56" rx="26" ry="35" fill="#25325A"/><ellipse cx="50" cy="64" rx="17" ry="26" fill="#fff"/><circle cx="41" cy="40" r="5.500" fill="#fff"/><circle cx="59" cy="40" r="5.500" fill="#fff"/><circle cx="42" cy="41" r="2.600" fill="#1E2A4A"/><circle cx="58" cy="41" r="2.600" fill="#1E2A4A"/><polygon points="44,47 56,47 50,56" fill="#F6A23A"/><circle cx="35" cy="50" r="3.500" fill="#EE8A78" opacity=".6"/><circle cx="65" cy="50" r="3.500" fill="#EE8A78" opacity=".6"/><ellipse cx="40" cy="91" rx="9" ry="4" fill="#F6A23A"/><ellipse cx="60" cy="91" rx="9" ry="4" fill="#F6A23A"/>`,
  bear: `<ellipse cx="50" cy="86" rx="28" ry="15" fill="#fff" stroke="#A9C8E3" stroke-width="2.500"/><circle cx="26" cy="22" r="11" fill="#fff" stroke="#A9C8E3" stroke-width="2.500"/><circle cx="74" cy="22" r="11" fill="#fff" stroke="#A9C8E3" stroke-width="2.500"/><circle cx="26" cy="22" r="5.500" fill="#CFC7F0"/><circle cx="74" cy="22" r="5.500" fill="#CFC7F0"/><circle cx="50" cy="48" r="29" fill="#fff" stroke="#A9C8E3" stroke-width="2.500"/><ellipse cx="50" cy="58" rx="13" ry="10" fill="#FFF3DC"/><ellipse cx="50" cy="53" rx="5" ry="3.500" fill="#1E2A4A"/><path d="M50 56 v5 M44 63 Q50 67 56 63" stroke="#1E2A4A" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="38" cy="43" r="3.500" fill="#1E2A4A"/><circle cx="62" cy="43" r="3.500" fill="#1E2A4A"/><circle cx="31" cy="55" r="4" fill="#EE8A78" opacity=".5"/><circle cx="69" cy="55" r="4" fill="#EE8A78" opacity=".5"/>`,
  rabbit: `<ellipse cx="50" cy="80" rx="24" ry="17" fill="#fff" stroke="#A9C8E3" stroke-width="2.500"/><ellipse cx="38" cy="20" rx="8" ry="20" fill="#fff" stroke="#A9C8E3" stroke-width="2.500" transform="rotate(-8 38 20)"/><ellipse cx="62" cy="20" rx="8" ry="20" fill="#fff" stroke="#A9C8E3" stroke-width="2.500" transform="rotate(8 62 20)"/><ellipse cx="38" cy="22" rx="3.500" ry="13" fill="#F6B3A6" transform="rotate(-8 38 22)"/><ellipse cx="62" cy="22" rx="3.500" ry="13" fill="#F6B3A6" transform="rotate(8 62 22)"/><circle cx="50" cy="52" r="23" fill="#fff" stroke="#A9C8E3" stroke-width="2.500"/><circle cx="41" cy="49" r="3.200" fill="#1E2A4A"/><circle cx="59" cy="49" r="3.200" fill="#1E2A4A"/><ellipse cx="50" cy="57" rx="3.500" ry="2.600" fill="#EE8A78"/><path d="M50 59 v4 M45 64 Q50 68 55 64" stroke="#1E2A4A" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="35" cy="58" r="4" fill="#EE8A78" opacity=".45"/><circle cx="65" cy="58" r="4" fill="#EE8A78" opacity=".45"/>`,
  fox: `<path d="M72 88 Q98 82 92 56 Q86 72 68 76 Z" fill="#E9803F"/><path d="M92 56 Q96 66 90 72 Q88 64 92 56Z" fill="#fff"/><ellipse cx="50" cy="86" rx="24" ry="14" fill="#E9803F"/><ellipse cx="50" cy="88" rx="12" ry="10" fill="#FFF3DC"/><path d="M20 46 L26 12 L44 30 Q50 29 56 30 L74 12 L80 46 Q80 78 50 82 Q20 78 20 46Z" fill="#E9803F"/><path d="M27 30 L29 20 L36 28Z M73 30 L71 20 L64 28Z" fill="#1E2A4A"/><path d="M24 52 Q50 92 76 52 Q50 62 24 52Z" fill="#FFF3DC"/><circle cx="38" cy="50" r="3.500" fill="#1E2A4A"/><circle cx="62" cy="50" r="3.500" fill="#1E2A4A"/><ellipse cx="50" cy="68" rx="4.500" ry="3.200" fill="#1E2A4A"/>`,
  owl: `<path d="M30 14 L40 30 L22 32Z M70 14 L60 30 L78 32Z" fill="#8F82C9"/><ellipse cx="50" cy="56" rx="29" ry="35" fill="#9B8FD0" stroke="#7C6BB8" stroke-width="2.500"/><ellipse cx="50" cy="68" rx="18" ry="22" fill="#E6E0F7"/><path d="M40 62 q4 4 8 0 M52 62 q4 4 8 0 M40 74 q4 4 8 0 M52 74 q4 4 8 0" stroke="#B9AFE3" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="37" cy="40" r="13" fill="#FFF3DC"/><circle cx="63" cy="40" r="13" fill="#FFF3DC"/><circle cx="37" cy="41" r="6.500" fill="#1E2A4A"/><circle cx="63" cy="41" r="6.500" fill="#1E2A4A"/><circle cx="39" cy="39" r="2" fill="#fff"/><circle cx="65" cy="39" r="2" fill="#fff"/><polygon points="45,47 55,47 50,57" fill="#F6A23A"/><ellipse cx="40" cy="92" rx="8" ry="3.500" fill="#F6A23A"/><ellipse cx="60" cy="92" rx="8" ry="3.500" fill="#F6A23A"/>`,
  seal: `<path d="M84 70 L98 58 L98 86Z" fill="#8FA8C8"/><ellipse cx="52" cy="72" rx="36" ry="19" fill="#9DB4D0" stroke="#7C97B8" stroke-width="2.500"/><ellipse cx="50" cy="80" rx="26" ry="9" fill="#DDE8F4"/><ellipse cx="30" cy="88" rx="9" ry="4" fill="#8FA8C8" transform="rotate(-20 30 88)"/><circle cx="30" cy="48" r="19" fill="#9DB4D0" stroke="#7C97B8" stroke-width="2.500"/><ellipse cx="25" cy="56" rx="10" ry="7.500" fill="#DDE8F4"/><circle cx="21" cy="44" r="3.200" fill="#1E2A4A"/><circle cx="36" cy="44" r="3.200" fill="#1E2A4A"/><ellipse cx="18" cy="54" rx="3.500" ry="2.600" fill="#1E2A4A"/><path d="M8 56 h-6 M9 60 l-6 3 M32 58 h6 M32 61 l6 3" stroke="#1E2A4A" stroke-width="1.500" stroke-linecap="round"/>`,
};
Art.animal = (id, cls = '') => `<svg class="animal ${cls}" viewBox="0 0 100 100" role="img" aria-label="${id}" xmlns="http://www.w3.org/2000/svg">${AN[id] || ''}</svg>`;
const animalInner = id => AN[id] || '';

/* ---------- Snowflake sticker art ---------- */
Art.flake = function (v) {
  const cols = ['#6BA6E8', '#A895D6', '#4FB48F', '#E4705C', '#E0A21C'];
  const c = cols[v % 5];
  const arms = [
    `<path d="M50 50 V10 M50 26 L39 16 M50 26 L61 16 M50 38 L42 31 M50 38 L58 31"/>`,
    `<path d="M50 50 V12 M50 24 L38 14 M50 24 L62 14"/><circle cx="50" cy="10" r="4" fill="${c}"/>`,
    `<path d="M50 50 V8"/><polygon points="50,16 58,26 50,36 42,26" fill="none"/>`,
    `<path d="M50 50 V10 M50 40 L36 30 M50 40 L64 30 M50 28 L40 20 M50 28 L60 20"/><circle cx="36" cy="30" r="2.500" fill="${c}"/><circle cx="64" cy="30" r="2.500" fill="${c}"/>`,
    `<path d="M50 50 V16"/><circle cx="50" cy="12" r="5" fill="none"/><circle cx="50" cy="30" r="3" fill="${c}"/><path d="M50 40 L44 36 M50 40 L56 36"/>`,
  ][v % 5];
  let g = '';
  for (let i = 0; i < 6; i++) g += `<g transform="rotate(${i * 60} 50 50)">${arms}</g>`;
  return `<svg viewBox="0 0 100 100" role="img" aria-label="Magical snowflake" xmlns="http://www.w3.org/2000/svg"><g stroke="${c}" stroke-width="3.500" stroke-linecap="round" stroke-linejoin="round" fill="none">${g}</g><circle cx="50" cy="50" r="6" fill="#fff" stroke="${c}" stroke-width="3"/></svg>`;
};

/* ---------- Cozy accessory + rare character sticker art ---------- */
const STICKER_ART = {
  mitten:  `<path d="M30 90 V52 Q30 40 40 38 L40 20 Q40 12 47 12 Q54 12 54 20 V36 L66 40 Q74 42 72 52 L70 90 Z" fill="#EE8A78" stroke="#C96452" stroke-width="3" stroke-linejoin="round"/><rect x="28" y="76" width="44" height="16" rx="4" fill="#fff" stroke="#A9C8E3" stroke-width="3"/><path d="M36 56 h28 M36 64 h28" stroke="#F9C9BF" stroke-width="4"/>`,
  cocoa:   `<path d="M22 40 H68 V70 Q68 86 45 86 Q22 86 22 70 Z" fill="#fff" stroke="#6B8FCC" stroke-width="3.500" stroke-linejoin="round"/><path d="M68 48 Q86 48 84 62 Q82 72 66 72" fill="none" stroke="#6B8FCC" stroke-width="4"/><ellipse cx="45" cy="40" rx="23" ry="6" fill="#8A5A3C"/><circle cx="34" cy="38" r="5" fill="#fff"/><circle cx="46" cy="36" r="5" fill="#fff"/><circle cx="56" cy="39" r="4" fill="#fff"/><path d="M36 28 q-4 -8 2 -14 M50 26 q-4 -8 2 -14" stroke="#A9C8E3" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  boot:    `<path d="M32 14 H58 V54 L84 64 Q90 68 88 78 V86 H28 Z" fill="#6BA6E8" stroke="#3E7BC4" stroke-width="3.500" stroke-linejoin="round"/><rect x="28" y="78" width="60" height="10" rx="3" fill="#fff" stroke="#A9C8E3" stroke-width="3"/><rect x="30" y="12" width="30" height="12" rx="4" fill="#fff" stroke="#A9C8E3" stroke-width="3"/><path d="M40 34 h10 M40 44 h10" stroke="#D4E6FA" stroke-width="4" stroke-linecap="round"/>`,
  sled:    `<path d="M10 66 Q10 84 30 84 H88 M24 70 Q24 84 40 84" fill="none" stroke="#8A6140" stroke-width="5" stroke-linecap="round"/><rect x="20" y="52" width="62" height="14" rx="5" fill="#EE8A78" stroke="#C96452" stroke-width="3"/><path d="M32 52 v-6 M70 52 v-6" stroke="#8A6140" stroke-width="4"/><path d="M82 60 Q94 56 92 40" fill="none" stroke="#6B7AA8" stroke-width="2.500"/><path d="M28 58 h46" stroke="#F9C9BF" stroke-width="3"/>`,
  lantern: `<path d="M38 22 Q50 6 62 22" fill="none" stroke="#1E2A4A" stroke-width="3.500"/><circle cx="50" cy="56" r="34" fill="#FFE9A6" opacity=".5"/><rect x="34" y="24" width="32" height="8" rx="3" fill="#1E2A4A"/><rect x="34" y="32" width="32" height="44" rx="7" fill="#F6C85F" stroke="#1E2A4A" stroke-width="3.500"/><rect x="34" y="72" width="32" height="8" rx="3" fill="#1E2A4A"/><path d="M50 40 q8 8 0 22 q-8 -14 0 -22Z" fill="#fff" opacity=".85"/>`,
  auroraFox: `<path d="M0 40 Q25 10 50 34 T100 22 V40 Q75 58 50 50 T0 62Z" fill="#7CCFB0" opacity=".6"/><path d="M0 62 Q25 36 50 58 T100 46 V62 Q75 78 50 70 T0 84Z" fill="#A895D6" opacity=".55"/><g transform="translate(14 8) scale(.72)">${AN.fox}</g><polygon points="${starPoints(84, 20, 7, 3)}" fill="#F6C85F"/><polygon points="${starPoints(14, 30, 5, 2)}" fill="#fff"/>`,
  moonRabbit:`<circle cx="62" cy="40" r="32" fill="#FFF3DC" stroke="#EAD6AE" stroke-width="3"/><circle cx="74" cy="30" r="5" fill="#EAD6AE" opacity=".7"/><circle cx="52" cy="52" r="4" fill="#EAD6AE" opacity=".7"/><g transform="translate(6 18) scale(.8)">${AN.rabbit}</g><polygon points="${starPoints(14, 14, 6, 2.500)}" fill="#F6C85F"/><polygon points="${starPoints(90, 86, 5, 2)}" fill="#A895D6"/>`,
  snowFairy: `<ellipse cx="30" cy="46" rx="20" ry="12" fill="#BFE8D8" stroke="#7CCFB0" stroke-width="2.500" transform="rotate(-30 30 46)" opacity=".9"/><ellipse cx="70" cy="46" rx="20" ry="12" fill="#BFE8D8" stroke="#7CCFB0" stroke-width="2.500" transform="rotate(30 70 46)" opacity=".9"/><polygon points="50,52 32,90 68,90" fill="#CFC7F0" stroke="#A895D6" stroke-width="3" stroke-linejoin="round"/><circle cx="50" cy="36" r="13" fill="#FFF3DC" stroke="#EAD6AE" stroke-width="2.500"/><path d="M38 30 Q50 14 62 30 Q50 24 38 30Z" fill="#A895D6"/><circle cx="46" cy="37" r="1.800" fill="#1E2A4A"/><circle cx="54" cy="37" r="1.800" fill="#1E2A4A"/><path d="M47 42 Q50 45 53 42" stroke="#1E2A4A" stroke-width="1.800" fill="none" stroke-linecap="round"/><line x1="68" y1="70" x2="86" y2="52" stroke="#8A6140" stroke-width="3" stroke-linecap="round"/><polygon points="${starPoints(88, 48, 8, 3.500)}" fill="#F6C85F"/>`,
  yeti: `<g fill="#E6EEFB" stroke="#A9C8E3" stroke-width="2.500"><circle cx="24" cy="60" r="12"/><circle cx="76" cy="60" r="12"/><circle cx="50" cy="62" r="34"/></g><polygon points="28,28 34,8 42,28" fill="#6BA6E8"/><polygon points="58,28 66,8 72,28" fill="#6BA6E8"/><circle cx="50" cy="58" r="26" fill="#fff"/><circle cx="40" cy="52" r="4" fill="#1E2A4A"/><circle cx="60" cy="52" r="4" fill="#1E2A4A"/><path d="M38 66 Q50 80 62 66 Z" fill="#1E2A4A"/><path d="M44 66 v5 M56 66 v5" stroke="#fff" stroke-width="4"/><circle cx="32" cy="62" r="4" fill="#EE8A78" opacity=".5"/><circle cx="68" cy="62" r="4" fill="#EE8A78" opacity=".5"/>`,
};
const wrap100 = (inner, label) => `<svg viewBox="0 0 100 100" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

/* ---------- Shapes, snowballs, scarves, hats for lessons ---------- */
Art.shape = function (shape, hex, outline) {
  const paint = outline ? `fill="none" stroke="${NAVY}" stroke-width="4" stroke-dasharray="8 6"` : `fill="${hex}" stroke="${NAVY}" stroke-width="3"`;
  const body = {
    circle:    `<circle cx="50" cy="50" r="38" ${paint}/>`,
    square:    `<rect x="14" y="14" width="72" height="72" rx="6" ${paint}/>`,
    triangle:  `<polygon points="50,12 90,84 10,84" stroke-linejoin="round" ${paint}/>`,
    star:      `<polygon points="${starPoints(50, 53, 43, 19)}" stroke-linejoin="round" ${paint}/>`,
    heart:     `<path d="M50 86 C8 58 12 20 36 20 C44 20 50 26 50 33 C50 26 56 20 64 20 C88 20 92 58 50 86Z" stroke-linejoin="round" ${paint}/>`,
    rectangle: `<rect x="6" y="28" width="88" height="44" rx="6" ${paint}/>`,
    oval:      `<ellipse cx="50" cy="50" rx="42" ry="27" ${paint}/>`,
    diamond:   `<polygon points="50,6 92,50 50,94 8,50" stroke-linejoin="round" ${paint}/>`,
    hexagon:   `<polygon points="50,6 87,28 87,72 50,94 13,72 13,28" stroke-linejoin="round" ${paint}/>`,
  }[shape] || '';
  return `<svg viewBox="0 0 100 100" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
};
Art.snowball = () => `<svg viewBox="0 0 40 40" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="17" fill="#EAF5FD" stroke="#5E9DCB" stroke-width="2.500"/><path d="M9 17 Q13 8 22 8" stroke="#fff" stroke-width="3.500" fill="none" stroke-linecap="round"/><circle cx="26" cy="26" r="2" fill="#E4F1FB"/></svg>`;
Art.scarf = hex => `<svg viewBox="0 0 100 100" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M14 30 Q50 18 86 30 L86 48 Q50 38 14 48Z" fill="${hex}" stroke="${NAVY}" stroke-width="3" stroke-linejoin="round"/><path d="M58 42 L62 88 Q72 92 80 86 L76 44Z" fill="${hex}" stroke="${NAVY}" stroke-width="3" stroke-linejoin="round"/><path d="M62 70 H78 M61 78 H77" stroke="#fff" stroke-opacity=".75" stroke-width="4"/></svg>`;
Art.hat = hex => `<svg viewBox="0 0 100 100" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M20 70 Q20 22 50 22 Q80 22 80 70Z" fill="${hex}" stroke="${NAVY}" stroke-width="3" stroke-linejoin="round"/><rect x="14" y="64" width="72" height="18" rx="9" fill="${hex}" stroke="${NAVY}" stroke-width="3"/><path d="M20 73 H80" stroke="#fff" stroke-opacity=".7" stroke-width="4"/><circle cx="50" cy="18" r="9" fill="#fff" stroke="${NAVY}" stroke-width="3"/></svg>`;

/* ---------- World map scenery (400 x 520 viewBox) ---------- */
Art.mapScene = function () {
  const pine = (x, y, s = 1, c = '#5DB895') => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-3" y="14" width="6" height="10" fill="#8A6140"/><polygon points="0,-34 -17,0 17,0" fill="${c}"/><polygon points="0,-20 -21,14 21,14" fill="${c}"/><path d="M-9 -12 L0 -34 L9 -12 L4 -14 L0 -8 L-4 -14Z" fill="#fff"/></g>`;
  const house = (x, y, wall, roof) => `<g transform="translate(${x} ${y})"><rect x="-16" y="-14" width="32" height="26" fill="${wall}" stroke="#B8935F" stroke-width="2"/><polygon points="-21,-12 0,-34 21,-12" fill="#fff" stroke="#A9C8E3" stroke-width="2.500" stroke-linejoin="round"/><rect x="-10" y="-8" width="9" height="9" rx="1.500" fill="#FFD36B" class="glow"/><rect x="4" y="-2" width="9" height="14" rx="1.500" fill="${roof}"/></g>`;
  return `<svg class="map-svg" viewBox="0 0 400 520" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
    <rect width="400" height="520" fill="#DCEEFB"/>
    <path d="M0 120 Q90 70 200 110 T400 90 V520 H0Z" fill="#F1F8FE"/>
    <path d="M0 250 Q120 200 230 240 T400 220 V520 H0Z" fill="#FFFFFF"/>
    <path d="M0 400 Q110 360 220 396 T400 380 V520 H0Z" fill="#EAF4FC"/>
    <path d="M0 470 Q140 440 260 466 T400 456 V520 H0Z" fill="#fff"/>
    <!-- frozen lake -->
    <ellipse cx="192" cy="84" rx="150" ry="56" fill="#A7D4EE" stroke="#8EC3E8" stroke-width="4"/>
    <ellipse cx="192" cy="80" rx="128" ry="42" fill="#C4E3F5"/>
    <path d="M90 70 l30 8 l14 -10 M240 60 l22 12 l30 -4 M170 100 l20 -10 l30 8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>
    <g class="slide-penguin"><g transform="translate(100 78) scale(.34)">${AN.penguin}</g></g>
    <g class="slide-penguin slow"><g transform="translate(110 96) scale(.26)">${AN.penguin}</g></g>
    <!-- storybook snowfield -->
    <path d="M230 205 Q300 170 396 198 V250 Q310 266 230 240Z" fill="#fff" stroke="#DCEEFB" stroke-width="3"/>
    ${house(350, 214, '#F2C9A0', '#8A6140')}
    <rect x="360" y="170" width="8" height="16" fill="#C99B6B"/>
    <g class="smoke"><circle cx="364" cy="164" r="4" fill="#fff"/><circle cx="368" cy="154" r="5" fill="#fff"/><circle cx="364" cy="142" r="6" fill="#fff"/></g>
    <g transform="translate(262 218)"><path d="M-20 0 Q-10 -8 0 0 Q10 -8 20 0 V12 Q10 4 0 12 Q-10 4 -20 12Z" fill="#fff" stroke="#6B8FCC" stroke-width="2.500" stroke-linejoin="round"/><path d="M0 0 V12" stroke="#6B8FCC" stroke-width="2"/></g>
    <!-- pattern village -->
    ${house(52, 290, '#F9D7C8', '#EE8A78')}${house(96, 302, '#D5E8D6', '#7CCFB0')}${house(138, 286, '#E6E0F7', '#A895D6')}
    ${pine(30, 330, .8)}${pine(170, 318, .7)}
    <!-- number mountain -->
    <polygon points="230,372 300,262 372,372" fill="#B9CCE6" stroke="#8EA8CF" stroke-width="3" stroke-linejoin="round"/>
    <polygon points="286,372 346,296 400,372" fill="#CFDBEE" stroke="#8EA8CF" stroke-width="3" stroke-linejoin="round"/>
    <polygon points="300,262 281,291 292,286 300,294 310,285 320,291" fill="#fff"/>
    <polygon points="346,296 332,316 341,312 347,318 354,311 361,316" fill="#fff"/>
    <!-- alphabet forest -->
    ${pine(40, 450, 1.1)}${pine(78, 470, .9, '#7CCFB0')}${pine(18, 482, .8)}${pine(180, 462, 1)}${pine(214, 480, .8, '#7CCFB0')}${pine(364, 440, .9)}${pine(386, 470, .7, '#7CCFB0')}
    <!-- dotted path -->
    <path d="M118 448 C200 450 258 410 296 372 C340 330 210 322 116 296 C44 276 160 238 300 204 C360 186 300 130 190 98" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-dasharray="1 14"/>
    <path d="M118 448 C200 450 258 410 296 372 C340 330 210 322 116 296 C44 276 160 238 300 204 C360 186 300 130 190 98" fill="none" stroke="#8EC3E8" stroke-width="2.500" stroke-linecap="round" stroke-dasharray="1 14" opacity=".9"/>
  </svg>`;
};

/* ===================================================================
   6. AUDIO + SPEECH  —  everything is optional; the game never needs sound
   =================================================================== */
const Sound = {
  ctx: null, musicTimer: null, step: 0,
  ensure() {
    if (!this.ctx) {
      try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  },
  tone(freq, dur, o = {}) {
    const c = this.ensure(); if (!c) return;
    try {
      const t0 = c.currentTime + (o.delay || 0), osc = c.createOscillator(), g = c.createGain();
      osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(freq, t0);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.vol || 0.14, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g); g.connect(c.destination); osc.start(t0); osc.stop(t0 + dur + 0.05);
    } catch (e) { /* audio is optional */ }
  },
  on() { return S.settings.sfx && !S.settings.muted; },
  play(name) {
    if (!this.on()) return;
    const N = { C5: 523, D5: 587, E5: 659, G5: 784, A5: 880, C6: 1047, E6: 1319 };
    switch (name) {
      case 'tap':     this.tone(520, .07, { type: 'triangle', vol: .08 }); break;
      case 'flip':    this.tone(700, .06, { type: 'triangle', vol: .08 }); break;
      case 'pop':     this.tone(420, .12, { to: 820, vol: .1 }); break;
      case 'right':   [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => this.tone(f, .22, { type: 'triangle', delay: i * .08 })); break;
      case 'oops':    this.tone(330, .22, { type: 'sine', vol: .1, to: 262 }); break;   // soft and gentle, never harsh
      case 'sparkle': [N.G5, N.C6, N.E6, N.A5].forEach((f, i) => this.tone(f, .16, { vol: .08, delay: i * .06 })); break;
      case 'win':     [N.C5, N.E5, N.G5, N.C6, N.G5, N.C6, N.E6].forEach((f, i) => this.tone(f, .28, { type: 'triangle', delay: i * .1 })); break;
    }
  },
  /* gentle music-box loop (pentatonic, so any order sounds friendly) */
  startMusic() {
    this.stopMusic();
    if (!S.settings.music || S.settings.muted || !this.ensure()) return;
    const notes = [523, 659, 784, 659, 587, 784, 880, 784, 523, 587, 659, 392, 440, 523, 587, 0];
    this.musicTimer = setInterval(() => {
      const f = notes[this.step++ % notes.length];
      if (f) this.tone(f, 1.1, { type: 'sine', vol: .035 });
    }, 520);
  },
  stopMusic() { clearInterval(this.musicTimer); this.musicTimer = null; },
  refresh() { if (S.settings.music && !S.settings.muted) this.startMusic(); else this.stopMusic(); if (S.settings.muted) Voice.stop(); },
};

const Voice = {
  supported: typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined',
  say(text, force) {
    if (!this.supported || !text || S.settings.muted) return false;
    if (!force && !S.settings.voice) return false;
    try {
      window.speechSynthesis.cancel();
      const u = new window.SpeechSynthesisUtterance(text);
      u.rate = 0.85; u.pitch = 1.15; u.lang = 'en-US';
      window.speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  },
  stop() { try { if (this.supported) window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } },
};

/* ===================================================================
   7. EFFECTS  —  snowfall, bursts, toasts, modals
   =================================================================== */
const prefersReduced = () => S.settings.reducedMotion !== null ? S.settings.reducedMotion
  : !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

function applyMotionSetting() {
  document.body.classList.toggle('reduce-motion', prefersReduced());
  Snow.sync();
}

const Snow = {
  canvas: null, ctx: null, flakes: [], raf: 0, running: false, w: 0, h: 0,
  init() {
    this.canvas = $('#snow'); if (!this.canvas || !this.canvas.getContext) return;
    this.ctx = this.canvas.getContext('2d'); if (!this.ctx) return;
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => this.sync());
    this.resize(); this.sync();
  },
  resize() {
    if (!this.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.canvas.width = this.w * dpr; this.canvas.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = this.w < 600 ? 26 : 46;
    this.flakes = Array.from({ length: count }, () => this.make(true));
  },
  make(anywhere) { return { x: Math.random() * this.w, y: anywhere ? Math.random() * this.h : -10, r: 1.5 + Math.random() * 3.2, v: 0.35 + Math.random() * 0.9, sway: Math.random() * 6.28, amp: 0.3 + Math.random() * 0.7 }; },
  sync() {
    if (!this.canvas || !this.ctx) return;
    const shouldRun = !prefersReduced() && !document.hidden;
    if (shouldRun && !this.running) { this.running = true; this.canvas.style.display = ''; this.loop(); }
    if (!shouldRun) { this.running = false; cancelAnimationFrame(this.raf); this.ctx.clearRect(0, 0, this.w, this.h); this.canvas.style.display = prefersReduced() ? 'none' : ''; }
  },
  loop() {
    if (!this.running) return;
    const c = this.ctx; c.clearRect(0, 0, this.w, this.h); c.fillStyle = 'rgba(255,255,255,.9)';
    for (const f of this.flakes) {
      f.y += f.v; f.sway += 0.02; f.x += Math.sin(f.sway) * f.amp;
      if (f.y > this.h + 10) Object.assign(f, this.make(false));
      c.beginPath(); c.arc(f.x, f.y, f.r, 0, 6.283); c.fill();
    }
    this.raf = requestAnimationFrame(() => this.loop());
  },
};

/** Little shower of snowflakes/stars from a point (or the center of an element). */
function burst(target, count = 12, chars = ['❄', '✦', '❅', '✧']) {
  if (prefersReduced() || !document.body.animate) return;
  const layer = $('#fx'); if (!layer) return;
  let x = window.innerWidth / 2, y = window.innerHeight / 2;
  if (target && target.getBoundingClientRect) { const r = target.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'particle'; p.textContent = pick(chars); p.setAttribute('aria-hidden', 'true');
    p.style.left = x + 'px'; p.style.top = y + 'px'; p.style.fontSize = (14 + rand(14)) + 'px';
    p.style.color = pick(['#fff', '#BFE0F5', '#CFC7F0', '#F6C85F', '#EE8A78']);
    layer.appendChild(p);
    const a = Math.random() * 6.283, d = 50 + Math.random() * 90;
    const anim = p.animate([
      { transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + 30}px)) scale(1) rotate(${rand(180)}deg)`, opacity: 0 },
    ], { duration: 800 + rand(500), easing: 'cubic-bezier(.2,.7,.3,1)' });
    anim.onfinish = () => p.remove();
  }
}

let toastTimer = 0;
function toast(msg, ms = 2600) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

/* ---------- Modal dialogs ---------- */
const modalStack = [];
function openModal({ title, html = '', actions = [], cls = '', dismissible = true, onClose }) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h2 id="modal-title">${title}</h2><div class="modal-body">${html}</div><div class="modal-actions"></div></div>`;
  const box = $('.modal', wrap), bar = $('.modal-actions', wrap);
  const prevFocus = document.activeElement;
  const m = {
    el: wrap,
    close(result) {
      if (!wrap.isConnected) return;
      wrap.remove(); modalStack.splice(modalStack.indexOf(m), 1);
      if (!modalStack.length) { $('#app').inert = false; $('#app').removeAttribute('aria-hidden'); }
      if (prevFocus && prevFocus.focus && prevFocus.isConnected) prevFocus.focus();
      if (onClose) onClose(result);
    },
  };
  actions.forEach(a => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn ' + (a.cls || ''); b.innerHTML = a.label;
    b.addEventListener('click', () => { const keep = a.onClick ? a.onClick(m) === false : false; if (!keep) m.close(a.id); });
    bar.appendChild(b);
  });
  wrap.addEventListener('keydown', e => {
    if (e.key === 'Escape' && dismissible) { e.stopPropagation(); m.close('esc'); }
    if (e.key === 'Tab') {
      const f = $$('button, input, [href], select, [tabindex]:not([tabindex="-1"])', box).filter(x => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  if (dismissible) wrap.addEventListener('pointerdown', e => { if (e.target === wrap) m.close('backdrop'); });
  document.body.appendChild(wrap);
  modalStack.push(m);
  $('#app').inert = true; $('#app').setAttribute('aria-hidden', 'true');
  const focusEl = $('[data-autofocus]', wrap) || $('button, input', box);
  if (focusEl) focusEl.focus();
  return m;
}

/* ===================================================================
   8. LEARNING  —  record answers, adapt difficulty, assess skills
   =================================================================== */
const Learning = {
  skill(k) { return S.skills[k] || (S.skills[k] = { a: 0, c: 0, recent: [], concepts: {} }); },

  /** Record one answered question. `concept` is a short readable label like "Letter B". */
  record(skillKey, concept, ok) {
    const sk = this.skill(skillKey);
    sk.a++; if (ok) sk.c++;
    sk.recent.push(ok ? 1 : 0); if (sk.recent.length > 20) sk.recent.shift();
    const cc = sk.concepts[concept] || (sk.concepts[concept] = [0, 0]);
    cc[0]++; if (ok) cc[1]++;
    const keys = Object.keys(sk.concepts);
    if (keys.length > 100) { keys.sort((x, y) => sk.concepts[x][0] - sk.concepts[y][0]); delete sk.concepts[keys[0]]; }
    S.stats.questions++; if (ok) S.stats.correct++;
  },

  /** Adaptive tier: a hot streak nudges difficulty up; a rough patch eases it down (within one step of the level's tier). */
  tier(skillKey, base) {
    const last = ((S.skills[skillKey] || {}).recent || []).slice(-4);
    let adj = 0;
    if (last.length >= 4) { const good = last.reduce((a, b) => a + b, 0); if (good === 4) adj = 1; else if (good <= 1) adj = -1; }
    return clamp(base + adj, Math.max(1, base - 1), Math.min(3, base + 1));
  },

  /** Informal learning indicator — never a diagnosis. */
  assess(k) {
    const sk = S.skills[k] || { a: 0, c: 0, recent: [], concepts: {} };
    const out = { key: k, n: sk.a, c: sk.c, status: 'none', recentAcc: null, improving: false, weak: [], recent: sk.recent.slice(-10) };
    const acc = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    out.weak = Object.keys(sk.concepts).filter(n => sk.concepts[n][0] >= 3 && sk.concepts[n][1] / sk.concepts[n][0] <= 0.5)
      .sort((x, y) => sk.concepts[x][1] / sk.concepts[x][0] - sk.concepts[y][1] / sk.concepts[y][0]).slice(0, 3)
      .map(n => ({ name: n, a: sk.concepts[n][0], c: sk.concepts[n][1] }));
    if (sk.a < 8) return out;
    const recent = sk.recent.slice(-10), earlier = sk.recent.slice(0, -10);
    out.recentAcc = acc(recent);
    out.improving = earlier.length >= 5 && out.recentAcc - acc(earlier) >= 0.15;
    if (out.recentAcc >= 0.8 && sk.a >= 10) out.status = 'comfortable';
    else if (out.recentAcc < 0.5 && sk.a >= 10 && !out.improving) out.status = 'practice';
    else out.status = 'progress';
    return out;
  },

  /** For mixed-review rounds: lean toward skills that have had little practice or need more. */
  pickMixedActivity(lastAct) {
    const weights = SKILL_ORDER.map(k => { const a = this.assess(k); return { k, w: 1 + (a.status === 'practice' ? 1.5 : 0) + (a.n < 8 ? 1 : 0) }; });
    let r = Math.random() * weights.reduce((t, x) => t + x.w, 0), skill = weights[0].k;
    for (const x of weights) { if ((r -= x.w) <= 0) { skill = x.k; break; } }
    const acts = Object.keys(ACTIVITY_SKILL).filter(a => ACTIVITY_SKILL[a] === skill && a !== lastAct);
    return acts.length ? pick(acts) : pick(Object.keys(ACTIVITY_SKILL));
  },
};

/* ===================================================================
   9. REWARDS  —  snowflakes, stickers, gifts (each paid out only once)
   =================================================================== */
function condMet(c) {
  switch (c.t) {
    case 'free':      return true;
    case 'level':     return levelRec(c.id).done;
    case 'region':    return regionComplete(c.id);
    case 'questions': return S.stats.questions >= c.n;
    case 'earned':    return S.earned >= c.n;
    case 'explorer':  return REGIONS.every(r => S.regionsSeen[r.id]);
    case 'stickers':  return Object.keys(S.stickers).length >= c.n;
  }
  return false;
}

const Rewards = {
  add(n) { S.snowflakes += n; S.earned += n; },

  /** Pay `amount` once per unique `key`. Returns true only the first time. */
  claim(key, amount, label, lines) {
    if (S.claimed[key]) return false;
    S.claimed[key] = true;
    if (amount > 0) { this.add(amount); if (lines) lines.push({ label, amount }); }
    return true;
  },

  pushUnlock(kind, id) { S.recentUnlocks.push({ kind, id, t: Date.now() }); S.recentUnlocks = S.recentUnlocks.slice(-12); },

  /** Unlock any stickers whose conditions are now met. Returns the new sticker ids. */
  checkStickers() {
    const fresh = []; let again = true;
    while (again) {
      again = false;
      STICKERS.forEach(st => {
        if (!S.stickers[st.id] && condMet(st.cond)) { S.stickers[st.id] = Date.now(); S.newStickers[st.id] = true; this.pushUnlock('sticker', st.id); fresh.push(st.id); again = true; }
      });
    }
    return fresh;
  },

  /** Called when a child opens a region for the first time. */
  discover(rid) {
    if (S.regionsSeen[rid]) return null;
    S.regionsSeen[rid] = true;
    const lines = []; const ok = this.claim('discover:' + rid, REWARD.discover, 'Explored a new place', lines);
    const fresh = this.checkStickers();
    save(); updateHud();
    return { amount: ok ? REWARD.discover : 0, stickers: fresh };
  },

  /** Everything that happens when a level is finished. Safe to call repeatedly for the same level. */
  levelComplete(level, sess) {
    const rec = S.levels[level.id] || (S.levels[level.id] = { done: false, stars: 0, plays: 0 });
    const first = !rec.done, lines = [];
    const beforeRegions = REGIONS.filter(isRegionUnlocked).map(r => r.id);
    const n = sess.roundResults.length, ft = sess.roundResults.filter(r => r.ok).length;
    const stars = ft / n >= 0.8 ? 3 : ft / n >= 0.5 ? 2 : 1;
    const prevStars = rec.stars;
    rec.plays++;
    const res = { first, stars, prevStars, lines, total: 0, newStickers: [], newItems: [], newRegions: [], regionDone: null };

    if (first) {
      rec.done = true;
      this.claim('lvl:' + level.id, REWARD.levelBase, 'Finished the level', lines);
      this.claim('try:' + level.id, n * REWARD.perRound, 'Tried every question', lines);
      this.claim('first:' + level.id, ft * REWARD.perFirstTry, 'Got answers on the first try', lines);
    }
    if (stars > rec.stars) rec.stars = stars;
    if (stars >= 2) this.claim('star2:' + level.id, REWARD.star2, 'Second star', lines);
    if (stars >= 3) this.claim('star3:' + level.id, REWARD.star3, 'Third star', lines);

    if (rec.done && regionComplete(level.region)) {
      const r = getRegion(level.region);
      if (this.claim('region:' + r.id, REWARD.region, r.name + ' complete!', lines)) {
        res.regionDone = r;
        const g = r.gift; if (g && !isItemOwned(g.cat, g.id)) { S.workshop.owned[g.cat + ':' + g.id] = true; this.pushUnlock('item', g.cat + ':' + g.id); res.newItems.push(g); }
      }
    }
    MILESTONES.forEach(m => { if (m.test(S)) this.claim('ms:' + m.id, m.amount, m.label, lines); });
    res.newStickers = this.checkStickers();
    res.newRegions = REGIONS.filter(r => isRegionUnlocked(r) && !beforeRegions.includes(r.id)).map(r => r.id);
    res.total = lines.reduce((t, l) => t + l.amount, 0);
    save(); updateHud();
    return res;
  },

  /** Spend snowflakes on a workshop item. */
  buy(cat, id) {
    const it = findItem(cat, id);
    if (!it || isItemOwned(cat, id) || S.snowflakes < it.cost) return false;
    S.snowflakes -= it.cost; S.workshop.owned[cat + ':' + id] = true; this.pushUnlock('item', cat + ':' + id);
    save(); updateHud(); return true;
  },
};

/* ===================================================================
   10. ACTIVITIES  —  each mini-game is ACT.name(tier) -> round
       A round = { skill?, key, instruction, speak, mount(area, api), solve(area) }
       `key` is used so the same question is not repeated within a session.
       `api` (from the session): right(msg) wrong(msg, assistEl, shakeEl) finish(outcomes) mistakes()
   =================================================================== */
const ACT = {};
const unique = arr => Array.from(new Set(arr));
const COUNT_OBJECTS = [
  { id: 'snowball', svg: true, name: 'snowballs' }, { id: 'star', e: '⭐', name: 'stars' }, { id: 'mitten', e: '🧤', name: 'mittens' },
  { id: 'penguin', e: '🐧', name: 'penguins' }, { id: 'gift', e: '🎁', name: 'presents' }, { id: 'snowman', e: '⛄', name: 'snowmen' },
];
const objHtml = o => o.svg ? Art.snowball() : `<span class="emoji" aria-hidden="true">${o.e}</span>`;
const COUNT_RANGE = { 1: [1, 4], 2: [3, 7], 3: [5, 10] };
const SHAPE_CLUE = {
  circle: 'A circle is perfectly round, with no corners.', square: 'A square has 4 sides that are all the same.', triangle: 'A triangle has 3 corners.',
  star: 'A star has pointy tips.', heart: 'A heart is curvy on top with a point at the bottom.', rectangle: 'A rectangle has 4 sides: 2 long and 2 short.',
  oval: 'An oval is round, like a stretched circle.', diamond: 'A diamond points up and down.', hexagon: 'A hexagon has 6 sides.',
};
const SIMILAR_SHAPES = { square: ['rectangle', 'diamond'], rectangle: ['square', 'oval'], circle: ['oval', 'hexagon'], oval: ['circle', 'rectangle'], diamond: ['square', 'triangle'],
                         triangle: ['diamond', 'hexagon'], star: ['hexagon', 'diamond'], heart: ['circle', 'star'], hexagon: ['circle', 'star'] };
const colorHex = id => COLORS.find(c => c.id === id).hex;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

/** k distinct numerals near `correct`, within 1–10, always including `correct`. */
function numeralOptions(correct, k) {
  let near = shuffle([correct - 2, correct - 1, correct + 1, correct + 2].filter(x => x >= 1 && x <= 10));
  if (near.length < k - 1) near = near.concat(shuffle(Array.from({ length: 10 }, (_, i) => i + 1).filter(x => x !== correct && !near.includes(x))));
  return shuffle([correct].concat(near.slice(0, k - 1))).map(n => ({ id: String(n), html: `<span class="glyph">${n}</span>`, label: String(n) }));
}

/** Tapping objects counts them aloud: 1, 2, 3… (helps children count along). */
function makeCountable(area) {
  let c = 0;
  $$('.countable', area).forEach(b => b.addEventListener('click', () => {
    if (b.dataset.n) return;
    c++; b.dataset.n = c; $('.num', b).textContent = c; b.classList.add('counted');
    Sound.play('tap'); Voice.say(String(c));
  }));
}

/**
 * Tap OR drag. `item` can be tapped (onTap) or dragged onto an element with [data-zone] (onDrop).
 * Every drag interaction in the game goes through this, so there is always a tap alternative.
 */
function dragTap(item, { onTap, onDrop }) {
  let pid = null, sx = 0, sy = 0, dragging = false, justDragged = false;
  item.style.touchAction = 'none';
  const reset = () => { item.classList.remove('dragging'); item.style.transform = ''; item.style.zIndex = ''; dragging = false; pid = null; };
  item.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pid = e.pointerId; sx = e.clientX; sy = e.clientY; dragging = false;
  });
  item.addEventListener('pointermove', e => {
    if (pid !== e.pointerId) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!dragging && Math.hypot(dx, dy) > 10) { dragging = true; item.classList.add('dragging'); try { item.setPointerCapture(pid); } catch (err) { /* ok */ } }
    if (dragging) { item.style.transform = `translate(${dx}px, ${dy}px) scale(1.12)`; item.style.zIndex = 60; }
  });
  item.addEventListener('pointerup', e => {
    if (pid !== e.pointerId) return;
    if (dragging) {
      item.style.visibility = 'hidden';
      const under = document.elementFromPoint(e.clientX, e.clientY);
      item.style.visibility = '';
      const zone = under && under.closest ? under.closest('[data-zone]') : null;
      reset(); justDragged = true; setTimeout(() => { justDragged = false; }, 50);
      onDrop(item, zone);
    } else pid = null;
  });
  item.addEventListener('pointercancel', reset);
  item.addEventListener('click', () => { if (justDragged) return; onTap(item); });
}

/** Shared helper for "pick one of several answers" questions. */
function choiceRound(cfg) {
  return {
    key: cfg.key, instruction: cfg.instruction, speak: cfg.speak || cfg.instruction,
    mount(area, api) {
      area.innerHTML = `${cfg.visual ? `<div class="visual">${cfg.visual}</div>` : ''}<div class="options ${cfg.optClass || ''}" role="group" aria-label="Answers">${
        cfg.options.map(o => `<button type="button" class="opt ${cfg.btnClass || ''}" data-id="${esc(o.id)}" aria-label="${esc(o.label || o.id)}">${o.html}</button>`).join('')}</div>`;
      if (cfg.afterMount) cfg.afterMount(area);
      const btns = $$('.opt', area); let wrong = 0, done = false;
      btns.forEach(b => b.addEventListener('click', () => {
        if (done || b.classList.contains('tried')) return;
        if (b.dataset.id === cfg.correctId) {
          done = true; b.classList.add('correct'); btns.forEach(x => { if (x !== b) x.disabled = true; });
          if (cfg.onCorrect) cfg.onCorrect(area);
          api.right(cfg.praise);
          api.finish([{ concept: cfg.concept, ok: wrong === 0 }]);
        } else {
          wrong++; b.classList.add('tried'); b.setAttribute('aria-disabled', 'true');
          const good = btns.find(x => x.dataset.id === cfg.correctId);
          api.wrong(typeof cfg.hint === 'function' ? cfg.hint(b.dataset.id) : cfg.hint, wrong >= 2 ? good : null, b);
        }
      }));
    },
    solve(area) { $$('.opt', area).find(x => x.dataset.id === cfg.correctId).click(); },
  };
}

/* ---------- ALPHABET FOREST ---------- */
ACT.findLetter = t => {
  const target = pick(LETTER_POOL[t]), lower = t >= 2 && Math.random() < 0.6, n = t === 1 ? 3 : t === 2 ? 4 : 6;
  const base = t === 3 ? (CONFUSABLE[target] || []).concat(shuffle(LETTERS)) : shuffle(LETTER_POOL[t]);
  const others = unique(base.filter(l => l !== target)).slice(0, n - 1);
  const show = l => lower ? l.toLowerCase() : l;
  return choiceRound({
    key: `fl:${target}:${lower}`, concept: `Letter ${target}`,
    instruction: lower ? `Find the little letter ${target.toLowerCase()}.` : `Find the letter ${target}.`,
    speak: lower ? `Find the little letter ${target}.` : `Find the letter ${target}.`,
    visual: t < 3 ? `<div class="target-card" aria-hidden="true"><span class="glyph xl">${show(target)}</span></div>` : '',
    options: shuffle([target].concat(others)).map(l => ({ id: l, label: 'letter ' + l, html: `<span class="glyph">${show(l)}</span>` })),
    optClass: 'flakes', btnClass: 'flake', correctId: target,
    hint: `Look closely at the shape of the ${target}. Try another snowflake!`,
  });
};

ACT.matchCase = t => {
  const n = t === 1 ? 3 : t === 2 ? 4 : 5, letters = sample(t === 1 ? LETTER_POOL[1] : unique(LETTER_POOL[2].concat(['K', 'Q', 'J'])), n).sort();
  return {
    key: 'mc:' + letters.join(''),
    instruction: 'Match each big letter with its little letter.', speak: 'Match each big letter with its little letter. Tap one, then tap its friend.',
    mount(area, api) {
      const tile = (l, side, txt) => `<button type="button" class="opt tile" data-l="${l}" data-side="${side}" aria-label="${side === 'up' ? 'big' : 'little'} ${l}"><span class="glyph">${txt}</span></button>`;
      area.innerHTML = `<div class="match-grid"><div class="col">${letters.map(l => tile(l, 'up', l)).join('')}</div><div class="col">${shuffle(letters).map(l => tile(l, 'low', l.toLowerCase())).join('')}</div></div>`;
      let sel = null, matched = 0; const miss = {}, missCount = {};
      $$('.tile', area).forEach(b => b.addEventListener('click', () => {
        if (b.classList.contains('matched')) return;
        Sound.play('tap');
        if (!sel || sel.dataset.side === b.dataset.side) { if (sel) sel.classList.remove('selected'); sel = b; b.classList.add('selected'); return; }
        const up = sel.dataset.side === 'up' ? sel : b, low = sel.dataset.side === 'up' ? b : sel;
        sel.classList.remove('selected'); sel = null;
        if (up.dataset.l === low.dataset.l) {
          [up, low].forEach(x => { x.classList.add('matched', 'pair' + (matched % 5)); x.disabled = true; });
          matched++;
          if (matched === letters.length) { api.right(); api.finish(letters.map(l => ({ concept: `Letter ${l}`, ok: !miss[l] }))); }
          else api.good(`${up.dataset.l} and ${up.dataset.l.toLowerCase()} are friends!`);
        } else {
          const L = up.dataset.l; miss[L] = true; missCount[L] = (missCount[L] || 0) + 1;
          const friend = $$('.tile', area).find(x => x.dataset.side === 'low' && x.dataset.l === L);
          api.wrong(`Hmm, ${L} and ${low.dataset.l.toLowerCase()} are not a pair. Look at the shapes!`, missCount[L] >= 2 ? friend : null, up);
          low.classList.add('shake'); setTimeout(() => low.classList.remove('shake'), 500);
        }
      }));
    },
    solve(area) { letters.forEach(l => { $$('.tile', area).find(x => x.dataset.side === 'up' && x.dataset.l === l).click(); $$('.tile', area).find(x => x.dataset.side === 'low' && x.dataset.l === l).click(); }); },
  };
};

ACT.beginSound = t => {
  const pool = BEGIN_WORDS.filter(w => w.t <= t), word = pick(pool), L = word.l;
  const avoid = [L].concat(SAME_SOUND[L] || []);
  const others = sample(unique(pool.map(w => w.l)).filter(l => !avoid.includes(l)), t === 1 ? 2 : 3);
  return choiceRound({
    key: 'bs:' + word.w, concept: `Beginning letter ${L}`,
    instruction: `Which letter does "${word.w}" start with?`, speak: `Which letter does ${word.w} start with? ${word.w}.`,
    visual: `<div class="word-card"><span class="emoji xl" aria-hidden="true">${word.e}</span><span class="word">${word.w}</span></div>`,
    options: shuffle([L].concat(others)).map(l => ({ id: l, label: 'letter ' + l, html: `<span class="glyph">${l}</span>` })),
    optClass: 'flakes', btnClass: 'flake', correctId: L,
    hint: `Say "${word.w}" slowly. What sound do you hear first?`,
  });
};

/* ---------- NUMBER MOUNTAIN ---------- */
ACT.countObjects = t => {
  const [lo, hi] = COUNT_RANGE[t], n = lo + rand(hi - lo + 1), obj = pick(COUNT_OBJECTS);
  return choiceRound({
    key: `co:${n}:${obj.id}`, concept: `Counting ${n}`,
    instruction: `How many ${obj.name}?`, speak: `How many ${obj.name}? Tap each one to count.`,
    visual: `<div class="count-field">${Array.from({ length: n }, (_, i) => `<button type="button" class="countable ${obj.svg ? 'rolling' : ''}" style="--d:${(i * 0.37) % 1.6}s" aria-label="${obj.name.slice(0, -1)}">${objHtml(obj)}<span class="num"></span></button>`).join('')}</div>`,
    afterMount: makeCountable,
    options: numeralOptions(n, t === 3 ? 4 : 3), optClass: 'numerals', btnClass: 'numeral', correctId: String(n),
    hint: 'Tap each one and count along: 1, 2, 3…',
  });
};

ACT.basket = t => {
  const [lo, hi] = COUNT_RANGE[t], n = lo + rand(hi - lo + 1), total = Math.min(12, n + (t === 1 ? 2 : 3));
  return {
    key: `bk:${n}`, instruction: `Put ${n} ${plural(n, 'snowball')} in the basket.`, speak: `Put ${n} ${plural(n, 'snowball')} in the basket. Tap or drag. Then tap I'm done.`,
    mount(area, api) {
      area.innerHTML = `<div class="basket-game">
        <div class="pile" data-zone="pile" aria-label="Snowball pile">${Array.from({ length: total }, (_, i) => `<button type="button" class="ball" aria-label="snowball ${i + 1}">${Art.snowball()}</button>`).join('')}</div>
        <div class="basket" data-zone="basket" aria-label="Basket"><div class="basket-in" aria-hidden="false"></div><div class="basket-rim"></div><div class="basket-count" aria-live="polite">0</div></div>
        <button type="button" class="btn go done-btn">I'm done!</button></div>`;
      const pile = $('.pile', area), inB = $('.basket-in', area), cnt = $('.basket-count', area);
      let checks = 0, finished = false;
      const upd = () => { cnt.textContent = inB.children.length; };
      const toBasket = b => { inB.appendChild(b); b.classList.add('in'); Sound.play('pop'); upd(); Voice.say(String(inB.children.length)); };
      const toPile = b => { pile.appendChild(b); b.classList.remove('in'); Sound.play('tap'); upd(); };
      $$('.ball', area).forEach(b => dragTap(b, {
        onTap: x => { if (finished) return; x.parentElement === pile ? toBasket(x) : toPile(x); },
        onDrop: (x, zone) => { if (finished || !zone) return; const z = zone.dataset.zone; if (z === 'basket' && x.parentElement !== inB) toBasket(x); else if (z === 'pile' && x.parentElement !== pile) toPile(x); },
      }));
      $('.done-btn', area).addEventListener('click', () => {
        if (finished) return;
        const c = inB.children.length;
        if (c === n) { finished = true; $$('.ball', area).forEach(b => { b.disabled = true; }); api.right(); api.finish([{ concept: `Counting ${n}`, ok: checks === 0 }]); }
        else { checks++; const msg = c < n ? `You have ${c}. We need ${n}. Add ${n - c} more!` : `You have ${c}. We need ${n}. Take out ${c - n}.`; api.wrong(msg, null, $('.basket', area)); }
      });
    },
    solve(area) { $$('.ball', area).slice(0, n).forEach(b => b.click()); $('.done-btn', area).click(); },
  };
};

ACT.whichGroup = t => {
  const [lo, hi] = COUNT_RANGE[t], n = lo + rand(hi - lo + 1), obj = pick(COUNT_OBJECTS);
  const counts = numeralOptions(n, 3).map(o => +o.id);
  return choiceRound({
    key: `wg:${n}:${counts.slice().sort().join('')}`, concept: `Counting ${n}`,
    instruction: `Which group has ${n}?`, speak: `Which group has ${n} ${obj.name}?`,
    visual: `<div class="target-card" aria-hidden="true"><span class="glyph xl">${n}</span></div>`,
    options: counts.map(k => ({ id: String(k), label: `group of ${k}`, html: `<span class="group-items">${Array.from({ length: k }, () => `<span class="gi">${objHtml(obj)}</span>`).join('')}</span>` })),
    optClass: 'groups', btnClass: 'group', correctId: String(n),
    hint: `Count each group. Which one has ${n}?`,
  });
};

ACT.addVisual = t => {
  const maxSum = t === 1 ? 5 : t === 2 ? 7 : 10, a = 1 + rand(maxSum - 1), b = 1 + rand(maxSum - a), sum = a + b, obj = pick(COUNT_OBJECTS);
  const grp = k => `<div class="count-field small">${Array.from({ length: k }, () => `<button type="button" class="countable" aria-label="${obj.name.slice(0, -1)}">${objHtml(obj)}<span class="num"></span></button>`).join('')}</div>`;
  return choiceRound({
    key: `ad:${a}+${b}`, concept: `Adding ${a} + ${b}`,
    instruction: `${a} + ${b} = ?  How many in all?`, speak: `${a} ${obj.name} plus ${b} ${obj.name}. How many in all?`,
    visual: `<div class="add-row">${grp(a)}<span class="op" aria-hidden="true">+</span>${grp(b)}<span class="op" aria-hidden="true">=</span><span class="q" aria-hidden="true">?</span></div><p class="equation">${a} + ${b} = ?</p>`,
    afterMount: makeCountable,
    options: numeralOptions(sum, t === 3 ? 4 : 3), optClass: 'numerals', btnClass: 'numeral', correctId: String(sum),
    hint: `Tap every one and count them all together: ${a} and ${b} more.`,
    onCorrect: area => { const q = $('.q', area); if (q) { q.textContent = sum; q.classList.add('solved'); } const eq = $('.equation', area); if (eq) eq.textContent = `${a} + ${b} = ${sum}`; },
  });
};

ACT.numberSequence = t => {
  const down = t === 3 && Math.random() < 0.5, len = t === 1 ? 4 : 5;
  const start = down ? 6 + rand(5) : 1 + rand(t === 1 ? 3 : 6);
  const seq = Array.from({ length: len }, (_, i) => down ? start - i : start + i);
  const miss = 1 + rand(len - 2), correct = seq[miss];
  const shown = seq.map((x, i) => i === miss ? '?' : x);
  return choiceRound({
    key: `ns:${seq.join('')}:${miss}`, concept: 'Number order',
    instruction: 'What number is missing?', speak: `What number is missing? ${shown.map(x => x === '?' ? 'blank' : x).join(', ')}.`,
    visual: `<div class="seq-row" aria-label="Number line: ${shown.join(', ')}">${shown.map(x => `<span class="seq-tile ${x === '?' ? 'slot' : ''}">${x}</span>`).join('')}</div>`,
    options: numeralOptions(correct, 3), optClass: 'numerals', btnClass: 'numeral', correctId: String(correct),
    hint: `Say the numbers in order: ${seq.filter((_, i) => i < miss).join(', ')}… what comes next?`,
    onCorrect: area => { const s = $('.slot', area); if (s) { s.textContent = correct; s.classList.remove('slot'); s.classList.add('solved'); } },
  });
};

/* ---------- PATTERN & SHAPE PLAYGROUND ---------- */
function makeElems(count, t) {
  if (t >= 2 && Math.random() < 0.55) {
    const shapes = sample(SHAPE_POOL[Math.min(t, 2)], count), colors = sample(COLOR_POOL[3], count);
    return shapes.map((s, i) => ({ id: `${colors[i]}-${s}`, html: Art.shape(s, colorHex(colors[i])), label: `${colors[i]} ${s}` }));
  }
  return sample(WINTER_ELEMS, count).map(e => ({ id: e, html: `<span class="emoji" aria-hidden="true">${e}</span>`, label: e }));
}
ACT.completePattern = t => {
  const unit = pick(t === 1 ? ['AB'] : t === 2 ? ['AAB', 'ABB', 'ABC'] : ['ABC', 'AABB', 'ABCB']);
  const kinds = unique(unit.split('')).length, elems = makeElems(kinds + 2, t);
  const map = {}; unique(unit.split('')).forEach((ch, i) => { map[ch] = elems[i]; });
  const len = t === 1 ? 6 : unit.length * 2 + 1, seq = Array.from({ length: len }, (_, i) => map[unit[i % unit.length]]);
  const hidden = Math.max(unit.length, len - 1 - rand(2)), correct = seq[hidden];
  const wrongs = shuffle(elems.filter(e => e.id !== correct.id)).slice(0, 2);
  const instruction = hidden === len - 1 ? 'What comes next in the pattern?' : 'What goes in the empty spot?';
  return choiceRound({
    key: `cp:${unit}:${elems.map(e => e.id).join('')}:${hidden}`, concept: `${unit} patterns`, instruction, speak: instruction,
    visual: `<div class="seq-row pattern" aria-label="A pattern with one missing item">${seq.map((e, i) => i === hidden ? `<span class="seq-tile slot" aria-label="empty spot">?</span>` : `<span class="seq-tile" aria-label="${esc(e.label)}">${e.html}</span>`).join('')}</div>`,
    options: shuffle([correct].concat(wrongs)).map(e => ({ id: e.id, label: e.label, html: e.html })),
    optClass: 'items', btnClass: 'item', correctId: correct.id,
    hint: 'Look at the first ones. What repeats again and again?',
    onCorrect: area => { const s = $('.slot', area); if (s) { s.innerHTML = correct.html; s.classList.remove('slot'); s.classList.add('solved'); } },
  });
};

ACT.findShape = t => {
  const mode = t === 3 ? 'both' : pick(['shape', 'color']), n = t === 1 ? 3 : t === 2 ? 4 : 6;
  const shapes = SHAPE_POOL[t], colors = COLOR_POOL[t];
  const shape = pick(shapes), color = pick(colors);
  let opts = [];
  if (mode === 'shape') {
    const cs = shuffle(colors);
    opts = sample(shapes.filter(s => s !== shape), n - 1).concat([shape]).map((s, i) => ({ s, c: cs[i % cs.length] }));
  } else if (mode === 'color') {
    const sh = pick(shapes);
    opts = sample(colors.filter(c => c !== color), n - 1).concat([color]).map(c => ({ s: sh, c }));
  } else {
    opts = [{ s: shape, c: color }];
    const used = new Set([shape + color]);
    const tries = shuffle(shapes.flatMap(s => colors.map(c => ({ s, c })))).filter(o => (o.s === shape) !== (o.c === color));   // share exactly one attribute
    for (const o of tries) { if (opts.length >= n) break; if (!used.has(o.s + o.c)) { used.add(o.s + o.c); opts.push(o); } }
  }
  const ans = mode === 'shape' ? opts.find(o => o.s === shape) : mode === 'color' ? opts.find(o => o.c === color) : { s: shape, c: color };
  const inst = mode === 'shape' ? `Find the ${shape}.` : mode === 'color' ? `Find the ${color} one.` : `Find the ${color} ${shape}.`;
  const concept = mode === 'color' ? `Color ${color}` : `Shape ${shape}`;
  return choiceRound({
    key: `fs:${mode}:${shape}:${color}`, concept, instruction: inst, speak: inst,
    visual: mode === 'shape' ? '' : `<div class="swatch-line" aria-hidden="true"><i class="dot" style="background:${colorHex(color)}"></i></div>`,
    options: shuffle(opts).map(o => ({ id: `${o.s}|${o.c}`, label: `${o.c} ${o.s}`, html: Art.shape(o.s, colorHex(o.c)) })),
    optClass: 'shapes', btnClass: 'shape', correctId: `${ans.s}|${ans.c}`,
    hint: mode === 'color' ? `Look for the color ${color}.` : SHAPE_CLUE[shape],
  });
};

ACT.shapeOutline = t => {
  const shape = pick(SHAPE_POOL[Math.max(1, t)]), color = pick(COLOR_POOL[t]), n = t === 1 ? 3 : 4;
  const pool = SHAPE_POOL[t], sim = (t >= 2 ? (SIMILAR_SHAPES[shape] || []).filter(s => pool.includes(s)) : []);
  const others = unique(sim.concat(shuffle(pool))).filter(s => s !== shape).slice(0, n - 1);
  return choiceRound({
    key: `so:${shape}:${color}`, concept: `Shape ${shape}`,
    instruction: 'Which outline fits this shape?', speak: 'Which outline fits this shape?',
    visual: `<div class="target-card" aria-label="A ${color} ${shape}">${Art.shape(shape, colorHex(color))}</div>`,
    options: shuffle([shape].concat(others)).map(s => ({ id: s, label: `outline of a ${s}`, html: Art.shape(s, '', true) })),
    optClass: 'shapes', btnClass: 'shape outline', correctId: shape, hint: SHAPE_CLUE[shape],
  });
};

ACT.sortItems = t => {
  const mode = t === 1 ? 'color' : pick(['color', 'shape']), n = t === 1 ? 4 : t === 2 ? 5 : 6;
  const bins = mode === 'color' ? sample(COLOR_POOL[t], 2) : sample(SHAPE_POOL[Math.min(t, 2)], 2);
  const items = Array.from({ length: n }, (_, i) => {
    const bin = bins[i % 2];
    return mode === 'color' ? { bin, s: pick(SHAPE_POOL[t]), c: bin } : { bin, s: bin, c: pick(COLOR_POOL[t]) };
  });
  return {
    key: `si:${mode}:${bins.join('')}:${items.map(i => i.s + i.c).join('')}`,
    instruction: `Sort the shapes by ${mode}.`, speak: `Sort the shapes by ${mode}. Tap a shape, then tap where it goes. Or drag it.`,
    mount(area, api) {
      const binHtml = b => `<div class="bin" data-zone="bin" data-bin="${b}" tabindex="0" role="button" aria-label="${b} bin"><div class="bin-label">${mode === 'color' ? `<i class="dot" style="background:${colorHex(b)}"></i>${cap(b)}` : `<span class="mini">${Art.shape(b, '#fff', true)}</span>${cap(b)}`}</div><div class="bin-items"></div></div>`;
      area.innerHTML = `<div class="sort-game"><div class="bins">${bins.map(binHtml).join('')}</div><div class="tray" data-zone="tray">${shuffle(items).map((it, i) => `<button type="button" class="sort-item" data-bin="${it.bin}" aria-label="${it.c} ${it.s}">${Art.shape(it.s, colorHex(it.c))}</button>`).join('')}</div></div>`;
      let sel = null, placed = 0, mistakes = 0;
      const place = (item, bin) => {
        if (item.dataset.bin === bin.dataset.bin) {
          $('.bin-items', bin).appendChild(item); item.disabled = true; item.classList.remove('selected'); item.classList.add('placed'); sel = null; placed++;
          if (placed === items.length) { api.right(); api.finish([{ concept: `Sorting by ${mode}`, ok: mistakes === 0 }]); } else api.good();
        } else {
          mistakes++; item.classList.remove('selected'); sel = null;
          api.wrong(`Look at the ${mode} of this one. Which bin matches?`, mistakes >= 2 ? $$('.bin', area).find(b => b.dataset.bin === item.dataset.bin) : null, item);
        }
      };
      $$('.sort-item', area).forEach(it => dragTap(it, {
        onTap: x => { if (sel && sel !== x) sel.classList.remove('selected'); sel = (sel === x) ? null : x; x.classList.toggle('selected', sel === x); Sound.play('tap'); },
        onDrop: (x, zone) => { const bin = zone && zone.closest('.bin'); if (bin) place(x, bin); },
      }));
      $$('.bin', area).forEach(b => {
        const go = () => { if (sel) place(sel, b); else api.hintOnly(`Tap a shape first, then tap its ${mode === 'color' ? 'color' : 'shape'} bin.`); };
        b.addEventListener('click', go);
        b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      });
    },
    solve(area) { $$('.sort-item', area).forEach(it => { it.click(); $$('.bin', area).find(b => b.dataset.bin === it.dataset.bin).click(); }); },
  };
};

/* ---------- STORYBOOK SNOWFIELD ---------- */
ACT.wordPicture = t => {
  const pool = VOCAB.filter(w => w.t <= t), word = pick(pool), mode = t === 1 ? 'pic' : pick(['pic', 'word']);
  const others = sample(pool.filter(w => w.w !== word.w && w.e !== word.e), t === 3 ? 3 : 2);
  const all = shuffle([word].concat(others));
  if (mode === 'pic') return choiceRound({
    key: 'wp:' + word.w, concept: `Word ${word.w}`, instruction: `Tap the ${word.w}.`, speak: `Find the ${word.w}.`,
    visual: `<div class="word-card"><span class="word xl">${word.w}</span></div>`,
    options: all.map(w => ({ id: w.w, label: w.w, html: `<span class="emoji" aria-hidden="true">${w.e}</span>` })), optClass: 'items', btnClass: 'item', correctId: word.w,
    hint: `Sound it out slowly: ${word.w.split('').join('-')}. Which picture matches?`,
  });
  return choiceRound({
    key: 'wp:' + word.w, concept: `Word ${word.w}`, instruction: 'What is this?', speak: 'What is this?',
    visual: `<div class="word-card"><span class="emoji xl" aria-hidden="true">${word.e}</span></div>`,
    options: all.map(w => ({ id: w.w, label: w.w, html: `<span class="word">${w.w}</span>` })), optClass: 'items', btnClass: 'item wordbtn', correctId: word.w,
    hint: 'Look at the picture. Which word names it?',
  });
};

ACT.storyChoice = t => {
  const story = pick(STORIES.filter(s => s.t <= t));
  const opts = shuffle([story.ans].concat(story.wrong));
  return choiceRound({
    key: 'st:' + story.id, concept: 'Story listening',
    instruction: story.q, speak: `${story.text} ${story.q}`,
    visual: `<div class="story-card"><p class="story-text">${story.text}</p><button type="button" class="btn small read-btn">🔊 Read to me</button></div>`,
    afterMount: area => { $('.read-btn', area).addEventListener('click', () => { if (!Voice.say(story.text, true)) toast(S.settings.muted ? 'Sound is muted.' : 'Reading aloud is not available here, but you can read the story!'); }); },
    options: opts.map(o => ({ id: o.w, label: o.w, html: `<span class="emoji" aria-hidden="true">${o.e}</span><span class="word small">${o.w}</span>` })),
    optClass: 'items', btnClass: 'item', correctId: story.ans.w,
    hint: 'Read the story again. Who or what is it about?',
  });
};

ACT.sequenceStory = t => {
  const seq = pick(SEQUENCES.filter(s => s.t <= t && (t === 3 || s.steps.length === 3)));
  const n = seq.steps.length, ORD = ['First', 'Next', 'Then', 'Last'].slice(0, n === 3 ? 3 : 4);
  if (n === 3) ORD.splice(0, 3, 'First', 'Next', 'Last');
  let order = shuffle(seq.steps.map((_, i) => i)); if (order.every((v, i) => v === i)) order.reverse();
  return {
    key: 'sq:' + seq.id, instruction: `${seq.title}: tap the pictures in order.`, speak: `${seq.title}. What happens first? Tap the pictures in order.`,
    mount(area, api) {
      area.innerHTML = `<ol class="slots">${seq.steps.map((_, i) => `<li class="slot-box" data-i="${i}"><span class="slot-num">${ORD[i]}</span></li>`).join('')}</ol>
        <div class="cards">${order.map(i => `<button type="button" class="opt story-step" data-i="${i}" aria-label="${esc(seq.steps[i].t)}"><span class="emoji" aria-hidden="true">${seq.steps[i].e}</span><span class="word small">${seq.steps[i].t}</span></button>`).join('')}</div>`;
      let next = 0, mistakes = 0;
      $$('.story-step', area).forEach(c => c.addEventListener('click', () => {
        if (c.disabled) return;
        if (+c.dataset.i === next) {
          const slot = $$('.slot-box', area)[next]; slot.appendChild(c); c.disabled = true; c.classList.add('placed'); next++;
          $$('.story-step.assist', area).forEach(x => x.classList.remove('assist'));
          if (next === n) { api.right(); api.finish([{ concept: 'Putting events in order', ok: mistakes === 0 }]); } else api.good(`Yes! What happens ${ORD[next].toLowerCase()}?`);
        } else {
          mistakes++;
          const good = $$('.story-step', area).find(x => +x.dataset.i === next);
          api.wrong(`Think about the story. What happens ${ORD[next].toLowerCase()}?`, mistakes >= 2 ? good : null, c);
        }
      }));
    },
    solve(area) { for (let i = 0; i < n; i++) $$('.story-step', area).find(x => +x.dataset.i === i && !x.disabled).click(); },
  };
};

ACT.followInstruction = t => {
  const k = t === 1 ? 2 : 3, animals = sample(ANIMALS, k), colors = sample(COLOR_POOL[Math.max(2, t)].map(id => COLORS.find(c => c.id === id)), k);
  const type = t === 3 ? pick(['scarf', 'hat']) : 'scarf', target = pick(animals), want = pick(colors);
  const draw = c => type === 'scarf' ? Art.scarf(c.hex) : Art.hat(c.hex);
  return {
    key: `fi:${target.id}:${want.id}:${type}`, instruction: `Give the ${target.n} the ${want.id} ${type}.`, speak: `Give the ${target.n} the ${want.id} ${type}. Tap the ${type}, then tap the ${target.n}.`,
    mount(area, api) {
      area.innerHTML = `<div class="give-game"><div class="animals">${animals.map(a => `<button type="button" class="animal-btn" data-zone="animal" data-a="${a.id}" aria-label="${a.n}">${Art.animal(a.id)}<span class="worn"></span></button>`).join('')}</div>
        <div class="gifts">${shuffle(colors).map(c => `<button type="button" class="give-item" data-c="${c.id}" aria-label="${c.id} ${type}">${draw(c)}</button>`).join('')}</div></div>`;
      let sel = null, mistakes = 0, done = false;
      const give = (item, animalBtn) => {
        if (done) return;
        if (!item) { api.hintOnly(`Pick a ${type} first, then tap the ${animalBtn.dataset.a}.`); return; }
        const okColor = item.dataset.c === want.id, okAnimal = animalBtn.dataset.a === target.id;
        if (okColor && okAnimal) {
          done = true; $('.worn', animalBtn).innerHTML = item.innerHTML; item.classList.add('placed'); item.disabled = true;
          $$('.give-item, .animal-btn', area).forEach(x => { x.disabled = true; });
          api.right(); api.finish([{ concept: 'Following directions', ok: mistakes === 0 }]);
        } else {
          mistakes++; item.classList.remove('selected'); sel = null;
          const msg = !okColor ? `That ${type} is ${item.dataset.c}. Look for the ${want.id} ${type}.` : `That is the ${animalBtn.dataset.a}. Find the ${target.n}!`;
          api.wrong(msg, mistakes >= 2 ? (okColor ? $$('.animal-btn', area).find(a => a.dataset.a === target.id) : $$('.give-item', area).find(g => g.dataset.c === want.id)) : null, item);
        }
      };
      $$('.give-item', area).forEach(it => dragTap(it, {
        onTap: x => { if (sel && sel !== x) sel.classList.remove('selected'); sel = sel === x ? null : x; x.classList.toggle('selected', sel === x); Sound.play('tap'); },
        onDrop: (x, zone) => { const a = zone && zone.closest('.animal-btn'); if (a) give(x, a); },
      }));
      $$('.animal-btn', area).forEach(a => a.addEventListener('click', () => give(sel, a)));
    },
    solve(area) { $$('.give-item', area).find(g => g.dataset.c === want.id).click(); $$('.animal-btn', area).find(a => a.dataset.a === target.id).click(); },
  };
};

/* ---------- FROSTY'S BRAIN QUEST ---------- */
ACT.memoryPairs = t => {
  const pairs = t === 1 ? 3 : t === 2 ? 4 : 6, emojis = sample(MEMORY_EMOJI, pairs), cols = pairs === 3 ? 3 : 4;
  return {
    key: 'mp:' + emojis.slice().sort().join(''), instruction: 'Find the matching pairs. Tap two cards!', speak: 'Find the matching pairs. Tap two cards.',
    mount(area, api) {
      const deck = shuffle(emojis.concat(emojis));
      area.innerHTML = `<div class="mem-grid" style="--cols:${cols}">${deck.map((e, i) => `<button type="button" class="mem-card" data-e="${e}" aria-label="Card ${i + 1}, face down"><span class="face back" aria-hidden="true">❄</span><span class="face front" aria-hidden="true">${e}</span></button>`).join('')}</div>`;
      let open = [], lock = false, found = 0, mismatches = 0;
      $$('.mem-card', area).forEach((c, i) => c.addEventListener('click', () => {
        if (lock || c.classList.contains('flipped') || c.classList.contains('matched')) return;
        c.classList.add('flipped'); c.setAttribute('aria-label', `Card ${i + 1}, showing ${c.dataset.e}`); Sound.play('flip'); open.push(c);
        if (open.length < 2) return;
        const [a, b] = open; open = [];
        if (a.dataset.e === b.dataset.e) {
          [a, b].forEach(x => { x.classList.add('matched'); x.disabled = true; }); found++;
          if (found === pairs) { api.right(); api.finish([{ concept: 'Memory pairs', ok: mismatches <= pairs }]); } else api.good('A match!');
        } else {
          mismatches++; lock = true;
          setTimeout(() => { [a, b].forEach(x => { x.classList.remove('flipped'); x.setAttribute('aria-label', 'Card, face down'); }); lock = false; }, 900);
          api.hintOnly('Not a match. Try to remember where they are!');
        }
      }));
    },
    solve(area) { emojis.forEach(e => $$('.mem-card', area).filter(c => c.dataset.e === e).forEach(c => c.click())); },
  };
};

ACT.oddOne = t => {
  const set = pick(ODD_SETS.filter(s => s.t <= t)), odd = pick(set.odd), three = sample(set.items, 3);
  return choiceRound({
    key: `oo:${set.cat}:${odd}:${three.join('')}`, concept: 'Odd one out',
    instruction: 'Which one does not belong?', speak: 'Which one does not belong with the others?',
    options: shuffle(three.concat([odd])).map(x => ({ id: x, label: x, html: `<span class="emoji big" aria-hidden="true">${x}</span>` })),
    optClass: 'items four', btnClass: 'item', correctId: odd,
    hint: `Three of these are ${set.cat}. Which one is different?`, praise: `Yes! The others are all ${set.cat}.`,
  });
};

/* ===================================================================
   11. SESSION  —  playing one level: rounds, feedback, results
   =================================================================== */
const Session = {
  cur: null,

  start(level) {
    if (!isLevelUnlocked(level)) { toast(levelLockText(level)); return; }
    this.cur = { level, idx: 0, seen: new Set(), roundResults: [], ms: 0, roundStart: 0, pauseStart: 0, lastAct: null, round: null, api: null, over: false };
    go('intro');
  },

  /** Child pressed "Let's go!" on the intro screen. */
  begin() { go('play'); this.showRound(); },

  makeRound() {
    const s = this.cur, spec = s.level.rounds[s.idx];
    const act = spec === '*' ? Learning.pickMixedActivity(s.lastAct) : spec, skill = ACTIVITY_SKILL[act];
    let round, tries = 0;
    do { round = ACT[act](Learning.tier(skill, s.level.tier)); tries++; } while (s.seen.has(round.key) && tries < 20);
    s.seen.add(round.key); round.act = act; round.skill = skill; s.lastAct = act;
    return round;
  },

  showRound() {
    const s = this.cur, round = this.makeRound(); s.round = round;
    const area = $('#area'); area.innerHTML = ''; area.classList.remove('done');
    $('#next').hidden = true; setFeedback('');
    $('#instr').textContent = round.instruction;
    $$('.pdot').forEach((d, i) => { d.classList.toggle('now', i === s.idx); d.classList.toggle('done', i < s.idx); });
    $('#round-label').textContent = `Question ${s.idx + 1} of ${s.level.rounds.length}`;
    buddyReact('wave');
    const state = { mistakes: 0, finished: false };
    const api = {
      mistakes: () => state.mistakes,
      right(msg) { Sound.play('right'); buddyReact('cheer'); burst($('#buddy'), 14); setFeedback(msg || pick(CHEERS), 'good'); Voice.say(msg || '', false); },
      good(msg) { Sound.play('pop'); buddyReact('cheer'); if (msg) setFeedback(msg, 'good'); },
      hintOnly(msg) { setFeedback(msg, 'hint'); Voice.say(msg); },
      wrong(msg, assistEl, shakeEl) {
        state.mistakes++; Sound.play('oops'); buddyReact('oops');
        if (shakeEl) { shakeEl.classList.remove('shake'); void shakeEl.offsetWidth; shakeEl.classList.add('shake'); }
        const text = msg || pick(TRY_AGAIN); setFeedback(text + (assistEl ? ' Try this one!' : ''), 'hint'); Voice.say(text);
        if (assistEl) assistEl.classList.add('assist');
      },
      finish(outcomes) {
        if (state.finished) return; state.finished = true;
        outcomes.forEach(o => Learning.record(round.skill, o.concept, o.ok));
        s.roundResults.push({ act: round.act, skill: round.skill, ok: outcomes.every(o => o.ok), outcomes });
        s.ms += clamp(Date.now() - s.roundStart, 0, 120000);
        area.classList.add('done'); save();
        $$('.pdot')[s.idx].classList.add('done');
        const last = s.idx === s.level.rounds.length - 1, nb = $('#next');
        nb.innerHTML = last ? 'See my rewards! ❄' : 'Next ➜'; nb.hidden = false; nb.focus({ preventScroll: false });
        nb.scrollIntoView({ block: 'nearest', behavior: prefersReduced() ? 'auto' : 'smooth' });
      },
    };
    s.api = api; s.roundStart = Date.now();
    round.mount(area, api);
    Voice.say(round.speak);
  },

  next() {
    const s = this.cur; if (!s || !s.round) return;
    if (s.idx >= s.level.rounds.length - 1) { this.complete(); return; }
    s.idx++; this.showRound();
  },

  complete() {
    const s = this.cur; if (s.over) return; s.over = true;
    Voice.stop();
    const level = s.level, res = Rewards.levelComplete(level, s);
    this.logSession(true, res.stars);
    save();
    Sound.play('win');
    go('results', res);
  },

  /** Save a history entry. Called when a level ends or is exited after at least one answer. */
  logSession(done, stars) {
    const s = this.cur; if (!s || !s.roundResults.length) return;
    S.sessions.push({ t: Date.now(), level: s.level.id, title: s.level.title, done, ms: s.ms, stars: stars || 0,
      q: s.roundResults.length, ft: s.roundResults.filter(r => r.ok).length, skills: unique(s.roundResults.map(r => r.skill)) });
    S.sessions = S.sessions.slice(-40);
    S.stats.totalMs += s.ms; S.stats.sessions++;
    const d = todayStr(); if (!S.playDays.includes(d)) S.playDays = S.playDays.concat(d).slice(-60);
    s.ms = 0; s.roundResults = s.roundResults.slice();   // avoid logging the same time twice
    save();
  },

  pause() {
    const s = this.cur; if (!s || s.over) return;
    s.pauseStart = Date.now(); Voice.stop();
    const resume = () => { s.roundStart += Date.now() - s.pauseStart; };
    openModal({
      title: 'Taking a break?', html: '<p>Your answers so far are safe. You can come back any time!</p>',
      actions: [
        { label: '▶ Keep playing', cls: 'go', onClick: () => { resume(); } },
        { label: '🗺️ Back to the map', onClick: () => { Session.exit(); } },
      ],
      onClose: res => { if (res === 'esc' || res === 'backdrop') resume(); },
    });
  },

  exit() {
    const s = this.cur; if (!s) { go('map'); return; }
    Voice.stop();
    if (!s.over) { s.over = true; this.logSession(false, 0); }
    const rid = s.level.region; this.cur = null; go('region', { id: rid });
  },
};

/* ---------- play-screen helpers ---------- */
function setFeedback(text, kind) {
  const f = $('#feedback'); if (!f) return;
  f.textContent = text || ''; f.className = 'feedback' + (kind ? ' ' + kind : '');
}
function buddyReact(kind) {
  const b = $('#buddy'); if (!b) return;
  b.classList.remove('wave', 'cheer', 'oops'); void b.offsetWidth; b.classList.add(kind);
}

/* ===================================================================
   12. SCREENS  —  router, HUD and every child-facing screen
   =================================================================== */
const Screens = {};
let currentScreen = '';
let lastCoins = null;

function go(name, params) {
  const def = Screens[name]; if (!def) return;
  const out = def(params || {});
  if (!out) return;                                   // a screen can refuse (e.g. locked region)
  currentScreen = name; document.body.dataset.screen = name;
  const host = $('#screens');
  host.innerHTML = `<section class="screen enter" id="scr-${name}" data-screen="${name}"${out.attrs || ''}>${out.html}</section>`;
  const el = host.firstElementChild;
  setHud(name, params || {});
  if (out.after) out.after(el);
  window.scrollTo(0, 0);
  const h = $('[data-focus]', el) || $('h1', el);
  if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
}

/* ---------- HUD (top bar) ---------- */
const HUD_LEFT = {
  map:      () => `<button class="btn small ghost" data-go="menu">← Home</button>`,
  region:   () => `<button class="btn small ghost" data-go="map">← Map</button>`,
  album:    () => `<button class="btn small ghost" data-go="menu">← Home</button>`,
  workshop: () => `<button class="btn small ghost" data-go="menu">← Home</button>`,
  intro:    () => `<button class="btn small ghost" data-go="region" data-id="${Session.cur ? Session.cur.level.region : ''}">← Back</button>`,
  play:     () => `<button class="btn small ghost" data-act="pause"><span class="pause-ico" aria-hidden="true"></span> Pause</button>`,
  menu:     () => '',
  welcome:  () => '',
  results:  () => '',
};
function setHud(name) { $('#hud-left').innerHTML = (HUD_LEFT[name] || (() => ''))(); updateHud(); }
function updateHud() {
  const n = $('#coin-n'); if (!n) return;
  n.textContent = S.snowflakes;
  if (lastCoins !== null && S.snowflakes > lastCoins) { const c = $('#coins'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  lastCoins = S.snowflakes;
  const m = $('#btn-mute'); m.textContent = S.settings.muted ? '🔇' : '🔊';
  m.setAttribute('aria-pressed', String(S.settings.muted)); m.setAttribute('aria-label', S.settings.muted ? 'Sound is off. Turn sound on' : 'Sound is on. Mute everything');
}

/* ---------- shared bits ---------- */
const mascot = (cls = '') => Art.snowman(currentLook(), { cls: 'mascot ' + cls, label: 'Frosty the snowman' });
const starsHtml = n => `<span class="stars" role="img" aria-label="${n} of 3 stars">${[1, 2, 3].map(i => `<span class="${i <= n ? 'on' : ''}">★</span>`).join('')}</span>`;
const fmtTime = ms => { const m = Math.round(ms / 60000); return ms < 45000 ? 'under a minute' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr ${m % 60} min`; };
const fmtDate = ts => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' + new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const guideArt = (region, cls = '') => region.guide === 'snowman' ? Art.snowman(currentLook(), { cls }) : Art.animal(region.guide, cls);

function nextUp() {
  return LEVELS.find(l => !l.bonus && isLevelUnlocked(l) && !levelRec(l.id).done) || LEVELS.find(l => l.bonus && isLevelUnlocked(l)) || null;
}
const hasProgress = () => S.stats.questions > 0 || Object.keys(S.levels).some(id => S.levels[id].done);

/** Show unlock reveals one after another. items: [{type:'sticker', id} | {type:'item', cat, id}] */
function revealQueue(items, done) {
  if (!items.length) { if (done) done(); return; }
  const it = items[0], rest = items.slice(1);
  let art, name, sub, kind;
  if (it.type === 'sticker') {
    const st = STICKERS.find(x => x.id === it.id); art = st.art(); name = st.name; kind = 'New sticker!';
    sub = `${STICKER_CATS.find(c => c.id === st.cat).name} · ${RARITY[st.rarity]}`;
  } else {
    const wi = findItem(it.cat, it.id), cat = WORKSHOP_CATS.find(c => c.id === it.cat);
    art = Art.snowman(Object.assign(currentLook(), { [it.cat]: it.id }), { view: cat.view, cls: 'reveal-snowman' }); name = wi.name; kind = 'New for your snowman!'; sub = 'Find it in the Snowman Workshop';
  }
  Sound.play('sparkle');
  const m = openModal({
    title: kind, cls: 'reveal',
    html: `<div class="reveal-art ${it.type === 'sticker' ? 'sticker-art rarity-' + (STICKERS.find(x => x.id === it.id) || {}).rarity : ''}">${art}</div><p class="reveal-name">${name}</p><p class="reveal-sub">${sub}</p>`,
    actions: [{ label: rest.length ? 'Yay! Next ➜' : 'Yay!', cls: 'go' }],
    dismissible: false, onClose: () => revealQueue(rest, done),
  });
  setTimeout(() => burst($('.reveal-art', m.el), 22), 250);
}

/* ---------- WELCOME ---------- */
function titleHtml() { return 'SnowBuddies'.split('').map((ch, i) => `<span class="tt t${i % 5}" style="--r:${((i * 37) % 9) - 4}deg">${ch}</span>`).join(''); }
Screens.welcome = () => ({
  html: `<div class="welcome">
    <h1 class="logo" aria-label="SnowBuddies">${titleHtml()}</h1>
    <p class="tagline">A magical winter learning adventure</p>
    <div class="hero-mascot">${mascot('waving big')}<div class="hero-friends"><span class="slide-pen">${Art.animal('penguin')}</span></div></div>
    <button class="btn go huge" data-go="menu" data-focus>Let's play!</button>
    <p class="fine">Tip: tap the speaker at the top to turn sound on or off.</p>
  </div>`,
});

/* ---------- MAIN MENU ---------- */
Screens.menu = () => {
  const nu = nextUp(), cont = hasProgress() && nu;
  return {
    html: `<div class="menu">
      <h1 class="logo small" aria-label="SnowBuddies">${titleHtml()}</h1>
      <div class="menu-grid">
        <div class="menu-mascot"><div class="bubble">Hi! I'm Frosty. Ready to play?</div>${mascot('waving')}</div>
        <nav class="menu-buttons" aria-label="Main menu">
          ${cont ? `<button class="btn go big" data-act="continue" data-focus>▶ Continue Adventure<small>${esc(nu.title)}</small></button>` : ''}
          <button class="btn ${cont ? 'mint' : 'go'} big" data-go="map" ${cont ? '' : 'data-focus'}>${cont ? '🗺️ World Map' : '▶ Play'}</button>
          <button class="btn lav big" data-go="album">🌟 Sticker Collection <span class="count">${Object.keys(S.stickers).length}/${STICKERS.length}</span></button>
          <button class="btn coral big" data-go="workshop">⛄ Snowman Workshop</button>
          <button class="btn cream big" data-go="gate">👪 Parent Corner</button>
          <div class="sound-row" role="group" aria-label="Sound controls">
            <button class="chip" data-act="toggle-sfx" aria-pressed="${S.settings.sfx}">🔔 Sounds</button>
            <button class="chip" data-act="toggle-music" aria-pressed="${S.settings.music}">🎵 Music</button>
            <button class="chip" data-act="toggle-voice" aria-pressed="${S.settings.voice}">🗣️ Read aloud</button>
          </div>
        </nav>
      </div></div>`,
  };
};

/* ---------- WORLD MAP ---------- */
const MAP_POS = { alphabet: [31, 87], number: [72, 77], pattern: [29, 49], story: [72, 30], lake: [47, 17] };
Screens.map = () => {
  const nu = nextUp();
  const spots = REGIONS.map(r => {
    const open = isRegionUnlocked(r), done = regionDoneCount(r.id), total = regionLevels(r.id).length, [x, y] = MAP_POS[r.id];
    const finished = regionComplete(r.id), cls = !open ? 'locked' : finished ? 'complete' : (nu && nu.region === r.id ? 'current' : 'open');
    const dots = regionLevels(r.id).map(l => `<i class="${levelRec(l.id).done ? 'on' : ''}"></i>`).join('');
    return `<button class="spot ${cls}" style="left:${x}%;top:${y}%" data-act="region" data-id="${r.id}" ${open ? '' : 'aria-disabled="true"'}
      aria-label="${r.name}. ${open ? `${done} of ${total} levels finished` : 'Locked. ' + regionLockText(r)}">
      <span class="sign"><span class="sign-icon">${open ? (finished ? '⭐' : { alphabet: '🌲', number: '⛰️', pattern: '🏘️', story: '📖', lake: '🧊' }[r.id]) : '🔒'}</span>
      <span class="sign-name">${r.name}</span><span class="sign-dots" aria-hidden="true">${dots}</span></span><span class="sign-post"></span></button>`;
  }).join('');
  return { html: `<div class="map-screen"><h1 class="sr-only">World map</h1><div class="map-wrap">${Art.mapScene()}${spots}</div><p class="map-hint">Tap a place to explore!</p></div>`,
    after(el) { $$('.spot[aria-disabled="true"]', el).forEach(b => b.addEventListener('click', () => { b.classList.remove('wobble'); void b.offsetWidth; b.classList.add('wobble'); })); } };
};

/* ---------- REGION (level list) ---------- */
Screens.region = ({ id }) => {
  const r = getRegion(id); if (!r) return false;
  if (!isRegionUnlocked(r)) { toast(regionLockText(r)); return false; }
  const levels = regionLevels(id), nu = nextUp();
  const items = levels.map((l, i) => {
    const rec = levelRec(l.id), open = isLevelUnlocked(l), cls = rec.done ? 'done' : open ? 'open' : 'locked';
    return `<li><button class="level-node ${cls} ${nu && nu.id === l.id ? 'current' : ''}" data-act="level" data-id="${l.id}" ${open ? '' : 'aria-disabled="true"'}>
      <span class="badge">${rec.done ? '✓' : open ? (l.bonus ? '★' : i + 1) : '🔒'}</span>
      <span class="ntext"><b>${esc(l.title)}</b><small>${open ? esc(l.blurb) : esc(levelLockText(l))}</small></span>
      ${rec.done ? starsHtml(rec.stars) : ''}</button></li>`;
  }).join('');
  return {
    attrs: ` data-region="${id}"`,
    html: `<div class="region">
      <header class="region-hero"><div class="guide-art">${guideArt(r, 'bobbing')}</div>
        <div><h1 data-focus>${r.name}</h1><p>${r.blurb}</p><p class="prog">${regionDoneCount(id)} of ${levels.length} levels finished</p></div></header>
      ${id === 'lake' ? `<div class="ice-strip" aria-hidden="true"><span class="slide-pen">${Art.animal('penguin')}</span><span class="slide-pen slow">${Art.animal('seal')}</span></div>` : ''}
      <ol class="level-path">${items}</ol></div>`,
    after(el) {
      $$('.level-node.locked', el).forEach(b => b.addEventListener('click', () => { b.classList.remove('wobble'); void b.offsetWidth; b.classList.add('wobble'); toast(levelLockText(getLevel(b.dataset.id))); }));
      const d = Rewards.discover(id);
      if (d) {
        if (d.amount) toast(`You found ${r.name}! +${d.amount} ❄`);
        if (d.stickers.length) revealQueue(d.stickers.map(x => ({ type: 'sticker', id: x })));
      }
    },
  };
};

/* ---------- LEVEL INTRO ---------- */
Screens.intro = () => {
  const s = Session.cur; if (!s) return false;
  const l = s.level, r = getRegion(l.region), rec = levelRec(l.id);
  const skills = unique(l.rounds.map(a => a === '*' ? 'mixed' : ACTIVITY_SKILL[a])).map(k => k === 'mixed' ? 'A mix of everything' : SKILLS[k].name);
  return {
    attrs: ` data-region="${r.id}"`,
    html: `<div class="intro"><div class="intro-art">${guideArt(r, 'bobbing')}</div>
      <div class="intro-card"><h1 data-focus>${esc(l.title)}</h1><p class="lead">${esc(l.blurb)}</p>
      <p class="meta">${l.rounds.length} little questions · ${esc(skills.join(', '))}</p>
      ${rec.done ? `<p class="replay-note">You've finished this one before! Playing again is great practice. It won't give new snowflakes, but you can still earn stars.</p>` : ''}
      <button class="btn go huge" data-act="begin">Let's go!</button></div></div>`,
  };
};

/* ---------- PLAY ---------- */
Screens.play = () => {
  const s = Session.cur; if (!s) return false;
  const r = getRegion(s.level.region);
  return {
    attrs: ` data-region="${r.id}"`,
    html: `<div class="play">
      <div class="pdots" role="img" aria-label="Progress through the level">${s.level.rounds.map(() => '<i class="pdot"></i>').join('')}</div>
      <span id="round-label" class="sr-only" aria-live="polite"></span>
      <div class="coach"><div id="buddy" class="buddy" aria-hidden="true">${guideArt(r)}</div>
        <div class="bubble"><p id="instr" data-focus></p><button class="listen" data-act="listen" aria-label="Hear the question again">🔊</button></div></div>
      <div id="area" class="area"></div>
      <div id="feedback" class="feedback" role="status" aria-live="polite"></div>
      <div class="next-row"><button id="next" class="btn go big" data-act="next" hidden>Next ➜</button></div></div>`,
  };
};

/* ---------- RESULTS ---------- */
Screens.results = res => {
  const s = Session.cur; if (!s) return false;
  const l = s.level, r = getRegion(l.region), n = s.roundResults.length, ft = s.roundResults.filter(x => x.ok).length;
  const msg = res.stars === 3 ? 'Wow! You were super smooth!' : res.stars === 2 ? 'Great job! You are getting it!' : 'You did it! Practice makes learning grow!';
  const nxt = nextLevelAfter(l);
  const lines = res.lines.map(x => `<li><span>${esc(x.label)}</span><b>+${x.amount} ❄</b></li>`).join('');
  return {
    attrs: ` data-region="${r.id}"`,
    html: `<div class="results"><div class="results-art">${guideArt(r, 'cheering')}</div>
      <h1 data-focus>${msg}</h1>
      <div class="big-stars">${starsHtml(res.stars)}</div>
      <p class="lead">You tried ${n} ${plural(n, 'question')} and got ${ft} on the very first try.</p>
      <div class="payout">${res.total > 0 ? `<ul>${lines}</ul><p class="total">You earned <b>${res.total} ❄</b></p>`
        : `<p>Practice time! Playing again doesn't give new snowflakes, but practice helps you grow.</p>`}</div>
      ${res.regionDone ? `<p class="banner">⭐ You finished ${res.regionDone.name}! ⭐</p>` : ''}
      ${res.newRegions.length ? `<p class="banner">🗺️ A new place opened: ${res.newRegions.map(i => getRegion(i).name).join(', ')}!</p>` : ''}
      ${res.newItems.length ? `<p class="banner">🎁 A new item is waiting in the <button class="linkish" data-go="workshop">Snowman Workshop</button>!</p>` : ''}
      <div class="result-actions">
        ${nxt ? `<button class="btn go big" data-act="level" data-id="${nxt.id}">Next level ➜</button>` : `<button class="btn go big" data-go="map">🗺️ Back to the map</button>`}
        <button class="btn mint" data-act="level" data-id="${l.id}">↻ Play again</button>
        ${nxt ? `<button class="btn ghost" data-go="map">🗺️ Map</button>` : `<button class="btn ghost" data-go="region" data-id="${r.id}">← ${r.name}</button>`}
      </div></div>`,
    after(el) {
      burst($('.big-stars', el), 26, ['⭐', '❄', '✦', '✧']);
      const q = res.newStickers.map(id => ({ type: 'sticker', id })).concat(res.newItems.map(g => ({ type: 'item', cat: g.cat, id: g.id })));
      setTimeout(() => revealQueue(q), 900);
    },
  };
};

/* ---------- STICKER COLLECTION ---------- */
Screens.album = (p = {}) => {
  const tab = p.tab || 'stickers', owned = Object.keys(S.stickers).length, fresh = Object.assign({}, S.newStickers);
  S.newStickers = {}; save();
  const tile = st => {
    const has = !!S.stickers[st.id];
    return has
      ? `<button class="sticker has rarity-${st.rarity}" data-act="sticker" data-id="${st.id}" aria-label="${st.name}, ${RARITY[st.rarity]}">${fresh[st.id] ? '<span class="new">NEW</span>' : ''}<span class="sticker-art">${st.art()}</span><span class="sname">${st.name}</span></button>`
      : `<div class="sticker locked" role="group" aria-label="Locked sticker. ${esc(describeCond(st.cond))}"><span class="sticker-art silhouette">${st.art()}<span class="qmark" aria-hidden="true">?</span></span><span class="sname">???</span><span class="how">${esc(describeCond(st.cond))}</span></div>`;
  };
  const sections = STICKER_CATS.map(c => {
    const list = STICKERS.filter(s => s.cat === c.id), n = list.filter(s => S.stickers[s.id]).length;
    return `<section class="sticker-cat"><h2>${c.icon} ${c.name} <small>${n}/${list.length}</small></h2><div class="sticker-grid">${list.map(tile).join('')}</div></section>`;
  }).join('');
  const body = tab === 'stickers' ? sections : scrapbookHtml();
  return {
    html: `<div class="album"><header class="page-head"><h1 data-focus>Sticker Collection</h1>
      <div class="meter" role="img" aria-label="${owned} of ${STICKERS.length} stickers collected"><span style="width:${Math.round(owned / STICKERS.length * 100)}%"></span></div>
      <p>${owned} of ${STICKERS.length} stickers collected</p></header>
      <div class="tabs" role="tablist"><button role="tab" aria-selected="${tab === 'stickers'}" data-go="album" data-tab="stickers">Stickers</button><button role="tab" aria-selected="${tab === 'scrapbook'}" data-go="album" data-tab="scrapbook">Scrapbook</button></div>
      ${body}</div>`,
    after(el) { if (tab === 'scrapbook') initScrapbook(el); },
  };
};

function showStickerDetail(id) {
  const st = STICKERS.find(s => s.id === id);
  openModal({
    title: st.name, cls: 'reveal',
    html: `<div class="reveal-art sticker-art rarity-${st.rarity}">${st.art()}</div><p class="reveal-sub">${STICKER_CATS.find(c => c.id === st.cat).name} · ${RARITY[st.rarity]}</p><p>${esc(describeCond(st.cond))}</p>`,
    actions: [{ label: '📌 Add to scrapbook', cls: 'lav', onClick: () => { addToScrapbook(id); toast(`${st.name} is on your scrapbook page!`); } }, { label: 'Close', cls: 'ghost' }],
  });
}

/* ---------- SCRAPBOOK ---------- */
function scrapbookHtml() {
  const owned = STICKERS.filter(s => S.stickers[s.id]);
  return `<div class="scrapbook"><p class="hint">Tap a sticker below to add it. Drag it to move, or tap it and then tap where it should go.</p>
    <div class="scrap-page" id="scrap-page" aria-label="Scrapbook page"></div>
    <div class="scrap-tools"><button class="btn small coral" id="scrap-remove" disabled>🗑️ Remove sticker</button><button class="btn small ghost" id="scrap-clear" ${S.scrapbook.length ? '' : 'disabled'}>Clear page</button></div>
    <div class="scrap-tray" role="group" aria-label="Your stickers">${owned.map(st => `<button class="tray-item" data-id="${st.id}" aria-label="Add ${st.name} to the page">${st.art()}</button>`).join('')}</div></div>`;
}
function addToScrapbook(id) {
  if (S.scrapbook.length >= 40) { toast('The page is full! Remove a sticker first.'); return; }
  S.scrapbook.push({ id, x: 25 + rand(50), y: 25 + rand(50) }); save();
}
function initScrapbook(root) {
  const page = $('#scrap-page', root), rm = $('#scrap-remove', root), clr = $('#scrap-clear', root);
  let sel = -1;
  const draw = () => {
    page.innerHTML = S.scrapbook.map((p, i) => { const st = STICKERS.find(s => s.id === p.id); return `<button class="scrap-item ${i === sel ? 'selected' : ''}" data-i="${i}" style="left:${p.x}%;top:${p.y}%" aria-label="${st.name} on the page. Use arrow keys to move.">${st.art()}</button>`; }).join('');
    rm.disabled = sel < 0; clr.disabled = !S.scrapbook.length;
    $$('.scrap-item', page).forEach(b => {
      const i = +b.dataset.i; let drag = null, moved = false;
      b.addEventListener('pointerdown', e => { drag = { id: e.pointerId }; moved = false; try { b.setPointerCapture(e.pointerId); } catch (x) { /* ok */ } });
      b.addEventListener('pointermove', e => {
        if (!drag) return; const r = page.getBoundingClientRect();
        const x = clamp((e.clientX - r.left) / r.width * 100, 4, 96), y = clamp((e.clientY - r.top) / r.height * 100, 4, 96);
        if (Math.abs(x - S.scrapbook[i].x) + Math.abs(y - S.scrapbook[i].y) > 0.6) moved = true;
        if (moved) { S.scrapbook[i].x = x; S.scrapbook[i].y = y; b.style.left = x + '%'; b.style.top = y + '%'; }
      });
      b.addEventListener('pointerup', () => { drag = null; if (moved) { save(); b.dataset.moved = '1'; setTimeout(() => delete b.dataset.moved, 60); } });
      b.addEventListener('click', e => { e.stopPropagation(); if (b.dataset.moved) return; sel = sel === i ? -1 : i; draw(); const nb = $(`.scrap-item[data-i="${i}"]`, page); if (nb && sel === i) nb.focus(); });
      b.addEventListener('keydown', e => {
        const d = { ArrowLeft: [-3, 0], ArrowRight: [3, 0], ArrowUp: [0, -3], ArrowDown: [0, 3] }[e.key];
        if (d) { e.preventDefault(); S.scrapbook[i].x = clamp(S.scrapbook[i].x + d[0], 4, 96); S.scrapbook[i].y = clamp(S.scrapbook[i].y + d[1], 4, 96); save(); b.style.left = S.scrapbook[i].x + '%'; b.style.top = S.scrapbook[i].y + '%'; }
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); S.scrapbook.splice(i, 1); sel = -1; save(); draw(); }
      });
    });
  };
  page.addEventListener('click', e => {      // tap-to-move alternative to dragging
    if (sel < 0 || e.target !== page) return;
    const r = page.getBoundingClientRect(); S.scrapbook[sel].x = clamp((e.clientX - r.left) / r.width * 100, 4, 96); S.scrapbook[sel].y = clamp((e.clientY - r.top) / r.height * 100, 4, 96); save(); draw();
  });
  $$('.tray-item', root).forEach(b => b.addEventListener('click', () => { if (S.scrapbook.length >= 40) { toast('The page is full! Remove a sticker first.'); return; } addToScrapbook(b.dataset.id); sel = S.scrapbook.length - 1; Sound.play('pop'); draw(); }));
  rm.addEventListener('click', () => { if (sel >= 0) { S.scrapbook.splice(sel, 1); sel = -1; save(); draw(); } });
  clr.addEventListener('click', () => openModal({ title: 'Clear the page?', html: '<p>The stickers go back to your collection. You will not lose any!</p>', actions: [{ label: 'Yes, clear it', cls: 'coral', onClick: () => { S.scrapbook = []; sel = -1; save(); draw(); } }, { label: 'Keep it', cls: 'ghost' }] }));
  draw();
}

/* ---------- SNOWMAN WORKSHOP ---------- */
const giftHint = (cat, id) => { const r = REGIONS.find(r => r.gift && r.gift.cat === cat && r.gift.id === id); return r ? `Free when you finish ${r.name}` : ''; };
Screens.workshop = (p = {}) => {
  const cat = p.cat || 'hat', look = currentLook(), cinfo = WORKSHOP_CATS.find(c => c.id === cat);
  const tabs = WORKSHOP_CATS.map(c => `<button role="tab" class="cat-tab" aria-selected="${c.id === cat}" data-go="workshop" data-cat="${c.id}"><span aria-hidden="true">${c.icon}</span>${c.name}</button>`).join('');
  const items = WORKSHOP_ITEMS[cat].map(it => {
    const owned = isItemOwned(cat, it.id), eq = look[cat] === it.id, can = S.snowflakes >= it.cost;
    const mini = Art.snowman(Object.assign({}, look, { [cat]: it.id }), { view: cinfo.view });
    const note = !owned ? (giftHint(cat, it.id) || '') : '';
    return `<button class="item-tile ${eq ? 'equipped' : ''} ${owned ? '' : 'locked'} ${!owned && !can ? 'poor' : ''}" data-act="item" data-cat="${cat}" data-id="${it.id}" aria-pressed="${eq}" aria-label="${it.name}${eq ? ', wearing' : owned ? '' : ', costs ' + it.cost + ' snowflakes'}">
      <span class="mini-art">${mini}</span><span class="iname">${it.name}</span>
      <span class="istate">${eq ? '✓ Wearing' : owned ? 'Tap to wear' : `❄ ${it.cost}`}</span>${note ? `<span class="note">${note}</span>` : ''}</button>`;
  }).join('');
  return {
    html: `<div class="workshop"><h1 class="sr-only" data-focus>Snowman Workshop</h1>
      <div class="preview"><div class="preview-art">${Art.snowman(look, { cls: 'mascot bounce-on-change', label: 'Your snowman' })}</div>
        <div class="preview-tools"><button class="btn small mint" data-act="surprise">🎲 Surprise me!</button></div></div>
      <div class="picker"><div class="cat-tabs" role="tablist" aria-label="What to change">${tabs}</div>
        <div class="item-grid">${items}</div></div></div>`,
  };
};
function equipItem(cat, id) {
  S.workshop.equipped[cat] = id; save(); Sound.play('pop'); go('workshop', { cat });
  const pv = $('.preview-art .mascot'); if (pv) { pv.classList.add('hop'); burst($('.preview-art'), 8); }
}
function onItemTap(cat, id) {
  const it = findItem(cat, id);
  if (isItemOwned(cat, id)) { equipItem(cat, id); return; }
  if (S.snowflakes < it.cost) { toast(`You need ${it.cost - S.snowflakes} more ❄ for this. Keep exploring to earn more!`); return; }
  openModal({
    title: `Unlock ${it.name}?`, html: `<div class="reveal-art">${Art.snowman(Object.assign(currentLook(), { [cat]: id }), { view: WORKSHOP_CATS.find(c => c.id === cat).view })}</div><p>It costs <b>${it.cost} ❄</b>. You have ${S.snowflakes} ❄.</p>`,
    actions: [{ label: `Yes! (${it.cost} ❄)`, cls: 'go', onClick: () => { if (Rewards.buy(cat, id)) { Sound.play('sparkle'); equipItem(cat, id); } } }, { label: 'Not now', cls: 'ghost' }],
  });
}

/* ---------- SETTINGS ---------- */
function openSettings() {
  const row = (key, label, desc) => `<button class="switch" role="switch" aria-checked="${key === 'reducedMotion' ? prefersReduced() : S.settings[key]}" data-key="${key}"><span><b>${label}</b><small>${desc}</small></span><i class="knob"></i></button>`;
  const m = openModal({
    title: 'Settings',
    html: `<div class="switches">${row('sfx', 'Sound effects', 'Little chimes and pops')}${row('music', 'Music', 'Soft winter lullaby')}${row('voice', 'Read questions aloud', Voice.supported ? 'A friendly voice reads each question' : 'Not available in this browser')}${row('reducedMotion', 'Calm mode', 'Less movement and no falling snow')}${row('muted', 'Mute everything', 'Turns off all sound at once')}</div>`,
    actions: [{ label: 'Done', cls: 'go' }],
  });
  $$('.switch', m.el).forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.key, cur = k === 'reducedMotion' ? prefersReduced() : S.settings[k];
    S.settings[k] = !cur; b.setAttribute('aria-checked', String(!cur)); save(); applySettings(); if (k === 'sfx' || k === 'muted') Sound.play('pop');
  }));
}
function applySettings() { applyMotionSetting(); Sound.refresh(); updateHud(); }

/* ===================================================================
   13. PARENT CORNER  —  adult check, then the learning dashboard
   =================================================================== */
const NUM_WORDS = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];

/** A light "grown-ups only" check. It keeps little fingers out; it is NOT real security. */
Screens.gate = () => {
  const a = 6 + rand(7), b = 5 + rand(5);
  return {
    html: `<div class="gate"><div class="gate-card"><h1 data-focus>Grown-ups only</h1>
      <p>Please answer this question to open the Parent Corner.</p>
      <label for="gate-input" class="gate-q">What is <b>${NUM_WORDS[a]}</b> plus <b>${NUM_WORDS[b]}</b>?</label>
      <input id="gate-input" class="gate-input" type="text" inputmode="numeric" autocomplete="off" aria-describedby="gate-msg" placeholder="Type the number">
      <p id="gate-msg" class="gate-msg" role="status" aria-live="polite"></p>
      <div class="gate-actions"><button class="btn go" id="gate-ok">Open Parent Corner</button><button class="btn ghost" data-go="menu">← Back to the game</button></div>
      <p class="fine">This is a simple check to keep young children out. It is not a security lock.</p></div></div>`,
    after(el) {
      const input = $('#gate-input', el), msg = $('#gate-msg', el);
      const submit = () => {
        if (parseInt(input.value.trim(), 10) === a + b) { go('parent'); return; }
        msg.textContent = 'Not quite. Try again with a new question.'; input.classList.add('shake');
        setTimeout(() => go('gate'), 900);
      };
      $('#gate-ok', el).addEventListener('click', submit);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    },
  };
};

const STATUS = {
  none:        { label: 'Not enough data yet',        icon: '○' },
  practice:    { label: 'Needs more practice',        icon: '◆' },
  progress:    { label: 'Making progress',            icon: '▲' },
  comfortable: { label: 'Appears comfortable',        icon: '●' },
};
function statusText(a, name, what) {
  switch (a.status) {
    case 'none':        return `There are not enough answers yet to say anything useful. Insights appear after about 8 questions in this skill (so far: ${a.n}).`;
    case 'practice':    return `Recent questions about ${what} have been tricky. That is completely normal at this age. A little play away from the screen can help, and the game will keep offering gentle questions.`;
    case 'progress':    return a.improving ? `Recent answers are going better than earlier ones. That is a nice sign that practice is paying off.` : `Your child is working steadily on ${what}. Keep exploring and it will keep growing.`;
    case 'comfortable': return `Recent answers suggest your child feels comfortable with ${what}. The game will offer slightly harder questions over time.`;
  }
}

function lastDays(n) {
  return Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (n - 1 - i)); return d; });
}

function skillBlock(k) {
  const sk = SKILLS[k], a = Learning.assess(k), st = STATUS[a.status], pct = a.n ? Math.round(a.c / a.n * 100) : 0;
  const dots = a.recent.length ? `<span class="rdots" role="img" aria-label="Last ${a.recent.length} answers: ${a.recent.filter(Boolean).length} on the first try">${a.recent.map(x => `<i class="${x ? 'y' : 'n'}"></i>`).join('')}</span>` : '<span class="muted">No answers yet</span>';
  return `<li class="skill ${a.status}">
    <div class="skill-head"><span class="skill-icon" aria-hidden="true">${sk.icon}</span><h3>${sk.name}</h3><span class="status ${a.status}"><span aria-hidden="true">${st.icon}</span> ${st.label}</span></div>
    <div class="bar" role="img" aria-label="${a.c} of ${a.n} answered correctly on the first try"><span style="width:${pct}%"></span></div>
    <p class="nums"><b>${a.n}</b> ${plural(a.n, 'question')} tried · <b>${a.c}</b> right on the first try${a.n ? ` (${pct}%)` : ''}</p>
    <p class="recent">Recent: ${dots}</p>
    ${a.improving ? '<p class="tag">📈 Showing steady improvement</p>' : ''}
    <p>${statusText(a, sk.name, sk.what)}</p>
    ${a.weak.length ? `<p class="weak"><b>May enjoy a little extra practice with:</b> ${a.weak.map(w => `${esc(w.name)} (${w.c} of ${w.a} right)`).join(', ')}.</p>` : ''}
    <details ${a.status === 'practice' ? 'open' : ''}><summary>Offline play ideas</summary><ul>${sk.ideas.map(i => `<li>${i}</li>`).join('')}</ul></details></li>`;
}

Screens.parent = () => {
  const total = LEVELS.filter(l => !l.bonus).length, done = levelsDone(S), empty = S.stats.questions === 0;
  const week = lastDays(7), played = week.filter(d => S.playDays.includes(todayStr(d))).length;
  const perDay = week.map(d => { const key = todayStr(d); return S.sessions.filter(s => todayStr(new Date(s.t)) === key).reduce((t, s) => t + s.q, 0); });
  const maxQ = Math.max(1, ...perDay);
  const unlocks = S.recentUnlocks.slice().reverse().slice(0, 6).map(u => {
    if (u.kind === 'sticker') { const st = STICKERS.find(x => x.id === u.id); return st ? `<li>🌟 Sticker: <b>${st.name}</b> <small>${fmtDate(u.t)}</small></li>` : ''; }
    const [c, i] = u.id.split(':'), it = findItem(c, i); return it ? `<li>🎁 Snowman item: <b>${it.name}</b> <small>${fmtDate(u.t)}</small></li>` : '';
  }).join('');
  const hist = S.sessions.slice().reverse().slice(0, 10).map(s => `<li><div><b>${esc(s.title)}</b> <span class="muted">${s.done ? 'Finished' : 'Stopped early'}</span></div>
      <div class="muted">${fmtDate(s.t)} · ${s.ft} of ${s.q} on the first try · ${fmtTime(s.ms)}</div>
      <div class="muted">Practiced: ${s.skills.map(k => SKILLS[k].name).join(', ') || 'n/a'}</div></li>`).join('');
  return {
    html: `<div class="parent"><header class="parent-head"><div><h1 data-focus>Parent Corner</h1><p>A friendly look at how your child is learning and playing.</p></div>
      <button class="btn go" data-go="menu">← Back to the game</button></header>
      ${!Store.available ? '<p class="notice warn">This browser is not letting the game save progress (private browsing can cause this). The game still works, but progress will be lost when the page closes.</p>' : ''}
      ${S.meta.recovered ? '<p class="notice">Saved data could not be read, so a fresh game was started. A copy of the old data was kept in this browser.</p>' : ''}
      ${empty ? '<p class="notice">Nothing has been recorded yet. Once your child plays a level, their progress will appear here.</p>' : ''}

      <section class="p-section"><h2>Overview</h2>
        <div class="stat-row">
          <div class="stat"><b>${done}<small> / ${total}</small></b><span>levels finished</span></div>
          <div class="stat"><b>${S.stats.questions}</b><span>questions tried</span></div>
          <div class="stat"><b>${S.stats.sessions}</b><span>learning ${plural(S.stats.sessions, 'session')}</span></div>
          <div class="stat"><b>${S.stats.totalMs ? fmtTime(S.stats.totalMs) : '0 min'}</b><span>time answering questions</span></div>
          <div class="stat"><b>${played}<small> / 7</small></b><span>days played this week</span></div>
        </div>
        <div class="week" role="img" aria-label="Questions tried each day this week: ${week.map((d, i) => d.toLocaleDateString(undefined, { weekday: 'long' }) + ' ' + perDay[i]).join(', ')}">
          ${week.map((d, i) => `<div class="day"><span class="col"><i style="height:${Math.round(perDay[i] / maxQ * 100)}%"></i></span><span class="dn">${perDay[i]}</span><span class="dl">${d.toLocaleDateString(undefined, { weekday: 'short' })}</span></div>`).join('')}
        </div>
        <p class="muted">Days played is just a friendly look back. There is no streak to keep up, and missing a day is perfectly fine.</p>
        <h3>Recently unlocked</h3>${unlocks ? `<ul class="plain">${unlocks}</ul>` : '<p class="muted">Nothing yet. Finishing levels unlocks stickers and snowman items.</p>'}
      </section>

      <section class="p-section"><h2>Learning by skill</h2>
        <p class="muted">These are informal indicators based on first-try answers. A single wrong answer means nothing on its own, so a skill is only flagged after several questions.</p>
        <ul class="skill-list">${SKILL_ORDER.map(skillBlock).join('')}</ul></section>

      <section class="p-section"><h2>Recent sessions</h2>${hist ? `<ol class="history">${hist}</ol>` : '<p class="muted">No sessions yet. They will show up here after your child plays.</p>'}</section>

      <section class="p-section"><h2>About these indicators</h2>
        <p>SnowBuddies shows informal learning signals to help you play along. They are not tests, clinical assessments, or a measure of kindergarten readiness. Every child learns at their own pace, and the game never labels a child. If you have concerns about development, a teacher or pediatrician is the right person to ask.</p></section>

      <section class="p-section"><h2>Privacy and saved data</h2>
        <ul class="plain"><li>Progress is saved <b>only in this browser on this device</b>, using local storage.</li>
        <li>No personal information is collected, nothing is sent to a server, and there are no accounts, ads, chat, or links for children.</li>
        <li>Clearing the browser's site data (or using private browsing) can erase saved progress. Browser storage is not encrypted.</li>
        <li>The grown-up check on this page is a simple question to deter young children. It is not strong security.</li></ul></section>

      <section class="p-section danger"><h2>Start over</h2>
        <p>This erases stickers, snowflakes, snowman items, and all learning records on this device.</p>
        <button class="btn coral" id="reset-btn">Reset all progress…</button></section>

      <div class="parent-foot"><button class="btn go" data-go="menu">← Back to the game</button></div></div>`,
    after(el) { $('#reset-btn', el).addEventListener('click', openResetDialog); },
  };
};

function openResetDialog() {
  const m = openModal({
    title: 'Erase all progress?',
    html: `<p>This will permanently remove snowflakes, stickers, workshop items, level progress and learning records from this device. It cannot be undone.</p>
      <label class="check"><input type="checkbox" id="reset-ok"> I understand and want to start over</label>`,
    actions: [{ label: 'Keep my progress', cls: 'go' }, { label: 'Erase everything', cls: 'coral', onClick: () => { if (!$('#reset-ok', m.el).checked) { toast('Please tick the box to confirm.'); return false; } doReset(); } }],
  });
  $('.btn.go', m.el).setAttribute('data-autofocus', '');
}
function doReset() {
  const settings = S.settings;
  Store.wipe(); Session.cur = null; S = defaultState(); S.settings = settings; save(); applySettings();
  toast('All progress was reset. A fresh adventure begins!'); go('welcome');
}

/* ===================================================================
   14. INIT  —  wire up events and start
   =================================================================== */
const ACTIONS = {
  continue() { const l = nextUp(); l ? Session.start(l) : go('map'); },
  region(t) { go('region', { id: t.dataset.id }); },
  level(t) { const l = getLevel(t.dataset.id); if (l) Session.start(l); },
  begin() { Session.begin(); },
  next() { Sound.play('tap'); Session.next(); },
  pause() { Session.pause(); },
  listen() { const r = Session.cur && Session.cur.round; if (r && !Voice.say(r.speak, true)) toast(S.settings.muted ? 'Sound is muted. Tap the speaker at the top to turn it on.' : 'Reading aloud is not available here. You can still play!'); },
  'toggle-sfx': t => toggleSetting('sfx', t), 'toggle-music': t => toggleSetting('music', t), 'toggle-voice': t => toggleSetting('voice', t),
  sticker(t) { showStickerDetail(t.dataset.id); },
  item(t) { onItemTap(t.dataset.cat, t.dataset.id); },
  surprise() { WORKSHOP_CATS.forEach(c => { const owned = WORKSHOP_ITEMS[c.id].filter(i => isItemOwned(c.id, i.id)); S.workshop.equipped[c.id] = pick(owned).id; }); save(); Sound.play('sparkle'); go('workshop', { cat: ($('.cat-tab[aria-selected="true"]') || {}).dataset ? $('.cat-tab[aria-selected="true"]').dataset.cat : 'hat' }); burst($('.preview-art'), 12); },
};
function toggleSetting(k, btn) { S.settings[k] = !S.settings[k]; if (btn) btn.setAttribute('aria-pressed', String(S.settings[k])); save(); applySettings(); Sound.play('pop'); }

function init() {
  Store.init(); S = Store.load(); save();
  applyMotionSetting();
  if (window.matchMedia) { const mq = window.matchMedia('(prefers-reduced-motion: reduce)'); (mq.addEventListener || mq.addListener).call(mq, 'change', () => applyMotionSetting()); }
  Snow.init();

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-go],[data-act]'); if (!t || t.disabled) return;
    if (t.dataset.go) { Sound.play('tap'); go(t.dataset.go, { id: t.dataset.id, tab: t.dataset.tab, cat: t.dataset.cat }); return; }
    const fn = ACTIONS[t.dataset.act]; if (fn) { if (!['next', 'toggle-sfx', 'toggle-music', 'toggle-voice'].includes(t.dataset.act)) Sound.play('tap'); fn(t); }
  });
  $('#btn-settings').addEventListener('click', openSettings);
  $('#btn-mute').addEventListener('click', () => { S.settings.muted = !S.settings.muted; save(); applySettings(); if (!S.settings.muted) Sound.play('pop'); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { Sound.stopMusic(); Voice.stop(); } else Sound.refresh(); });
  // The first tap anywhere unlocks audio in browsers that require a gesture.
  document.addEventListener('pointerdown', () => { if (S.settings.music && !Sound.musicTimer) Sound.refresh(); }, { once: true });

  go('welcome');
}

// Hooks used by the automated checks in the README. Harmless in normal play.
window.SnowBuddies = { get state() { return S; }, go, Session, ACT, LEVELS, STICKERS, REGIONS, Learning, Rewards, sanitize, Store,
  solve() { const r = Session.cur && Session.cur.round; if (r) r.solve($('#area')); } };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
