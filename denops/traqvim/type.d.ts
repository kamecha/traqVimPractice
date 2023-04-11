import { traq } from "./deps.ts";

export interface Channel extends traq.Channel {
	path: string;
}

export interface UnreadChannel extends traq.UnreadChannel {
	path: string;
}

export interface Message extends traq.Message {
	user: User;
	quote?: Message[];
}

export interface User extends traq.User {
}
