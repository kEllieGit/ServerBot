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
import Leveling from "./leveling";

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
    if (message.author.bot || Leveling.IGNORED_CHANNELS.includes(message.channel.id)) {
        return;
    }

    try {
        const updatedUser = await Leveling.giveXP(
            message.author.id, 
            Leveling.XP_PER_MESSAGE,
            message.channel as TextChannel
        );
        
        if (!updatedUser) {
            console.log(`User ${message.author.id} not found in database`);
        }
    } catch (error) {
        console.error('Error processing message XP:', error);
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