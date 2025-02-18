import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../commandHandler";

@Command({
    name: "ping",
    description: "Pong!",
    requiredRole: "ADMIN"
})
export class LeaderboardCommand {
    static async execute(interaction: ChatInputCommandInteraction) {
        interaction.reply("Pong!");
    }
}