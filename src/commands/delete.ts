import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { Command } from "../commandHandler";
import prisma from "../database";
import Logging from "../logging";

@Command({
    name: "deletedata",
    description: "Remove the specified user's data from the database.",
    requiredRole: "ADMIN",
    options: [
        {
            name: "user",
            description: "The user whose data you want to delete.",
            type: 6,
            required: true,
        }
    ]
})
export class DeleteDataCommand {
    static async execute(interaction: ChatInputCommandInteraction) {
        const targetUser = interaction.options.getUser("user");

        if (!targetUser) {
            await interaction.reply({
                content: "Please specify a valid user to delete data for.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { discordId: targetUser.id },
        });

        if (!user) {
            await interaction.reply({
                content: `No data found for user: ${targetUser}`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await prisma.user.delete({
            where: { discordId: targetUser.id },
        });

        await interaction.reply({
            content: `Deleted data for user: ${targetUser}`,
            flags: MessageFlags.Ephemeral,
        });

        await Logging.log(interaction.guild, `Deleted data for user: ${targetUser}`);
    }
}