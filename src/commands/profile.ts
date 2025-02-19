import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Command } from "../commandHandler";
import Leveling from "../leveling";
import prisma from "../database";

@Command({
    name: "profile",
    description: "View your profile or another user's profile.",
    registrationRequired: true,
    options: [
        {
            name: "user",
            description: "The user of the profile to view",
            type: 6,
            required: false
        }
    ]
})
export class ProfileCommand {
    static async execute(interaction: ChatInputCommandInteraction) {
        try {
            const targetUser = interaction.options.getUser("user");
            let user;

            if (targetUser) {
                user = await prisma.user.findUnique({
                    where: { discordId: targetUser.id },
                });

                if (!user) {
                    await interaction.reply({
                        content: `No profile found for user: ${targetUser}`,
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

            const xpForNextLevel = Leveling.getXpForNextLevel(user.level);
            const progressBarLength = 20;
            const progress = Math.round((user.xp / xpForNextLevel) * progressBarLength);
            const progressBar = "█".repeat(progress) + "░".repeat(progressBarLength - progress);

            const profileEmbed = new EmbedBuilder()
                .setColor("#0099ff")
                .setTitle(`${user.username}'s Profile`)
                .addFields(
                    { name: "Created", value: user.createdAt.toLocaleDateString(), inline: true },
                    { name: "Role", value: user.role.toString(), inline: true },
                    { name: "Balance", value: `${user.balance.toString()}$`, inline: false },
                    { name: "Level", value: user.level.toString(), inline: true },
                    { name: "XP", value: `${user.xp}/${xpForNextLevel}`, inline: true },
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
