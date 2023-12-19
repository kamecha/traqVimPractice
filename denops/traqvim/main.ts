import { OAuth } from "./oauth.ts";
import {
  channelMessageOptions,
  channelTimeline,
  homeChannelId,
  homeChannelPath,
  sendMessage,
} from "./model.ts";
import {
  Denops,
  bufname,
  ensureArray,
  ensureNumber,
  ensureString,
  fn,
  helper,
  vars,
} from "./deps.ts";
import {
  actionBackChannelMessage,
  actionCreatePin,
  actionDeleteMessage,
  actionEditMessage,
  actionForwardChannelMessage,
  actionOpenActivity,
  actionOpenChannel,
  actionRemovePin,
  actionYankMessageLink,
  actionYankMessageMarkdown,
} from "./action.ts";
import { ChannelMessageBuffer, Message } from "./type.d.ts";
import { api } from "./api.ts";

export async function main(denops: Denops) {
  const path = await vars.globals.get(denops, "traqvim#token_file_path");
  ensureString(path);
  api.tokenFilePath = path;
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
    async deleteOAuthToken(): Promise<unknown> {
      const choice = await fn.confirm(
        denops,
        "Delete token file? path: " + path,
        "&Yes\n&No",
        "No",
        "Warning",
      );
      ensureNumber(choice);
      switch (choice) {
        // dialogの中断
        case 0:
          helper.echo(denops, "make up  your mind");
          break;
        // Yes
        case 1:
          helper.echo(denops, "delete token " + path + " ...");
          await Deno.remove(path);
          break;
        // No
        case 2:
          helper.echo(denops, "cancel");
          break;
        default:
          helper.echo(denops, "choice error");
          break;
      }
      return Promise.resolve();
    },
    async home(): Promise<unknown> {
      const homePath = await homeChannelPath();
      const homeId = await homeChannelId();
      const limit = await vars.globals.get(denops, "traqvim#fetch_limit");
      ensureNumber(limit);
      const timelineOption: channelMessageOptions = {
        id: homeId,
        channelPath: homePath,
        limit: limit,
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
      const channelID = await vars.buffers.get(denops, "channelID");
      ensureString(channelID);
      const limit = await vars.globals.get(denops, "traqvim#fetch_limit");
      ensureNumber(limit);
      const timelineOption: channelMessageOptions = {
        id: channelID,
        channelPath: channelPath,
        limit: limit,
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
        const channelID = await vars.buffers.get(denops, "channelID");
        ensureString(channelID);
        const limit = await vars.globals.get(denops, "traqvim#fetch_limit");
        ensureNumber(limit);
        const timelineOption: channelMessageOptions = {
          id: channelID,
          channelPath: bufNameWithoutNumber,
          limit: limit,
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
        const channelID = await vars.buffers.get(denops, "channelID");
        ensureString(channelID);
        const limit = await vars.globals.get(denops, "traqvim#fetch_limit");
        ensureNumber(limit);
        // 最後のメッセージの内容
        const timelineOption: channelMessageOptions = {
          id: channelID,
          channelPath: bufNameWithoutNumber,
          limit: limit,
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
        const channelID = await vars.buffers.get(denops, "channelID");
        ensureString(channelID);
        const limit = await vars.globals.get(denops, "traqvim#fetch_limit");
        ensureNumber(limit);
        // 最後のメッセージの内容
        const timelineOption: channelMessageOptions = {
          id: channelID,
          channelPath: bufNameWithoutNumber,
          limit: limit,
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
      const channelID = await fn.getbufvar(denops, bufNum, "channelID");
      ensureString(channelID);
      const channelMessageVars: ChannelMessageBuffer = {
        channelID: channelID,
      };
      const messageBufName = bufname.format({
        scheme: bufname.parse(bufName).scheme,
        expr: "Message",
        params: {
          type: "open",
        },
        fragment: bufname.parse(bufName).fragment,
      });
      // bufferが下に表示されるようoptionを設定し元に戻す
      await fn.setbufvar(denops, bufNum, "&splitbelow", 1);
      const messageBufNum = await denops.call(
        "traqvim#make_buffer",
        messageBufName,
        "new",
      );
      await fn.setbufvar(denops, bufNum, "&splitbelow", 0);
      await fn.setbufvar(
        denops,
        messageBufNum,
        "channelID",
        channelMessageVars.channelID,
      );
      await denops.cmd(
        "setlocal buftype=nofile ft=traqvim-message nonumber breakindent",
      );
      return;
    },
    async messageSend(bufNum: unknown, contents: unknown): Promise<unknown> {
      helper.echo(denops, "Sending...");
      ensureNumber(bufNum);
      const channelID = await fn.getbufvar(denops, bufNum, "channelID");
      ensureString(channelID);
      const content = (contents as string[]).join("\n");
      await sendMessage(channelID, content);
      await denops.cmd(":bdelete");
      return;
    },
    async yankMessageLink(message: unknown): Promise<unknown> {
      // ensureでの型チェックの仕方分からんから、とりあえずasで:awoo:
      await actionYankMessageLink(denops, message as Message);
      return Promise.resolve();
    },
    async yankMessageMarkdown(message: unknown): Promise<unknown> {
      await actionYankMessageMarkdown(denops, message as Message);
      return Promise.resolve();
    },
    async messageDelete(bufNum: unknown, message: unknown): Promise<unknown> {
      ensureNumber(bufNum);
      const choice = await fn.confirm(
        denops,
        "Delete message?",
        "&Yes\n&No",
        "No",
        "Warning",
      );
      ensureNumber(choice);
      switch (choice) {
        // dialogの中断
        case 0:
          helper.echo(denops, "make up  your mind");
          break;
        // Yes
        case 1:
          helper.echo(denops, "delete message...");
          await actionDeleteMessage(denops, message as Message, bufNum);
          break;
        // No
        case 2:
          helper.echo(denops, "cancel");
          break;
        default:
          helper.echo(denops, "choice error");
          break;
      }
      return Promise.resolve();
    },
    async messageEditOpen(bufNum: unknown, message: unknown): Promise<unknown> {
      ensureNumber(bufNum);
      await fn.setbufvar(denops, bufNum, "&splitbelow", 1);
      const bufName = await fn.bufname(denops, bufNum);
      const messageBufName = bufname.format({
        scheme: bufname.parse(bufName).scheme,
        expr: "Message",
        params: {
          type: "edit",
        },
        fragment: bufname.parse(bufName).fragment,
      });
      const messageBufNum = await denops.call(
        "traqvim#make_buffer",
        messageBufName,
        "new",
      );
      ensureNumber(messageBufNum);
      // 既存メッセージの内容を描画しておく
      await fn.setbufline(
        denops,
        messageBufNum,
        1,
        (message as Message).content.split("\n"),
      );
      await fn.setbufvar(denops, bufNum, "&splitright", 0);
      await fn.setbufvar(
        denops,
        messageBufNum,
        "message",
        message,
      );
      await fn.setbufvar(
        denops,
        messageBufNum,
        "editSourceBuffer",
        bufNum,
      );
      await denops.cmd(
        "setlocal buftype=nofile ft=traqvim-message-edit nonumber breakindent",
      );
      return;
    },
    async messageEdit(
      bufNum: unknown,
      message: unknown,
      contents: unknown,
    ): Promise<unknown> {
      ensureNumber(bufNum);
      const content = (contents as string[]).join("\n");
      await actionEditMessage(denops, message as Message, content, bufNum);
      await denops.cmd(":bdelete");
      return;
    },
    async createPin(
      bufNum: unknown,
      message: unknown,
    ): Promise<unknown> {
      ensureNumber(bufNum);
      await actionCreatePin(denops, message as Message, bufNum);
      return;
    },
    async removePin(
      bufNum: unknown,
      message: unknown,
    ): Promise<unknown> {
      ensureNumber(bufNum);
      await actionRemovePin(denops, message as Message, bufNum);
      return;
    },
  };
}
