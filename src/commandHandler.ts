import { ChatInputCommandInteraction, ApplicationCommandOptionType } from "discord.js";
import { readdirSync } from "fs";
import { join } from "path";
import prisma from "./database";

type CommandExecute = (interaction: ChatInputCommandInteraction) => Promise<void>;

interface Command {
    name: string;
    description: string;
    options?: {
        name: string;
        description: string;
        type: ApplicationCommandOptionType;
        required?: boolean;
    }[];
    requiredRole?: string;
    execute: CommandExecute;
}

const commands: Command[] = [];

export function Command(data: Omit<Command, "execute">) {
    return function (target: { execute: CommandExecute }) {
        const wrappedExecute: CommandExecute = async (interaction) => {
            if (data.requiredRole) {
                const user = await prisma.user.findUnique({
                    where: { discordId: interaction.user.id },
                    select: { role: true },
                });

                if (!user) {
                    await interaction.reply({ content: "You are not registered in the database.", ephemeral: true });
                    return;
                }

                if (user.role !== data.requiredRole) {
                    await interaction.reply({ content: `This command requires the ${data.requiredRole} role to access!`, ephemeral: true });
                    return;
                }
            }

            await target.execute(interaction); // Runs the command if role check passes
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