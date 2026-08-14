/**
 * Reading a picked GPX file into the string the API takes.
 *
 * The file is read at submit time rather than when it is picked, because
 * `File.text` is asynchronous and a quick submit after a pick would otherwise
 * race the read and post an empty track.
 */

import type { GpxErrorKey } from '../molecules/GpxFileField';

export interface GpxReadResult {
  /** The track to send, or null when there is none to send. */
  readonly xml: string | null;
  readonly errorKey: GpxErrorKey | null;
}

function readPicked(xml: string | null): GpxReadResult {
  if (xml === null) return { xml: null, errorKey: 'admin.setup.gpx-unreadable' };
  if (xml.length === 0) return { xml: null, errorKey: 'admin.setup.gpx-empty' };
  return { xml, errorKey: null };
}

/** Creating an edition needs a track, so picking no file is an error. */
// @FollowsBlueprint utils-pure-module
export function selectRequiredGpxResult(hasFile: boolean, xml: string | null): GpxReadResult {
  if (!hasFile) return { xml: null, errorKey: 'admin.setup.gpx-missing' };
  return readPicked(xml);
}

/** Editing an edition may leave the track alone, so picking no file is fine. */
export function selectOptionalGpxResult(hasFile: boolean, xml: string | null): GpxReadResult {
  if (!hasFile) return { xml: null, errorKey: null };
  return readPicked(xml);
}
