import { TextChannel } from "discord.js";

const Logging = {
    LOG_CHANNEL_ID: "1341168478861922434",

    async log(guild: any, message: string) {
        console.log(message);

        const channel = await guild.channels.fetch(this.LOG_CHANNEL_ID) as TextChannel;
        if (channel.isTextBased()) channel.send(message);
    }
};

export default Logging;