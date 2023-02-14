import {
	BaseSource,
	Item,
} from "https://deno.land/x/ddu_vim@v1.13.0/types.ts";
import type { Denops } from "https://deno.land/x/ddu_vim@v1.13.0/deps.ts";
import { ActionData } from "https://deno.land/x/ddu_kind_file@v0.3.2/file.ts";
import { channelsRecursive } from "../traqvim/model.ts";

type Params = {
	// ...
};

export class Source extends BaseSource<Params> {
	gather(args: {
		denops: Denops;
		sourceParams: Params;
	}): ReadableStream<Item<ActionData>[]> {
		return new ReadableStream({
			async start(controller) {
				const channels = await channelsRecursive();
				const items: Item<ActionData>[] = channels.map((channel) => {
					return {
						word: channel.path,
						action: {
							name: "traqvim#channel#open",
							args: [channel.id],
						},
					};
				});
				controller.enqueue(items);
				controller.close();
			},
		});
	}
	params(): Params {
		return {};
	}
}
