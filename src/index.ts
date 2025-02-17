import {
    Client,
    Events,
    GatewayIntentBits,
    REST,
    Routes,
    EmbedBuilder,
    TextChannel
} from "discord.js";
import dotenv from "dotenv";
import prisma from "./database";

dotenv.config();

const commands = [
    {
        name: "register",
        description: "Create a new profile.",
    },
    {
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
    },
    {
        name: "leaderboard",
        description: "View the top 5 users by level.",
    },
];

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const GUILD_ID = "811256944953262102";
const LOG_CHANNEL_ID = "1341168478861922434";

const XP_PER_MESSAGE = 1;
const MAX_LEVEL = 50;
const IGNORED_CHANNELS = ["1341107978455089243"];

function getXpForNextLevel(level: number): number {
    return 100 * level;
}

async function sendLevelUpMessage(user: any, newLevel: number, message: any) {
    const levelUpEmbed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("🎉 Level Up! 🎉")
        .setDescription(
            `Congratulations ${user.username}, you have reached level ${newLevel}!`
        )
        .setTimestamp();

    await message.channel.send({ embeds: [levelUpEmbed] });
}

client.once(Events.ClientReady, async (client) => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    client.user.setPresence({
        activities: [
            {
                name: "Register with /register!",
                type: 2,
            },
        ],
        status: "online",
    });

    const rest = new REST().setToken(process.env.TOKEN!);
    try {
        // Clear global commands
        const globalCommands = await rest.get(
            Routes.applicationCommands(client.user.id)
        ) as Array<{ id: string }>;
        
        for (const command of globalCommands) {
            await rest.delete(
                Routes.applicationCommand(client.user.id, command.id)
            );
            console.log(`Deleted global command ${command.id}`);
        }

        // Clear server-specific commands
        const guildCommands = await rest.get(
            Routes.applicationGuildCommands(client.user.id, GUILD_ID)
        ) as Array<{ id: string }>;

        for (const command of guildCommands) {
            await rest.delete(
                Routes.applicationGuildCommand(client.user.id, GUILD_ID, command.id)
            );
            console.log(`Deleted server command ${command.id}`);
        }

        await rest.put(
            Routes.applicationGuildCommands(client.user.id, GUILD_ID),
            { body: commands }
        );
        console.log("New server commands registered successfully!");

        const channel = await client.channels.fetch(LOG_CHANNEL_ID) as TextChannel;
        if (channel && channel.isTextBased()) {
            channel.send("🟢 Bot is now online!");
        }
    } catch (error) {
        console.error("Error refreshing commands:", error);
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || IGNORED_CHANNELS.includes(message.channel.id))
        return;

    try {
        const user = await prisma.user.findUnique({
            where: { discordId: message.author.id },
        });

        if (!user) return;

        let newXp = user.xp + XP_PER_MESSAGE;
        let newLevel = user.level;
        let leveledUp = false;

        while (newXp >= getXpForNextLevel(newLevel) && newLevel < MAX_LEVEL) {
            newXp -= getXpForNextLevel(newLevel);
            newLevel++;
            leveledUp = true;
        }

        await prisma.user.update({
            where: { discordId: message.author.id },
            data: {
                xp: newXp,
                level: newLevel,
            },
        });

        if (leveledUp) {
            await sendLevelUpMessage(user, newLevel, message);
        }
    } catch (error) {
        console.error(error);
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "register") {
        try {
            const existingUser = await prisma.user.findUnique({
                where: { discordId: interaction.user.id },
            });

            if (existingUser) {
                await interaction.reply({
                    content: "You already have a profile registered! View it using /profile",
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

            const guild = interaction.guild;
            if (!guild) {
                await interaction.reply({
                    content: "❌ Could not find the server.",
                    ephemeral: true,
                });
                return;
            }

            const roleId = "1341103896168235019";
            const member = await guild.members.fetch(interaction.user.id);
            if (!member) {
                await interaction.reply({
                    content: "❌ Could not fetch member.",
                    ephemeral: true,
                });
                return;
            }

            await member.roles.add(roleId);

            await interaction.reply({
                content: `✅ Profile created successfully for ${user.username}!`,
                ephemeral: true,
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: `❌ Error creating profile!`,
                ephemeral: true,
            });
        }
    }

    if (interaction.commandName === "profile") {
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

    if (interaction.commandName === "leaderboard") {
        try {
            const topUsers = await prisma.user.findMany({
                orderBy: {
                    level: "desc",
                },
                take: 5,
            });

            if (topUsers.length === 0) {
                await interaction.reply({
                    content: "No users found in the leaderboard.",
                    ephemeral: true,
                });
                return;
            }

            const leaderboard = topUsers
                .map((user, index) => {
                    return `${index + 1}. **${user.username}** - Level: ${user.level}`;
                })
                .join("\n");

            const leaderboardEmbed = new EmbedBuilder()
                .setColor("#FFD700")
                .setTitle("🏆 Leaderboard 🏆")
                .setDescription(leaderboard);

            await interaction.reply({
                embeds: [leaderboardEmbed]
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: "Error fetching leaderboard!",
                ephemeral: true,
            });
        }
    }
});

async function shutdown() {
    console.log('Shutdown initiated');
    try {
        const channel = await client.channels.fetch(LOG_CHANNEL_ID) as TextChannel;
        if (channel && channel.isTextBased()) {
            await channel.send("🔴 Bot is now offline!");
        }
    } catch (error) {
        console.error('Error during shutdown:', error);
    } finally {
        try {
            await prisma.$disconnect();
            await client.destroy();
        } catch (error) {
            console.error('Error cleaning up:', error);
        }
        process.exit(0);
    }
}

client.on(Events.ShardDisconnect, async (_, shardId) => {
    console.log(`Shard ${shardId} disconnected`);
    await shutdown();
});

client.on(Events.ShardError, async (error, shardId) => {
    console.error(`Shard ${shardId} encountered error:`, error);
    await shutdown();
});

client.login(process.env.TOKEN);