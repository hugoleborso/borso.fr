import type { JSX, ReactNode, SyntheticEvent } from 'react';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import { useTranslation } from 'react-i18next';
import { focusFirstField } from '../../lib/modal-dialog.adapter';
import { composeClassName } from '../atoms/class-name.utils';
import { IconButton } from '../atoms/IconButton';
import { useSheetSwipe } from './sheet-swipe.hook';
import { SHEET_BODY_CLASS, type SheetVariantProps, sheetVariants } from './sheet.variants';

export interface SheetProps extends SheetVariantProps {
  readonly title: ReactNode;
  readonly label: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly headerExtra?: ReactNode;
  readonly subheader?: ReactNode;
  readonly footer?: ReactNode;
  readonly isDismissible?: boolean;
  readonly isTitleARecordName?: boolean;
  readonly onSubmit?: (event: SyntheticEvent<HTMLFormElement>) => void;
  readonly isCloseDisabled?: boolean;
  readonly role?: 'dialog' | 'alertdialog';
}

const FOOTER_CLASS =
  'flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-rule px-4 pt-3 ' +
  'pb-[max(16px,env(safe-area-inset-bottom))]';
const SCRIM_CLASS =
  'fixed inset-x-0 top-0 z-50 flex h-(--visual-viewport-height) flex-col bg-scrim ' +
  'pt-[env(safe-area-inset-top)]';
const TITLE_CLASS_BY_KIND = {
  record: 'font-display text-title text-ink',
  tool: 'font-sans text-heading text-ink',
} as const;

// @FollowsBlueprint molecule-dialog-form
export function Sheet({
  title,
  label,
  onClose,
  children,
  headerExtra,
  subheader,
  footer,
  size,
  isDismissible = true,
  isTitleARecordName = false,
  onSubmit,
  isCloseDisabled = false,
  role = 'dialog',
}: SheetProps): JSX.Element {
  const { t } = useTranslation();
  const isSwipeClosable = isDismissible && !isCloseDisabled;
  const swipe = useSheetSwipe(isSwipeClosable, onClose);
  const content = (
    <>
      <div data-sheet-body className={SHEET_BODY_CLASS}>
        {children}
      </div>
      {footer === undefined ? null : <footer className={FOOTER_CLASS}>{footer}</footer>}
    </>
  );
  return (
    <ModalOverlay
      isOpen
      isDismissable={isSwipeClosable}
      isKeyboardDismissDisabled={isCloseDisabled}
      onOpenChange={onClose}
      className={SCRIM_CLASS}
    >
      <Modal data-sheet className={sheetVariants({ size })}>
        <Dialog
          ref={focusFirstField}
          role={role}
          aria-label={label}
          className="flex min-h-0 flex-auto flex-col outline-none"
        >
          <div data-sheet-grab className="shrink-0 touch-none" {...swipe}>
            {isSwipeClosable ? (
              <div
                data-sheet-grabber
                aria-hidden="true"
                className="mx-auto mt-2 h-1 w-9 rounded-pill bg-rule-strong lg:hidden"
              />
            ) : null}
            <header className="flex items-center gap-2 py-1 pr-2 pl-4">
              <h2
                className={composeClassName(
                  'm-0 min-w-0 flex-auto',
                  TITLE_CLASS_BY_KIND[isTitleARecordName ? 'record' : 'tool'],
                )}
              >
                {title}
              </h2>
              {headerExtra}
              <IconButton
                data-sheet-close
                icon="close"
                label={t('common.close')}
                disabled={isCloseDisabled}
                onClick={onClose}
              />
            </header>
          </div>
          {subheader === undefined ? null : <div className="shrink-0 px-4 pb-2">{subheader}</div>}
          {onSubmit === undefined ? (
            content
          ) : (
            <form className="flex min-h-0 flex-auto flex-col" onSubmit={onSubmit}>
              {content}
            </form>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
