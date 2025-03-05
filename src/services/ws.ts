import { WebSocketServer } from "ws";
import prisma from "../database";
import Logging from "../logging";
import Leveling from "../leveling";
import { codeMap, deleteCode } from "../codeStorage";
import { mergeUsers } from "../mergeUsers";
import { client } from "../index"
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
			let user = undefined;

			if (!account || !account.user) {

				user = await prisma.user.create({
					data: {
						username: username,
						accounts: {
							create: {
								platform: "STEAM",
								platformId: steamId,
								username: username
							}
						},
						xp: 0,
						level: 1,
					},
				});
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
	"linkCode_steam": async (data) => {
		if (!data.content) {
			return {
				success: false,
				content: `Malformed content received.`
			};
		}

		const [steamId, code] = data.content.split(" ");
		let discordId = undefined;
		
		codeMap.forEach((val, key ) => {
			if(code == val){
				discordId = key;
			}
		});

		if( discordId === undefined) {
			console.log("Invalid code entered!");
			return
		}

		const result = await prisma.user.findMany({
			where: {
				accounts: {
					some: {
						OR: [
							{ platform: "STEAM", platformId: steamId },
							{ platform: "DISCORD", platformId: discordId },
						],
					},
				},
			},
			include: {
				accounts: {
					orderBy: {
						platform: 'asc',  // Ensures Steam comes before Discord
					},
				},
			},
		});

		if (result.length !== 2) {
			console.error(`Cannot merge when there are more or less than 2 users in the database. Found ${result.length} user(s).`);
			return;
		}

		const response = await mergeUsers(result[0].id, result[1].id);
		console.log(response.message);
		if (response.success === true) {
			deleteCode(discordId);
			const discordUserId = result[1].accounts.find(account => account.platform === 'DISCORD')?.platformId;
			if (discordUserId) {
				try {
					const discordUser = await client.users.fetch(discordUserId);
					discordUser.send({
						content: `🎉 Your Steam and Discord accounts have been successfully linked!`
					});
				} catch (error) {
					console.error("Error sending DM confirmation message:", error);
				}
			}
		}
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