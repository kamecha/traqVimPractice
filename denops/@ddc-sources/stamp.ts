import {
  assert,
  ddcVim,
  ddcVimSource,
  Denops,
  is,
  traq,
  vars,
} from "../traqvim/deps.ts";

import { getStamps } from "../traqvim/model.ts";
import { api } from "../traqvim/api.ts";

type Params = Record<never, never>;

export class Source extends ddcVim.BaseSource<Params> {
  async onInit(args: ddcVimSource.OnInitArguments<Params>): Promise<void> {
    const path = await vars.globals.get(args.denops, "traqvim#token_file_path");
    assert(path, is.String);
    api.tokenFilePath = path;
    return Promise.resolve();
  }

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
