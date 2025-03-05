import fs from 'fs';
import path from 'path';

export enum Environment {
    DEVELOPMENT = 'development',
    PRODUCTION = 'production',
    TEST = 'test'
}

export interface ConfigInterface {
    env: Environment;

    token: string;

    // The main guild for the bot
    guild_id: string;

    // The channel where all logs get sent
    logging_channel_id: string;
}

const loadJsonConfig = (filename: string): Partial<ConfigInterface> => {
    const filePath = path.resolve(__dirname, filename);
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    return {};
};

export const ConfigClass = (): ConfigInterface => {
    // Get the node environment, default to development it wasn't found
    const env: Environment = process.env['NODE_ENV'] as Environment ?? Environment.DEVELOPMENT

    // Config will be preferred over env, and env will be used as a fall back if
    // the values do not exist in the config.
    const prod_config = loadJsonConfig('../config.prod.json')
    const dev_config = loadJsonConfig('../config.json')

    const current_config = env === Environment.DEVELOPMENT ? dev_config: prod_config;

    // @todo these could probably be cleaned up at some point, but they're fine for now
    // probably would be best to move the parsing into a function so we just call
    // getValue<Type>(config_value, env_value, default_value)
    return {
        env,
        token: current_config.token || (process.env['APP_TOKEN'] ?? '0'),
        guild_id: current_config.guild_id || (process.env['APP_GUILD_ID'] ?? '0'),
        logging_channel_id: current_config.logging_channel_id || (process.env['APP_LOGGING_CHANNEL_ID'] ?? '0')
    };
};

export const Config: ConfigInterface = ConfigClass();
