import { WebSocketServer } from "ws";
import prisma from "../database";
import Logging from "../logging";
import { client } from "../index";

const wss = new WebSocketServer({ port: 8080 });
const GUILD_ID = "1341508196589633636";

interface WebsocketMessage {
	type: string;
	content?: string;
	correlationId?: string;
}

interface ResponseMessage extends WebsocketMessage {
	success: boolean;
	error?: string;
}

const messageHandlers: Record<string, (data: WebsocketMessage) => Promise<any>> = {
	"getUser_steam": async (data) => {
		try {
			const userId = data.content;
			const user = await prisma.user.findUnique({
		  		where: { id: userId }
			});

			if (!user)
			{
				return {
					success: false
				};
			}
		
			return {
		  		success: true,
		  		content: JSON.stringify(user)
			};
	  	} catch (error) {
			return {
		  		success: false,
		  		error: `Failed to get user: ${error}`
			};
	  	}
	},
  };

wss.on("connection", (ws) => {
	Logging.log(client.guilds.cache.get(GUILD_ID), "🟢 Established websocket connection.");

	ws.on("message", async (message: string) => {
		try {
		  	const data = JSON.parse(message) as WebsocketMessage;
		  	Logging.log(client.guilds.cache.get(GUILD_ID), `Received message type: ${data.type}`);
		  
		  	if (data.type && messageHandlers[data.type]) {
				const result = await messageHandlers[data.type](data);
			
				if (data.correlationId) {
			  	const response: ResponseMessage = {
					type: `${data.type}_response`,
					correlationId: data.correlationId,
					...result
			  	};
			  
			  	ws.send(JSON.stringify(response));
			  	Logging.log(client.guilds.cache.get(GUILD_ID), `Sent response for request ${data.correlationId}`);
			}
		} else {
			Logging.log(client.guilds.cache.get(GUILD_ID), `Received unhandled message type: ${data.type}`);
			  
			if (data.correlationId) {
			  	const response: ResponseMessage = {
					type: "error",
					correlationId: data.correlationId,
					success: false,
					error: `Unknown message type: ${data.type}`
			  	};
			  
			  	ws.send(JSON.stringify(response));
			}
		  }
		} catch (error: any) {
		  	Logging.log(client.guilds.cache.get(GUILD_ID), `Error processing message: ${error.message}`);
		}
	});

	ws.on("close", () => {
		Logging.log(client.guilds.cache.get(GUILD_ID), "🔴 WebSocket connection closed for client.");
	});
	  
	ws.on("error", (error) => {
		Logging.log(client.guilds.cache.get(GUILD_ID), `🔴 WebSocket connection ran into an error: ${error.message}`);
	});
});