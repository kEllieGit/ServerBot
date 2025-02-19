import { TextChannel } from "discord.js";
import prisma from "./database";

const Leveling = {
    XP_PER_MESSAGE: 1,
    LEVEL_UP_BONUS: 50,
    MAX_LEVEL: 50,
    IGNORED_CHANNELS: ["1341107978455089243"],

    getXpForNextLevel(level: number): number {
        return 100 * level;
    },

    async giveXP(userId: string, xpAmount: number, channel?: TextChannel) {
        try {
            const user = await prisma.user.findUnique({ 
                where: { discordId: userId } 
            });
            
            if (!user) return null;

            let newXp = user.xp + xpAmount;
            let newLevel = user.level;
            let leveledUp = false;

            await prisma.user.update({
                where: { discordId: userId },
                data: { lastActiveAt: new Date() },
            });

            const xpForNextLevel = this.getXpForNextLevel(newLevel);
            if (newXp >= xpForNextLevel && newLevel < this.MAX_LEVEL) {
                newXp -= xpForNextLevel;
                newLevel++;
                leveledUp = true;
            }

            const updateData = {
                xp: newXp,
                level: newLevel,
                ...(leveledUp && { balance: user.balance + this.LEVEL_UP_BONUS })
            };

            const updatedUser = await prisma.user.update({
                where: { discordId: userId },
                data: updateData,
            });

            // Send level up message if applicable
            if (leveledUp && channel) {
                await this.sendLevelUpMessage(user, newLevel, channel);
            }

            return updatedUser;
        } catch (error) {
            console.error('Error in giveXP:', error);
            return null;
        }
    },

    async sendLevelUpMessage(user: any, newLevel: number, channel: TextChannel) {
        try {
            await channel.send({
                embeds: [{
                    color: 0x00ff00,
                    title: "🎉 Level Up! 🎉",
                    description: `Congratulations ${user.username}, you have reached level ${newLevel}!`,
                    timestamp: new Date().toISOString(),
                }],
            });
        } catch (error) {
            console.error('Error sending level up message:', error);
        }
    }
};

export default Leveling;