import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { Command } from "../commandHandler";
import prisma from "../database";

@Command({
    name: "leaderboard",
    description: "View the top 5 users by level."
})
export class LeaderboardCommand {
    static async execute(interaction: ChatInputCommandInteraction) {
        try {
            const topUsers = await prisma.user.findMany({
                orderBy: [
                    {
                        level: "desc",
                    },
                    {
                        xp: "desc", // Secondary sorting by XP when levels are the same
                    }
                ],
                take: 5,
            });

            if (topUsers.length === 0) {
                await interaction.reply({
                    content: "No users found in the leaderboard.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const medals = ["🥇", "🥈", "🥉"];
            
            let leaderboard = topUsers
                .map((user, index) => {
                    const medal = index < 3 ? `${medals[index]} ` : "   ";
                    const rank = `\`#${(index + 1).toString()}\``;
                    const levelInfo = `Level ${user.level} (${user.xp} XP)`;
                    
                    return `${medal}${rank} **${user.username}** - ${levelInfo}`;
                })
                .join("\n");

            const userData = await prisma.account.findUnique({
                where: { platform_platformId: { platform: "DISCORD", platformId: interaction.user.id } },
                include: { user: true }
            });
    
            if (userData && !topUsers.some(user => user.id === userData.user.id)) {
                // Count users with higher level OR same level but higher XP
                const userRank = await prisma.user.count({
                    where: {
                        OR: [
                            {
                                level: {
                                    gt: userData.user.level
                                }
                            },
                            {
                                AND: [
                                    {
                                        level: userData.user.level
                                    },
                                    {
                                        xp: {
                                            gt: userData.user.xp
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                });

                const actualRank = userRank + 1;
                leaderboard += "\n\nYour Rank\n" +
                            `\`#${actualRank.toString()}\` ` +
                            `**${userData.user.username}** - Level ${userData.user.level} ` +
                            `(${userData.user.xp}/${userData.user.level * 100} XP)`;
            }

            const totalUsers = await prisma.user.count();
            const leaderboardEmbed = new EmbedBuilder()
                .setColor("#FFD700")
                .setTitle("🏆 Level Leaderboard")
                .setDescription(leaderboard)
                .setFooter({ 
                    text: `Total Users: ${totalUsers} • Updated ${new Date().toLocaleString()}`
                })
                .setTimestamp();

            await interaction.reply({ embeds: [leaderboardEmbed] });
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: "Error fetching leaderboard!",
                flags: MessageFlags.Ephemeral,
            });
        }
    }
}