import { is, Predicate, traq } from "./deps.ts";
import { Message } from "./type.d.ts";

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
  })),
  // quote?: Message[];
  quote: is.OptionalOf(is.ArrayOf((x: unknown): x is Message => isMessage(x))),
});
