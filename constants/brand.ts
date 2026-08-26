/** Markentexte. Jede Oberfläche zieht ihre Formulierungen von hier, damit sie konsistent bleiben. */

export const brand = {
  name: 'JASON REMIX',
  nameParts: ['JASON', 'REMIX'] as const,
  tagline: 'DIE OFFIZIELLE APP',
  taglineAlt: 'MUSIK • PRÄMIEN • COMMUNITY',
  artist: 'Jason Remix',
  origin: 'Brandenburg an der Havel',
  creditsName: 'JASON CREDITS',
  /** Facettenzeichen, das überall dort steht, wo ein Guthaben angezeigt wird. */
  creditGlyph: '◈',
  memberTitle: 'JASON REMIX MITGLIED',
  supportEmail: 'support@jasonremix.de',
  privacyEmail: 'datenschutz@jasonremix.de',
  website: 'https://jasonremix.de',
} as const;

export const tabs = {
  home: 'START',
  music: 'MUSIK',
  rewards: 'PRÄMIEN',
  credits: 'CREDITS',
  profile: 'PROFIL',
} as const;
