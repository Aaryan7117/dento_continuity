/**
 * Spoken numbers → digits. Speech engines return "nine eight seven", "at ten",
 * "nineteen ninety", "March fourteenth"; the grammar and the date parser want
 * "9 8 7", "at 10", "1990", "March 14". Pure and shared by browser and server.
 */

const ONES: Record<string, number> = {
  zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const ORDINALS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9,
  tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16,
  seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20, thirtieth: 30,
};

const isDigitWord = (w: string) => w in ONES && ONES[w] <= 9;

/**
 * Rewrites number words in place. Runs of single digit words ("nine eight
 * seven") stay as separate digits, which is how phone numbers are read out;
 * compound numbers ("twenty five", "nineteen ninety") are joined.
 */
export function wordsToDigits(text: string): string {
  const tokens = text.split(/(\s+)/); // keep whitespace tokens
  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    const w = t.toLowerCase().replace(/[.,:;!?]+$/, "");
    const trailing = t.slice(w.length);

    if (w in ORDINALS) {
      out.push(String(ORDINALS[w]) + trailing);
      i++;
      continue;
    }
    if (/^[a-z]+$/.test(w) && w.endsWith("th") && w.slice(0, -2) in TENS) {
      out.push(String(TENS[w.slice(0, -2)]) + trailing); // "twentieth" handled above; "fortieth" → 40
      i++;
      continue;
    }

    if (isDigitWord(w)) {
      // Digit run: "nine eight seven" → "9 8 7"
      out.push(String(ONES[w]) + trailing);
      i++;
      continue;
    }

    if (w in ONES || w in TENS) {
      // Compound: "nineteen ninety" (year), "twenty five", "thirty"
      let value = w in TENS ? TENS[w] : ONES[w];
      let j = i + 2; // index of the next word token (i + 1 is whitespace)
      let last = trailing;
      // "twenty five"
      if (w in TENS && j < tokens.length && isDigitWord(tokens[j].toLowerCase().replace(/[.,:;!?]+$/, ""))) {
        const nw = tokens[j].toLowerCase().replace(/[.,:;!?]+$/, "");
        value += ONES[nw];
        last = tokens[j].slice(nw.length);
        j += 2;
      }
      // Year form: "nineteen ninety [five]" → 1990 / 1995
      if (!(w in TENS) && value >= 10 && value <= 20 && j < tokens.length) {
        const nw = tokens[j].toLowerCase().replace(/[.,:;!?]+$/, "");
        if (nw in TENS || nw === "hundred") {
          let rest = nw === "hundred" ? 0 : TENS[nw];
          last = tokens[j].slice(nw.length);
          let k = j + 2;
          if (nw !== "hundred" && k < tokens.length) {
            const dw = tokens[k].toLowerCase().replace(/[.,:;!?]+$/, "");
            if (isDigitWord(dw)) {
              rest += ONES[dw];
              last = tokens[k].slice(dw.length);
              k += 2;
            }
          }
          value = value * 100 + rest;
          j = k;
        }
      }
      out.push(String(value) + last);
      i = j - 1; // resume at the whitespace before the next word
      continue;
    }

    out.push(t);
    i++;
  }
  return out.join("");
}

/** Speech engines add punctuation and the odd full-width mark; commands need neither. */
export function stripSpokenPunctuation(text: string): string {
  return text
    .replace(/[。，、！？]/g, " ")
    .replace(/(\w)[.:;,!?]+(\s|$)/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}
