import { 
    ChatInputCommandInteraction, 
    EmbedBuilder, 
    MessageFlags, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} from "discord.js";

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
            const targetUser = interaction.options.getUser("user") || interaction.user;
            const user = await prisma.user.findUnique({
                where: { discordId: targetUser.id },
                include: { badges: { include: { badge: true } } }
            });

            if (!user) {
                await interaction.reply({
                    content: `No profile found for user: ${targetUser}`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            let currentPage = 1;
            const pages = [
                () => {
                    const xpForNextLevel = Leveling.getXpForNextLevel(user.level);
                    const progressBarLength = 20;
                    const progress = Math.round((user.xp / xpForNextLevel) * progressBarLength);
                    const progressBar = "█".repeat(progress) + "░".repeat(progressBarLength - progress);

                    return new EmbedBuilder()
                        .setColor("#0099ff")
                        .setTitle(`${user.username}'s Profile`)
                        .addFields(
                            { name: "Created", value: user.createdAt.toLocaleDateString(), inline: true },
                            { name: "Balance", value: `${user.balance.toString()}$`, inline: false },
                            { name: "Level", value: user.level.toString(), inline: true },
                            { name: "XP", value: `${user.xp}/${xpForNextLevel}`, inline: true },
                            { name: "Progress", value: progressBar, inline: false }
                        );
                },
                () => {
                    const badges = user.badges.map(ub => `- ${ub.badge.name}: ${ub.badge.description}`).join("\n") || "No badges yet.";
                    return new EmbedBuilder()
                        .setColor("#0099ff")
                        .setTitle(`${user.username}'s Badges`)
                        .setDescription(badges);
                }
            ];

            const generateButtons = (page: number) => new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId("prev_page")
                    .setLabel("◀")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 1),
                new ButtonBuilder()
                    .setCustomId("next_page")
                    .setLabel("▶")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === pages.length)
            );

            await interaction.reply({
                embeds: [pages[currentPage - 1]()],
                components: [generateButtons(currentPage)]
            });
            
            const message = await interaction.fetchReply();

            const collector = message.createMessageComponentCollector({
                time: 60000
            });

            collector.on("collect", async i => {
                if (i.user.id !== interaction.user.id) {
                    await i.reply({ content: "You can't interact with this profile view!", ephemeral: true });
                    return;
                }

                if (i.customId === "prev_page") currentPage--;
                if (i.customId === "next_page") currentPage++;

                await i.update({
                    embeds: [pages[currentPage - 1]()],
                    components: [generateButtons(currentPage)]
                });
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: "Error fetching profile!",
                flags: MessageFlags.Ephemeral,
            });
        }
    }
}