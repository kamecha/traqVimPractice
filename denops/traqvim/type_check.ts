import { as, ddcVim, is, Predicate, traq } from "./deps.ts";
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
  abbr: as.Optional(is.String),
  menu: as.Optional(is.String),
  info: as.Optional(is.String),
  kind: as.Optional(is.String),
  user_data: as.Optional(is.Unknown),
  highlights: as.Optional(is.ArrayOf(isPumHighlight)),
  columns: as.Optional(is.RecordOf(is.String)),
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
  position: as.Optional(is.ObjectOf({
    index: is.Number,
    start: is.Number,
    end: is.Number,
    quote: as.Optional(is.ArrayOf(is.ObjectOf({
      index: is.Number,
      start: is.Number,
      end: is.Number,
    }))),
  })),
  // quote?: Message[];
  quote: as.Optional(is.ArrayOf((x: unknown): x is Message => isMessage(x))),
});

export const isChannelMessageOptions: Predicate<channelMessageOptions> = is
  .ObjectOf({
    id: is.String,
    channelPath: as.Optional(is.String),
    limit: as.Optional(is.Number),
    offset: as.Optional(is.Number),
    since: as.Optional(is.String),
    until: as.Optional(is.String),
    inclusive: as.Optional(is.Boolean),
    order: as.Optional(is.LiteralOneOf(["asc", "desc"] as const)),
  });
