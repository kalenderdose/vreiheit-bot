import { Interaction } from "discord.js";
import {
  Constructor,
  DiscordHandlerMeta,
  getMeta,
  InitHandler,
  InteractionHandler,
  MemberHandler,
  MessageHandler,
} from "src/decorators/meta";

export const registeredHandlers: {
  memberJoin: MemberHandler[];
  memberLeave: MemberHandler[];
  message: MessageHandler[];
  init: InitHandler[];
  interaction: Record<string, InteractionHandler[]>;
} = {
  memberJoin: [],
  memberLeave: [],
  message: [],
  init: [],
  interaction: {},
};

export function Handler(prefix: string = "") {
  return function (cls: any) {
    const meta = getMeta(cls);
    meta.prefix = prefix;
    const instance = new (cls as any)();
    const handlerMap = createHandlers(instance, meta);
    for (const [key, handlers] of Object.entries(handlerMap)) {
      const registered = registeredHandlers[key];
      if (Array.isArray(registered)) registered.push(...(handlers as any));
      else {
        for (const [prefix, subHandlers] of Object.entries(handlers)) {
          (registered[prefix] ??= []).push(...subHandlers);
        }
      }
    }
  };
}

function createHandlers(instance: any, meta: DiscordHandlerMeta) {
  const handlerMap = {
    memberJoin: [],
    memberLeave: [],
    interaction: {},
    message: [],
    init: [],
  };

  const prefix = meta.prefix;

  for (const [key, value] of Object.entries(meta)) {
    switch (key as keyof DiscordHandlerMeta) {
      case "prefix":
        continue;
      case "init":
        handlerMap.init.push(...(value[""] ?? []).map(it => it.bind(instance)));
        break;
      case "message":
        handlerMap.message.push(
          ...(value[""] ?? []).map(it => it.bind(instance)),
        );
        break;
      case "memberJoin":
        handlerMap.memberJoin.push(
          ...(value[""] ?? []).map(it => it.bind(instance)),
        );
        break;
      case "memberLeave":
        handlerMap.memberLeave.push(
          ...(value[""] ?? []).map(it => it.bind(instance)),
        );
        break;
      case "button":
        for (const [key, handlers] of Object.entries(value)) {
          const fullPrefix = prefix ? `${prefix}:${key}` : key;
          (handlerMap.interaction[fullPrefix] ??= []).push(
            ...(handlers as any).map(handler => {
              return (interaction: Interaction, id: string) => {
                if (!interaction.isButton()) return;
                return handler.call(instance, interaction, id);
              };
            }),
          );
        }
        break;
      case "command":
        for (const [key, handlers] of Object.entries(value)) {
          (handlerMap.interaction[""] ??= []).push(
            ...(handlers as any).map(handler => {
              return (interaction: Interaction, id: string) => {
                if (!interaction.isCommand()) return;
                if (interaction.commandName !== key) return;
                return handler.call(instance, interaction, id);
              };
            }),
          );
        }
        break;
      case "form":
        for (const [key, handlers] of Object.entries(value)) {
          const fullPrefix = prefix ? `${prefix}:${key}` : key;
          (handlerMap.interaction[fullPrefix] ??= []).push(
            ...(handlers as any).map(handler => {
              return (interaction: Interaction, id: string) => {
                if (!interaction.isModalSubmit()) return;
                return handler.call(instance, interaction, id);
              };
            }),
          );
        }
        break;
      case "interaction":
        for (const [key, handlers] of Object.entries(value)) {
          const fullPrefix = prefix ? `${prefix}:${key}` : key;
          (handlerMap.interaction[fullPrefix] ??= []).push(
            ...(handlers as any).map(handler => {
              return (interaction: Interaction, id: string) => {
                return handler.call(instance, interaction, id);
              };
            }),
          );
        }
        break;
    }
  }

  return handlerMap;
}
