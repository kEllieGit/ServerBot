import {
    Client,
    Events,
    GatewayIntentBits,
    REST,
    Routes,
    TextChannel,
} from "discord.js";
import dotenv from "dotenv";
import prisma from "./database";
import { getCommands } from "./commandHandler";

dotenv.config();

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

export function getXpForNextLevel(level: number): number {
    return 100 * level;
}

async function sendLevelUpMessage(user: any, newLevel: number, message: any) {
    await message.channel.send({
        embeds: [
            {
                color: 0x00ff00,
                title: "🎉 Level Up! 🎉",
                description: `Congratulations ${user.username}, you have reached level ${newLevel}!`,
                timestamp: new Date().toISOString(),
            },
        ],
    });
}

client.once(Events.ClientReady, async (client) => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    client.user.setPresence({
        activities: [{ name: "Register with /register!", type: 2 }],
        status: "online",
    });

    const rest = new REST().setToken(process.env.TOKEN!);
    const commands = getCommands().map(({ name, description, options }) => ({
        name,
        description,
        options,
    }));

    try {
        // Clear and update commands
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, GUILD_ID),
            { body: commands }
        );
        console.log("Commands registered successfully!");

        const channel = await client.channels.fetch(LOG_CHANNEL_ID) as TextChannel;
        if (channel.isTextBased()) channel.send("🟢 Bot is now online!");
    } catch (error) {
        console.error("Error refreshing commands:", error);
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || IGNORED_CHANNELS.includes(message.channel.id))
        return;

    try {
        const user = await prisma.user.findUnique({ where: { discordId: message.author.id } });
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
            data: { xp: newXp, level: newLevel },
        });

        if (leveledUp) await sendLevelUpMessage(user, newLevel, message);
    } catch (error) {
        console.error(error);
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = getCommands().find((cmd) => cmd.name === interaction.commandName);
    if (command) await command.execute(interaction);
});

async function shutdown() {
    console.log("Shutdown initiated");
    try {
        const channel = await client.channels.fetch(LOG_CHANNEL_ID) as TextChannel;
        if (channel.isTextBased()) await channel.send("🔴 Bot is now offline!");
    } catch (error) {
        console.error("Error during shutdown:", error);
    } finally {
        await prisma.$disconnect();
        await client.destroy();
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
