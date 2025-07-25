const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { youtubeChannels, videoIdeas } = require('../src/lib/db/schema.ts');
const { eq } = require('drizzle-orm');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function migrateDefaultChannel() {
    try {
        console.log('🚀 Starting default channel migration...');

        // Check if there are existing video ideas
        const existingIdeas = await db.select().from(videoIdeas).limit(1);

        if (existingIdeas.length === 0) {
            console.log('✅ No existing video ideas found. Migration not needed.');
            return;
        }

        // Check if default channel already exists
        const existingChannels = await db.select().from(youtubeChannels).limit(1);

        let defaultChannel;
        if (existingChannels.length === 0) {
            // Create default channel
            console.log('📺 Creating default YouTube channel...');
            [defaultChannel] = await db.insert(youtubeChannels).values({
                name: 'Default Channel',
                description: 'Default channel for existing video ideas',
                isActive: true
            }).returning();

            console.log(`✅ Default channel created with ID: ${defaultChannel.id}`);
        } else {
            defaultChannel = existingChannels[0];
            console.log(`✅ Using existing channel with ID: ${defaultChannel.id}`);
        }

        // Update existing video ideas without channel_id
        console.log('🔄 Updating existing video ideas...');
        const updateResult = await db
            .update(videoIdeas)
            .set({ channelId: defaultChannel.id })
            .where(eq(videoIdeas.channelId, null))
            .returning();

        console.log(`✅ Updated ${updateResult.length} video ideas with default channel`);
        console.log('🎉 Default channel migration completed successfully!');

    } catch (error) {
        console.error('❌ Error during migration:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateDefaultChannel()
        .then(() => {
            console.log('Migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateDefaultChannel }; 