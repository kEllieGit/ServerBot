import {
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
  EmbedBuilder,
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
    description: "View your profile.",
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
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, "811256944953262102"),
      { body: commands }
    );
    console.log("Commands registered!");
  } catch (error) {
    console.error(error);
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

    while (newXp >= getXpForNextLevel(newLevel) && newLevel < MAX_LEVEL) {
      newXp -= getXpForNextLevel(newLevel);
      newLevel++;
      await sendLevelUpMessage(user, newLevel, message);
    }

    await prisma.user.update({
      where: { discordId: message.author.id },
      data: {
        xp: newXp,
        level: newLevel,
      },
    });
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
        await interaction.reply(
          "You already have a profile registered! View it using /profile"
        );
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
        `✅ Profile created successfully for ${user.username}!`
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

      await interaction.reply({ embeds: [profileEmbed] });
    } catch (error) {
      console.error(error);
      await interaction.reply("Error fetching profile!");
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
        await interaction.reply("No users found in the leaderboard.");
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

      await interaction.reply({ embeds: [leaderboardEmbed] });
    } catch (error) {
      console.error(error);
      await interaction.reply("Error fetching leaderboard!");
    }
  }
});

client.login(process.env.TOKEN);
