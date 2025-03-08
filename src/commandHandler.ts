import { 
    ChatInputCommandInteraction, 
    ApplicationCommandOptionType, 
    MessageFlags 
} from "discord.js";
import { readdirSync } from "fs";
import { join } from "path";
import prisma from "./database";

type CommandExecute = (interaction: ChatInputCommandInteraction) => Promise<void>;

interface CommandOption {
    name: string;
    description: string;
    type: ApplicationCommandOptionType;
    required?: boolean;
    options?: CommandOption[];
    choices?: { name: string; value: string }[];
}


interface Command {
    name: string;
    description: string;
    options?: CommandOption[];
    registrationRequired?: boolean;
    requiredRole?: string;
    execute: CommandExecute;
}

const commands: Command[] = [];

export function Command(data: Omit<Command, "execute">) {
    return function (target: { execute: CommandExecute }) {
        const wrappedExecute: CommandExecute = async (interaction) => {
            const account = await prisma.account.findUnique({
                where: { platform_platformId: { platform: "DISCORD", platformId: interaction.user.id } },
                include: { user: true }
            });

            if (data.registrationRequired || data.requiredRole) {
                if (!account || !account.user) {
                    await interaction.reply({ 
                        content: "To use this command, you must be registered. Use `/register` to register!", 
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }
            }
            
            if (account) {
                await prisma.account.update({
                    where: { platform_platformId: { platform: "DISCORD", platformId: interaction.user.id } },
                    data: { user: { update: { lastActiveAt: new Date() } } },
                });

                if (data.requiredRole && account.user.role !== data.requiredRole) {
                    await interaction.reply({ 
                        content: `This command requires the **${data.requiredRole}** role!`, 
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }
            }

            await target.execute(interaction);
        };

        commands.push({ ...data, execute: wrappedExecute });
    };
}

export function getCommands(): Command[] {
    if (commands.length > 0) return commands;

    const commandsPath = join(__dirname, "commands");
    try {
        const commandFiles = readdirSync(commandsPath).filter(file => 
            file.endsWith(".ts") || file.endsWith(".js")
        );

        for (const file of commandFiles) {
            const filePath = join(commandsPath, file);
            require(filePath);
        }

        console.log(`Loaded ${commands.length} commands: ${commands.map(cmd => cmd.name).join(", ")}`);
        return commands;
    } catch (error) {
        console.error("Error loading commands:", error);
        return commands;
    }
}

/**
 * Registers a new command if it does not already exist in the commands list.
 *
 * @param {Command} command - The command to be registered.
 */
export function registerCommand(command: Command) {
    if (!commands.find(cmd => cmd.name === command.name)) {
        commands.push(command);
    }
}
