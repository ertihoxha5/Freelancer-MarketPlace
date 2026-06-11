import { commandBus } from "./command-bus.js";
import { queryBus } from "./query-bus.js";

import { GetWorkspaceQuery } from "./workspace/queries/get-workspace.query.js";
import { GetWorkspaceHandler } from "./workspace/queries/get-workspace.handler.js";

import { AddTodoCommand } from "./workspace/commands/add-todo.command.js";
import { AddTodoHandler } from "./workspace/commands/add-todo.handler.js";

import { UpdateTodoCommand } from "./workspace/commands/update-todo.command.js";
import { UpdateTodoHandler } from "./workspace/commands/update-todo.handler.js";

import { DeleteTodoCommand } from "./workspace/commands/delete-todo.command.js";
import { DeleteTodoHandler } from "./workspace/commands/delete-todo.handler.js";

import { AddSectionCommand } from "./workspace/commands/add-section.command.js";
import { AddSectionHandler } from "./workspace/commands/add-section.handler.js";

export function registerCqrsHandlers() {

  queryBus.register(GetWorkspaceQuery.name, new GetWorkspaceHandler());

  commandBus.register(AddTodoCommand.name, new AddTodoHandler());
  commandBus.register(UpdateTodoCommand.name, new UpdateTodoHandler());
  commandBus.register(DeleteTodoCommand.name, new DeleteTodoHandler());
  commandBus.register(AddSectionCommand.name, new AddSectionHandler());

  console.log("✅ CQRS handlers registered (Task 9 - Workspace domain started)");
}