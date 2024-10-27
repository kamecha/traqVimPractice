import { api } from "./api.ts";
import { Channel, Message, UnreadChannel } from "./type.d.ts";
import { ensure, is, traq } from "./deps.ts";

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

const UserMapCache = new Map<string, traq.UserDetail>();

const StampMapCache = new Map<string, traq.Stamp>();

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

// channelPathに対応するchannelUUIDを生成する
export const channelUUID = async (
  channelPath: string[],
  depth: number = 0,
  children: traq.Channel[] = [],
): Promise<string | undefined> => {
  if (channelPath.length === 0) {
    return undefined;
  }
  // 最初のchannelPathを取得
  if (depth === 0 && children.length === 0) {
    if (getChannelMapCache().size === 0) {
      const channelsRes = await api.api.getChannels();
      const channels = channelsRes.data.public;
      channels.forEach((channel: traq.Channel) => {
        setCacheChannel(channel);
      });
    }
    getChannelMapCache().forEach((channel: traq.Channel) => {
      if (channel.parentId === null) {
        children.push(channel);
      }
    });
  }
  // 末端のチャンネルを返す
  if (channelPath.length === depth + 1) {
    const channel = children.find((channel: traq.Channel) => {
      return channel.name === channelPath[depth];
    });
    return channel?.id;
  }
  const channelName = channelPath[depth];
  const channel = children.find((channel: traq.Channel) => {
    return channel.name === channelName;
  });
  const chans = channel?.children
    .map((childId: string) => {
      return getCacheChannel(childId);
    })
    .filter((channel: traq.Channel | undefined) => {
      return channel !== undefined;
    });
  return channelUUID(
    channelPath,
    depth + 1,
    chans,
  );
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
  return ensure(me.homeChannel, is.String);
};

// userIdからユーザー情報を取得する
export const getUser = async (userId: string): Promise<traq.User> => {
  let userDetail: traq.UserDetail | undefined = UserMapCache.get(userId);
  if (userDetail === undefined) {
    const userRes = await api.api.getUser(userId);
    userDetail = userRes.data;
    UserMapCache.set(userId, userDetail);
  }
  // TODO: もっと良い変換方法ありそうなんで、見つけたらやっとく
  const user: traq.User = {
    id: userDetail.id,
    name: userDetail.name,
    displayName: userDetail.displayName,
    iconFileId: userDetail.iconFileId,
    bot: userDetail.bot,
    state: userDetail.state,
    updatedAt: userDetail.updatedAt,
  };
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
        const ret: Message = {
          ...message,
          user: user,
        };
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
              };
              return ret;
            }),
          );
        }
        if (quotedMessages !== undefined) {
          ret.quote = quotedMessages;
        }
        return ret;
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
      };
    }),
  );
  return activitiesConverted;
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

export const getStamps = async (): Promise<traq.Stamp[]> => {
  const stampsRes = await api.api.getStamps();
  const stamps = stampsRes.data;
  stamps.forEach((stamp: traq.Stamp) => {
    StampMapCache.set(stamp.id, stamp);
  });
  return stamps;
};

export const getStamp = async (
  stampId: string,
): Promise<traq.Stamp> => {
  let stamp: traq.Stamp | undefined = StampMapCache.get(stampId);
  if (stamp === undefined) {
    const stampRes = await api.api.getStamp(stampId);
    stamp = stampRes.data;
    StampMapCache.set(stampId, stamp);
  }
  return stamp;
};

export const downloadFile = async (
  fileId: string,
): Promise<Uint8Array> => {
  try {
    const fileRes = await api.fetchWithToken(
      "GET",
      "/files/" + fileId,
      {},
    );
    const blob = await fileRes.blob();
    return new Uint8Array(await blob.arrayBuffer());
  } catch (e) {
    console.error(e);
  }
  return new Uint8Array();
};

export const getStampId = async (
  stampName: string,
): Promise<string | undefined> => {
  const stamps = await getStamps();
  const stamp = stamps.find((stamp: traq.Stamp) => {
    return stamp.name === stampName;
  });
  return stamp?.id;
};

export const getMessageStamps = async (
  messageId: string,
): Promise<traq.MessageStamp[]> => {
  const stmpasRes = await api.api.getMessageStamps(messageId);
  return stmpasRes.data;
};

export const addMessageStamp = async (
  messageId: string,
  stampId: string,
): Promise<void> => {
  try {
    // TODO: postだから失敗するかも
    await api.api.addMessageStamp(messageId, stampId);
  } catch (e) {
    console.error(e);
  }
};

export const removeMessageStamp = async (
  messageId: string,
  stampId: string,
): Promise<void> => {
  try {
    // TODO: postだから失敗するかも
    await api.api.removeMessageStamp(messageId, stampId);
  } catch (e) {
    console.error(e);
  }
};
