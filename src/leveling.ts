import { TextChannel, GuildMember } from "discord.js";
import prisma from "./database";

class LevelingSystem {
    public static instance: LevelingSystem = new LevelingSystem();
    
    public readonly XP_PER_MESSAGE: number = 1;
    public readonly LEVEL_UP_BONUS: number = 50;
    public readonly MAX_LEVEL: number = 50;
    public readonly IGNORED_CHANNELS: string[] = ["1341107978455089243"];
    
    public roleMultipliers: Map<string, number> = new Map();

    private constructor() {
        this.roleMultipliers.set("1273709101938905225", 2);
        this.roleMultipliers.set("1264261544825323590", 1.5);
        this.roleMultipliers.set("1341890748731228375", 2);
    }

    public getXpForNextLevel(level: number): number {
        return 100 * level;
    }
    
    private getMultiplierForMember(member: GuildMember): number {
        let highestMultiplier = 1.0;
        
        member.roles.cache.forEach(role => {
            const multiplier = this.roleMultipliers.get(role.id);
            if (multiplier && multiplier > highestMultiplier) {
                highestMultiplier = multiplier;
            }
        });
        
        return highestMultiplier;
    }

    public async giveXP(userId: string, xp: number, member?: GuildMember, channel?: TextChannel ) {
        try {
            const user = await prisma.user.findUnique({
                where: { 
                    id: userId
                }
            });
            
            if (!user) {
                console.error(`User not found for ID ${userId}`);
                return null;
            }

            let xpAmount = xp;
            if (member) {
                const multiplier = this.getMultiplierForMember(member);
                xpAmount = Math.floor(xp * multiplier);
            }

            let newXp = user.xp + xpAmount;
            let newLevel = user.level;
            let leveledUp = false;

            const xpForNextLevel = this.getXpForNextLevel(newLevel);
            if (newXp >= xpForNextLevel && newLevel < this.MAX_LEVEL) {
                newXp -= xpForNextLevel;
                newLevel++;
                leveledUp = true;
            }

            const updatedUser = await prisma.user.update({
                where: { 
                    id: userId
                },
                data: {
                    lastActiveAt: new Date(),
                    xp: newXp,
                    level: newLevel,
                    ...(leveledUp && { balance: user.balance + this.LEVEL_UP_BONUS })
                }
            });

            if (leveledUp && channel) {
                await this.sendLevelUpMessage(updatedUser, newLevel, channel);
            }

            return updatedUser;
        } catch (error) {
            console.error('Error while giving XP:', error);
            return null;
        }
    }

    private async sendLevelUpMessage(user: any, newLevel: number, channel: TextChannel) {
        try {
            await channel.send({
                embeds: [{
                    color: 0x00ff00,
                    title: "🎉 Level Up",
                    description: `Congratulations ${user.username}, you have reached level ${newLevel}!`,
                    timestamp: new Date().toISOString(),
                }],
            });
        } catch (error) {
            console.error('Error sending level up message:', error);
        }
    }

    public setRoleMultiplier(roleId: string, multiplier: number): void {
        this.roleMultipliers.set(roleId, multiplier);
    }
}

export default LevelingSystem.instance;