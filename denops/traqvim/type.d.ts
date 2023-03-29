
export interface Channel {
	id: string;
	path: string;
}

export interface Message {
	user: User;
	content: string;
	createdAt: Date;
	quote?: Message[];
}

export interface User {
	id: string;
	name: string;
	displayName: string;
}
