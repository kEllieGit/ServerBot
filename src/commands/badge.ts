import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    Colors,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
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
            name: "remove-all",
            description: "Remove a badge from all users!",
            type: 1,
            options: [
                {
                    name: "badge-name",
                    description: "The badge to remove",
                    type: 3,
                    required: true
                }
            ]
        },        
        {
            name: "edit",
            description: "Edit a badge's name or description!",
            type: 1,
            options: [
                {
                    name: "badge-name",
                    description: "The name of the badge to edit",
                    type: 3,
                    required: true
                },
                {
                    name: "new-name",
                    description: "New name for the badge (optional)",
                    type: 3,
                    required: false
                },
                {
                    name: "new-description",
                    description: "New description for the badge (optional)",
                    type: 3,
                    required: false
                }
            ]
        },
        {
            name: "id",
            description: "Find a badge ID!",
            type: 1,
            options: [
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
            const newBadge = await prisma.badge.create({ data: { name: badgeName, description: badgeDescription } });

            const embed = new EmbedBuilder()
                .setTitle("✅ Badge Created")
                .setDescription(`Badge **${badgeName}** has been created!`)
                .setColor(Colors.DarkGreen)
                .setFooter({ text: `ID: ${newBadge.id}` });
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
        
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId("confirm-delete-badge")
                    .setLabel("Confirm")
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId("cancel-delete-badge")
                    .setLabel("Cancel")
                    .setStyle(ButtonStyle.Secondary)
            );
        
            const embed = new EmbedBuilder()
                .setTitle("⚠️ Confirm Badge Deletion")
                .setDescription(`Are you sure you want to delete the **${badgeName}** badge?\n\nThis action **cannot** be undone!`)
                .setColor(Colors.Orange);
        
            const message = await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
        
            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 15 * 1000 // 15 seconds timeout
            });
        
            collector.on("collect", async (btnInteraction) => {
                if (btnInteraction.user.id !== interaction.user.id) {
                    await btnInteraction.reply({ content: "You cannot confirm this action.", ephemeral: true });
                    return;
                }
        
                if (btnInteraction.customId === "confirm-delete-badge") {
                    await prisma.badge.delete({ where: { name: badgeName } });
        
                    const successEmbed = new EmbedBuilder()
                        .setTitle("🗑️ Badge Deleted")
                        .setDescription(`Badge **${badgeName}** has been successfully deleted!`)
                        .setColor(Colors.DarkGreen);
        
                    await interaction.editReply({ embeds: [successEmbed], components: [] });
                } else if (btnInteraction.customId === "cancel-delete-badge") {
                    const cancelEmbed = new EmbedBuilder()
                        .setTitle("❌ Action Cancelled")
                        .setDescription("The badge deletion has been cancelled.")
                        .setColor(Colors.Grey);
        
                    await interaction.editReply({ embeds: [cancelEmbed], components: [] });
                }
        
                collector.stop();
            });
        
            collector.on("end", async (_, reason) => {
                if (reason === "time") {
                    const timeoutEmbed = new EmbedBuilder()
                        .setTitle("⏳ Confirmation Timed Out")
                        .setDescription("You took too long to respond. No badges were deleted.")
                        .setColor(Colors.Grey);
        
                    await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
                }
            });
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
        if (subcommand === "remove-all") {
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
        
            const userBadgeCount = await prisma.userBadge.count({ where: { badgeId: existingBadge.id } });
        
            if (userBadgeCount === 0) {
                const embed = new EmbedBuilder()
                    .setTitle("⚠️ No Users Found")
                    .setDescription(`No users currently have the **${badgeName}** badge.`)
                    .setColor(Colors.Red);
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                return;
            }
        
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId("confirm-remove-all")
                    .setLabel("Confirm")
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId("cancel-remove-all")
                    .setLabel("Cancel")
                    .setStyle(ButtonStyle.Secondary)
            );
        
            const embed = new EmbedBuilder()
                .setTitle("⚠️ Confirm Badge Removal")
                .setDescription(`Are you sure you want to remove the **${badgeName}** badge from **${userBadgeCount}** users?`)
                .setColor(Colors.Orange);
        
            const message = await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
        
            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 15 * 1000 // 15 seconds timeout
            });
        
            collector.on("collect", async (btnInteraction) => {
                if (btnInteraction.user.id !== interaction.user.id) {
                    await btnInteraction.reply({ content: "You cannot confirm this action.", ephemeral: true });
                    return;
                }
        
                if (btnInteraction.customId === "confirm-remove-all") {
                    await prisma.userBadge.deleteMany({ where: { badgeId: existingBadge.id } });
        
                    const successEmbed = new EmbedBuilder()
                        .setTitle("✅ Badge Removed from All Users")
                        .setDescription(`The **${badgeName}** badge has been removed from **${userBadgeCount}** users.`)
                        .setColor(Colors.DarkGreen);
        
                    await interaction.editReply({ embeds: [successEmbed], components: [] });
                } else if (btnInteraction.customId === "cancel-remove-all") {
                    const cancelEmbed = new EmbedBuilder()
                        .setTitle("❌ Action Cancelled")
                        .setDescription("The badge removal has been cancelled.")
                        .setColor(Colors.Grey);
        
                    await interaction.editReply({ embeds: [cancelEmbed], components: [] });
                }
        
                collector.stop();
            });
        
            collector.on("end", async (_, reason) => {
                if (reason === "time") {
                    const timeoutEmbed = new EmbedBuilder()
                        .setTitle("⏳ Confirmation Timed Out")
                        .setDescription("You took too long to respond. No badges were removed.")
                        .setColor(Colors.Grey);
        
                    await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
                }
            });
        }
        // -----------------------------------------------------------------------------------------------------        
        if (subcommand === "edit") {
            const badgeName = interaction.options.getString("badge-name", true);
            const newName = interaction.options.getString("new-name", false);
            const newDescription = interaction.options.getString("new-description", false);
        
            const existingBadge = await prisma.badge.findUnique({ where: { name: badgeName } });
            if (!existingBadge) {
                const embed = new EmbedBuilder()
                    .setTitle("⚠️ Badge Not Found")
                    .setDescription(`The badge **${badgeName}** does not exist!`)
                    .setColor(Colors.Red);
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                return;
            }
        
            if (!newName && !newDescription) {
                const embed = new EmbedBuilder()
                    .setTitle("⚠️ No Changes Provided")
                    .setDescription(`You must provide at least a new name or a new description to update the badge.`)
                    .setColor(Colors.Red);
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                return;
            }
        
            if (newName) {
                const nameExists = await prisma.badge.findUnique({ where: { name: newName } });
                if (nameExists) {
                    const embed = new EmbedBuilder()
                        .setTitle("⚠️ Name Already Taken")
                        .setDescription(`A badge with the name **${newName}** already exists!`)
                        .setColor(Colors.Red);
                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                    return;
                }
            }
        
            const updatedBadge = await prisma.badge.update({
                where: { name: badgeName },
                data: {
                    name: newName || badgeName,
                    description: newDescription || existingBadge.description
                }
            });
        
            const embed = new EmbedBuilder()
                .setTitle("✅ Badge Updated")
                .setDescription(`The badge has been successfully updated!`)
                .setColor(Colors.Blue)
                .addFields(
                    { name: "Old", value: `Name: \`\`${existingBadge.name}\`\`\nDescription: \`\`${existingBadge.description}\`\``, inline: true },
                    { name: "New", value: `Name: \`\`${updatedBadge.name}\`\`\nDescription: \`\`${updatedBadge.description}\`\``, inline: true },
                )
                .setFooter({ text: `ID: ${updatedBadge.id}` });
        
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }        
        // -----------------------------------------------------------------------------------------------------
        if (subcommand === "id") {
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

            const embed = new EmbedBuilder()
                .setTitle("📝 Badge ID")
                .setDescription(`**${existingBadge.name}**: \`\`${existingBadge.id}\`\``)
                .setColor(Colors.Blue);

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
                badgeList += `**${badge.name}**: \`\`${badge.id}\`\`\n`;
            });

            const embed = new EmbedBuilder()
                .setTitle("📝 List of Badge IDs")
                .setDescription(badgeList)
                .setColor(Colors.Blue);

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
        // -----------------------------------------------------------------------------------------------------
    }
}
