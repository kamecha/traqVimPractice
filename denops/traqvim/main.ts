import { OAuth } from "./oauth.ts";
import {
  channelMessageOptions,
  channelTimeline,
  homeChannelId,
  homeChannelPath,
  searchChannelUUID,
  sendMessage,
} from "./model.ts";
import {
  Denops,
  ensureArray,
  ensureNumber,
  ensureString,
  fn,
  helper,
  vars,
} from "./deps.ts";
import {
  actionBackChannelMessage,
  actionForwardChannelMessage,
  actionOpenActivity,
  actionOpenChannel,
} from "./action.ts";
import { Message } from "./type.d.ts";

export function main(denops: Denops) {
  // oauthの仮オブジェクト
  let oauth: OAuth;
  helper.echo(denops, "Hello Denops!");
  denops.dispatcher = {
    setupOAuth(): Promise<unknown> {
      helper.echo(denops, "setup...");
      // OAuthの設定を行う
      oauth = new OAuth(denops);
      return oauth.setupOAuth();
    },
    closeOAuth(): Promise<unknown> {
      helper.echo(denops, "close...");
      oauth.closeApp();
      return Promise.resolve();
    },
    checkOAuthListen(): Promise<unknown> {
      helper.echo(denops, "check...");
      return Promise.resolve(oauth.isAppListening());
    },
    async home(): Promise<unknown> {
      const homePath = await homeChannelPath();
      const homeId = await homeChannelId();
      const timelineOption: channelMessageOptions = {
        id: homeId,
        channelPath: homePath,
        limit: await vars.globals.get(denops, "traqvim#fetch_limit"),
        until: new Date().toISOString(),
        order: "desc",
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
        limit: await vars.globals.get(denops, "traqvim#fetch_limit"),
        until: new Date().toISOString(),
        order: "desc",
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
          limit: await vars.globals.get(denops, "traqvim#fetch_limit"),
          until: new Date().toISOString(),
          order: "desc",
        };
        actionOpenChannel(denops, timelineOption, undefined, bufNum);
      }
      return;
    },
    async messageForward(bufNum: unknown, bufName: unknown): Promise<unknown> {
      ensureNumber(bufNum);
      ensureString(bufName);
      // 対応するバッファのメッセージの新しいメッセージの日付を取得
      try {
        const timeline = await vars.buffers.get(denops, "channelTimeline");
        ensureArray<Message>(timeline);
        const bufNameWithoutNumber = bufName.replace(/\(\d+\)$/, "");
        const channelUUID = await searchChannelUUID(bufNameWithoutNumber);
        // 最後のメッセージの内容
        const timelineOption: channelMessageOptions = {
          id: channelUUID,
          channelPath: bufNameWithoutNumber,
          limit: await vars.globals.get(denops, "traqvim#fetch_limit"),
          since: new Date(timeline[timeline.length - 1].createdAt)
            .toISOString(),
        };
        const forwardTimeline: Message[] = await channelTimeline(
          timelineOption,
        );
        await actionForwardChannelMessage(
          denops,
          // 一番古いメッセージを削除
          forwardTimeline.filter((message: Message) => {
            return message.createdAt !==
              timeline[timeline.length - 1].createdAt;
          }),
          bufNum,
        );
      } catch (e) {
        console.log(e);
        return;
      }
    },
    async messageBack(bufNum: unknown, bufName: unknown): Promise<unknown> {
      ensureNumber(bufNum);
      ensureString(bufName);
      // 対応するバッファのメッセージの古いメッセージの日付を取得
      try {
        const timeline = await vars.buffers.get(denops, "channelTimeline");
        ensureArray<Message>(timeline);
        const bufNameWithoutNumber = bufName.replace(/\(\d+\)$/, "");
        const channelUUID = await searchChannelUUID(bufNameWithoutNumber);
        // 最後のメッセージの内容
        const timelineOption: channelMessageOptions = {
          id: channelUUID,
          channelPath: bufNameWithoutNumber,
          limit: await vars.globals.get(denops, "traqvim#fetch_limit"),
          until: new Date(timeline[0].createdAt).toISOString(),
        };
        const backTimeline: Message[] = await channelTimeline(
          timelineOption,
        );
        await actionBackChannelMessage(
          denops,
          // 受け取ったメッセージの中で一番新しい重複メッセージを削除
          backTimeline.filter((message: Message) => {
            return message.createdAt !== timeline[0].createdAt;
          }),
          bufNum,
        );
      } catch (e) {
        console.log(e);
        return;
      }
    },
    async messageOpen(bufNum: unknown, bufName: unknown): Promise<unknown> {
      ensureNumber(bufNum);
      ensureString(bufName);
      // bufNameの先頭に#がついていなければ、何もしない
      if (bufName[0] !== "#") {
        return;
      }
      const messageBufName = "Message" + bufName.replace("#", "\\#");
      // bufferが下に表示されるようoptionを設定し元に戻す
      await fn.setbufvar(denops, bufNum, "&splitbelow", 1);
      await denops.call("traqvim#make_buffer", messageBufName, "new");
      await fn.setbufvar(denops, bufNum, "&splitbelow", 0);
      await denops.cmd(
        "setlocal buftype=nofile ft=traqvim-message nonumber breakindent",
      );
      return;
    },
    async messageSend(bufName: unknown, contents: unknown): Promise<unknown> {
      helper.echo(denops, "Sending...");
      ensureString(bufName);
      const content = (contents as string[]).join("\n");
      // Message\#gps/times/kamecha → #gps/times/kamecha
      let channelPath = bufName.replace("Message#", "#");
      // #gps/times/kamecha(1) → #gps/times/kamecha
      channelPath = channelPath.replace(/\(\d+\)$/, "");
      const channelUUID = await searchChannelUUID(channelPath);
      await sendMessage(channelUUID, content);
      await denops.cmd(":bdelete");
      return;
    },
  };
}
