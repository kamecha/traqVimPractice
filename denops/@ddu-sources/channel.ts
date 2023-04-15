import { dduVim, Denops } from "../traqvim/deps.ts";
import { ActionData } from "../@ddu-kinds/channel.ts";
import {
	channelsRecursive,
	getUnreadChannels,
	searchChannelUUID,
} from "../traqvim/model.ts";
import { Channel, UnreadChannel } from "../traqvim/type.d.ts";

export class Source extends dduVim.BaseSource<Params> {
	kind = "channel";
	override gather(args: {
		denops: Denops;
		sourceOptions: dduVim.SourceOptions;
	}): ReadableStream<dduVim.Item<ActionData>[]> {
		return new ReadableStream({
			async start(controller) {
				const rootPath = args.sourceOptions.path;
				// #gps/times/kamecha から対象のChannelIDを抽出
				let rootId: string = rootPath === "VtraQ" ? "VtraQ" : "";
				if (rootId === "") {
					rootId = await searchChannelUUID(rootPath);
				}
				const tree = async (rootId: string) => {
					let items: dduVim.Item<ActionData>[] = [];
					const channels: Channel[] = await channelsRecursive();
					// 一番上の階層対応
					if (rootId === "VtraQ") {
						const parentChannels = channels.filter((channel: Channel) => {
							return channel.parentId === null;
						});
						parentChannels.forEach((channel: Channel) => {
							items.push({
								word: channel.path + (channel.children.length === 0 ? "" : "/"),
								action: {
									id: channel.id,
								},
								isTree: true,
								treePath: channel.path,
							});
						});
						return items;
					}
					const rootChannel: Channel = channels.find((channel: Channel) => {
						return channel.id === rootId;
					});
					rootChannel.children.forEach((id: string) => {
						const childrenChannel = channels.find((channel: Channel) => {
							return channel.id === id;
						});
						if (childrenChannel === undefined) {
							return;
						}
						items.push({
							word: (childrenChannel.path.split("/").pop() ?? "") +								(childrenChannel.children.length === 0 ? "" : "/"),
							action: {
								id: childrenChannel.id,
							},
							isTree: childrenChannel.children.length !== 0,
							treePath: childrenChannel.path,
						});
					});
					return items;
				};
				controller.enqueue(
					await tree(rootId),
				);
				controller.close();
			},
		});
	}
	params(): Params {
		return {};
	}
}
