// Map ISO 3166-1 alpha-2 country codes to Name and Flag Emoji

export interface CountryMeta {
  code: string;
  name: string;
  flag: string;
}

const COUNTRY_NAMES: Record<string, string> = {
  us: 'United States',
  uk: 'United Kingdom',
  gb: 'United Kingdom',
  ca: 'Canada',
  de: 'Germany',
  fr: 'France',
  es: 'Spain',
  it: 'Italy',
  au: 'Australia',
  br: 'Brazil',
  mx: 'Mexico',
  ar: 'Argentina',
  in: 'India',
  jp: 'Japan',
  kr: 'South Korea',
  cn: 'China',
  ru: 'Russia',
  ua: 'Ukraine',
  nl: 'Netherlands',
  be: 'Belgium',
  ch: 'Switzerland',
  at: 'Austria',
  se: 'Sweden',
  no: 'Norway',
  dk: 'Denmark',
  fi: 'Finland',
  pl: 'Poland',
  pt: 'Portugal',
  gr: 'Greece',
  tr: 'Turkey',
  eg: 'Egypt',
  za: 'South Africa',
  ae: 'United Arab Emirates',
  sa: 'Saudi Arabia',
  il: 'Israel',
  nz: 'New Zealand',
  sg: 'Singapore',
  my: 'Malaysia',
  id: 'Indonesia',
  ph: 'Philippines',
  th: 'Thailand',
  vn: 'Vietnam',
  cl: 'Chile',
  co: 'Colombia',
  pe: 'Peru',
  ve: 'Venezuela',
  ro: 'Romania',
  cz: 'Czech Republic',
  hu: 'Hungary',
  bg: 'Bulgaria',
  hr: 'Croatia',
  rs: 'Serbia',
  sk: 'Slovakia',
  si: 'Slovenia',
  ie: 'Ireland',
  ge: 'Georgia',
  ma: 'Morocco',
  dz: 'Algeria',
  tn: 'Tunisia',
  pk: 'Pakistan',
  bd: 'Bangladesh',
  ng: 'Nigeria',
  ke: 'Kenya',
  gh: 'Ghana',
  mk: 'North Macedonia',
};

export function getCountryFlag(code: string): string {
  if (!code || code.length !== 2) return '🌐';
  const upper = code.toUpperCase();
  // Special override for UK -> GB
  const mapped = upper === 'UK' ? 'GB' : upper;
  const first = mapped.codePointAt(0);
  const second = mapped.codePointAt(1);
  if (!first || !second || first < 65 || first > 90 || second < 65 || second > 90) {
    return '🌐';
  }
  return String.fromCodePoint(first - 65 + 0x1f1e6, second - 65 + 0x1f1e6);
}

export function getCountryName(code: string): string {
  if (!code) return 'International';
  const lower = code.toLowerCase();
  return COUNTRY_NAMES[lower] || lower.toUpperCase();
}
