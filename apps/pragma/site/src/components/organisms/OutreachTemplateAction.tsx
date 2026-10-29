/** @Feature bars */

import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSaveOutreachTemplate } from '../../lib/queries/outreach.queries';
import { Button } from '../atoms/Button';
import { OutreachTemplateSheet } from './OutreachTemplateSheet';

export interface OutreachTemplateActionProps {
  readonly template: string;
  readonly onError: (error: Error) => void;
}

// @FollowsBlueprint organism-query-owning
export function OutreachTemplateAction({
  template,
  onError,
}: OutreachTemplateActionProps): JSX.Element {
  const { t } = useTranslation();
  const saveOutreachTemplate = useSaveOutreachTemplate();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <>
      <Button icon="edit" variant="secondary" size="sm" onClick={() => setIsOpen(true)}>
        {t('bars.outreachTemplate')}
      </Button>
      {isOpen ? (
        <OutreachTemplateSheet
          key={template}
          template={template}
          message={message}
          onClose={() => setIsOpen(false)}
          onSave={(body) =>
            saveOutreachTemplate.mutate(
              { body },
              { onSuccess: () => setMessage(t('bars.outreachTemplateSaved')), onError },
            )
          }
        />
      ) : null}
    </>
  );
}
