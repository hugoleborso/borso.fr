import { findOutreachTemplateBody, upsertOutreachTemplateBody } from './outreach.repository';

export async function getOutreachTemplate(): Promise<{ body: string | null }> {
  return { body: await findOutreachTemplateBody() };
}

export async function saveOutreachTemplate(body: string): Promise<{ body: string }> {
  return { body: await upsertOutreachTemplateBody(body) };
}
