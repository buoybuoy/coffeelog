/* Flavor taxonomy for the Tasting Profiles tab.

   Groups every tasting note in the log into the SCA Coffee Taster's Flavor
   Wheel families. Matching takes the LONGEST keyword found in a note, so
   "milk chocolate" lands in Cocoa (not Sweet) and "blueberry pie" in Berry
   (not Overall Sweet). Keywords include the misspellings that are actually
   in the log ("bluberry", "pomagranate", "cirtus fruits").

   RING_ORDER is the clockwise order the wheel draws, chosen so that no two
   adjacent wedges are confusable under simulated colour-vision deficiency
   (validated with the data-viz palette checker: worst adjacent pair
   dE 9.8 deutan / 20.6 normal on the #fffdfa surface).

   BODY_GROUP and OTHER_GROUP are NOT flavours, so they stay off the wheel
   and are reported separately in neutral ink. */

const FLAVOR_RING_ORDER = ["Fruity", "Nutty / Cocoa", "Floral", "Sweet", "Spices", "Green / Vegetative", "Sour / Fermented", "Roasted"];
const FLAVOR_COLORS = {
  "Fruity": "#BB3334",
  "Nutty / Cocoa": "#CC9129",
  "Floral": "#C75C93",
  "Sweet": "#C6A034",
  "Spices": "#94332B",
  "Green / Vegetative": "#278D27",
  "Sour / Fermented": "#ADBA45",
  "Roasted": "#933D01"
};
// short forms for the ring only — the legend, tooltip and bars use full names
const FLAVOR_SHORT = {
  "Nutty / Cocoa": "Nutty/Cocoa",
  "Green / Vegetative": "Green",
  "Sour / Fermented": "Sour/Ferm.",
  "Alcohol / Fermented": "Alcohol"
};
const BODY_GROUP = 'Body & Balance';
const OTHER_GROUP = 'Other';

// [level-1, level-2, keywords] — order only breaks ties between equal-length hits
const FLAVOR_TAXONOMY = [
  ["Floral", "Floral",
    "floral", "flora", "flower", "florals", "blossom", "jasmine", "jasmin", "rose", "roses",
    "rosehip", "rose hip", "lavender", "hibiscus", "honeysuckle", "chamomile", "elderflower",
    "lilac", "gardenia", "osmanthus", "chrysanthemum", "peony", "violet", "bee pollen",
    "potpourri"
  ],
  ["Floral", "Tea",
    "black tea", "green tea", "herbal tea", "earl grey", "earl gray", "oolong", "rooibos",
    "milk tea", "london fog", "white peony", "jasmine tea", "raspberry tea", "peach tea",
    "hibiscus tea", "cranberry oolong", "tea-like", "tea", "arnold palmer", "chai"
  ],
  ["Fruity", "Berry",
    "strawberry", "strawberries", "raspberry", "raspberries", "blueberry", "blueberries",
    "bluberry", "blackberry", "blackberries", "blackbery", "cranberry", "cranberries",
    "gooseberry", "elderberry", "boysenberry", "mulberry", "framboise", "currant", "currants",
    "current", "blackcurrant", "blackcurrants", "berry", "berries", "berris", "berry buffett"
  ],
  ["Fruity", "Dried Fruit",
    "raisin", "raisins", "sultana", "prune", "date", "dates", "dried fig", "ripe figs", "fig",
    "figs", "dried fruit", "fruit leather", "dried apricot", "dried mango", "dried apple",
    "dried cherries", "dried berries", "golden raisin", "rum raisin"
  ],
  ["Fruity", "Citrus",
    "lemon", "lemons", "lemonade", "limeade", "lime", "orange", "oranges", "grapefruit",
    "tangerine", "mandarin", "mandarine", "bergamot", "citrus", "cirtus", "pomelo", "kumquat",
    "yuzu", "clementine", "marmalade", "key lime", "citrus oil", "lemon peel", "lemon zest",
    "blood orange", "navel orange", "meyer lemon", "candied lemon", "candied orange",
    "lemon curd", "lemon drop", "lemon candy", "citric"
  ],
  ["Fruity", "Other Fruit",
    "peach", "peaches", "apricot", "nectarine", "nectarin", "plum", "cherry", "cherries",
    "apple", "pear", "grape", "grapes", "melon", "watermelon", "honeydew", "casaba", "lychee",
    "rambutan", "mango", "papaya", "guava", "pineapple", "banana", "kiwi", "jackfruit",
    "passionfruit", "passion fruit", "starfruit", "star fruit", "dragonfruit", "pomegranate",
    "pomagranate", "persimmon", "stone fruit", "stone fruits", "pluot", "tropical", "muscat",
    "moscato", "concord", "pink lady", "fuji", "nashi", "plantain", "red fruit", "fruit punch",
    "fruity", "fruit", "quince", "cider", "sparkling pear", "donut peach", "rhubarb", "tamarind"
  ],
  ["Sour / Fermented", "Sour",
    "sour", "tart", "malic", "acidity", "sparkling", "tangy", "citric acid"
  ],
  ["Sour / Fermented", "Alcohol / Fermented",
    "wine", "winey", "port", "brandy", "rum", "pinot noir", "liqueur", "funky", "whiskey",
    "hot toddy", "fermented", "yogurt", "miso", "boozy", "champagne", "prosecco", "cognac"
  ],
  ["Green / Vegetative", "Green / Vegetative",
    "herbal", "lemongrass", "mint", "thyme", "grassy", "vegetal", "olive", "peapod", "beany",
    "chicory", "hops", "green plum", "fresh", "herbaceous", "basil", "sage"
  ],
  ["Roasted", "Cereal",
    "malt", "graham", "biscotti", "shortbread", "stroopwafel", "cookie", "toast", "toasted",
    "bread", "brioche", "cereal", "granola", "teddy graham", "teddy grahams", "oat", "waffle",
    "pastry", "biscuit"
  ],
  ["Roasted", "Roasted",
    "roast", "roasted", "roastey", "smoke", "smoky", "coal", "burnt", "ash", "tobacco", "cedar",
    "charred"
  ],
  ["Spices", "Brown Spice",
    "cinnamon", "clove", "nutmeg", "anise", "cardamom", "ginger", "allspice", "spice", "spices",
    "sipce", "candied ginger", "licorice", "vanilla bean"
  ],
  ["Spices", "Pepper",
    "pepper", "peppercorn", "black pepper", "pungent"
  ],
  ["Nutty / Cocoa", "Nutty",
    "almond", "hazelnut", "hazelnuts", "walnut", "walnuts", "pecan", "peanut", "cashew",
    "macadamia", "chestnut", "nutty", "nuts", "marzipan", "praline", "nougat", "pistachio",
    "almond paste", "coconut"
  ],
  ["Nutty / Cocoa", "Cocoa",
    "chocolate", "cocoa", "coca nibs", "cacao", "brownie", "fudge", "mocha", "truffle",
    "cocoa nib", "cocoa nibs", "kit kat", "reese", "rocky road", "devil\u2019s food",
    "devils food", "devil's food", "chocolatey"
  ],
  ["Sweet", "Brown Sugar",
    "brown sugar", "caramel", "caramelly", "caramelized", "toffee", "molasses", "butterscotch",
    "maple", "honey", "honeycomb", "turbinado", "piloncillo", "muscovado", "raw sugar",
    "cane sugar", "sugarcane", "sugar cane", "coconut sugar", "agave", "syrup", "dulce de leche",
    "bruleed", "flan", "salted caramel", "caramel apple", "creamed honey", "clover honey",
    "floral honey", "dark honey", "raw honey", "osmanthus honey", "jasmine honey", "bit-o-honey",
    "simple syrup", "maple syrup", "sponge toffee", "buttery toffee"
  ],
  ["Sweet", "Vanilla",
    "vanilla", "custard", "vanillin", "vanilla cream", "vanilla ice cream", "vanilla yogurt"
  ],
  ["Sweet", "Overall Sweet",
    "sweet", "sweetness", "bittersweet", "sugar", "jam", "jammy", "jelly", "compote", "cordial",
    "cordials", "pie", "cake", "cobbler", "muffin", "donut", "shortcake", "cheesecake",
    "cheese cake", "marshmallow", "cotton candy", "bubblegum", "candy", "candied", "sugars",
    "confection", "cream soda", "soda", "cola", "juice", "juicy", "nectar", "molasses cookie"
  ],
  ["Body & Balance", "Body & Balance",
    "creamy", "silky", "smooth", "velvet", "velvety", "syrupy", "rich", "balanced",
    "full bodied", "full-bodied", "medium body", "body", "thick", "rounded", "round", "clean",
    "bright", "lively", "complex", "elegant", "mellow", "bold", "layered", "delicious",
    "comforting", "familiar", "nostalgia", "cheer", "versatile", "dry", "intense", "soft",
    "buttery", "milky", "crisp", "sparkling water", "finish", "mouthfeel", "cream",
    "fresh cream", "light", "heavy", "delicate", "structured", "weight"
  ],
];

// keyword -> group, longest first so compounds beat their parts
const FLAVOR_KEYWORDS = (() => {
  const out = [];
  FLAVOR_TAXONOMY.forEach((row, rank) => {
    const [l1, l2] = row;
    for (let i = 2; i < row.length; i++) out.push({ word: row[i], l1, l2, rank });
  });
  return out.sort((a, b) => b.word.length - a.word.length || a.rank - b.rank);
})();

// Split a tasting-notes cell the same way the recommender does, then strip the
// punctuation the log has picked up over the years ("& cranberry", "spice. clean").
function flavorTokens(s) {
  return String(s || '').split(/[,/;•·]| and /i)
    .map(x => x.toLowerCase().replace(/[^a-z0-9&' -]+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(x => x.length > 2);
}

// A note matches on a keyword boundary, so "blackcurrant" isn't caught by "currant"
// unless that exact word is listed. Returns the most specific group that hits.
function classifyFlavor(note) {
  for (const k of FLAVOR_KEYWORDS) {
    const i = note.indexOf(k.word);
    if (i >= 0 && (i === 0 || !/[a-z]/.test(note[i - 1]))) return k;
  }
  return { l1: OTHER_GROUP, l2: OTHER_GROUP, word: '' };
}

// Tally every note in the log into the wheel's two rings.
// Returns { rings, groups, notes, totals } — counts are note *mentions*, and
// `coffees` counts distinct bags so a note repeated in one bag isn't double-sold.
function buildFlavorProfile(list) {
  const groups = new Map();   // l1 -> { count, coffees:Set, subs:Map, notes:Map }
  let mentions = 0, withNotes = 0;
  list.forEach(c => {
    const toks = flavorTokens(c.tasting_notes);
    if (toks.length) withNotes++;
    toks.forEach(t => {
      const { l1, l2 } = classifyFlavor(t);
      if (!groups.has(l1)) groups.set(l1, { count: 0, coffees: new Set(), subs: new Map(), notes: new Map() });
      const g = groups.get(l1);
      g.count++; mentions++;
      g.coffees.add(c.id);
      g.subs.set(l2, (g.subs.get(l2) || 0) + 1);
      g.notes.set(t, (g.notes.get(t) || 0) + 1);
    });
  });
  const rings = FLAVOR_RING_ORDER
    .filter(n => groups.has(n))
    .map(n => ({ name: n, color: FLAVOR_COLORS[n], ...groups.get(n) }));
  const aside = [BODY_GROUP, OTHER_GROUP]
    .filter(n => groups.has(n))
    .map(n => ({ name: n, ...groups.get(n) }));
  return { rings, aside, groups, mentions, withNotes, coffees: list.length };
}

/* ---------- single origin vs blend ----------
   The log records blends four different ways, depending on the year and the
   roaster, so all four count:
     country "Blend"           — how most are filed (52 bags)
     several origins in one    — "Peru, Ethiopia", "Honduras and Tanzania"
     "blend" in the coffee name — "Companion Blend", "Drip Blend"
     "blend" in the farm field  — "Morning Commute", "Tropical Weather"
   No single origin in the log carries "and"/"+"/"&" in its country, so those
   separators are safe to read as "more than one origin". */
const MULTI_ORIGIN = /,|\band\b|&|\+|\//i;
function isBlendCoffee(c) {
  const country = String(c.country || '').trim();
  if (/^blends?$/i.test(country)) return true;
  if (MULTI_ORIGIN.test(country)) return true;
  return /\bblends?\b/i.test(c.coffee || '') || /\bblends?\b/i.test(c.farm || '');
}
// 'all' | 'single' | 'blend'
function filterByOrigin(list, mode) {
  if (mode === 'single') return list.filter(c => !isBlendCoffee(c));
  if (mode === 'blend') return list.filter(c => isBlendCoffee(c));
  return list;
}
