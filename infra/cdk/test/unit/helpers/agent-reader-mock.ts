interface AgentReaderMockState {
  queries: string[];
  rows: unknown[];
  failOn: string | undefined;
  ended: number;
  options: Record<string, unknown> | undefined;
}

export const state: AgentReaderMockState = {
  queries: [],
  rows: [],
  failOn: undefined,
  ended: 0,
  options: undefined,
};

export function resetAgentReaderMockState(): void {
  state.queries = [];
  state.rows = [];
  state.failOn = undefined;
  state.ended = 0;
  state.options = undefined;
}

export function makeSql(options: Record<string, unknown>) {
  state.options = options;
  return {
    unsafe(query: string) {
      state.queries.push(query);
      if (state.failOn !== undefined && query.includes(state.failOn)) {
        return Promise.reject(new Error(`boom: ${state.failOn}`));
      }
      return Promise.resolve(query.startsWith('SELECT') ? state.rows : []);
    },
    end() {
      state.ended += 1;
      return Promise.resolve();
    },
  };
}
