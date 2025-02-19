import { ChatInputCommandInteraction, EmbedBuilder, Colors, TextChannel } from "discord.js";
import { Command } from "../commandHandler";
import prisma from "../database";
import Leveling from "../leveling";

@Command({
    name: "daily",
    description: "Receive your daily allowance of money and XP."
})
export class DailyCommand {
    static async execute(interaction: ChatInputCommandInteraction) {
        const userId = interaction.user.id;
        const dailyMoney = 5;
        const dailyXP = 10;

        const user = await prisma.user.findUnique({
            where: { discordId: userId }
        });

        if (!user) {
            await interaction.reply("User not found. Register first!");
            return;
        }

        // Check if user has already claimed today
        const now = new Date();
        const lastClaimed = user.lastClaimedDaily ? new Date(user.lastClaimedDaily) : null;

        if (lastClaimed && now.toDateString() === lastClaimed.toDateString()) {
            await interaction.reply({
                content: "You have already claimed your daily allowance today.",
                ephemeral: true,
            });
            return;
        }

        await prisma.user.update({
            where: { discordId: userId },
            data: {
                balance: user.balance + dailyMoney,
                lastClaimedDaily: now
            }
        });

        const updatedUser = await Leveling.giveXP(user.discordId, dailyXP, interaction.channel as TextChannel);

        if (!updatedUser) {
            await interaction.reply("An error occurred while updating your profile.");
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle("Daily Allowance")
            .setDescription(`You have received your daily rewards!`)
            .addFields(
                { name: "Money Received", value: `${dailyMoney}$`, inline: true },
                { name: "New Balance", value: `${updatedUser.balance}$`, inline: true },
                { name: "\u200B", value: "\u200B" },
                { name: "XP Received", value: `${dailyXP}XP`, inline: true },
                { name: "Total XP", value: `${updatedUser.xp}XP`, inline: true }
            )
            .setColor(Colors.Green);

        await interaction.reply({ embeds: [embed] });
    }
}