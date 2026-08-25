/** Brand strings. Every surface pulls its wording from here so it stays consistent. */

export const brand = {
  name: 'JASON REMIX',
  nameParts: ['JASON', 'REMIX'] as const,
  tagline: 'THE OFFICIAL EXPERIENCE',
  taglineAlt: 'MUSIC • REWARDS • COMMUNITY',
  artist: 'Jason Remix',
  origin: 'Brandenburg an der Havel',
  creditsName: 'JASON CREDITS',
  /** Facet mark used wherever a credit balance is shown. */
  creditGlyph: '◈',
  memberTitle: 'JASON REMIX MEMBER',
  supportEmail: 'support@jasonremix.de',
  privacyEmail: 'privacy@jasonremix.de',
  website: 'https://jasonremix.de',
} as const;

export const tabs = {
  home: 'HOME',
  music: 'MUSIC',
  rewards: 'REWARDS',
  credits: 'CREDITS',
  profile: 'PROFILE',
} as const;
