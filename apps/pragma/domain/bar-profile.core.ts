export const BAR_STATUSES = ['lead', 'contacted', 'booked', 'played', 'cold'] as const;

export type BarStatus = (typeof BAR_STATUSES)[number];

export const CONCERT_MOODS = ['chill', 'gig', 'ticketed'] as const;

export type ConcertMood = (typeof CONCERT_MOODS)[number];

export const AVAILABLE_SUPPORTS = ['pa-system', 'lights', 'sound-engineer'] as const;

export type AvailableSupport = (typeof AVAILABLE_SUPPORTS)[number];

export const BAR_NAME_MAX_LENGTH = 256;
export const BAR_NOTES_MAX_LENGTH = 8_192;
export const BAR_CITY_MAX_LENGTH = 128;
export const BAR_CAPACITY_MAX = 100_000;
export const BAR_CONTACT_NAME_MAX_LENGTH = 128;
export const BAR_CONTACT_PHONE_MAX_LENGTH = 32;
