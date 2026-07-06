// Reference price ranges (THB) used by the Baht Snap Converter's
// "fair price?" badge. Matching is fuzzy (substring/keyword based).
export const FAIR_PRICES = [
  { keywords: ['pad thai'], label: 'Pad Thai (street)', min: 40, max: 80 },
  { keywords: ['water', 'drinking water'], label: 'Bottled water (7-Eleven)', min: 7, max: 15 },
  { keywords: ['taxi', 'meter', 'flagfall', 'flag fall'], label: 'Metered taxi flagfall', min: 35, max: 35 },
  { keywords: ['bts', 'skytrain'], label: 'BTS ride', min: 17, max: 62 },
  { keywords: ['mrt', 'subway'], label: 'MRT ride', min: 17, max: 70 },
  { keywords: ['tuk tuk', 'tuk-tuk', 'tuktuk'], label: 'Tuk-tuk short hop', min: 60, max: 100 },
  { keywords: ['mango sticky rice', 'khao niew mamuang'], label: 'Mango sticky rice', min: 50, max: 100 },
  { keywords: ['latte', 'coffee', 'cappuccino', 'americano'], label: 'Coffee shop latte', min: 60, max: 120 },
  { keywords: ['som tam', 'papaya salad'], label: 'Som tam', min: 40, max: 80 },
  { keywords: ['tom yum'], label: 'Tom yum goong', min: 60, max: 150 },
  { keywords: ['pad see ew', 'pad si ew'], label: 'Pad see ew', min: 40, max: 80 },
  { keywords: ['fried rice', 'khao phat'], label: 'Fried rice', min: 40, max: 80 },
  { keywords: ['beer', 'chang', 'singha', 'leo'], label: 'Bottled beer (shop)', min: 60, max: 100 },
  { keywords: ['coconut', 'young coconut'], label: 'Fresh coconut', min: 40, max: 80 },
  { keywords: ['satay'], label: 'Satay (per skewer set)', min: 40, max: 100 },
  { keywords: ['spring roll'], label: 'Spring rolls', min: 30, max: 60 },
  { keywords: ['noodle soup', 'boat noodle', 'kuay teow'], label: 'Noodle soup', min: 40, max: 80 },
  { keywords: ['green curry', 'gaeng keow wan'], label: 'Green curry', min: 60, max: 120 },
  { keywords: ['massaman'], label: 'Massaman curry', min: 70, max: 150 },
  { keywords: ['roti'], label: 'Roti (street)', min: 25, max: 50 },
];

// Fuzzy-match a label from an extracted receipt/menu against the reference
// list. Returns the matching reference entry or null.
export function matchFairPrice(label) {
  if (!label) return null;
  const lower = label.toLowerCase();
  for (const ref of FAIR_PRICES) {
    if (ref.keywords.some((kw) => lower.includes(kw))) return ref;
  }
  return null;
}

// Returns 'fair' | 'high' | null (null = no reference match).
export function judgePrice(label, thb) {
  const ref = matchFairPrice(label);
  if (!ref) return null;
  return thb > ref.max * 1.5 ? 'high' : 'fair';
}
