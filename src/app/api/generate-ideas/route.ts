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

🔥 TITLE REQUIREMENTS - MAKE THEM IRRESISTIBLE:
- MAX 60 characters (shorter = better)
- Use EMOTIONAL TRIGGERS: Fear, curiosity, urgency, shock, controversy
- Include SPECIFIC NUMBERS: "2AM", "24 hours", "7 days", etc.
- Create CURIOSITY GAPS: "You Don't Know", "Nobody Tells You", "Hidden Truth"
- Use POWER WORDS: Dying, Destroying, Secret, Banned, Exposed, Shocking
- Make it PERSONAL: "Your Brain", "Your Body", "You're Making"
- Add URGENCY: "Right Now", "Before It's Too Late", "Immediately"

🎯 PROVEN CLICKBAIT FORMULAS TO USE:
- "[Body Part/Thing] is [Dying/Destroying] at [Specific Time] (You Don't Know)"
- "The [Shocking Thing] About ${topic} Nobody Tells You"
- "[Number] ${topic} [Thing] That Will [Destroy/Save] Your [Life/Health/Future]"
- "Why [Everyone/Doctors/Experts] Are [Wrong/Lying] About ${topic}"
- "This [Simple Thing] [Destroys/Fixes] ${topic} [Problem] in [Time Period]"
- "${topic} is [Killing/Ruining] You (Here's How to Stop It)"
- "The [Hidden/Secret/Banned] [Thing] About ${topic}"

${category ? `🎭 CATEGORY-SPECIFIC APPROACH FOR "${category}":
${category.toLowerCase().includes('how-to') ? '- Focus on dramatic transformations and instant results\n- "This ONE Trick" formulas work well' : ''}${category.toLowerCase().includes('essay') ? '- Use philosophical shock: "Why Everything You Know About X is Wrong"\n- Challenge conventional wisdom dramatically' : ''}${category.toLowerCase().includes('explainer') ? '- Promise hidden truths and secret knowledge\n- "The REAL Reason Behind X" approach' : ''}${category.toLowerCase().includes('storytime') ? '- Use personal drama and shocking revelations\n- "I Did X for 30 Days (This Happened)" style' : ''}${category.toLowerCase().includes('comparison') ? '- Use shocking difference reveals\n- "X vs Y: The Truth Will Shock You" format' : ''}${category.toLowerCase().includes('top') ? '- Promise mind-blowing lists with consequences\n- "X Things Destroying Your Life (You Do #3 Daily)"' : ''}${category.toLowerCase().includes('tips') ? '- Focus on secret tips and instant transformations\n- "This ${topic} Secret Changes Everything" style' : ''}${category.toLowerCase().includes('motivational') ? '- Use life-changing revelation language\n- "This ${topic} Truth Will Transform Your Life" approach' : ''}${category.toLowerCase().includes('educational') ? '- Promise shocking facts and hidden knowledge\n- "Scientists Hide This ${topic} Truth From You" style' : ''}${category.toLowerCase().includes('analysis') ? '- Use controversial takes and shocking conclusions\n- "Why ${topic} Analysis is COMPLETELY Wrong" format' : ''}${category.toLowerCase().includes('deep dive') ? '- Promise to expose hidden depths and secrets\n- "The ${topic} Iceberg: What They Don\'t Want You to Know"' : ''}

` : ''}❌ AVOID THESE BORING PATTERNS:
- "10 reasons why..." 
- "How to..." (unless dramatic)
- "A guide to..."
- "Everything you need to know about..."
- Generic educational language

✅ GOOD CLICKBAIT EXAMPLES FOR ${topic}:
Instead of: "Tips for better ${topic.toLowerCase()}"
Use: "Your ${topic} is Destroying You at Night (Stop This)"

Instead of: "Understanding ${topic.toLowerCase()}"  
Use: "This ${topic} Secret Doctors Don't Want You to Know"

Instead of: "Benefits of ${topic.toLowerCase()}"
Use: "${topic} is Rewiring Your Brain (Scientists Shocked)"

🎬 CONTENT MUST STILL BE VALUABLE:
- The dramatic title must be backed by genuine ${topic} content
- Ideas should deliver on the clickbait promise
- Include educational or entertainment value related to ${topic}
- Think of unique angles and approaches to ${topic}${category ? ` using ${category} format` : ''}`;

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
                    content: `You are a master YouTube clickbait creator who generates titles with 10M+ views. Your titles are short, shocking, and impossible to ignore. Focus on emotional triggers, curiosity gaps, and urgency. Make titles that people literally cannot scroll past. Every title must be directly about "${topic}"${category ? ` using ${category} format/style` : ''}. ${aiAutomatable ? 'Ensure content can be AI-generated with narration over stock footage.' : ''} ${videoType === 'shorts' ? 'Create maximum-impact Shorts titles.' : 'Create binge-worthy full-video titles.'} Return ONLY valid JSON - no markdown, no extra text.`,
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            max_tokens: 2000,
            temperature: 0.95, // Higher creativity for more dramatic titles
            top_p: 0.9,
            frequency_penalty: 0.5, // Avoid repetitive phrases
            presence_penalty: 0.6, // Encourage varied approaches
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