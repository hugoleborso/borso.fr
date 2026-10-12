import { useTranslation } from 'react-i18next';
import { didCopyTextToClipboard } from './clipboard.adapter';
import { COPY_FAILED_TOAST, PROMPT_COPIED_TOAST } from './queries/mutation-toasts.core';
import { showToast } from './toast.hook';

export function useCopyPromptOnLaunch(): (prompt: string) => void {
  const { t } = useTranslation();
  return (prompt) => {
    void didCopyTextToClipboard(prompt).then((didCopy) => {
      const toast = didCopy ? PROMPT_COPIED_TOAST : COPY_FAILED_TOAST;
      showToast({ tone: toast.tone, message: t(toast.messageKey) });
    });
  };
}
