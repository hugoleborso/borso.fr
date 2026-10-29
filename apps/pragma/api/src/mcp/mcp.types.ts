import type { AnyZodObject, z } from 'zod';

export interface ToolActor {
  readonly memberId: string;
  readonly now: Date;
}

export interface ToolRefusal {
  readonly error: string;
  readonly [field: string]: unknown;
}

export type ToolAnswer =
  | { readonly kind: 'answered'; readonly body: unknown }
  | { readonly kind: 'refused'; readonly body: ToolRefusal };

export type ToolOutcome = 'ok' | 'refused' | 'failed';

export interface ToolDefinition<Schema extends AnyZodObject = AnyZodObject> {
  readonly name: string;
  readonly description: string;
  readonly routes: readonly [string, ...string[]];
  readonly inputSchema: Schema;
  run(input: z.output<Schema>, actor: ToolActor): Promise<ToolAnswer>;
}

export interface ToolDeletion {
  readonly route: string;
  remove(reference: string, actor: ToolActor): Promise<ToolAnswer>;
}

export interface DeletionToolDefinition<Kind extends string> {
  readonly name: string;
  readonly description: string;
  readonly kinds: readonly [Kind, ...Kind[]];
  readonly deletions: Readonly<Record<Kind, ToolDeletion>>;
}

export interface ToolTextContent {
  readonly type: 'text';
  readonly text: string;
}

export interface ToolResult {
  readonly content: ToolTextContent[];
  readonly isError?: boolean;
}
