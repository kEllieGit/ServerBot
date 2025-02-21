import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, Colors, TextChannel, GuildMember } from "discord.js";
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

        const account = await prisma.account.findUnique({
            where: { platform_platformId: { platform: "DISCORD", platformId: userId } },
            include: { user: true }
        });

        if (!account || !account.user) {
            await interaction.reply("User not found. Register first!");
            return;
        }

        const user = account.user;
        const now = new Date();
        const lastClaimed = user.lastClaimedDaily ? new Date(user.lastClaimedDaily) : null;

        // Check if user has already claimed today
        if (lastClaimed && now.toDateString() === lastClaimed.toDateString()) {
            await interaction.reply({
                content: "You have already claimed your daily allowance today.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                balance: user.balance + dailyMoney,
                lastClaimedDaily: now
            }
        });

        const member = interaction.member as GuildMember;
        const leveledUser = await Leveling.giveXP(user.id, member, dailyXP, interaction.channel as TextChannel);

        if (!leveledUser) {
            await interaction.reply("An error occurred with receiving your daily allowance.");
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle("Daily Allowance")
            .setDescription("You have received your daily rewards!")
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
