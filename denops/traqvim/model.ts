import { api, TraqApi } from "./api.ts";
import { baseUrl } from "./oauth.ts";
import { Channel, Message, User } from "./type.d.ts";
import { traq } from "./deps.ts";

export type channelMessageOptions = {
	// channelUUID
	id: string;
	// #gps/time/kamecha
	channelPath?: string;
	lastMessageDate?: Date;
};

// channelPathに一致するchannelのUUIDを返す
// channelPathは#で始まる
export async function searchChannelUUID(channelPath: string): Promise<string> {
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
		baseChannels: any[],
		name: string[],
	): string | undefined => {
		if (name.length === 0) {
			return channelUUID;
		}
		const channel = baseChannels.find((channel: any) =>
			channel.name === name[0]
		);
		if (!channel) {
			return undefined;
		}
		channelUUID = channel.id;
		const children = channels.filter((channel: any) =>
			channel.parentId === channelUUID
		);
		return searchDFS(children, name.slice(1));
	};
	// channelsから親がいないchannelを探す
	const rootChannels = channels.filter((channel: any) =>
		channel.parentId === null
	);
	const result = searchDFS(rootChannels, channelPathSplited);
	if (!result) {
		throw new Error("channel not found");
	}
	return result;
}

// channelUUIDに対応するchannelPathを生成する
export const channelPath = async (channelUUID: string): Promise<string> => {
	const channelsRes = await api.api.getChannels();
	const publicChannels = channelsRes.data.public;
	const makeChannelPath = (channel: any): string => {
		if (channel.parentId === null) {
			return "#" + channel.name;
		}
		const parentChannel = publicChannels.find((c: any) =>
			c.id === channel.parentId
		);
		return makeChannelPath(parentChannel) + "/" + channel.name;
	};
	const channel = publicChannels.find((c: any) => c.id === channelUUID);
	return makeChannelPath(channel);
};

// 自身のユーザー情報を取得する
export const getMeInfo = async (): Promise<any> => {
	const meRes = await api.api.getMe();
	const me: traq.MyUserDetail = meRes.data;
	return {
		id: me.id,
		name: me.name,
		displayName: me.displayName,
		homeChannel: me.homeChannel,
	};
};

export const homeChannelPath = async (): Promise<string> => {
	const me = await getMeInfo();
	return channelPath(me.homeChannel);
};

export const homeChannelId = async (): Promise<string> => {
	const me = await getMeInfo();
	return me.homeChannel as string;
};

// userIdからユーザー情報を取得する
export const getUser = async (userId: string): Promise<User> => {
	const userRes = await api.api.getUser(userId);
	const user = userRes.data;
	return user;
};

export const channelTimeline = async (
	options: channelMessageOptions,
): Promise<Message[]> => {
	const channelUUID = options.id;
	// 以前取得したメッセージがあれば、その日付以降のメッセージを取得する
	const query: any = {};
	if (options.lastMessageDate) {
		query.until = options.lastMessageDate;
	}
	const messagesRes = await api.api.getMessages(channelUUID);
	// messageResからメッセージを取り出す
	const messages = messagesRes.data;
	// const messagesJson = await messages.json();
	const messagesConverted: Message[] = await Promise.all(
		messages.map(async (message: traq.Message) => {
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
						return {
							user: user,
							content: quotedMessage.content,
							createdAt: new Date(quotedMessage.createdAt).toLocaleString(
								"ja-JP",
							),
						};
					}),
				);
			}
			return {
				user: user,
				content: message.content,
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
	console.log("channelsRecursive");
	const channelsRes = await api.api.getChannels();
	const publicChannels = channelsRes.data.public;
	const makeChannelPath = (channel: traq.Channel): string => {
		if (channel.parentId === null) {
			return "#" + channel.name;
		}
		const parentChannel = publicChannels.find((c: traq.Channel) =>
			c.id === channel.parentId
		);
		return makeChannelPath(parentChannel) + "/" + channel.name;
	};
	const channelsConverted: Channel[] = publicChannels.map(
		(channel: traq.Channel) => {
			return {
				id: channel.id,
				path: makeChannelPath(channel),
			};
		},
	);
	return channelsConverted;
};

// 未読チャンネルの取得
export const getUnreadChannels = async (): Promise<Channel[]> => {
	const unreadChannelsRes = await api.api.getMyUnreadChannels();
	const unreadChannels = unreadChannelsRes.data;
	const unreadChannelsConverted: Channel[] = Promise.all(
		unreadChannels.map(async (channel: traq.UnreadChannel) => {
			const path = await channelPath(channel.channelId);
			return {
				...channel,
				id: channel.channelId,
				path: path,
			}
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
			return {
				user: user,
				content: activity.content,
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
	}
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

