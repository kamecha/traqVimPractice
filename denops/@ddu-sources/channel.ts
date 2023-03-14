import { BaseSource, Item } from "https://deno.land/x/ddu_vim@v1.13.0/types.ts";
import type { Denops } from "https://deno.land/x/ddu_vim@v1.13.0/deps.ts";
import { ActionData } from "../@ddu-kinds/channel.ts";
import { channelsRecursive, getSubscribedChannels, getUnreadChannels } from "../traqvim/model.ts";
import { Channel } from "../traqvim/type.d.ts";

type Params = {
	type: "all" | "subscribed" | "unread";
};

export class Source extends BaseSource<Params> {
	kind = "channel";
	gather(args: {
		denops: Denops;
		sourceParams: Params;
	}): ReadableStream<Item<ActionData>[]> {
		return new ReadableStream({
			async start(controller) {
				const channels: Channel[] = await channelsRecursive();
				const subscribedChannels: Channel[] = await getSubscribedChannels();
				const unreadChannels: Channel[] = await getUnreadChannels();
				console.log(subscribedChannels);
				const items: Item<ActionData>[] = channels
					.filter((channel) => {
						switch (args.sourceParams.type) {
							case "all":
								return true;
							case "subscribed":
								return subscribedChannels.some((c) => c.id === channel.id);
							case "unread":
								return unreadChannels.some((c) => c.id === channel.id);
						}
					})
					.map((channel) => {
						return {
							word: channel.path,
						};
					});
				controller.enqueue(items);
				controller.close();
			},
		});
	}
	params(): Params {
		return {
			type: "all",
		};
	}
}
