import { WebSocketServer } from "ws";
import prisma from "../database";
import Logging from "../logging";
import Leveling from "../leveling";

const wss = new WebSocketServer({ port: 8080 });

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
			if (!data.content) {
				return {
					success: false,
					content: `Malformed content received.`
				};
			}

			const [steamId, username] = data.content.split(" ");
			const account = await prisma.account.findUnique({
				where: { platform_platformId: { platform: "STEAM", platformId: steamId } },
				include: { user: true }
			});

			console.log(`SteamID: ${steamId} Username: ${username}`)
			if (!account || !account.user)
			{

				//const newAccount = await prisma.account.create({
				//	data: {
				//		platform: "STEAM",
				//		platformId: steamId,
				//		username: username
				//	}
				//});

				return {
					success: false,
					error: `No user found.`
				};
			}
		
			return {
				success: true,
				content: JSON.stringify(account.user)
			};
		} catch (error) {
			return {
				success: false,
				error: `Failed to get user: ${error}`
			};
		}
	},
	"linkCode_steam": async (data) => {
		if (!data.content) {
			return {
				success: false,
				content: `Malformed content received.`
			};
		}

		const [steamId, code] = data.content.split(" ");

		// Handle code verification.
		console.log(`SteamID: ${steamId} Code: ${code}`);
	},
	"giveXP": async (data) => {
		try {
			if (!data.content) {
				return {
					success: false,
					content: `Malformed content received.`
				};
			}

			const [userId, xpAmount] = data.content.split(" ");
			const updatedUser = Leveling.giveXP(userId, Number(xpAmount));

			if (!updatedUser) {
				return {
					success: false,
					content: `Could not find user by ID ${userId}`
				};
			}

			return {
				success: true,
				content: `Gave ${xpAmount} XP to user ${userId}`
			};
		} catch (error) {
			return {
				success: false,
				error: `Failed to give XP: ${error}`
			};
		}
	}
};

wss.on("connection", (ws) => {
	Logging.log("🟢 Established WebSocket connection.");

	ws.on("message", async (message: string) => {
		try {
			const data = JSON.parse(message) as WebsocketMessage;
		
			if (data.type && messageHandlers[data.type]) {
				const result = await messageHandlers[data.type](data);
			
				if (data.correlationId) {
					const response: ResponseMessage = {
						type: `${data.type}_response`,
						correlationId: data.correlationId,
						...result
				};
			
				ws.send(JSON.stringify(response));
				Logging.log(`Sent response for request ${data.correlationId} | Type: ${data.type}`);
			}
		} else {
			Logging.log(`Received unhandled message type: ${data.type}`);
			
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
			Logging.log(`Error processing message: ${error.message}`);
		}
	});

	ws.on("close", () => {
		Logging.log("🔴 Closed WebSocket connection.");
	});
	  
	ws.on("error", (error) => {
		Logging.log(`🔴 WebSocket connection ran into an error: ${error.message}`);
	});
});