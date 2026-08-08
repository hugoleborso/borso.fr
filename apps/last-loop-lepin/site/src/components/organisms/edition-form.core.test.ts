import { describe, expect, it } from 'vitest';
import type { RaceEditionDto } from '../../lib/race.types';
import {
  buildCreateEditionPayload,
  buildCreateFormDefaults,
  buildEditFormDefaults,
  buildReplaceEditionPayload,
  DEFAULT_INTERVAL_MINUTES,
  editionFormValuesSchema,
  type EditionFormValues,
  readIntervalMinutes,
  selectCreateFormHintKey,
  selectCreateFormTitleKey,
  selectEditableEdition,
  selectNextTransition,
  selectStartedEdition,
} from './edition-form.core';

const VALUES: EditionFormValues = {
  slug: 'lepin-2027',
  displayName: 'Last Loop Lépin 2027',
  startsAt: '2027-06-12T06:00',
  endsAt: '2027-06-12T22:00',
  intervalMinutes: '60',
};

function buildEdition(overrides: Partial<RaceEditionDto> = {}): RaceEditionDto {
  return {
    slug: 'lepin-2026',
    displayName: 'Last Loop Lépin 2026',
    startsAt: '2026-06-13T04:00:00.000Z',
    endsAt: '2026-06-13T20:00:00.000Z',
    sunriseAt: '2026-06-13T03:45:00.000Z',
    sunsetAt: '2026-06-13T19:45:00.000Z',
    intervalMinutes: 45,
    status: 'setup',
    gpx: {
      distanceMeters: 5_800,
      elevationGainMeters: 250,
      trackJson: { points: [] },
      startLatLng: { lat: 45.55, lng: 5.78 },
    },
    ...overrides,
  };
}

describe('editionFormValuesSchema', () => {
  it('accepts a well formed edition', () => {
    expect(editionFormValuesSchema.safeParse(VALUES).success).toBe(true);
  });

  it('rejects a slug with an uppercase letter', () => {
    expect(editionFormValuesSchema.safeParse({ ...VALUES, slug: 'Lepin-2027' }).success).toBe(
      false,
    );
  });

  it('rejects a slug shorter than three characters', () => {
    expect(editionFormValuesSchema.safeParse({ ...VALUES, slug: 'ab' }).success).toBe(false);
  });

  it('rejects an empty display name', () => {
    expect(editionFormValuesSchema.safeParse({ ...VALUES, displayName: '' }).success).toBe(false);
  });

  it('rejects an empty start', () => {
    expect(editionFormValuesSchema.safeParse({ ...VALUES, startsAt: '' }).success).toBe(false);
  });

  it('rejects an empty end', () => {
    expect(editionFormValuesSchema.safeParse({ ...VALUES, endsAt: '' }).success).toBe(false);
  });

  it('rejects an interval of zero minutes', () => {
    expect(editionFormValuesSchema.safeParse({ ...VALUES, intervalMinutes: '0' }).success).toBe(
      false,
    );
  });

  it('rejects an interval above four hours', () => {
    expect(editionFormValuesSchema.safeParse({ ...VALUES, intervalMinutes: '241' }).success).toBe(
      false,
    );
  });
});

describe('readIntervalMinutes', () => {
  it('parses a numeric entry', () => {
    expect(readIntervalMinutes('45')).toBe(45);
  });

  it('falls back to the default for an unparsable entry', () => {
    expect(readIntervalMinutes('')).toBe(DEFAULT_INTERVAL_MINUTES);
  });
});

describe('buildCreateEditionPayload', () => {
  it('carries the slug and the GPX and turns the schedule into timestamps', () => {
    const payload = buildCreateEditionPayload(VALUES, '<gpx/>');
    expect(payload.slug).toBe('lepin-2027');
    expect(payload.gpxXml).toBe('<gpx/>');
    expect(payload.intervalMinutes).toBe(60);
    expect(payload.startsAt).toBe(new Date('2027-06-12T06:00').toISOString());
  });
});

describe('buildReplaceEditionPayload', () => {
  it('omits the GPX when the operator picked no file', () => {
    const payload = buildReplaceEditionPayload('lepin-2026', VALUES, null);
    expect(payload.gpxXml).toBeUndefined();
    expect(payload.slug).toBe('lepin-2026');
  });

  it('includes the GPX when the operator picked one', () => {
    const payload = buildReplaceEditionPayload('lepin-2026', VALUES, '<gpx/>');
    expect(payload.gpxXml).toBe('<gpx/>');
  });
});

describe('buildEditFormDefaults', () => {
  it('reads every field off the edition being edited', () => {
    const defaults = buildEditFormDefaults(buildEdition());
    expect(defaults.slug).toBe('lepin-2026');
    expect(defaults.displayName).toBe('Last Loop Lépin 2026');
    expect(defaults.intervalMinutes).toBe('45');
    expect(defaults.startsAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});

describe('buildCreateFormDefaults', () => {
  it('suggests the first slug when there is no edition to draw from', () => {
    const defaults = buildCreateFormDefaults(null, new Date(2026, 5, 13));
    expect(defaults.slug).toBe('lepin-2026');
    expect(defaults.intervalMinutes).toBe('60');
  });

  it('suggests next year when an edition already exists', () => {
    const defaults = buildCreateFormDefaults(buildEdition(), new Date(2026, 5, 13));
    expect(defaults.slug).toBe('lepin-2027');
  });
});

describe('selectNextTransition', () => {
  it('starts an edition still in setup', () => {
    expect(selectNextTransition(buildEdition())).toBe('live');
  });

  it('ends a live edition', () => {
    expect(selectNextTransition(buildEdition({ status: 'live' }))).toBe('finished');
  });

  it('reopens a finished edition', () => {
    expect(selectNextTransition(buildEdition({ status: 'finished' }))).toBe('setup');
  });
});

describe('selectEditableEdition', () => {
  it('returns nothing when there is no edition', () => {
    expect(selectEditableEdition(null)).toBeNull();
  });

  it('returns the edition while it is still in setup', () => {
    expect(selectEditableEdition(buildEdition())?.slug).toBe('lepin-2026');
  });

  it('returns nothing once the edition has started', () => {
    expect(selectEditableEdition(buildEdition({ status: 'live' }))).toBeNull();
  });
});

describe('selectStartedEdition', () => {
  it('returns nothing when there is no edition', () => {
    expect(selectStartedEdition(null)).toBeNull();
  });

  it('returns nothing while the edition is still in setup', () => {
    expect(selectStartedEdition(buildEdition())).toBeNull();
  });

  it('returns the edition once it has started', () => {
    expect(selectStartedEdition(buildEdition({ status: 'live' }))?.slug).toBe('lepin-2026');
  });
});

describe('selectCreateFormTitleKey', () => {
  it('offers the first edition when there is none', () => {
    expect(selectCreateFormTitleKey(null)).toBe('admin.setup.create-title');
  });

  it('offers another edition when one already exists', () => {
    expect(selectCreateFormTitleKey(buildEdition())).toBe('admin.setup.create-another-title');
  });
});

describe('selectCreateFormHintKey', () => {
  it('describes the first setup when there is no edition', () => {
    expect(selectCreateFormHintKey(null)).toBe('admin.setup.hint-initial');
  });

  it('asks for a different slug when one already exists', () => {
    expect(selectCreateFormHintKey(buildEdition())).toBe('admin.setup.hint-different-slug');
  });
});
