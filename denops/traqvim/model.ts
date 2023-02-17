import { TraqApi, api } from "./api.ts";
import { baseUrl } from "./oauth.ts";
import { Message, User, Channel } from "./type.d.ts";

export type channelMessageOptions = {
	// channelUUID
	id?: string;
	// #gps/time/kamecha
	channelPath?: string;
	lastMessageDate?: Date;
}

// channelPathに一致するchannelのUUIDを返す
// channelPathは#で始まる
function searchChannelUUID(channels: any[], channelPath: string): string {
	// channelPathの先頭が#で始まっているかのチェック
	if (!channelPath.startsWith("#")) {
		throw new Error("channelPath must start with #");
	}
	// channelPathの先頭の#を削除
	const channelPathWituoutSharp = channelPath.slice(1);
	// channelPathの先頭の#を削除したものを/で分割
	const channelPathSplited = channelPathWituoutSharp.split("/");
	let channelUUID = "";
	const searchDFS = (baseChannels: any[], name: string[]): string | undefined => {
		if (name.length === 0) {
			return channelUUID;
		}
		const channel = baseChannels.find((channel: any) => channel.name === name[0]);
		if (!channel) {
			return undefined;
		}
		channelUUID = channel.id;
		const children = channels.filter((channel: any) => channel.parentId === channelUUID);
		return searchDFS(children, name.slice(1));
	}
	// channelsから親がいないchannelを探す
	const rootChannels = channels.filter((channel: any) => channel.parentId === null);
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
		const parentChannel = channelsJson.public.find((c: any) => c.id === channel.parentId);
		return makeChannelPath(parentChannel) + "/" + channel.name;
	}
	const channel = channelsJson.public.find((c: any) => c.id === channelUUID);
	return makeChannelPath(channel);
}

// 自身のユーザー情報を取得する
export const getMe = async (): Promise<any> => {
	const me = await api.fetchWithToken("GET", "/users/me");
	const meJson = await me.json();
	return {
		id: meJson.id,
		name: meJson.name,
		displayName: meJson.displayName,
		homeChannel: meJson.homeChannel,
	}
}

export const homeChannelPath = async (): Promise<string> => {
	const me = await getMe();
	return channelPath(me.homeChannel);
}

export const homeTimeline = async (): Promise<Message[]> => {
	const me = await getMe();
	return channelTimeline({ id: me.homeChannel });
}

// userIdからユーザー情報を取得する
export const getUser = async (userId: string): Promise<any> => {
	const user = await api.fetchWithToken("GET", "/users/" + userId);
	const userJson = await user.json();
	return {
		id: userJson.id,
		name: userJson.name,
		displayName: userJson.displayName,
	}
}

export const channelTimeline = async (
	options: channelMessageOptions,
): Promise<Message[]> => {
	let channelUUID = "";
	if (options.id) {
		channelUUID = options.id;
	}
	if (options.channelPath) {
		const channels = await api.fetchWithToken("GET", "/channels");
		const channelsJson = await channels.json();
		// channelPathに一致するchannelを探す
		channelUUID = searchChannelUUID(channelsJson.public, options.channelPath);
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
	)
	const messagesJson = await messages.json();
	const messagesConverted: Message[] = await Promise.all(
		messagesJson.map(async (message: any) => {
			// userIdからユーザー情報を取得する
			const user = await getUser(message.userId);
			return {
				displayName: user.displayName,
				content: message.content,
				createdAt: new Date(message.createdAt)
			};
		})
	);
	return messagesConverted;
}

// 再帰的にchannelを取得し、それぞれのchannelを記録
// channelsを#で始まるchannelPathに変換
export const channelsRecursive = async (
): Promise<Channel[]> => {
	const channels = await api.fetchWithToken("GET", "/channels");
	const channelsJson = await channels.json();
	const makeChannelPath = (channel: any): string => {
		if (channel.parentId === null) {
			return "#" + channel.name;
		}
		const parentChannel = channelsJson.public.find((c: any) => c.id === channel.parentId);
		return makeChannelPath(parentChannel) + "/" + channel.name;
	}
	const channelsConverted: Channel[] = channelsJson.public.map((channel: any) => {
		return {
			id: channel.id,
			path: makeChannelPath(channel)
		};
	});
	return channelsConverted;
}

// activityを取得する
export const activity = async (): Promise<Message[]> => {
	const activities = await api.fetchWithToken("GET", "/activity/timeline");
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
				createdAt: createdAt
			}
		})
	);
	return activitiesConverted;
}
