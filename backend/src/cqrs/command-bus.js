class CommandBus {
  constructor() {
    this.handlers = new Map();
  }

  register(commandName, handler) {
    if (this.handlers.has(commandName)) {
      throw new Error(`Handler already registered for command: ${commandName}`);
    }
    this.handlers.set(commandName, handler);
  }

  async execute(command) {
    const commandName = command.constructor.name;
    const handler = this.handlers.get(commandName);
    if (!handler) {
      throw new Error(`No handler registered for command: ${commandName}`);
    }
    return handler.handle(command);
  }
}

export const commandBus = new CommandBus();