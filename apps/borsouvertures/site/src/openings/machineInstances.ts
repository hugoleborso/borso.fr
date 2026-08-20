import { createLearnTreeMachine } from './learnTreeMachine.utils';
import { createPlayMachine } from './playMachine.utils';

/**
 * @Blueprint machine-singleton
 * @BlueprintName Machine Singleton Module
 * @BlueprintUsage Use when one machine instance has to be reachable from components that share no common ancestor holding it.
 * @BlueprintDescription Creates each machine once at module scope and exports the instance, so a control in the top bar and the board below it act on the same object by importing it rather than by threading a callback down the tree or wrapping the application in a context provider. The lifecycle question this raises, when to start a new session, is answered by the mounting organism calling `start` once and by a `key` derived from the scope remounting it, so nothing here needs resetting on import.
 */
export const learnTreeMachine = createLearnTreeMachine();
export const playMachine = createPlayMachine();
