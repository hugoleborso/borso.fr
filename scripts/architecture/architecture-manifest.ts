/**
 * The shape of the hand-written half of an application's architecture model,
 * and the register of the applications that have one.
 *
 * Everything a file path can carry is derived by `architecture-model.ts`. What
 * remains are the facts no single source file owns: who uses the system, which
 * runtime containers it deploys into, and what each external system actually
 * is. Those are declared per application under `manifests/` and cross-checked
 * against the code, so a declared external with no `@DependsOnExternal`
 * referencing it, or a tag naming an external that is not declared, fails the
 * generator.
 *
 * Adding an application is adding one file there and one line here. See
 * `docs/architecture/install.md`.
 */

import { borsoFrManifest } from './manifests/borso-fr.manifest';
import { borsouverturesManifest } from './manifests/borsouvertures.manifest';
import { lastLoopLepinManifest } from './manifests/last-loop-lepin.manifest';
import { pragmaManifest } from './manifests/pragma.manifest';

export interface ManifestActor {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Emoji drawn on the block, so a reader sorts the diagram before reading it. */
  readonly icon: string;
}

export interface ManifestContainer {
  readonly id: string;
  readonly name: string;
  readonly technology: string;
  readonly description: string;
  /** The `container` value `architecture-model.ts` infers for this one's code. */
  readonly sourceContainer: string | null;
  readonly runtime: 'browser' | 'aws' | 'build';
  readonly icon: string;
  /** Where this runs, when that is not obvious from the runtime alone. */
  readonly hosting?: string;
  /**
   * Why the scan finds no file for this container, when it finds none.
   *
   * The block used to print "no source in this repository", which is false for
   * anything whose source is simply not TypeScript under `apps/<slug>/`: the
   * service worker ships as a plain script and the bucket is a CDK resource.
   * A container with no scanned source has to say which of those it is.
   */
  readonly sourceNote?: string;
}

export interface ManifestExternal {
  readonly id: string;
  readonly name: string;
  readonly technology: string;
  readonly description: string;
  readonly boundary: 'third-party' | 'aws' | 'browser-platform';
  readonly icon: string;
  /**
   * The container this external actually is, when the system owns it. Aurora
   * DSQL reached through the signer is the application database rather than a
   * third party, and the container diagram should draw it as one box.
   */
  readonly realisedBy?: string;
}

export interface ArchitectureManifest {
  /** The `apps/<slug>` directory this models, and the page's file-name prefix. */
  readonly application: string;
  readonly name: string;
  readonly description: string;
  /** Plain scripts scanned for API path strings, repo-relative. */
  readonly urlOnlyScripts?: readonly string[];
  readonly actors: readonly ManifestActor[];
  readonly containers: readonly ManifestContainer[];
  readonly externals: readonly ManifestExternal[];
}

/** Every application with a map. Order decides the order on the index page. */
export const ARCHITECTURE_MANIFESTS: readonly ArchitectureManifest[] = [
  pragmaManifest,
  lastLoopLepinManifest,
  borsouverturesManifest,
  borsoFrManifest,
];

export function manifestFor(application: string): ArchitectureManifest | undefined {
  return ARCHITECTURE_MANIFESTS.find((manifest) => manifest.application === application);
}
