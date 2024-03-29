import { api } from "./api.ts";
import { Channel, Message, UnreadChannel } from "./type.d.ts";
import { traq } from "./deps.ts";

export type channelMessageOptions = {
  // channelUUID
  id: string;
  // #gps/time/kamecha
  channelPath?: string;
  limit?: number;
  offset?: number;
  since?: string;
  until?: string;
  inclusive?: boolean;
  order?: "asc" | "desc";
};

// TODO: ↓チャンネル周りはclassに分離しても良いかも
const channelMapCache: Map<string, traq.Channel> = new Map();

const getChannelMapCache = () => {
  return channelMapCache;
};

const makeChannelMapCache = async () => {
  const channelsRes = await api.api.getChannels();
  const channels = channelsRes.data;
  channels.public.forEach((channel: traq.Channel) => {
    setCacheChannel(channel);
  });
};

const setCacheChannel = (channel: traq.Channel) => {
  channelMapCache.set(channel.id, channel);
};

const getCacheChannel = (channelId: string): traq.Channel | undefined => {
  return channelMapCache.get(channelId);
};

const makeChannelPath = (
  channelCache: Map<string, traq.Channel>,
  channelId: string,
): string => {
  if (getCacheChannel(channelId) === undefined) {
    throw new Error("channel not found");
  }
  const parentId = getCacheChannel(channelId)?.parentId;
  if (parentId === null || parentId === undefined) {
    return "#" + getCacheChannel(channelId)?.name;
  } else {
    return (
      makeChannelPath(channelCache, parentId) + "/" +
      getCacheChannel(channelId)?.name
    );
  }
};

// channelUUIDに対応するchannelPathを生成する
export const channelPath = async (channelUUID: string): Promise<string> => {
  if (getCacheChannel(channelUUID) === undefined) {
    await makeChannelMapCache();
  }
  return makeChannelPath(getChannelMapCache(), channelUUID);
};

// 自身のユーザー情報を取得する
export const getMeInfo = async (): Promise<traq.MyUserDetail> => {
  const meRes = await api.api.getMe();
  const me: traq.MyUserDetail = meRes.data;
  return me;
};

export const homeChannelPath = async (): Promise<string> => {
  const me = await getMeInfo();
  if (me.homeChannel === null) {
    return "";
  }
  return channelPath(me.homeChannel);
};

export const homeChannelId = async (): Promise<string> => {
  const me = await getMeInfo();
  if (me.homeChannel === null) {
    return "";
  }
  return me.homeChannel as string;
};

// userIdからユーザー情報を取得する
export const getUser = async (userId: string): Promise<traq.User> => {
  const userRes = await api.api.getUser(userId);
  const user = userRes.data;
  return user;
};

export const channelTimeline = async (
  options: channelMessageOptions,
): Promise<Message[]> => {
  const messagesRes = await api.api.getMessages(
    options.id,
    options.limit,
    options.offset,
    options.since,
    options.until,
    options.inclusive,
    options.order,
  );
  // messageResからメッセージを取り出す
  const messages = messagesRes.data;
  // const messagesJson = await messages.json();
  const messagesConverted: Message[] = await Promise.all(
    messages
      .reverse()
      .map(async (message: traq.Message) => {
        // userIdからユーザー情報を取得する
        const user = await getUser(message.userId);
        // contentのうち引用してる箇所を判定し、対応するUUIDを記録する
        // 引用URLはhttps://q.trap.jp/messages/UUIDの形式である

        const quotedMessageUUIDs: string[] | undefined = message.content.match(
          /https:\/\/q.trap.jp\/messages\/[0-9a-f-]+/g,
        )?.map((url: string) => {
          return url.split("/").slice(-1)[0];
        });
        // quotedMessageUUIDsが存在しなかった場合はundefinedを返す
        let quotedMessages: Message[] | undefined = undefined;
        if (quotedMessageUUIDs) {
          quotedMessages = await Promise.all(
            quotedMessageUUIDs?.map(async (uuid: string) => {
              const quotedMessageRes = await api.api.getMessage(uuid);
              const quotedMessage = quotedMessageRes.data;
              // userIdからユーザー情報を取得する
              const user = await getUser(quotedMessage.userId);
              const ret: Message = {
                ...quotedMessage,
                user: user,
                createdAt: new Date(quotedMessage.createdAt).toLocaleString(
                  "ja-JP",
                ),
              };
              return ret;
            }),
          );
        }
        return {
          ...message,
          user: user,
          createdAt: new Date(message.createdAt).toLocaleString("ja-JP"),
          quote: quotedMessages,
        };
      }),
  );
  return messagesConverted;
};

// 再帰的にchannelを取得し、それぞれのchannelを記録
// channelsを#で始まるchannelPathに変換
export const channelsRecursive = async (): Promise<Channel[]> => {
  const channelsRes = await api.api.getChannels();
  const publicChannels = channelsRes.data.public;
  publicChannels.forEach((channel: traq.Channel) => {
    if (getCacheChannel(channel.id) === undefined) {
      setCacheChannel(channel);
    }
  });
  const channelsConverted: Channel[] = publicChannels.map(
    (channel: traq.Channel) => {
      return {
        ...channel,
        path: makeChannelPath(getChannelMapCache(), channel.id),
      };
    },
  );
  return channelsConverted;
};

// 未読チャンネルの取得
export const getUnreadChannels = async (): Promise<UnreadChannel[]> => {
  const unreadChannelsRes = await api.api.getMyUnreadChannels();
  const unreadChannels = unreadChannelsRes.data;
  const unreadChannelsConverted: UnreadChannel[] = await Promise.all(
    unreadChannels.map(async (channel: traq.UnreadChannel) => {
      const path = await channelPath(channel.channelId);
      return {
        ...channel,
        path: path,
      };
    }),
  );
  return unreadChannelsConverted;
};

// activityを取得する
export const activity = async (): Promise<Message[]> => {
  const activityRes = await api.api.getActivityTimeline(undefined, true);
  const activity: traq.ActivityTimelineMessage[] = activityRes.data;
  const activitiesConverted: Message[] = await Promise.all(
    activity.map(async (activity: traq.ActivityTimelineMessage) => {
      const user = await getUser(activity.userId);
      const messageRes = await api.api.getMessage(activity.id);
      const message = messageRes.data;
      return {
        ...message,
        user: user,
        createdAt: new Date(activity.createdAt).toLocaleString("ja-JP"),
      };
    }),
  );
  return activitiesConverted;
};

// stamp情報の取得
export const getStamps = async (): Promise<traq.Stamp[]> => {
  const stampsRes = await api.api.getStamps();
  const stamps = stampsRes.data;
  return stamps;
};

export const sendMessage = async (
  channelUUID: string,
  content: string,
): Promise<void> => {
  const message: traq.PostMessageRequest = {
    content: content,
    embed: false,
  };
  const messagesJson = JSON.stringify(message);
  try {
    // POSTに関しては、deno&npm経由だとcontent-length等々がうまくいかないらしく、
    // APIを直打ちする必要がある
    await api.fetchWithToken(
      "POST",
      "/channels/" + channelUUID + "/messages",
      {},
      messagesJson,
    );
  } catch (e) {
    console.error(e);
  }
};

export const deleteMessage = async (
  messageId: string,
): Promise<void> => {
  try {
    await api.api.deleteMessage(messageId);
  } catch (e) {
    console.error(e);
  }
};

export const editMessage = async (
  messageId: string,
  content: string,
): Promise<void> => {
  const message: traq.PostMessageRequest = {
    content: content,
    embed: false,
  };
  const messagesJson = JSON.stringify(message);
  try {
    // POSTに関しては、deno&npm経由だとcontent-length等々がうまくいかないらしく、
    // APIを直打ちする必要がある
    await api.fetchWithToken(
      "PUT",
      "/messages/" + messageId,
      {},
      messagesJson,
    );
  } catch (e) {
    console.error(e);
  }
};

export const createPin = async (
  messageId: string,
): Promise<void> => {
  try {
    await api.api.createPin(messageId);
  } catch (e) {
    console.error(e);
  }
};

export const removePin = async (
  messageId: string,
): Promise<void> => {
  try {
    await api.api.removePin(messageId);
  } catch (e) {
    console.error(e);
  }
};
