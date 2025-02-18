export const XP_PER_MESSAGE = 1;
export const MAX_LEVEL = 50;
export const IGNORED_CHANNELS = ["1341107978455089243"];

export function getXpForNextLevel(level: number): number {
    return 100 * level;
}

export async function sendLevelUpMessage(user: any, newLevel: number, message: any) {
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
