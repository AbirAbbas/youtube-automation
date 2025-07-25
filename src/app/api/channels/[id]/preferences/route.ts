import { NextRequest, NextResponse } from 'next/server';
import { youtubeChannels } from '@/lib/db/schema';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) return NextResponse.json({ success: false, error: 'Channel ID required' }, { status: 400 });
    const channel = await db.select().from(youtubeChannels).where(eq(youtubeChannels.id, Number(id))).limit(1);
    if (!channel[0]) return NextResponse.json({ success: false, error: 'Channel not found' }, { status: 404 });
    return NextResponse.json({
        success: true,
        topic: channel[0].topic || '',
        category: channel[0].category || ''
    });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) return NextResponse.json({ success: false, error: 'Channel ID required' }, { status: 400 });
    const { topic, category } = await request.json();
    await db.update(youtubeChannels)
        .set({ topic: topic || null, category: category || null, updatedAt: new Date() })
        .where(eq(youtubeChannels.id, Number(id)));
    return NextResponse.json({ success: true, topic: topic || '', category: category || '' });
} 