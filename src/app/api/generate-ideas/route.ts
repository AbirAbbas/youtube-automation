import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPEN_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        const {
            topic,
            count = 5,
            category,
            enableWebSearch = false,
            aiAutomatable = false,
            videoType = 'full-length' // 'full-length' or 'shorts'
        } = await request.json();

        if (!topic) {
            return NextResponse.json(
                { error: 'Topic is required' },
                { status: 400 }
            );
        }

        // Build the base prompt with emphasis on clickbait titles
        let prompt = `Generate exactly ${count} INSANELY CLICKABLE YouTube ${videoType === 'shorts' ? 'Shorts' : 'video'} ideas about "${topic}"${category ? ` in the ${category} category` : ''}.

🔥 TITLE REQUIREMENTS - MAKE THEM DIVERSE & IRRESISTIBLE:
- MAX 60 characters (shorter = better)
- Each title should feel COMPLETELY DIFFERENT from the others
- Use varied emotional triggers: fear, curiosity, urgency, shock, controversy, surprise, mystery
- Mix different angles: scientific, personal, shocking facts, conspiracy, transformation, secrets
- Vary the language style: some casual, some dramatic, some mysterious, some urgent

🎯 DIVERSE CLICKBAIT APPROACHES (MIX THESE UP):
- Fear/Warning: Something dangerous happening
- Mystery/Secret: Hidden information revealed  
- Transformation: Dramatic before/after promises
- Controversy: Challenge popular beliefs
- Urgency: Time-sensitive information
- Personal: Direct impact on viewer
- Scientific: Research reveals shocking truth
- Conspiracy: What "they" don't want you to know
- Numerical: Specific counts that intrigue
- Emotional: Tap into deep feelings

${category ? `🎭 CATEGORY INFLUENCE FOR "${category}":
${category.toLowerCase().includes('how-to') ? '- Vary between instant transformations, secret methods, and game-changing techniques' : ''}${category.toLowerCase().includes('essay') ? '- Mix philosophical challenges, controversial takes, and mind-bending perspectives' : ''}${category.toLowerCase().includes('explainer') ? '- Alternate between hidden truths, shocking reveals, and mystery solving' : ''}${category.toLowerCase().includes('storytime') ? '- Use personal drama, shocking experiences, and jaw-dropping revelations' : ''}${category.toLowerCase().includes('comparison') ? '- Create surprising face-offs, shocking differences, and unexpected winners' : ''}${category.toLowerCase().includes('top') ? '- Mix countdown drama, shocking rankings, and surprising inclusions' : ''}${category.toLowerCase().includes('tips') ? '- Vary between secret hacks, surprising methods, and game-changing discoveries' : ''}${category.toLowerCase().includes('motivational') ? '- Mix life-changing realizations, shocking truths, and powerful transformations' : ''}${category.toLowerCase().includes('educational') ? '- Alternate between mind-blowing facts, shocking studies, and paradigm shifts' : ''}${category.toLowerCase().includes('analysis') ? '- Use controversial conclusions, shocking discoveries, and paradigm-breaking insights' : ''}${category.toLowerCase().includes('deep dive') ? '- Mix iceberg revelations, rabbit hole journeys, and shocking depth reveals' : ''}

` : ''}❌ AVOID REPETITIVE PATTERNS:
- Don't start multiple titles the same way
- Don't overuse the same power words
- Don't follow the same sentence structure
- Avoid making all titles sound similar
- Mix up the emotional approaches

🎨 VARIETY EXAMPLES FOR INSPIRATION (DON'T COPY THESE):
- Mysterious: "Scientists Can't Explain This ${topic} Phenomenon"
- Urgent: "${topic} Emergency: Why Millions Are Panicking"  
- Personal: "I Tried ${topic} for 30 Days. This Happened."
- Controversial: "Why ${topic} Experts Are Dead Wrong"
- Numerical: "3 ${topic} Facts That Break Physics"
- Emotional: "${topic} Made Me Cry (Here's Why)"

🎬 CONTENT REQUIREMENTS:
- Each idea must be genuinely about ${topic}${category ? ` using ${category} approach` : ''}
- Vary the specific aspects or angles of ${topic} covered
- Mix different depths: surface-level shocking vs deep revelations
- Include different time scales: instant, daily, long-term impacts
- Think of unique, unexpected angles on ${topic}`;

        // Add AI automation filter
        if (aiAutomatable) {
            prompt += `

🤖 AI AUTOMATION REQUIREMENT:
- Ideas must work with AI narration over stock footage
- Avoid requiring physical demonstrations or personal presence
- Focus on informational, educational, or analytical content about ${topic}
- Perfect for voiceover-style videos with graphics/footage`;
        }

        // Add video type specific instructions
        if (videoType === 'shorts') {
            prompt += `

📱 YOUTUBE SHORTS SPECIFIC:
- Even MORE clickable titles (people scroll FAST)
- Ideas for 15-60 second videos
- ONE shocking fact or tip about ${topic}
- Maximum impact in minimum time
- Estimated length: "30 seconds", "45 seconds", or "60 seconds"`;
        } else {
            prompt += `

🎬 FULL-LENGTH VIDEO SPECIFIC:
- Titles that promise comprehensive ${topic} insights
- Ideas for 8-20+ minute deep dives
- Can build up the dramatic promise throughout the video
- Estimated length: "10 minutes", "15 minutes", "20 minutes"`;
        }

        // Add web search instructions when enabled
        if (enableWebSearch) {
            prompt += `

🌐 TRENDING CONTEXT: 
- Use recent ${topic} developments to add urgency
- Reference current controversies or debates about ${topic}
- Make titles feel timely: "Right Now", "In 2024", "This Week"`;
        }

        prompt += `

🎯 OUTPUT FORMAT:
Return ONLY a valid JSON array. Each title should make people think "I NEED to watch this RIGHT NOW."

Example format:
[
  {
    "title": "Your ${topic} is Destroying You at Night (Stop This)",
    "description": "Shocking revelations about ${topic} that most people don't realize are harming them.",
    "estimatedLength": "${videoType === 'shorts' ? '45 seconds' : '12 minutes'}"
  }
]

CREATE TITLES THAT ARE IMPOSSIBLE TO IGNORE!`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `You are a master YouTube clickbait creator who generates DIVERSE titles with 10M+ views. Your #1 priority is VARIETY - each title must feel completely different in style, emotion, and approach. Never follow repetitive patterns or formulas. Be wildly creative and unpredictable. Every title must be about "${topic}"${category ? ` using ${category} format/style` : ''} but approach it from totally different angles each time. ${aiAutomatable ? 'Ensure content can be AI-generated with narration over stock footage.' : ''} ${videoType === 'shorts' ? 'Create maximum-impact Shorts titles.' : 'Create binge-worthy full-video titles.'} Return ONLY valid JSON - no markdown, no extra text.`,
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            max_tokens: 2000,
            temperature: 1.0, // Maximum creativity for diverse titles
            top_p: 0.85,
            frequency_penalty: 0.8, // Strong penalty against repetitive phrases
            presence_penalty: 0.7, // Encourage totally different approaches
        });

        const responseText = completion.choices[0]?.message?.content?.trim();

        if (!responseText) {
            return NextResponse.json(
                { error: 'Failed to generate ideas' },
                { status: 500 }
            );
        }

        // Clean the response text - remove any markdown code blocks
        let cleanedResponse = responseText;
        if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        // Try to parse JSON response
        let ideas;
        try {
            ideas = JSON.parse(cleanedResponse);

            // Validate that it's an array and has the right structure
            if (!Array.isArray(ideas)) {
                throw new Error('Response is not an array');
            }

            // Validate each idea has required fields and enforce title length
            ideas = ideas.map((idea, index) => ({
                title: (idea.title || `Your ${topic} is Broken (Fix This Now)`).substring(0, 60), // Enforce 60 char limit
                description: idea.description || 'Shocking revelations that will change everything you thought you knew.',
                estimatedLength: idea.estimatedLength || (videoType === 'shorts' ? '45 seconds' : '12 minutes')
            }));

        } catch (parseError) {
            console.error('JSON parsing failed:', parseError);
            console.error('Raw response:', responseText);

            // Fallback: create clickbait ideas
            ideas = [{
                title: `Your ${topic} is Killing You (Stop This Now)`,
                description: `Shocking truths about ${topic} that will completely change how you think about this topic.`,
                estimatedLength: videoType === 'shorts' ? '45 seconds' : '12 minutes'
            }];
        }

        return NextResponse.json({ ideas });
    } catch (error) {
        console.error('Error generating video ideas:', error);
        return NextResponse.json(
            { error: 'Failed to generate video ideas' },
            { status: 500 }
        );
    }
} 