import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getXpForNextLevel } from "../leveling";
import { Command } from "../commandHandler";
import prisma from "../database";

@Command({
    name: "profile",
    description: "View your profile or another user's profile.",
    options: [
        {
            name: "username",
            description: "The username of the profile to view",
            type: 3,
            required: false,
        },
    ],
})
export class ProfileCommand {
    static async execute(interaction: ChatInputCommandInteraction) {
        try {
            const username = interaction.options.getString("username");
            let user;

            if (username) {
                user = await prisma.user.findUnique({
                    where: { username: username },
                });

                if (!user) {
                    await interaction.reply({
                        content: `No profile found for username: ${username}`,
                        ephemeral: true,
                    });
                    return;
                }
            } else {
                user = await prisma.user.findUnique({
                    where: { discordId: interaction.user.id },
                });

                if (!user) {
                    await interaction.reply({
                        content: "No profile found! Use /register to create one.",
                        ephemeral: true,
                    });
                    return;
                }
            }

            const xpForNextLevel = getXpForNextLevel(user.level);
            const progressBarLength = 20;
            const progress = Math.round((user.xp / xpForNextLevel) * progressBarLength);
            const progressBar = "█".repeat(progress) + "░".repeat(progressBarLength - progress);

            const profileEmbed = new EmbedBuilder()
                .setColor("#0099ff")
                .setTitle(`${user.username}'s Profile`)
                .addFields(
                    {
                        name: "Created",
                        value: user.createdAt.toLocaleDateString(),
                        inline: true,
                    },
                    { name: "Level", value: user.level.toString(), inline: false },
                    { name: "XP", value: `${user.xp}/${xpForNextLevel}`, inline: false },
                    { name: "Progress", value: progressBar, inline: false }
                );

            await interaction.reply({
                embeds: [profileEmbed]
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: "Error fetching profile!",
                ephemeral: true,
            });
        }
    }
}
