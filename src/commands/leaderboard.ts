import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Command } from "../commandHandler";
import prisma from "../database";

@Command({
    name: "leaderboard",
    description: "View the top 5 users by level."
})
export class LeaderboardCommand {
    static async execute(interaction: ChatInputCommandInteraction) {
        try {
            const topUsers = await prisma.user.findMany({
                orderBy: {
                    level: "desc",
                },
                take: 5,
            });

            if (topUsers.length === 0) {
                await interaction.reply({
                    content: "No users found in the leaderboard.",
                    ephemeral: true,
                });
                return;
            }

            const leaderboard = topUsers
                .map((user, index) => `${index + 1}. **${user.username}** - Level: ${user.level}`)
                .join("\n");

            const leaderboardEmbed = new EmbedBuilder()
                .setColor("#FFD700")
                .setTitle("🏆 Leaderboard 🏆")
                .setDescription(leaderboard)
                .setTimestamp();

            await interaction.reply({ embeds: [leaderboardEmbed] });
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: "Error fetching leaderboard!",
                ephemeral: true,
            });
        }
    }
}
