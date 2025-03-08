import { TextChannel } from "discord.js";
import { client } from "./index"
import { Config } from "./config";


const Logging = {
    async log(message: string, channelId?: string) {
        console.log(message);

        const guild = await client.guilds.fetch(Config.guild_id);
        let channel: TextChannel;
        if (!channelId) {
            channel = await guild.channels.fetch(Config.logging_channel_id) as TextChannel;
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