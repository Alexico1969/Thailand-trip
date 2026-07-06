// Seeded BTS/MRT/ARL line data. Used to ground the Route Buddy Claude call
// and as an offline fallback when the API call fails.
// `interchange` lists the other line(s) reachable by walking at that station.

export const LINES = {
  'BTS Sukhumvit': {
    color: '#7CB342', // light green
    label: 'BTS Sukhumvit Line',
    stations: [
      'Mo Chit', 'Saphan Khwai', 'Ari', 'Sanam Pao', 'Victory Monument',
      'Phaya Thai', 'Ratchathewi', 'Siam', 'Chit Lom', 'Ploen Chit', 'Nana',
      'Asok', 'Phrom Phong', 'Thong Lo', 'Ekkamai', 'Phra Khanong', 'On Nut',
      'Bang Chak', 'Punnawithi', 'Udom Suk', 'Bang Na', 'Bearing',
    ],
    interchanges: {
      'Mo Chit': ['MRT Blue (Chatuchak Park)'],
      'Phaya Thai': ['ARL'],
      'Siam': ['BTS Silom'],
      'Asok': ['MRT Blue (Sukhumvit)'],
    },
  },
  'BTS Silom': {
    color: '#00622F', // dark green
    label: 'BTS Silom Line',
    stations: [
      'National Stadium', 'Siam', 'Ratchadamri', 'Sala Daeng', 'Chong Nonsi',
      'Saint Louis', 'Surasak', 'Saphan Taksin', 'Krung Thon Buri',
      'Wongwian Yai', 'Pho Nimit', 'Talat Phlu', 'Wutthakat', 'Bang Wa',
    ],
    interchanges: {
      'Siam': ['BTS Sukhumvit'],
      'Sala Daeng': ['MRT Blue (Silom)'],
      'Bang Wa': ['MRT Blue'],
    },
  },
  'MRT Blue': {
    color: '#1C3F94',
    label: 'MRT Blue Line',
    stations: [
      'Bang Khae', 'Bang Wa', 'Tha Phra', 'Itsaraphap', 'Sanam Chai',
      'Sam Yot', 'Wat Mangkon', 'Hua Lamphong', 'Sam Yan', 'Silom',
      'Lumphini', 'Khlong Toei', 'Queen Sirikit National Convention Centre',
      'Sukhumvit', 'Phetchaburi', 'Phra Ram 9', 'Thailand Cultural Centre',
      'Huai Khwang', 'Sutthisan', 'Ratchadaphisek', 'Lat Phrao',
      'Phahon Yothin', 'Chatuchak Park', 'Kamphaeng Phet', 'Bang Sue',
      'Tao Poon',
    ],
    interchanges: {
      'Bang Wa': ['BTS Silom'],
      'Sala Daeng': ['BTS Silom'],
      'Silom': ['BTS Silom (Sala Daeng)'],
      'Sukhumvit': ['BTS Sukhumvit (Asok)'],
      'Phetchaburi': ['ARL (Makkasan)'],
      'Chatuchak Park': ['BTS Sukhumvit (Mo Chit)'],
      'Tao Poon': ['MRT Purple'],
    },
  },
  'MRT Purple': {
    color: '#8E44AD',
    label: 'MRT Purple Line',
    stations: [
      'Khlong Bang Phai', 'Talad Bang Yai', 'Sam Yaek Bang Yai', 'Bang Phlu',
      'Bang Rak Noi Tha It', 'Bang Rak Yai', 'Bang Phlu Market',
      'Nonthaburi Civic Center', 'Ministry of Public Health', 'Yaek Tiwanon',
      'Bang Krasor', 'Nonthaburi Market', 'Tao Poon',
    ],
    interchanges: {
      'Tao Poon': ['MRT Blue'],
    },
  },
  ARL: {
    color: '#D0006E',
    label: 'Airport Rail Link',
    stations: [
      'Suvarnabhumi', 'Lat Krabang', 'Ban Thap Chang', 'Hua Mak',
      'Ramkhamhaeng', 'Makkasan', 'Ratchaprarop', 'Phaya Thai',
    ],
    interchanges: {
      'Makkasan': ['MRT Blue (Phetchaburi)'],
      'Phaya Thai': ['BTS Sukhumvit'],
    },
  },
};

// Very rough nearest-station guesses for common tourist destinations, used
// only as an offline fallback banner ("verify" language required in the UI).
export const OFFLINE_DESTINATION_GUESSES = {
  'chatuchak market': { station: 'Mo Chit / Kamphaeng Phet', line: 'BTS Sukhumvit / MRT Blue' },
  'wat pho': { station: 'Saphan Taksin (then boat/taxi)', line: 'BTS Silom' },
  'wat arun': { station: 'Saphan Taksin (then cross-river boat)', line: 'BTS Silom' },
  'grand palace': { station: 'Saphan Taksin (then boat/taxi)', line: 'BTS Silom' },
  'iconsiam': { station: 'Saphan Taksin (then free shuttle boat)', line: 'BTS Silom' },
  'siam paragon': { station: 'Siam', line: 'BTS Sukhumvit / Silom' },
  'khao san road': { station: 'Ratchathewi (then taxi)', line: 'BTS Sukhumvit' },
  'asiatique': { station: 'Saphan Taksin (then free shuttle boat)', line: 'BTS Silom' },
  'lumphini park': { station: 'Silom / Lumphini', line: 'MRT Blue' },
  'terminal 21': { station: 'Asok', line: 'BTS Sukhumvit / MRT Blue (Sukhumvit)' },
};
