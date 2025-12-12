export type ServerMessage =
	| { type: "server:connected"; apiVersion: string; counter: number }
	| { type: "server:time"; time: string }
	| { type: "server:counter"; counter: number };

export type ClientMessage = { type: "client:counter:increment" };
