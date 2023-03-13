import { api, TraqApi } from "./api.ts";
import { baseUrl } from "./oauth.ts";
import { Channel, Message, User } from "./type.d.ts";

export type channelMessageOptions = {
	// channelUUID
	id?: string;
	// #gps/time/kamecha
	channelPath?: string;
	lastMessageDate?: Date;
};

export type stamp = {
	id?: string;
	word?: string;
	isUnicode?: boolean;
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
	const channelsPromise = await api.fetchWithToken("GET", "/channels");
	const channelsJson = await channelsPromise.json();
	const channels = channelsJson.public;
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
	const channels = await api.fetchWithToken("GET", "/channels");
	const channelsJson = await channels.json();
	const makeChannelPath = (channel: any): string => {
		if (channel.parentId === null) {
			return "#" + channel.name;
		}
		const parentChannel = channelsJson.public.find((c: any) =>
			c.id === channel.parentId
		);
		return makeChannelPath(parentChannel) + "/" + channel.name;
	};
	const channel = channelsJson.public.find((c: any) => c.id === channelUUID);
	return makeChannelPath(channel);
};

// 自身のユーザー情報を取得する
export const getMe = async (): Promise<any> => {
	const me = await api.fetchWithToken("GET", "/users/me");
	const meJson = await me.json();
	return {
		id: meJson.id,
		name: meJson.name,
		displayName: meJson.displayName,
		homeChannel: meJson.homeChannel,
	};
};

export const homeChannelPath = async (): Promise<string> => {
	const me = await getMe();
	return channelPath(me.homeChannel);
};

export const homeTimeline = async (): Promise<Message[]> => {
	const me = await getMe();
	return channelTimeline({ id: me.homeChannel });
};

// userIdからユーザー情報を取得する
export const getUser = async (userId: string): Promise<any> => {
	const user = await api.fetchWithToken("GET", "/users/" + userId);
	const userJson = await user.json();
	return {
		id: userJson.id,
		name: userJson.name,
		displayName: userJson.displayName,
	};
};

export const channelTimeline = async (
	options: channelMessageOptions,
): Promise<Message[]> => {
	let channelUUID = "";
	if (options.id) {
		channelUUID = options.id;
	}
	if (options.channelPath) {
		// channelPathに一致するchannelを探す
		channelUUID = await searchChannelUUID(options.channelPath);
	}
	// 以前取得したメッセージがあれば、その日付以降のメッセージを取得する
	const query: any = {};
	if (options.lastMessageDate) {
		query.until = options.lastMessageDate;
	}
	// UUIDを使ってメッセージを取得する
	const messages = await api.fetchWithToken(
		"GET",
		"/channels/" + channelUUID + "/messages",
		query,
	);
	const messagesJson = await messages.json();
	const messagesConverted: Message[] = await Promise.all(
		messagesJson.map(async (message: any) => {
			// userIdからユーザー情報を取得する
			const user = await getUser(message.userId);
			// contentのうち引用してる箇所を判定し、対応するUUIDを記録する
			// 引用URLはhttps://q.trap.jp/messages/UUIDの形式である
			const quotedMessageUUIDs: string[] = message.content.match(
				/https:\/\/q.trap.jp\/messages\/[0-9a-f-]+/g,
			)?.map((url: string) => {
				return url.split("/").slice(-1)[0];
			});
			// quotedMessageUUIDsが存在しなかった場合はundefinedを返す
			let quotedMessages: Message[] | undefined = undefined;
			if (quotedMessageUUIDs) {
				quotedMessages = await Promise.all(
					quotedMessageUUIDs?.map(async (uuid: string) => {
						const quotedMessage = await api.fetchWithToken(
							"GET",
							"/messages/" + uuid,
						);
						const quotedMessageJson = await quotedMessage.json();
						// userIdからユーザー情報を取得する
						const user = await getUser(quotedMessageJson.userId);
						return {
							displayName: user.displayName,
							content: quotedMessageJson.content,
							createdAt: new Date(quotedMessageJson.createdAt),
						}
					})
				)
			}
			return {
				displayName: user.displayName,
				content: message.content,
				createdAt: new Date(message.createdAt),
				quote: quotedMessages,
			};
		}),
	);
	return messagesConverted;
};

// 再帰的にchannelを取得し、それぞれのchannelを記録
// channelsを#で始まるchannelPathに変換
export const channelsRecursive = async (): Promise<Channel[]> => {
	const channels = await api.fetchWithToken("GET", "/channels");
	const channelsJson = await channels.json();
	const makeChannelPath = (channel: any): string => {
		if (channel.parentId === null) {
			return "#" + channel.name;
		}
		const parentChannel = channelsJson.public.find((c: any) =>
			c.id === channel.parentId
		);
		return makeChannelPath(parentChannel) + "/" + channel.name;
	};
	const channelsConverted: Channel[] = channelsJson.public.map(
		(channel: any) => {
			return {
				id: channel.id,
				path: makeChannelPath(channel),
			};
		},
	);
	return channelsConverted;
};

// activityを取得する
export const activity = async (): Promise<Message[]> => {
	const activities = await api.fetchWithToken(
		"GET",
		"/activity/timeline",
		{
			all: true,
		},
	);
	const activitiesJson = await activities.json();
	const activitiesConverted: Message[] = await Promise.all(
		activitiesJson.map(async (activity: any) => {
			const displayNameJson = await getUser(activity.userId);
			const displayName = displayNameJson.displayName;
			const content = activity.content;
			const createdAt = new Date(activity.createdAt);
			return {
				displayName: displayName,
				content: content,
				createdAt: createdAt,
			};
		}),
	);
	return activitiesConverted;
};

// messageの送信
export const sendMessage = async (
	channelUUID: string,
	content: string,
): Promise<void> => {
	const message = {
		content: content,
		embed: false,
	};
	const messagesJson = JSON.stringify(message);
	console.log(messagesJson);
	try {
		await api.fetchWithToken(
			"POST",
			"/channels/" + channelUUID + "/messages",
			{},
			messagesJson,
		);
	} catch (e) {
		console.log(e);
	}
};

// stamp情報の取得
export const getStamps = async (): Promise<stamp[]> => {
	const stamps = await api.fetchWithToken(
		"GET",
		"/stamps",
	);
	const stampsJson = await stamps.json();
	const ret: stamp[] = stampsJson.map((stamp: any) => {
		return {
			id: stamp.id,
			word: stamp.name,
			isUnicode: stamp.isUnicode,
		};
	});
	return ret;
};
