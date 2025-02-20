import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { Command } from "../commandHandler";
import prisma from "../database";

@Command({
    name: "register",
    description: "Create a new profile."
})
export class RegisterCommand {
    static async execute(interaction: ChatInputCommandInteraction) {
        try {
            const existingUser = await prisma.user.findUnique({
                where: { discordId: interaction.user.id },
            });

            if (existingUser) {
                await interaction.reply({
                    content: "You already have a profile! Use /profile to view it.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const user = await prisma.user.create({
                data: {
                    discordId: interaction.user.id,
                    username: interaction.user.username,
                    platform: "discord",
                    xp: 0,
                    level: 1,
                },
            });

            const guild = interaction.guild;
            if (guild) {
                const member = await guild.members.fetch(interaction.user.id);
                const roleId = "1341103896168235019";
                const role = guild.roles.cache.get(roleId);
                if (role) {
                    await member.roles.add(role);
                }
            }

            await interaction.reply({
                content: `✅ Profile created successfully for ${user.username}!`,
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: "❌ Error creating profile!",
                flags: MessageFlags.Ephemeral,
            });
        }
    }
}
