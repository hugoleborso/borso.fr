import { createLearnTreeMachine } from './learnTreeMachine.utils';
import { createPlayMachine } from './playMachine.utils';

/**
 * The two session machines are application-wide singletons, so a control that
 * sits outside the board area can drive them from its own event handler rather
 * than through an effect that mirrors React state onto them.
 *
 * A session is (re)started by the organism that renders it, once per mount;
 * the organism carries a `key` derived from the scope, so a new scope remounts
 * it and restarts the machine.
 */
export const learnTreeMachine = createLearnTreeMachine();
export const playMachine = createPlayMachine();
