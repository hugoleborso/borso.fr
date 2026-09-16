import type { TaskStatus } from '@domain/task-status.core';

export interface SeedTask {
  readonly title: string;
  readonly notes: string;
  readonly status: TaskStatus;
  readonly assigneeFirstName: string | null;
  readonly songTitle: string | null;
  readonly dueInDays: number | null;
}

export const SEED_TASKS: readonly SeedTask[] = [
  {
    title: 'Réécrire le pont',
    notes: 'La montée tombe trop tôt, on perd la salle.',
    status: 'doing',
    assigneeFirstName: 'Hugo',
    songTitle: 'Runaway Sun',
    dueInDays: 4,
  },
  {
    title: 'Enregistrer la maquette',
    notes: '',
    status: 'todo',
    assigneeFirstName: 'Hugo',
    songTitle: 'Runaway Sun',
    dueInDays: 19,
  },
  {
    title: 'Trouver une deuxième voix',
    notes: '',
    status: 'todo',
    assigneeFirstName: 'Léa',
    songTitle: 'Last Call',
    dueInDays: null,
  },
  {
    title: 'Racheter des cordes',
    notes: '',
    status: 'done',
    assigneeFirstName: 'Léa',
    songTitle: null,
    dueInDays: -14,
  },
  {
    title: 'Relancer Le Trabendo',
    notes: 'Sans réponse depuis la dernière relance.',
    status: 'todo',
    assigneeFirstName: 'Marc',
    songTitle: null,
    dueInDays: -6,
  },
  {
    title: 'Réserver le camion',
    notes: '',
    status: 'todo',
    assigneeFirstName: null,
    songTitle: null,
    dueInDays: 12,
  },
];
