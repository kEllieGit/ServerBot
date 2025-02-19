import {
    Client,
    Events,
    GatewayIntentBits,
    REST,
    Routes,
    TextChannel,
    GuildMember
} from "discord.js";
import { getCommands } from "./commandHandler";
import dotenv from "dotenv";
import prisma from "./database";
import Leveling from "./leveling";
import Logging from "./logging";

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
    ],
});

const GUILD_ID = "811256944953262102";

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

        Logging.log(client.guilds.cache.get(GUILD_ID), "🟢 Bot is now online!");
    } catch (error) {
        console.error("Error refreshing commands:", error);
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || Leveling.IGNORED_CHANNELS.includes(message.channel.id)) {
        return;
    }

    try {
        const member = message.member as GuildMember;
        const updatedUser = await Leveling.giveXP(
            message.author.id,
            member,
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

client.on(Events.GuildMemberRemove, async (member) => {
    try {
        if (member.user.bot) return;

        const user = await prisma.user.findUnique({ where: { discordId: member.user.id } });
        if (user) {
            await prisma.user.delete({
                where: { discordId: member.id },
            });

            Logging.log(client.guilds.cache.get(GUILD_ID), `Deleted user ${member.user.displayName} from database because they left the server!`);
        }
    }
    catch (error) {
        console.error('Error deleting user on leave:', error);
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
        Logging.log(client.guilds.cache.get(GUILD_ID), "🔴 Bot is now offline!");
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