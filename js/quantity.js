// Shared quantity parsing: recipe measures ("2", "400g", "1 cup") and simple
// pantry quantities ("6 eggs", "2 cups"). Used by both nutrition estimation
// and pantry deduction — best-effort only, never throws on unparseable input.

export const UNIT_TO_GRAMS_GENERIC = {
  g: 1, gram: 1, grams: 1, kg: 1000, kilogram: 1000,
  oz: 28.35, ounce: 28.35, ounces: 28.35,
  lb: 453.6, lbs: 453.6, pound: 453.6, pounds: 453.6,
  ml: 1, milliliter: 1, millilitre: 1, l: 1000, liter: 1000, litre: 1000,
  cup: 240, cups: 240,
  tbsp: 15, tablespoon: 15, tablespoons: 15,
  tsp: 5, teaspoon: 5, teaspoons: 5,
  pinch: 0.4, dash: 0.6,
  clove: 3, cloves: 3,
  slice: 25, slices: 25,
  can: 400, cans: 400, tin: 400, tins: 400,
  stick: 113, sticks: 113,
  handful: 30, bunch: 60,
};

const FRACTION_MAP = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 0.333, "⅔": 0.667, "⅛": 0.125 };

export function normalizeMeasureText(measure) {
  let s = (measure || "").toLowerCase().trim();
  Object.entries(FRACTION_MAP).forEach(([sym, val]) => {
    s = s.split(sym).join(` ${val} `);
  });
  return s.replace(/\s+/g, " ").trim();
}

// Parses a measure/quantity string into { amount: number|null, unit: string|null, unitLabel: string }
export function parseQuantity(measure) {
  const text = normalizeMeasureText(measure);
  if (!text) return { amount: null, unit: null, unitLabel: "" };

  let amount = null;
  let rest = text;

  const numMatch = text.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(\.\d+)?)/);
  if (numMatch) {
    const numStr = numMatch[1];
    if (numStr.includes(" ")) {
      const [whole, frac] = numStr.split(" ");
      const [n, d] = frac.split("/").map(Number);
      amount = Number(whole) + n / d;
    } else if (numStr.includes("/")) {
      const [n, d] = numStr.split("/").map(Number);
      amount = n / d;
    } else {
      amount = Number(numStr);
    }
    rest = text.slice(numMatch[0].length).trim();
  } else if (/^an?\s/.test(text) || text === "a" || text === "an") {
    amount = 1;
    rest = text.replace(/^an?\s?/, "").trim();
  }

  let unit = null;
  const unitKeys = Object.keys(UNIT_TO_GRAMS_GENERIC).sort((a, b) => b.length - a.length);
  for (const key of unitKeys) {
    const re = new RegExp(`\\b${key}\\b`);
    if (re.test(rest)) {
      unit = key;
      break;
    }
  }
  if (!unit && /pinch/.test(text)) unit = "pinch";
  if (!unit && /dash/.test(text)) unit = "dash";
  if (!unit && /handful/.test(text)) unit = "handful";
  if (amount === null && (unit === "pinch" || unit === "dash" || unit === "handful")) amount = 1;

  return { amount, unit, unitLabel: unit || (rest || "") };
}

export function formatQuantity(amount, unitLabel) {
  if (amount === null || amount === undefined) return "";
  const rounded = Math.round(amount * 100) / 100;
  return unitLabel ? `${rounded} ${unitLabel}` : `${rounded}`;
}
