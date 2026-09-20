import { bananaRushManifest } from './manifests/banana-rush.manifest';
import { borsoFrManifest } from './manifests/borso-fr.manifest';
import { borsouverturesManifest } from './manifests/borsouvertures.manifest';
import { lastLoopLepinManifest } from './manifests/last-loop-lepin.manifest';
import { pragmaManifest } from './manifests/pragma.manifest';

export interface ManifestActor {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
}

export interface ManifestContainer {
  readonly id: string;
  readonly name: string;
  readonly technology: string;
  readonly description: string;
  readonly sourceContainer: string | null;
  readonly runtime: 'browser' | 'aws' | 'build';
  readonly icon: string;
  readonly hosting?: string;
  readonly noScannedSourceNote?: string;
}

export type ExternalAccess = 'open' | 'usage-policy' | 'credential' | 'account' | 'billing-account';

export interface ManifestExternal {
  readonly id: string;
  readonly name: string;
  readonly technology: string;
  readonly description: string;
  readonly boundary: 'third-party' | 'aws' | 'browser-platform';
  readonly access: ExternalAccess;
  readonly icon: string;
  readonly realisedBy?: string;
}

export interface ArchitectureManifest {
  readonly application: string;
  readonly name: string;
  readonly description: string;
  readonly urlOnlyScripts?: readonly string[];
  readonly actors: readonly ManifestActor[];
  readonly containers: readonly ManifestContainer[];
  readonly externals: readonly ManifestExternal[];
}

export const ARCHITECTURE_MANIFESTS: readonly ArchitectureManifest[] = [
  pragmaManifest,
  lastLoopLepinManifest,
  bananaRushManifest,
  borsouverturesManifest,
  borsoFrManifest,
];

export function manifestFor(application: string): ArchitectureManifest | undefined {
  return ARCHITECTURE_MANIFESTS.find((manifest) => manifest.application === application);
}
