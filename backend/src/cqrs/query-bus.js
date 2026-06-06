class QueryBus {
  constructor() {
    this.handlers = new Map();
  }

  register(queryName, handler) {
    if (this.handlers.has(queryName)) {
      throw new Error(`Handler already registered for query: ${queryName}`);
    }
    this.handlers.set(queryName, handler);
  }

  async execute(query) {
    const queryName = query.constructor.name;
    const handler = this.handlers.get(queryName);
    if (!handler) {
      throw new Error(`No handler registered for query: ${queryName}`);
    }
    return handler.handle(query);
  }
}

export const queryBus = new QueryBus();