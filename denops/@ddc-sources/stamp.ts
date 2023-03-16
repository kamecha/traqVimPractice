import { ddcVim } from "../traqvim/deps.ts";

import { Denops } from "https://deno.land/x/ddc_vim@v3.4.0/deps.ts";
import { getStamps, stamp } from "../traqvim/model.ts";

type Params = Record<never, never>;

export class Source extends ddcVim.BaseSource<Params> {
	override async gather(args: {
		denops: Denops;
		options: ddcVim.DdcOptions;
		sourceOptions: ddcVim.SourceOptions;
		sourceParams: Params;
		completeStr: string;
	}): Promise<ddcVim.Item[]> {
		const stamps: stamp[] = await getStamps();
		return stamps
			.filter((stamp) => stamp.word)
			.map((stamp) => {
				return {
					word: ":" + stamp.word + ":",
				} as ddcVim.Item;
			});
	}

	override getCompletePosition(args: {
		denops: Denops;
		context: ddcVim.Context;
	}): Promise<number> {
		const matchPos = args.context.input.search(
			new RegExp("(?:" + ":\\w*" + ")$"),
		);
		const completePos = matchPos != null ? matchPos : -1;
		return Promise.resolve(completePos);
	}

	override params(): Params {
		return {};
	}
}
