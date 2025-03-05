import { ChatInputCommandInteraction, Colors, EmbedBuilder, MessageFlags } from "discord.js";
import { Command } from "../commandHandler";
import { CodeStorage } from "../codeStorage";

@Command({
    name: "link",
    description: "Link your discord account to your ingame account!"
})
export class LinkCommand {
    static async execute(interaction: ChatInputCommandInteraction) {
        if (CodeStorage.getCode(interaction.user.id)) {
            const embed = new EmbedBuilder()
                .setTitle("Error")
                .setDescription("You still have an active code!")
                .setColor(Colors.Red)
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const codeLifetime = 300; // Code lifetime in seconds (e.g., 300 seconds = 5 minutes)
        const genCode = generateRandomString();
        const futureTimestamp = Math.floor(Date.now() / 1000) + codeLifetime;

        CodeStorage.storeCode(interaction.user.id, genCode);

        const embed = new EmbedBuilder()
            .setTitle("Link")
            .setDescription("Paste the following in the ingame text chat!")
            .addFields(
                { name: "Code:", value: `\`\`${genCode}\`\``, inline: true },
                { name: "Expires in:", value: `<t:${futureTimestamp}:R>`, inline: true }
            )
            .setColor(Colors.Gold)
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });

        setTimeout(async () => {
            CodeStorage.deleteCode(interaction.user.id);

            try {
                const expirationEmbed = new EmbedBuilder()
                    .setTitle("Code Expired")
                    .setDescription("Your verification code has expired. You can generate a new one using `/link`.")
                    .setColor(Colors.Grey)
                    .setTimestamp();

                await interaction.followUp({
                    embeds: [expirationEmbed],
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                console.error(`Failed to send expiration ephemeral message to ${interaction.user.id}:`, error);
            }
        }, codeLifetime * 1000);
    }
}

function generateRandomString(length: number = 10): string {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:<>?";
    let result = "";
    let codeExists = true;

    while (codeExists) {
        result = "";
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            result += characters[randomIndex];
        }

        if (!CodeStorage.hasCode(result)) {
            codeExists = false;
        }

    }

    return result;
}
