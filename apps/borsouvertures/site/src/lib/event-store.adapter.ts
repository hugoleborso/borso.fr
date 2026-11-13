export type EventStoreOperation = 'open' | 'read' | 'write';

export interface EventStoreDefinition<Event> {
  readonly databaseName: string;
  readonly storeName: string;
  readonly listValid: (values: readonly unknown[]) => Event[];
  readonly buildError: (operation: EventStoreOperation, cause: unknown) => Error;
}

const DATABASE_VERSION = 1;
const KEY_PATH = 'id';

function requestDatabase<Event>(
  factory: IDBFactory,
  definition: EventStoreDefinition<Event>,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(definition.databaseName, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(definition.storeName, { keyPath: KEY_PATH });
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(new Error('IndexedDB refused to open the database', { cause: request.error }));
    };
  });
}

async function openDatabase<Event>(
  factory: IDBFactory | undefined,
  definition: EventStoreDefinition<Event>,
): Promise<IDBDatabase> {
  try {
    if (factory === undefined) throw new Error('This browser has no IndexedDB');
    return await requestDatabase(factory, definition);
  } catch (error) {
    throw definition.buildError('open', error);
  }
}

function runTransaction<Value>(
  database: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  startRequest: (store: IDBObjectStore) => IDBRequest<Value>,
): Promise<Value> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = startRequest(transaction.objectStore(storeName));
    transaction.oncomplete = () => {
      resolve(request.result);
    };
    transaction.onabort = () => {
      reject(new Error('The IndexedDB transaction was aborted', { cause: transaction.error }));
    };
  });
}

async function runStoreOperation<Event, Value>(
  factory: IDBFactory | undefined,
  definition: EventStoreDefinition<Event>,
  operation: Exclude<EventStoreOperation, 'open'>,
  mode: IDBTransactionMode,
  startRequest: (store: IDBObjectStore) => IDBRequest<Value>,
): Promise<Value> {
  const database = await openDatabase(factory, definition);
  try {
    return await runTransaction(database, definition.storeName, mode, startRequest);
  } catch (error) {
    throw definition.buildError(operation, error);
  } finally {
    database.close();
  }
}

// @FollowsBlueprint adapter-storage-keyed-by-record
export async function listStoredEvents<Event>(
  factory: IDBFactory | undefined,
  definition: EventStoreDefinition<Event>,
): Promise<Event[]> {
  const stored: unknown[] = await runStoreOperation(
    factory,
    definition,
    'read',
    'readonly',
    (store) => store.getAll(),
  );
  return definition.listValid(stored);
}

export async function putStoredEvents<Event>(
  factory: IDBFactory | undefined,
  definition: EventStoreDefinition<Event>,
  events: readonly Event[],
): Promise<void> {
  const [firstEvent, ...laterEvents] = events;
  if (firstEvent === undefined) return;
  await runStoreOperation(factory, definition, 'write', 'readwrite', (store) =>
    laterEvents.reduce((_previousRequest, event) => store.put(event), store.put(firstEvent)),
  );
}
