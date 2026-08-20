import type { GpxErrorKey } from '../molecules/GpxFileField';

export interface GpxReadResult {
  readonly xml: string | null;
  readonly errorKey: GpxErrorKey | null;
}

function readPicked(xml: string | null): GpxReadResult {
  if (xml === null) return { xml: null, errorKey: 'admin.setup.gpx-unreadable' };
  if (xml.length === 0) return { xml: null, errorKey: 'admin.setup.gpx-empty' };
  return { xml, errorKey: null };
}

// @FollowsBlueprint utils-pure-module
export function selectRequiredGpxResult(hasFile: boolean, xml: string | null): GpxReadResult {
  if (!hasFile) return { xml: null, errorKey: 'admin.setup.gpx-missing' };
  return readPicked(xml);
}

export function selectOptionalGpxResult(hasFile: boolean, xml: string | null): GpxReadResult {
  if (!hasFile) return { xml: null, errorKey: null };
  return readPicked(xml);
}
