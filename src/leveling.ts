const Leveling = {
    XP_PER_MESSAGE: 1,
    MAX_LEVEL: 50,
    IGNORED_CHANNELS: ["1341107978455089243"],

    getXpForNextLevel(level: number): number {
        return 100 * level;
    },

    async sendLevelUpMessage(user: any, newLevel: number, message: any) {
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
};

export default Leveling;