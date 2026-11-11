export interface DuplicatedResolution {
  readonly name: string;
  readonly versions: readonly string[];
}

const KEY_INDENT = '  ';
const KEY_OPENING_QUOTE = /^'/;
const KEY_ENDING = /[':]/;
const PEERS_OPENING = '(';
const ABSENT = -1;

function isPackageKey(line: string): boolean {
  return line.startsWith(KEY_INDENT) && !line.startsWith(`${KEY_INDENT} `);
}

function readKey(line: string): string {
  const opened = line.trim().replace(KEY_OPENING_QUOTE, '');
  const endsAt = opened.search(KEY_ENDING);
  return endsAt === ABSENT ? opened : opened.slice(0, endsAt);
}

function readVersion(key: string, name: string): string {
  const versioned = key.slice(name.length + 1);
  const peersAt = versioned.indexOf(PEERS_OPENING);
  return peersAt === ABSENT ? versioned : versioned.slice(0, peersAt);
}

export function listDuplicatedResolutions(
  lockfile: string,
  names: readonly string[],
): readonly DuplicatedResolution[] {
  const keys = lockfile.split('\n').filter(isPackageKey).map(readKey);
  return names
    .map((name) => {
      const versions = keys
        .filter((key) => key.startsWith(`${name}@`))
        .map((key) => readVersion(key, name));
      return { name, versions: [...new Set(versions)].sort() };
    })
    .filter((resolution) => resolution.versions.length > 1);
}
