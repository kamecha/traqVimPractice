import { ddcVim, is, Predicate, traq } from "./deps.ts";
import { channelMessageOptions, Message } from "./type.d.ts";

const isPumHighlight: Predicate<ddcVim.PumHighlight> = is.ObjectOf({
  name: is.String,
  type: is.LiteralOneOf(["abbr", "kind", "menu"] as const),
  hl_group: is.String,
  col: is.Number,
  width: is.Number,
});

export const isDdcItem: Predicate<ddcVim.Item> = is.ObjectOf({
  word: is.String,
  abbr: is.OptionalOf(is.String),
  menu: is.OptionalOf(is.String),
  info: is.OptionalOf(is.String),
  kind: is.OptionalOf(is.String),
  user_data: is.OptionalOf(is.Unknown),
  highlights: is.OptionalOf(is.ArrayOf(isPumHighlight)),
  columns: is.OptionalOf(is.RecordOf(is.String)),
});

export const isMessageStamp: Predicate<traq.MessageStamp> = is.ObjectOf({
  userId: is.String,
  stampId: is.String,
  count: is.Number,
  createdAt: is.String,
  updatedAt: is.String,
});

const isUserAccountState: Predicate<traq.UserAccountState> = is.UnionOf([
  // 停止
  is.LiteralOf(0),
  // 有効
  is.LiteralOf(1),
  // 一時停止
  is.LiteralOf(2),
]);

const isUser: Predicate<traq.User> = is.ObjectOf({
  id: is.String,
  name: is.String,
  displayName: is.String,
  iconFileId: is.String,
  bot: is.Boolean,
  state: isUserAccountState,
  updatedAt: is.String,
});

export const isMessage: Predicate<Message> = is.ObjectOf({
  // traq.Message
  id: is.String,
  userId: is.String,
  channelId: is.String,
  content: is.String,
  createdAt: is.String,
  updatedAt: is.String,
  pinned: is.Boolean,
  stamps: is.ArrayOf(isMessageStamp),
  threadId: is.UnionOf([is.String, is.Null]),

  user: isUser,
  position: is.OptionalOf(is.ObjectOf({
    index: is.Number,
    start: is.Number,
    end: is.Number,
    quote: is.OptionalOf(is.ArrayOf(is.ObjectOf({
      index: is.Number,
      start: is.Number,
      end: is.Number,
    }))),
  })),
  // quote?: Message[];
  quote: is.OptionalOf(is.ArrayOf((x: unknown): x is Message => isMessage(x))),
});

export const isChannelMessageOptions: Predicate<channelMessageOptions> = is
  .ObjectOf({
    id: is.String,
    channelPath: is.OptionalOf(is.String),
    limit: is.OptionalOf(is.Number),
    offset: is.OptionalOf(is.Number),
    since: is.OptionalOf(is.String),
    until: is.OptionalOf(is.String),
    inclusive: is.OptionalOf(is.Boolean),
    order: is.OptionalOf(is.LiteralOneOf(["asc", "desc"] as const)),
  });
