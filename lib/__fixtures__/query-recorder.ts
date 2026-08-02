export interface RecordedOperation {
  method: string;
  args: unknown[];
}

export interface RecordedCall {
  table: string;
  select?: string;
  selectOptions?: Record<string, unknown>;
  operation?: RecordedOperation;
  filters: RecordedOperation[];
  terminal?: string;
}

export interface ScriptedResult {
  data?: unknown;
  error?: { message: string; code?: string } | null;
  count?: number | null;
}

export interface ResolvedResult {
  data: unknown;
  error: { message: string; code?: string } | null;
  count: number | null;
}

export interface QueryRecorder {
  client: { from(table: string): QueryBuilder };
  calls: RecordedCall[];
}

const FILTER_METHODS = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "like",
  "ilike",
  "is",
  "in",
  "contains",
  "containedBy",
  "overlaps",
  "match",
  "not",
  "or",
  "filter",
  "order",
  "range",
  "limit",
  "abortSignal",
] as const;

const WRITE_METHODS = ["insert", "update", "upsert", "delete"] as const;

const TERMINAL_METHODS = ["single", "maybeSingle", "csv"] as const;

const EMPTY_RESULT: ResolvedResult = { data: null, error: null, count: null };

type QueryBuilder = Record<string, (...args: unknown[]) => unknown>;

function resolve(scripted: ScriptedResult | undefined): ResolvedResult {
  if (!scripted) {
    return { ...EMPTY_RESULT };
  }
  return {
    data: scripted.error ? null : (scripted.data ?? null),
    error: scripted.error ?? null,
    count: scripted.count ?? null,
  };
}

export function createQueryRecorder(
  scripted: ScriptedResult[] = [],
): QueryRecorder {
  const calls: RecordedCall[] = [];
  let consumed = 0;

  const nextResult = (): ResolvedResult => resolve(scripted[consumed++]);

  const createBuilder = (call: RecordedCall): QueryBuilder => {
    const builder: QueryBuilder = {};

    builder.select = (columns?: unknown, options?: unknown) => {
      if (typeof columns === "string") {
        call.select = columns;
      }
      if (options && typeof options === "object") {
        call.selectOptions = { ...(options as Record<string, unknown>) };
      }
      return builder;
    };

    for (const method of FILTER_METHODS) {
      builder[method] = (...args: unknown[]) => {
        call.filters.push({ method, args });
        return builder;
      };
    }

    for (const method of WRITE_METHODS) {
      builder[method] = (...args: unknown[]) => {
        call.operation = { method, args };
        return builder;
      };
    }

    for (const method of TERMINAL_METHODS) {
      builder[method] = () => {
        call.terminal = method;
        return Promise.resolve(nextResult());
      };
    }

    builder.then = (onFulfilled?: unknown, onRejected?: unknown) =>
      Promise.resolve(nextResult()).then(
        onFulfilled as (value: ResolvedResult) => unknown,
        onRejected as (reason: unknown) => unknown,
      );

    return builder;
  };

  return {
    calls,
    client: {
      from(table: string) {
        const call: RecordedCall = { table, filters: [] };
        calls.push(call);
        return createBuilder(call);
      },
    },
  };
}
