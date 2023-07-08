import { ddcVim, traq, Denops } from "../traqvim/deps.ts";

import { getStamps } from "../traqvim/model.ts";

type Params = Record<never, never>;

export class Source extends ddcVim.BaseSource<Params> {
  override async gather(): Promise<ddcVim.Item[]> {
    const stamps: traq.Stamp[] = await getStamps();
    return stamps
      .filter((stamp) => stamp.name)
      .map((stamp) => {
        return {
          word: ":" + stamp.name + ":",
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
