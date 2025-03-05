import { TextChannel } from "discord.js";
import { client } from "./index"

const Logging = {
    GUILD_ID: "1341508196589633636",
    LOG_CHANNEL_ID: "1341508197491540040",

    async log(message: string, channelId?: string) {
        console.log(message);

        const guild = await client.guilds.fetch(this.GUILD_ID);
        let channel: TextChannel;
        if (!channelId) {
            channel = await guild.channels.fetch(this.LOG_CHANNEL_ID) as TextChannel;
        }
        else {
            channel = await guild.channels.fetch(channelId) as TextChannel;
        }

        if (channel.isTextBased()) {
            channel.send(message);
        }
    }
};

export default Logging;