import prisma from '../database'

export async function populatePlatformField() {
    const result = await prisma.user.updateMany({
        where: {
            discordId: { not: null },
            platform: undefined,
        },
        data: {
            platform: "discord"
        }
    })
    console.log(`${result.count} users updated`)
}