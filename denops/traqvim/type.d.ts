
export interface Channel {
	id: string;
	path: string;
}

export interface Message {
	displayName: string;
	content: string;
	createdAt: Date;
	quote?: Message[];
}

export interface User {
	id: string;
	name: string;
	displayName: string;
}
