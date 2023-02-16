
export interface Channel {
	id: string;
	path: string;
}

export interface Message {
	displayName: string;
	content: string;
	createdAt: Date;
}

export interface User {
	id: string;
	name: string;
	displayName: string;
}
