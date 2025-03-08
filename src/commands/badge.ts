import { 
    ChatInputCommandInteraction, 
    EmbedBuilder,
    MessageFlags,
    Colors
} from "discord.js";
import { Command } from "../commandHandler";
import prisma from "../database";

@Command({
    name: "badge",
    description: "Admin command for managing badges.",
    registrationRequired: true,
    requiredRole: "ADMIN",
    options: [
        {
            name: "create",
            description: "Create a badge and add it to the database!",
            type: 1,
            options: [
                {
                    name: "badge-name",
                    description: "The name of the badge",
                    type: 3,
                    required: true
                },
                {
                    name: "badge-description",
                    description: "Short description of the badge",
                    type: 3,
                    required: true
                }
            ]
        },
        {
            name: "delete",
            description: "Delete a badge from the database!",
            type: 1,
            options: [
                {
                    name: "badge-name",
                    description: "The name of the badge to delete",
                    type: 3,
                    required: true
                }
            ]
        },
        {
            name: "add",
            description: "Give a user a badge!",
            type: 1,
            options: [
                {
                    name: "user",
                    description: "User to assign the badge to",
                    type: 6,
                    required: true
                },
                {
                    name: "badge-name",
                    description: "The badge name",
                    type: 3,
                    required: true
                }
            ]
        },
        {
            name: "remove",
            description: "Remove a badge from a user!",
            type: 1,
            options: [
                {
                    name: "user",
                    description: "User to remove the badge from",
                    type: 6,
                    required: true
                },
                {
                    name: "badge-name",
                    description: "The badge name",
                    type: 3,
                    required: true
                }
            ]
        },
        {
            name: "list",
            description: "List all badges!",
            type: 1
        },
        {
            name: "ids",
            description: "List all badge IDs!",
            type: 1
        },
    ]
})
export class BadgeCommand {
    static async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === "create") {
            const badgeName = interaction.options.getString("badge-name", true);
            const existingBadge = await prisma.badge.findUnique({ where: { name: badgeName } });
            if (existingBadge) {
                const embed = new EmbedBuilder()
                    .setTitle("⚠️ Badge Already Exists")
                    .setDescription(`The badge **${badgeName}** already exists!`)
                    .setColor(Colors.Red);
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                return;
            }
            const badgeDescription = interaction.options.getString("badge-description", true);
            await prisma.badge.create({ data: { name: badgeName, description: badgeDescription } });
            const embed = new EmbedBuilder()
                .setTitle("✅ Badge Created")
                .setDescription(`Badge **${badgeName}** has been created!`)
                .setColor(Colors.DarkGreen);
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
        // -----------------------------------------------------------------------------------------------------
        if (subcommand === "delete") {
            const badgeName = interaction.options.getString("badge-name", true);
            const existingBadge = await prisma.badge.findUnique({ where: { name: badgeName } });
            if (!existingBadge) {
                const embed = new EmbedBuilder()
                    .setTitle("⚠️ Badge Not Found")
                    .setDescription(`The badge **${badgeName}** does not exist!`)
                    .setColor(Colors.Red);
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                return;
            }
            await prisma.badge.delete({ where: { name: badgeName } });
            const embed = new EmbedBuilder()
                .setTitle("🗑️ Badge Deleted")
                .setDescription(`Badge **${badgeName}** has been deleted!`)
                .setColor(Colors.DarkGreen);
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
        // -----------------------------------------------------------------------------------------------------        
        if (subcommand === "add") {
            const user = interaction.options.getUser("user", true);
            const badgeName = interaction.options.getString("badge-name", true);
            const existingBadge = await prisma.badge.findUnique({ where: { name: badgeName } });
            if (!existingBadge) {
                const embed = new EmbedBuilder()
                    .setTitle("⚠️ Badge Not Found")
                    .setDescription(`The badge **${badgeName}** does not exist!`)
                    .setColor(Colors.Red);
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                return;
            }
            const account = await prisma.account.findUnique({ where: { platform_platformId: { platform: "DISCORD", platformId: user.id } }, include: { user: true } });
            if (!account || !account.user) {
                const embed = new EmbedBuilder()
                    .setTitle("⚠️ User Not Registered")
                    .setDescription(`The user **${user.username}** is not registered!`)
                    .setColor(Colors.Red);
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                return;
            }
            await prisma.userBadge.create({ data: { userId: account.user.id, badgeId: existingBadge.id } });
            const embed = new EmbedBuilder()
                .setTitle("✅ Badge Assigned")
                .setDescription(`**${user.username}** has been given the **${badgeName}** badge!`)
                .setColor(Colors.DarkGreen);
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
        // -----------------------------------------------------------------------------------------------------
        if (subcommand === "remove") {
            const user = interaction.options.getUser("user", true);
            const badgeName = interaction.options.getString("badge-name", true);
            const existingBadge = await prisma.badge.findUnique({ where: { name: badgeName } });
            if (!existingBadge) {
                const embed = new EmbedBuilder()
                    .setTitle("⚠️ Badge Not Found")
                    .setDescription(`The badge **${badgeName}** does not exist!`)
                    .setColor(Colors.Red);
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                return;
            }
            const account = await prisma.account.findUnique({ where: { platform_platformId: { platform: "DISCORD", platformId: user.id } }, include: { user: true } });
            if (!account || !account.user) {
                const embed = new EmbedBuilder()
                    .setTitle("⚠️ User Not Registered")
                    .setDescription(`The user **${user.username}** is not registered!`)
                    .setColor(Colors.Red);
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                return;
            }
            const userBadge = await prisma.userBadge.findUnique({
                where: {
                    userId_badgeId: {
                        userId: account.user.id,
                        badgeId: existingBadge.id
                    }
                }
            });

            if (!userBadge) {
                const embed = new EmbedBuilder()
                    .setTitle("⚠️ Badge Not Assigned")
                    .setDescription(`The user **${user.username}** does not have the **${badgeName}** badge!`)
                    .setColor(Colors.Red);
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                return;
            }

            await prisma.userBadge.delete({
                where: {
                    userId_badgeId: {
                        userId: account.user.id,
                        badgeId: existingBadge.id
                    }
                }
            });

            const embed = new EmbedBuilder()
                .setTitle("✅ Badge Removed")
                .setDescription(`**${user.username}** has had the **${badgeName}** badge removed!`)
                .setColor(Colors.DarkGreen);
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
        // -----------------------------------------------------------------------------------------------------
        if (subcommand === "list") {
            const badges = await prisma.badge.findMany();
            if (badges.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle("⚠️ No Badges Found")
                    .setDescription("There are no badges in the database yet!")
                    .setColor(Colors.Red);
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                return;
            }

            let badgeList = "";
            badges.forEach(badge => {
                badgeList += `**${badge.name}**: ${badge.description}\n`;
            });

            const embed = new EmbedBuilder()
                .setTitle("🎖️ List of Badges")
                .setDescription(badgeList)
                .setColor(Colors.Blue);
            
            await interaction.reply({ embeds: [embed] });
        }
        // -----------------------------------------------------------------------------------------------------
        if (subcommand === "ids") {
            const badges = await prisma.badge.findMany();
            if (badges.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle("⚠️ No Badges Found")
                    .setDescription("There are no badges in the database yet!")
                    .setColor(Colors.Red);
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                return;
            }

            let badgeList = "";
            badges.forEach(badge => {
                badgeList += `**${badge.name}**: ${badge.id}\n`;
            });

            const embed = new EmbedBuilder()
                .setTitle("📝 List of Badge IDs")
                .setDescription(badgeList)
                .setColor(Colors.Blue);
            
            await interaction.reply({ embeds: [embed] });
        }
    }
}
