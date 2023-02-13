import { TraqApi, api } from "./api.ts";
import { baseUrl } from "./oauth.ts";
import { Message, User } from "./type.d.ts";

export type channelMessageOptions = {
	// #gps/time/kamecha
	channelPath: string;
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
	const channels = await api.fetchWithToken("GET", "/channels");
	const channelsJson = await channels.json();
	// channelPathに一致するchannelを探す
	const channelUUID = searchChannelUUID(channelsJson.public, options.channelPath);
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
