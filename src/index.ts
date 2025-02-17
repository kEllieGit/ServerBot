import { Client, Events, GatewayIntentBits, REST, Routes } from "discord.js";
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
    description: "View your profile.",
  },
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, async (client) => {
  console.log(`Ready! Logged in as ${client.user.tag}`);

  const rest = new REST().setToken(process.env.TOKEN!);

  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, "811256944953262102"),
      { body: commands }
    );
    console.log("Commands registered!");
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
        await interaction.reply("You already have a profile registered!");
        return;
      }

      const user = await prisma.user.create({
        data: {
          discordId: interaction.user.id,
          username: interaction.user.username,
        },
      });

      const guild = interaction.guild;
      if (!guild) {
        await interaction.reply("❌ Could not find the server.");
        return;
      }

      const roleId = "1341103896168235019";
      const member = await guild.members.fetch(interaction.user.id);
      if (!member) {
        await interaction.reply("❌ Could not fetch member.");
        return;
      }

      await member.roles.add(roleId);

      await interaction.reply(
        `✅ Profile created successfully for ${user.username}!\n🎉`
      );
    } catch (error) {
      console.error(error);
      await interaction.reply(`❌ Error creating profile!`);
    }
  }

  if (interaction.commandName === "profile") {
    try {
      const user = await prisma.user.findUnique({
        where: { discordId: interaction.user.id },
      });

      if (!user) {
        await interaction.reply(
          "No profile found! Use /register to create one."
        );
        return;
      }

      await interaction.reply(`
    📋 **${user.username}'s Profile**
    Created: ${user.createdAt.toLocaleDateString()}
          `);
    } catch (error) {
      console.error(error);
      await interaction.reply("Error fetching profile!");
    }
  }
});

client.login(process.env.TOKEN);
