import prisma from "./database";

export async function mergeUsers(sourceUserId: string, targetUserId: string): Promise<{ success: boolean; message: string }> {
    try {
        const sourceUser = await prisma.user.findUnique({ where: { id: sourceUserId } });
        const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });

        if (!sourceUser || !targetUser) {
            return { success: false, message: "One or both users not found." };
        }

        const sourceAccounts = await prisma.account.findMany({
            where: { userId: sourceUserId },
        });

        for (const account of sourceAccounts) {
            await prisma.account.upsert({
                where: { platform_platformId: { platform: account.platform, platformId: account.platformId } },
                update: { userId: targetUserId },
                create: { ...account, userId: targetUserId, id: undefined }, // Generate a new id for the target user
            });
        }

        await prisma.user.update({
            where: { id: targetUserId },
            data: {
                balance: targetUser.balance + sourceUser.balance,
                xp: 0,
                level: targetUser.level + sourceUser.level,
            },
        });

        await prisma.user.delete({ where: { id: sourceUserId } });

        return { success: true, message: `User ${sourceUserId} successfully merged into ${targetUserId}` };
    } catch (error) {
        console.error("Error merging users:", error);
        return { success: false, message: "An error occurred while merging users." };
    }
}
