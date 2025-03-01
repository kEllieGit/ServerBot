import WebSocket, { WebSocketServer } from "ws";
import Logging from "../logging";
import { client } from "../index";

const wss = new WebSocketServer({ port: 8080 });
const GUILD_ID = "1341508196589633636";

wss.on("connection", (ws) => {
	Logging.log(client.guilds.cache.get(GUILD_ID), "🟢 Established websocket connection.");

  	ws.on("message", async (message: string) => {
    	const data = JSON.parse(message);
        Logging.log(client.guilds.cache.get(GUILD_ID), data.message);
  	});

	ws.on("close", () => {
		Logging.log(client.guilds.cache.get(GUILD_ID), "🔴 WebSocket connection closed for client.");
	});
	  
	ws.on("error", (error) => {
		Logging.log(client.guilds.cache.get(GUILD_ID), `🔴 WebSocket connection ran into an error: ${error.message}`);
	});
});