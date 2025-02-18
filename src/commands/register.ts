import { ChatInputCommandInteraction } from "discord.js";
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
                    ephemeral: true,
                });
                return;
            }

            const user = await prisma.user.create({
                data: {
                    discordId: interaction.user.id,
                    username: interaction.user.username,
                    xp: 0,
                    level: 1,
                },
            });

            await interaction.reply({
                content: `✅ Profile created successfully for ${user.username}!`,
                ephemeral: true,
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: "❌ Error creating profile!",
                ephemeral: true,
            });
        }
    }
}
