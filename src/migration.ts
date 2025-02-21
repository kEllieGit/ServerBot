import prisma from './database';

async function migrateUsersToAccounts() {
  const users = await prisma.user.findMany({
    where: {
      discordId: { not: null },
      accounts: { none: {} }
    }
  });

  if (users.length === 0) {
    console.log('No users need migration');
    return;
  }

  console.log(`Migrating ${users.length} users`);

  for (const user of users) {
    if (!user.discordId) continue;

    await prisma.account.create({
      data: {
        userId: user.id,
        platform: 'DISCORD',
        platformId: user.discordId,
        username: user.username
      }
    });
  }

  console.log('Migration completed');
}

export async function runMigrations() {
  try {
    await migrateUsersToAccounts();
  } catch (error) {
    console.error('Migration error:', error);
  }
}