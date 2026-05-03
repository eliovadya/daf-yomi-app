// dafYomi.js
// Primary source: Sefaria public calendars API (no auth needed)
// Fallback:       local calculation from the 15th cycle start date (Jan 5, 2025)

const SEFARIA_CALENDARS_URL = 'https://www.sefaria.org/api/calendars';

/**
 * Returns today's Daf Yomi info.
 * Shape: { display: { en, he }, ref: string, date: string }
 */
export async function getTodaysDaf() {
  try {
    const res = await fetch(SEFARIA_CALENDARS_URL, { timeout: 6000 });
    if (!res.ok) throw new Error(`Sefaria HTTP ${res.status}`);

    const data = await res.json();

    // The calendars API returns an array of calendar_items.
    // We look for the "Daf Yomi" (Babylonian Talmud) entry.
    const item = data.calendar_items?.find(c => c.title?.en === 'Daf Yomi');
    if (!item) throw new Error('Daf Yomi item missing from Sefaria response');

    return {
      display: {
        en: item.displayValue?.en ?? '',
        he: item.displayValue?.he ?? '',
      },
      ref:  item.ref  ?? '',
      date: data.date ?? new Date().toISOString().split('T')[0],
      source: 'sefaria',
    };
  } catch (err) {
    console.warn('[dafYomi] Sefaria API unavailable, using local fallback:', err.message);
    return localFallback();
  }
}

// ---------------------------------------------------------------------------
// Local calculation — tractate list in Daf Yomi order
// Each tractate starts at daf 2, so count = (last daf number - 1)
// Total: 2711 dafim in the standard cycle
// ---------------------------------------------------------------------------
const TRACTATES = [
  // Seder Zeraim
  { en: 'Berakhot',     he: 'ברכות',      count: 63  },
  // Seder Moed
  { en: 'Shabbat',      he: 'שבת',        count: 156 },
  { en: 'Eruvin',       he: 'עירובין',    count: 104 },
  { en: 'Pesachim',     he: 'פסחים',      count: 120 },
  { en: 'Shekalim',     he: 'שקלים',      count: 21  },
  { en: 'Yoma',         he: 'יומא',       count: 87  },
  { en: 'Sukkah',       he: 'סוכה',       count: 55  },
  { en: 'Beitzah',      he: 'ביצה',       count: 39  },
  { en: 'Rosh Hashana', he: 'ראש השנה',   count: 34  },
  { en: 'Taanit',       he: 'תענית',      count: 30  },
  { en: 'Megillah',     he: 'מגילה',      count: 31  },
  { en: 'Moed Katan',   he: 'מועד קטן',   count: 28  },
  { en: 'Chagigah',     he: 'חגיגה',      count: 26  },
  // Seder Nashim
  { en: 'Yevamot',      he: 'יבמות',      count: 121 },
  { en: 'Ketubot',      he: 'כתובות',     count: 111 },
  { en: 'Nedarim',      he: 'נדרים',      count: 90  },
  { en: 'Nazir',        he: 'נזיר',       count: 65  },
  { en: 'Sotah',        he: 'סוטה',       count: 48  },
  { en: 'Gittin',       he: 'גיטין',      count: 89  },
  { en: 'Kiddushin',    he: 'קידושין',    count: 81  },
  // Seder Nezikin
  { en: 'Bava Kamma',   he: 'בבא קמא',    count: 118 },
  { en: 'Bava Metzia',  he: 'בבא מציעא',  count: 118 },
  { en: 'Bava Batra',   he: 'בבא בתרא',   count: 175 },
  { en: 'Sanhedrin',    he: 'סנהדרין',    count: 112 },
  { en: 'Makkot',       he: 'מכות',       count: 23  },
  { en: 'Shevuot',      he: 'שבועות',     count: 48  },
  { en: 'Avodah Zarah', he: 'עבודה זרה',  count: 75  },
  { en: 'Horayot',      he: 'הוריות',     count: 13  },
  // Seder Kodashim
  { en: 'Zevachim',     he: 'זבחים',      count: 119 },
  { en: 'Menachot',     he: 'מנחות',      count: 109 },
  { en: 'Chullin',      he: 'חולין',      count: 141 },
  { en: 'Bechorot',     he: 'בכורות',     count: 60  },
  { en: 'Arachin',      he: 'ערכין',      count: 33  },
  { en: 'Temurah',      he: 'תמורה',      count: 33  },
  { en: 'Keritot',      he: 'כריתות',     count: 27  },
  { en: 'Meilah',       he: 'מעילה',      count: 21  },
  { en: 'Kinnim',       he: 'קינים',      count: 3   },
  { en: 'Tamid',        he: 'תמיד',       count: 9   },
  { en: 'Middot',       he: 'מידות',      count: 4   },
  // Seder Taharot
  { en: 'Niddah',       he: 'נידה',       count: 72  },
];

// Total dafim in cycle (standard Daf Yomi = 2711)
const TOTAL_DAFIM = TRACTATES.reduce((sum, t) => sum + t.count, 0);

function localFallback() {
  // 15th cycle started January 5, 2025
  const CYCLE_START = new Date('2025-01-05T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysSinceStart = Math.floor((today - CYCLE_START) / 86_400_000);
  // Keep index in [0, TOTAL_DAFIM) to handle future cycles gracefully
  const dafIndex = ((daysSinceStart % TOTAL_DAFIM) + TOTAL_DAFIM) % TOTAL_DAFIM;

  let remaining = dafIndex;
  let tractate = TRACTATES[0];

  for (const t of TRACTATES) {
    if (remaining < t.count) {
      tractate = t;
      break;
    }
    remaining -= t.count;
  }

  const dafNum = remaining + 2; // dafim start at 2 in the Vilna Shas

  return {
    display: {
      en: `${tractate.en} ${dafNum}`,
      he: `${tractate.he} דף ${dafNum}`,
    },
    ref:    `${tractate.en} ${dafNum}a`,
    date:   today.toISOString().split('T')[0],
    source: 'local',
  };
}
