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

// channelPathに一致するchannelのUUIDを返す
// channelPathは#で始まる
export async function searchChannelUUID(channelPath: string): Promise<string> {
  if (api.api === undefined) {
    throw new Error("api is undefined");
  }
  // channelPathの先頭が#で始まっているかのチェック
  if (!channelPath.startsWith("#")) {
    throw new Error("channelPath must start with #");
  }
  // channelPathの先頭の#を削除
  const channelPathWituoutSharp = channelPath.slice(1);
  // channelPathの先頭の#を削除したものを/で分割
  const channelPathSplited = channelPathWituoutSharp.split("/");
  const channelsRes = await api.api.getChannels();
  // const channelsJson = await channelsPromise.json();
  const channels = channelsRes.data.public;
  let channelUUID = "";
  const searchDFS = (
    baseChannels: traq.Channel[],
    name: string[],
  ): string | undefined => {
    if (name.length === 0) {
      return channelUUID;
    }
    const channel = baseChannels.find((channel: traq.Channel) =>
      channel.name === name[0]
    );
    if (!channel) {
      return undefined;
    }
    channelUUID = channel.id;
    const children = channels.filter((channel: traq.Channel) =>
      channel.parentId === channelUUID
    );
    return searchDFS(children, name.slice(1));
  };
  // channelsから親がいないchannelを探す
  const rootChannels = channels.filter((channel: traq.Channel) =>
    channel.parentId === null
  );
  const result = searchDFS(rootChannels, channelPathSplited);
  if (!result) {
    throw new Error("channel not found");
  }
  return result;
}

const makeChannelPath = (
  channels: traq.Channel[],
  channel: traq.Channel,
): string => {
  const parentChannel = channels.find((c: traq.Channel) =>
    c.id === channel.parentId
  );
  if (!parentChannel) {
    return "#" + channel.name;
  } else {
    return makeChannelPath(channels, parentChannel) + "/" + channel.name;
  }
};

// channelUUIDに対応するchannelPathを生成する
export const channelPath = async (channelUUID: string): Promise<string> => {
  if (api.api === undefined) {
    throw new Error("api is undefined");
  }
  const channelsRes = await api.api.getChannels();
  const publicChannels = channelsRes.data.public;
  const channel = publicChannels.find((c: traq.Channel) =>
    c.id === channelUUID
  );
  if (!channel) {
    return "";
  } else {
    return makeChannelPath(publicChannels, channel);
  }
};

// 自身のユーザー情報を取得する
export const getMeInfo = async (): Promise<traq.MyUserDetail> => {
  if (api.api === undefined) {
    throw new Error("api is undefined");
  }
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
  if (api.api === undefined) {
    throw new Error("api is undefined");
  }
  const userRes = await api.api.getUser(userId);
  const user = userRes.data;
  return user;
};

export const channelTimeline = async (
  options: channelMessageOptions,
): Promise<Message[]> => {
  if (api.api === undefined) {
    throw new Error("api is undefined");
  }
  const now = new Date();
  console.log(now.toISOString());
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
              if (api.api === undefined) {
                throw new Error("api is undefined");
              }
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
  if (api.api === undefined) {
    throw new Error("api is undefined");
  }
  const channelsRes = await api.api.getChannels();
  const publicChannels = channelsRes.data.public;
  const channelsConverted: Channel[] = publicChannels.map(
    (channel: traq.Channel) => {
      return {
        ...channel,
        path: makeChannelPath(publicChannels, channel),
      };
    },
  );
  return channelsConverted;
};

// 未読チャンネルの取得
export const getUnreadChannels = async (): Promise<UnreadChannel[]> => {
  if (api.api === undefined) {
    throw new Error("api is undefined");
  }
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
  if (api.api === undefined) {
    throw new Error("api is undefined");
  }
  const activityRes = await api.api.getActivityTimeline(undefined, true);
  const activity: traq.ActivityTimelineMessage[] = activityRes.data;
  const activitiesConverted: Message[] = await Promise.all(
    activity.map(async (activity: traq.ActivityTimelineMessage) => {
      if (api.api === undefined) {
        throw new Error("api is undefined");
      }
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
  if (api.api === undefined) {
    throw new Error("api is undefined");
  }
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
    console.log(e.response);
  }
};
