import { traq } from "./deps.ts";

export type channelMessageOptions = {
  // channelUUID
  id: string;
  // #gps/time/kamecha
  channelPath?: string;
  limit?: number;
  offset?: number;
  since?: string;
  until?: string;
  inclusive?: boolean;
  order?: "asc" | "desc";
};

export interface Channel extends traq.Channel {
  path: string;
}

export interface UnreadChannel extends traq.UnreadChannel {
  path: string;
}

export interface Message extends traq.Message {
  user: traq.User;
  position?: {
    index: number;
    start: number;
    end: number;
    // 相対位置の方がメッセージの位置変更に簡単に対応できそう
    quote?: {
      index: number;
      start: number;
      end: number;
    }[];
  };
  quote?: Message[];
}

// vimのタイムラインbufferでの持つ変数
export interface ChannelBuffer {
  channelID: string;
  channelPath: string;
  channelTimeline: Message[];
}

// vimのタイムラインにメッセージを送る時のbufferで持つ変数
export interface ChannelMessageBuffer {
  channelID: string;
}
