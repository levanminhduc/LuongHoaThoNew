import { server } from "./server";

const saved = {
  fetch: globalThis.fetch,
  localStorage: globalThis.localStorage,
};

function installRealFetch() {
  const realGlobals = globalThis as typeof globalThis & {
    __REAL_FETCH__?: typeof fetch;
    __REAL_REQUEST__?: typeof Request;
    __REAL_RESPONSE__?: typeof Response;
    __REAL_HEADERS__?: typeof Headers;
  };

  if (realGlobals.__REAL_FETCH__) {
    globalThis.fetch = realGlobals.__REAL_FETCH__;
  }
  if (realGlobals.__REAL_REQUEST__) {
    globalThis.Request = realGlobals.__REAL_REQUEST__;
  }
  if (realGlobals.__REAL_RESPONSE__) {
    globalThis.Response = realGlobals.__REAL_RESPONSE__;
  }
  if (realGlobals.__REAL_HEADERS__) {
    globalThis.Headers = realGlobals.__REAL_HEADERS__;
  }

  if (
    typeof globalThis.fetch !== "function" ||
    (globalThis.fetch as typeof fetch & { _isMockFunction?: boolean })
      ._isMockFunction
  ) {
    throw new Error("enable-msw: failed to install real fetch");
  }
}

function makeStatefulStorage(): Storage {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

beforeAll(() => {
  installRealFetch();
  Object.defineProperty(globalThis, "localStorage", {
    value: makeStatefulStorage(),
    writable: true,
    configurable: true,
  });
  server.listen({ onUnhandledRequest: "bypass" });
});

beforeEach(() => {
  globalThis.localStorage.clear();
});

afterEach(() => server.resetHandlers());

afterAll(() => {
  server.close();
  globalThis.fetch = saved.fetch;
  Object.defineProperty(globalThis, "localStorage", {
    value: saved.localStorage,
    writable: true,
    configurable: true,
  });
});

export { server };
