import { useState } from 'react';
import { ApiError, apiClient } from '../../api/client';
import { invalidateResource } from '../../data/useResource';
import type { RaceEditionDto } from '../../domain/types';
import { CreateEditionForm } from './CreateEditionForm';
import { EditionEditForm } from './EditionEditForm';
import { LiveOrFinishedEditionCard } from './LiveOrFinishedEditionCard';
import {
  defaultEndsAt,
  defaultStartsAt,
  isoLocal,
  suggestNextSlug,
  summariseZodError,
} from './setup-form.utils';

interface SetupPanelProps {
  readonly currentEdition: RaceEditionDto | null;
}

export function SetupPanel({ currentEdition }: SetupPanelProps) {
  // Three rendering modes:
  //   - `setup` edition in progress → edit mode (PUT, slug read-only)
  //   - `live` / `finished` edition  → readonly card on top + create form
  //     for the NEXT edition below (POST, slug pre-filled with a sensible
  //     suggestion like `lepin-2026` → `lepin-2027`)
  //   - no edition                  → just the create form
  const isEditing = currentEdition !== null && currentEdition.status === 'setup';
  const showReadonlyCard = currentEdition !== null && currentEdition.status !== 'setup';
  const initialSlug = isEditing
    ? (currentEdition?.slug ?? 'lepin-2026')
    : suggestNextSlug(currentEdition?.slug);
  const initialDisplayName = isEditing
    ? (currentEdition?.displayName ?? 'Last Loop Lépin 2026')
    : 'Last Loop Lépin';
  const [slug, setSlug] = useState(initialSlug);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [startsAt, setStartsAt] = useState(
    isEditing && currentEdition !== null
      ? isoLocal(new Date(currentEdition.startsAt))
      : defaultStartsAt(),
  );
  const [endsAt, setEndsAt] = useState(
    isEditing && currentEdition !== null
      ? isoLocal(new Date(currentEdition.endsAt))
      : defaultEndsAt(),
  );
  const [intervalMinutes, setIntervalMinutes] = useState(
    String(isEditing && currentEdition !== null ? currentEdition.intervalMinutes : 60),
  );
  // Hold the picked `File` rather than its text content. Reading via
  // `file.text()` is async — if we kicked it off in `onChange`, a quick
  // submit could race the read and POST an empty `gpxXml`. Reading at
  // submit time removes the race.
  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [gpxReadError, setGpxReadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function readGpxFromState(): Promise<string | null> {
    if (gpxFile === null) return null;
    try {
      const text = await gpxFile.text();
      if (text.length === 0) {
        setGpxReadError('Le fichier choisi est vide.');
        return null;
      }
      setGpxReadError(null);
      return text;
    } catch (caught) {
      setGpxReadError(caught instanceof Error ? caught.message : 'Lecture du fichier impossible.');
      return null;
    }
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const intervalMinutesNumber = Number.parseInt(intervalMinutes, 10);
      const basePayload = {
        displayName,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        intervalMinutes: Number.isFinite(intervalMinutesNumber) ? intervalMinutesNumber : 60,
      };
      const gpxXml = await readGpxFromState();
      if (isEditing && currentEdition !== null) {
        // In edit mode, an empty file picker means "keep the persisted
        // trace". `gpxXml === null` covers both "no file chosen" and "file
        // read failed" — we treat both as a no-op on the GPX side and let
        // the schedule / displayName update land.
        await apiClient.adminReplaceEdition(
          currentEdition.slug,
          gpxXml === null ? basePayload : { ...basePayload, gpxXml },
        );
      } else {
        if (gpxXml === null) {
          setError("Choisis un fichier GPX avant de créer l'édition.");
          return;
        }
        await apiClient.adminCreateEdition({ slug, ...basePayload, gpxXml });
      }
      invalidateResource('edition:current');
      invalidateResource('editions:all');
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 400) {
        const summary = summariseZodError(caught.body);
        setError(
          summary === null
            ? 'Données invalides (vérifier le GPX et les horaires).'
            : `Données invalides → ${summary}`,
        );
      } else {
        setError(caught instanceof Error ? caught.message : 'Erreur inconnue.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTransition(nextStatus: 'setup' | 'live' | 'finished'): Promise<void> {
    if (currentEdition === null) return;
    const label =
      nextStatus === 'live'
        ? 'Démarrer la course maintenant ? Le classement live devient visible côté spectateur.'
        : nextStatus === 'finished'
          ? 'Terminer la course ? Plus aucun pointage ne sera accepté.'
          : "Réouvrir l'édition en setup ? Tu pourras modifier le GPX et les horaires de nouveau.";
    if (!confirm(label)) return;
    setTransitioning(true);
    setError(null);
    try {
      await apiClient.adminTransitionEditionStatus(currentEdition.slug, nextStatus);
      invalidateResource('edition:current');
      invalidateResource('editions:all');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Erreur inconnue.');
    } finally {
      setTransitioning(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (currentEdition === null) return;
    if (
      !confirm(
        `Supprimer l'édition "${currentEdition.displayName}" ? Cette action est irréversible.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await apiClient.adminDeleteEdition(currentEdition.slug);
      invalidateResource('edition:current');
      invalidateResource('editions:all');
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setError("L'édition a démarré : suppression verrouillée.");
      } else {
        setError(caught instanceof Error ? caught.message : 'Erreur inconnue.');
      }
    } finally {
      setDeleting(false);
    }
  }

  const readonlyCard =
    showReadonlyCard && currentEdition !== null ? (
      <LiveOrFinishedEditionCard
        edition={currentEdition}
        transitioning={transitioning}
        onTransition={(status) => void handleTransition(status)}
      />
    ) : null;

  const formCard = (
    <EditionEditForm
      currentEdition={currentEdition}
      isEditing={isEditing}
      showReadonlyCard={showReadonlyCard}
      slug={slug}
      displayName={displayName}
      startsAt={startsAt}
      endsAt={endsAt}
      intervalMinutes={intervalMinutes}
      gpxFile={gpxFile}
      gpxReadError={gpxReadError}
      error={error}
      submitting={submitting}
      deleting={deleting}
      transitioning={transitioning}
      onSlugChange={setSlug}
      onDisplayNameChange={setDisplayName}
      onStartsAtChange={setStartsAt}
      onEndsAtChange={setEndsAt}
      onIntervalMinutesChange={setIntervalMinutes}
      onGpxFileChange={(file) => {
        setGpxFile(file);
        setGpxReadError(null);
      }}
      onSubmit={(event) => void handleSubmit(event)}
      onTransitionLive={() => void handleTransition('live')}
      onDelete={() => void handleDelete()}
    />
  );

  // Two independent surfaces, always rendered (one or both, never zero):
  //
  //   1. Current edition card — edit form in `setup`, readonly + transition
  //      buttons in `live` / `finished`.
  //   2. Create form — POSTs a new edition. Always available so the orga
  //      can prep next year's race even while the current one is still in
  //      setup / live / finished. Slug is auto-suggested (`lepin-2026 →
  //      lepin-2027`) when there's an existing edition to draw from.
  //
  // We keep them as separate components so their input state never bleeds
  // across (previous bug: the "Créer" form was hidden as soon as a setup
  // edition existed, leaving the orga no path to register the next race).
  const createTitle = currentEdition === null ? 'Créer une édition' : 'Créer une nouvelle édition';
  const createHint = currentEdition === null ? 'configuration initiale' : 'slug différent';
  const createForm = (
    <CreateEditionForm
      suggestedSlug={suggestNextSlug(currentEdition?.slug)}
      suggestedDisplayName="Last Loop Lépin"
      headerTitle={createTitle}
      headerHint={createHint}
    />
  );
  if (isEditing) {
    return (
      <>
        {formCard}
        {createForm}
      </>
    );
  }
  return (
    <>
      {createForm}
      {readonlyCard}
    </>
  );
}
