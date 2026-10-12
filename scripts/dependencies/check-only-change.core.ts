const CHECK_ONLY_SCRIPT_NAMES: ReadonlySet<string> = new Set(['lint', 'typecheck', 'test', 'dev']);
const CHECK_ONLY_SCRIPT_PREFIXES = ['test:', 'dev:', 'db:local:'] as const;
const SCRIPTS_FIELD = 'scripts';
const MANIFEST_FILE = 'package.json';

type JsonRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isCheckOnlyScript(name: string): boolean {
  return (
    CHECK_ONLY_SCRIPT_NAMES.has(name) ||
    CHECK_ONLY_SCRIPT_PREFIXES.some((prefix) => name.startsWith(prefix))
  );
}

function withoutCheckOnlyScripts(manifest: JsonRecord): JsonRecord {
  const scripts = manifest[SCRIPTS_FIELD];
  if (!isRecord(scripts)) return manifest;
  const kept = Object.fromEntries(
    Object.entries(scripts).filter(([name]) => !isCheckOnlyScript(name)),
  );
  return { ...manifest, [SCRIPTS_FIELD]: kept };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .toSorted()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

export function hasOnlyCheckScriptChanges(before: unknown, after: unknown): boolean {
  if (!isRecord(before) || !isRecord(after)) return false;
  return (
    JSON.stringify(canonicalize(withoutCheckOnlyScripts(before))) ===
    JSON.stringify(canonicalize(withoutCheckOnlyScripts(after)))
  );
}

export function manifestPathOf(directory: string): string {
  return `${directory}/${MANIFEST_FILE}`;
}

export function isCheckOnlyChange(
  directory: string,
  changedFiles: readonly string[],
  manifests: { readonly before: unknown; readonly after: unknown },
): boolean {
  const manifestPath = manifestPathOf(directory);
  if (changedFiles.length === 0) return false;
  if (changedFiles.some((file) => file !== manifestPath)) return false;
  return hasOnlyCheckScriptChanges(manifests.before, manifests.after);
}
