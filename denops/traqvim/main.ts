import { setupOAuth } from "./oauth.ts";
import {
  channelMessageOptions,
  homeChannelId,
  homeChannelPath,
  searchChannelUUID,
  sendMessage,
} from "./model.ts";
import { Denops, ensureNumber, ensureString } from "./deps.ts";
import { actionOpenActivity, actionOpenChannel } from "./action.ts";

export function main(denops: Denops) {
  // ここにプラグインの処理を記載する
  console.log("Hello Denops!");
  denops.dispatcher = {
    setup(): Promise<unknown> {
      console.log("setup...");
      return setupOAuth(denops);
    },
    async home(): Promise<unknown> {
      const homePath = await homeChannelPath();
      const homeId = await homeChannelId();
      const timelineOption: channelMessageOptions = {
        id: homeId,
        channelPath: homePath,
      };
      await actionOpenChannel(denops, timelineOption);
      return;
    },
    async timeline(args: unknown): Promise<unknown> {
      ensureString(args);
      // argsが"#gps/times/kamecha(1)"のようになっていた場合"(1)"を削除する
      const channelPath = args.replace(/\(\d+\)$/, "");
      const channelUUID = await searchChannelUUID(channelPath);
      const timelineOption: channelMessageOptions = {
        id: channelUUID,
        channelPath: channelPath,
      };
      await actionOpenChannel(denops, timelineOption);
      return;
    },
    async activity(): Promise<unknown> {
      await actionOpenActivity(denops);
      return;
    },
    async reload(bufNum: unknown, bufName: unknown): Promise<unknown> {
      // バッファ番号は被らないが、バッファ名は被る可能性がある
      ensureNumber(bufNum);
      ensureString(bufName);
      if (bufName === "Activity") {
        actionOpenActivity(denops, bufNum);
      } else {
        // バッファが"#gps/times/kamecha(1)"のように"(1)"がついている場合、
        // それを削除する
        const bufNameWithoutNumber = bufName.replace(/\(\d+\)$/, "");
        const channelUUID = await searchChannelUUID(bufNameWithoutNumber);
        const timelineOption: channelMessageOptions = {
          id: channelUUID,
          channelPath: bufNameWithoutNumber,
        };
        actionOpenChannel(denops, timelineOption, undefined, bufNum);
      }
      return;
    },
    async messageOpen(bufNum: unknown, bufName: unknown): Promise<unknown> {
      ensureNumber(bufNum);
      ensureString(bufName);
      // bufNameの先頭に#がついていなければ、何もしない
      if (bufName[0] !== "#") {
        return;
      }
      const messageBufName = "Message" + bufName.replace("#", "\\#");
      await denops.call("traqvim#make_buffer", messageBufName, "new");
      await denops.cmd(
        "setlocal buftype=nofile ft=traqvim-message nonumber breakindent",
      );
      return;
    },
    async messageSend(bufName: unknown, contents: unknown): Promise<unknown> {
      ensureString(bufName);
      console.log("bufName: " + bufName);
      const content = (contents as string[]).join("\n");
      console.log("content: " + content);
      // Message\#gps/times/kamecha → #gps/times/kamecha
      let channelPath = bufName.replace("Message#", "#");
      // #gps/times/kamecha(1) → #gps/times/kamecha
      channelPath = channelPath.replace(/\(\d+\)$/, "");
      console.log("channelPath: " + channelPath);
      const channelUUID = await searchChannelUUID(channelPath);
      console.log("channelUUID: " + channelUUID);
      await sendMessage(channelUUID, content);
      await denops.cmd(":bdelete");
      return;
    },
  };
}
