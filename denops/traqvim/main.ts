import { OAuth } from "./oauth.ts";
import {
  channelsRecursive,
  channelTimeline,
  channelUUID,
  downloadFile,
  getStamp,
  getStampId,
  getStamps,
  getUser,
  homeChannelId,
  homeChannelPath,
  sendMessage,
} from "./model.ts";
import {
  as,
  assert,
  bufname,
  Denops,
  ensure,
  fn,
  helper,
  is,
  traq,
  vars,
} from "./deps.ts";
import {
  actionAddMessageStamp,
  actionBackChannelMessage,
  actionCreatePin,
  actionDeleteMessage,
  actionEditMessage,
  actionForwardChannelMessage,
  actionOpenActivity,
  actionOpenChannel,
  actionRemoveMessageStamp,
  actionRemovePin,
  actionYankMessageLink,
  actionYankMessageMarkdown,
} from "./action.ts";
import {
  Channel,
  ChannelMessageBuffer,
  channelMessageOptions,
  Message,
} from "./type.d.ts";
import { api } from "./api.ts";
import { isChannelMessageOptions, isMessage } from "./type_check.ts";

export async function main(denops: Denops) {
  const path = await vars.globals.get(denops, "traqvim#token_file_path");
  assert(path, is.String);
  api.tokenFilePath = path;
  // oauthの仮オブジェクト
  let oauth: OAuth;
  denops.dispatcher = {
    async getFile(
      fileId: unknown,
      opts?: unknown,
    ): Promise<unknown> {
      assert(fileId, is.String);
      assert(
        opts,
        as.Optional(is.ObjectOf({
          maxWidth: is.Number,
          maxHeight: is.Number,
        })),
      );
      const file: Uint8Array = await downloadFile(fileId);
      // denops-sixel-view.vimのsixel_viewがUint8Arrayを受け取れる必要がある
      const sixel = await denops.dispatch(
        "sixel_view",
        "img2sixel",
        file,
        opts,
      );
      assert(
        sixel,
        is.ObjectOf({
          data: is.String,
          height: is.Number,
          width: is.Number,
        }),
      );
      return sixel;
    },
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
      assert(choice, is.Number);
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
      assert(limit, is.Number);
      const timelineOption: channelMessageOptions = {
        id: homeId,
        channelPath: homePath,
        limit: limit,
        until: new Date().toISOString(),
        inclusive: true,
        order: "desc",
      };
      await actionOpenChannel(denops, timelineOption);
      return;
    },
    async timeline(channelPath: unknown): Promise<unknown> {
      assert(channelPath, is.String);
      // '#gps/times/kamecha' → ['gps', 'times', 'kamecha']
      const channelPathArray = channelPath.substring(1).split("/");
      const channelID = await channelUUID(channelPathArray);
      if (channelID === undefined) {
        helper.echo(denops, "Channel not found");
        return;
      }
      assert(channelID, is.String);
      const limit = await vars.globals.get(denops, "traqvim#fetch_limit");
      assert(limit, is.Number);
      const timelineOption: channelMessageOptions = {
        id: channelID,
        channelPath: channelPath,
        limit: limit,
        until: new Date().toISOString(),
        inclusive: true,
        order: "desc",
      };
      await actionOpenChannel(denops, timelineOption);
      return;
    },
    async timelineMessage(message: unknown): Promise<unknown> {
      assert(message, isMessage);
      const limit = await vars.globals.get(denops, "traqvim#fetch_limit");
      assert(limit, is.Number);
      const timelineOption: channelMessageOptions = {
        id: message.channelId,
        limit: limit,
        until: message.createdAt,
        inclusive: true,
        order: "desc",
      };
      await actionOpenChannel(denops, timelineOption, message);
      return;
    },
    async activity(): Promise<unknown> {
      await actionOpenActivity(denops);
      return;
    },
    async reload(bufNum: unknown, bufName: unknown): Promise<unknown> {
      // バッファ番号は被らないが、バッファ名は被る可能性がある
      assert(bufNum, is.Number);
      assert(bufName, is.String);
      const bufnameParsed = bufname.parse(bufName);
      if (bufnameParsed.expr === "/Activity") {
        actionOpenActivity(denops, bufNum);
      } else {
        // バッファが"#gps/times/kamecha(1)"のように"(1)"がついている場合、
        // それを削除する
        const bufNameWithoutNumber =
          bufnameParsed.fragment?.replace(/\(\d+\)$/, "") || "";
        const channelID = await vars.buffers.get(denops, "channelID");
        assert(channelID, is.String);
        const limit = await vars.globals.get(denops, "traqvim#fetch_limit");
        assert(limit, is.Number);
        const timelineOption: channelMessageOptions = {
          id: channelID,
          channelPath: bufNameWithoutNumber,
          limit: limit,
          until: new Date().toISOString(),
          inclusive: true,
          order: "desc",
        };
        actionOpenChannel(denops, timelineOption, undefined, bufNum);
      }
      return;
    },
    async messageForward(bufNum: unknown, bufName: unknown): Promise<unknown> {
      assert(bufNum, is.Number);
      assert(bufName, is.String);
      // 対応するバッファのメッセージの新しいメッセージの日付を取得
      try {
        const timeline = await vars.buffers.get(denops, "channelTimeline");
        assert(timeline, is.ArrayOf(isMessage));
        const bufNameWithoutNumber = bufName.replace(/\(\d+\)$/, "");
        const channelID = await vars.buffers.get(denops, "channelID");
        assert(channelID, is.String);
        const limit = await vars.globals.get(denops, "traqvim#fetch_limit");
        assert(limit, is.Number);
        // 最後のメッセージの内容
        const timelineOption: channelMessageOptions = {
          id: channelID,
          channelPath: bufNameWithoutNumber,
          limit: limit,
          since: timeline[timeline.length - 1].createdAt,
        };
        const forwardTimeline: Message[] = await channelTimeline(
          timelineOption,
        );
        await actionForwardChannelMessage(
          denops,
          forwardTimeline,
          bufNum,
        );
      } catch (e) {
        console.log(e);
        return;
      }
    },
    async messageBack(bufNum: unknown, bufName: unknown): Promise<unknown> {
      assert(bufNum, is.Number);
      assert(bufName, is.String);
      // 対応するバッファのメッセージの古いメッセージの日付を取得
      try {
        const timeline = await vars.buffers.get(denops, "channelTimeline");
        assert(timeline, is.ArrayOf(isMessage));
        const bufNameWithoutNumber = bufName.replace(/\(\d+\)$/, "");
        const channelID = await vars.buffers.get(denops, "channelID");
        assert(channelID, is.String);
        const limit = await vars.globals.get(denops, "traqvim#fetch_limit");
        assert(limit, is.Number);
        // 最後のメッセージの内容
        const timelineOption: channelMessageOptions = {
          id: channelID,
          channelPath: bufNameWithoutNumber,
          limit: limit,
          until: timeline[0].createdAt,
        };
        const backTimeline: Message[] = await channelTimeline(
          timelineOption,
        );
        await actionBackChannelMessage(
          denops,
          backTimeline,
          bufNum,
        );
      } catch (e) {
        console.log(e);
        return;
      }
    },
    async messageOpen(bufNum: unknown, bufName: unknown): Promise<unknown> {
      assert(bufNum, is.Number);
      assert(bufName, is.String);
      const channelID = await fn.getbufvar(denops, bufNum, "channelID");
      assert(channelID, is.String);
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
      const messageBufNum = await fn.bufnr(denops, messageBufName, true);
      // bufferが下に表示されるようoptionを設定し元に戻す
      await fn.setbufvar(denops, bufNum, "&splitbelow", 1);
      await denops.cmd(`split +buffer\\ ${messageBufNum}`);
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
      assert(bufNum, is.Number);
      const channelID = await fn.getbufvar(denops, bufNum, "channelID");
      assert(channelID, is.String);
      const content = (ensure(contents, is.ArrayOf(is.String))).join("\n");
      await sendMessage(channelID, content);
      await denops.cmd(":bdelete");
      return;
    },
    async yankMessageLink(message: unknown): Promise<unknown> {
      assert(message, isMessage);
      await actionYankMessageLink(denops, message);
      return Promise.resolve();
    },
    async yankMessageMarkdown(message: unknown): Promise<unknown> {
      assert(message, isMessage);
      await actionYankMessageMarkdown(denops, message);
      return Promise.resolve();
    },
    async messageDelete(bufNum: unknown, message: unknown): Promise<unknown> {
      assert(bufNum, is.Number);
      assert(message, isMessage);
      const choice = await fn.confirm(
        denops,
        "Delete message?",
        "&Yes\n&No",
        "No",
        "Warning",
      );
      assert(choice, is.Number);
      switch (choice) {
        // dialogの中断
        case 0:
          helper.echo(denops, "make up  your mind");
          break;
        // Yes
        case 1:
          helper.echo(denops, "delete message...");
          await actionDeleteMessage(denops, message, bufNum);
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
      assert(bufNum, is.Number);
      const bufName = await fn.bufname(denops, bufNum);
      const messageBufName = bufname.format({
        scheme: bufname.parse(bufName).scheme,
        expr: "Message",
        params: {
          type: "edit",
        },
        fragment: bufname.parse(bufName).fragment,
      });
      const messageBufNum = await fn.bufnr(denops, messageBufName, true);
      assert(messageBufNum, is.Number);
      await fn.setbufvar(denops, bufNum, "&splitbelow", 1);
      await denops.cmd(`split +buffer\\ ${messageBufNum}`);
      await fn.setbufvar(denops, bufNum, "&splitright", 0);
      // 既存メッセージの内容を描画しておく
      await fn.setbufline(
        denops,
        messageBufNum,
        1,
        (ensure(message, isMessage)).content.split("\n"),
      );
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
      assert(bufNum, is.Number);
      assert(message, isMessage);
      const content = (ensure(contents, is.ArrayOf(is.String))).join("\n");
      await actionEditMessage(denops, message, content, bufNum);
      await denops.cmd(":bdelete");
      return;
    },
    async messageAddStamps(
      bufNum: unknown,
      message: unknown,
      stampNames: unknown,
    ): Promise<unknown> {
      assert(bufNum, is.Number);
      assert(message, isMessage);
      assert(stampNames, is.ArrayOf(is.String));
      for (const stampName of stampNames) {
        const stampId = await getStampId(stampName);
        if (stampId === undefined) {
          helper.echo(denops, `Stamp not found: ${stampName}`);
          continue;
        }
        const stamp = await getStamp(stampId);
        await actionAddMessageStamp(denops, message, stamp.id, bufNum);
      }
      return;
    },
    async messageRemoveStamps(
      bufNum: unknown,
      message: unknown,
      stampNames: unknown,
    ): Promise<unknown> {
      assert(bufNum, is.Number);
      assert(message, isMessage);
      assert(stampNames, is.ArrayOf(is.String));
      for (const stampName of stampNames) {
        const stampId = await getStampId(stampName);
        if (stampId === undefined) {
          helper.echo(denops, `Stamp not found: ${stampName}`);
          continue;
        }
        const stamp = await getStamp(stampId);
        await actionRemoveMessageStamp(denops, message, stamp.id, bufNum);
      }
      return;
    },
    async createPin(
      bufNum: unknown,
      message: unknown,
    ): Promise<unknown> {
      assert(bufNum, is.Number);
      assert(message, isMessage);
      await actionCreatePin(denops, message, bufNum);
      return;
    },
    async removePin(
      bufNum: unknown,
      message: unknown,
    ): Promise<unknown> {
      assert(bufNum, is.Number);
      assert(message, isMessage);
      await actionRemovePin(denops, message, bufNum);
      return;
    },
  };

  // apiっぽいやつ
  denops.dispatcher["channelList"] = async (): Promise<Channel[]> => {
    const channels = await channelsRecursive();
    return channels;
  };
  denops.dispatcher["channelMessage"] = async (
    option: unknown,
  ): Promise<Message[]> => {
    assert(option, isChannelMessageOptions);
    const timeline = await channelTimeline(option);
    return timeline;
  };
  denops.dispatcher["convertDate"] = (date: unknown): Promise<string> => {
    assert(date, is.String);
    const d = new Date(date);
    return Promise.resolve(d.toLocaleString("ja-JP"));
  };
  denops.dispatcher["getUser"] = (userId: unknown): Promise<traq.User> => {
    assert(userId, is.String);
    return getUser(userId);
  };
  denops.dispatcher["getStamps"] = (): Promise<traq.Stamp[]> => {
    return getStamps();
  };
  denops.dispatcher["getStamp"] = (stampId: unknown): Promise<traq.Stamp> => {
    assert(stampId, is.String);
    return getStamp(stampId);
  };
}
