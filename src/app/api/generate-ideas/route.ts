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

        // Build the base prompt with emphasis on topic relevance
        let prompt = `Generate exactly ${count} creative and engaging YouTube ${videoType === 'shorts' ? 'Shorts' : 'video'} ideas that are DIRECTLY RELATED to "${topic}"${category ? ` in the ${category} category` : ''}.

🎯 CRITICAL REQUIREMENTS - TOPIC RELEVANCE IS MANDATORY:
- EVERY single idea MUST be directly about "${topic}" - no exceptions
- The title and content must clearly relate to the chosen topic
- Ideas should be specific to "${topic}" and not generic content
- Ensure each idea couldn't apply to any other topic
- The topic "${topic}" should be the main focus, not just mentioned

💡 CONTENT GUIDELINES:
- Create engaging and click-worthy ideas while staying relevant
- Think of unique angles and approaches to "${topic}"
- Consider different formats: tutorials, reviews, experiments, challenges, educational content
- Make ideas that would genuinely interest people curious about "${topic}"
- Use compelling language but ensure substance matches the topic
- Include practical, educational, or entertainment value related to "${topic}"`;

        // Add AI automation filter
        if (aiAutomatable) {
            prompt += `

🤖 AI AUTOMATION REQUIREMENT:
- Ideas must be suitable for full AI automation (script generation → audio → video)
- Avoid ideas requiring:
  * Physical presence or demonstrations
  * Real-time interactions or interviews
  * Location-specific filming
  * Complex visual effects or animations
  * Personal experiences or stories
- Focus on:
  * Educational content that can be narrated
  * Informational videos with stock footage
  * Tutorial-style content with voiceover
  * List-based or comparison content
  * Analytical or review content`;
        }

        // Add video type specific instructions
        if (videoType === 'shorts') {
            prompt += `

📱 YOUTUBE SHORTS SPECIFIC:
- Ideas must be suitable for 15-60 second videos
- Content should be quick, punchy, and immediately engaging
- Focus on one clear, simple concept per video
- Perfect for quick tips, facts, or bite-sized information about "${topic}"
- Estimated length should be "30 seconds", "45 seconds", or "60 seconds"
- Think snackable content that delivers value fast`;
        } else {
            prompt += `

🎬 FULL-LENGTH VIDEO SPECIFIC:
- Ideas suitable for 8-20+ minute videos
- Content should allow for detailed exploration of "${topic}"
- Can include multiple sub-topics or detailed analysis
- Perfect for in-depth tutorials, comprehensive guides, or detailed discussions about "${topic}"
- Estimated length should be "10 minutes", "15 minutes", "20 minutes", etc.`;
        }

        // Add web search instructions when enabled
        if (enableWebSearch) {
            prompt += ` 

🌐 TRENDING CONTEXT: Consider current trends, news, and discussions related to "${topic}" to make ideas more timely and relevant:
- Recent developments in "${topic}"
- Current debates or controversies about "${topic}"
- Seasonal relevance to "${topic}"
- Popular questions people are asking about "${topic}"
- Recent updates or changes in "${topic}"
- Trending aspects of "${topic}" on social media

Keep the focus on "${topic}" but make it feel current and relevant!`;
        }

        prompt += `

🎯 TITLE AND FORMAT REQUIREMENTS:
- Titles must clearly indicate the content is about "${topic}"
- Use engaging language but ensure it's truthful and deliverable
- For ${videoType === 'shorts' ? 'Shorts' : 'full videos'}: make titles appropriate for the format
- Avoid misleading clickbait that doesn't relate to "${topic}"
- Include relevant keywords about "${topic}" in titles

Return ONLY a valid JSON array with no additional text or formatting. Each object should have exactly these fields:
- title: An engaging title that clearly relates to "${topic}"
- description: A brief description (1-2 sentences) explaining the "${topic}"-related content
- estimatedLength: Estimated video length ${videoType === 'shorts' ? '(e.g., "30 seconds", "45 seconds", "60 seconds")' : '(e.g., "10 minutes", "15 minutes", "20 minutes")'}

Example format for ${videoType}:
[
  {
    "title": "${videoType === 'shorts' ? `5 Quick ${topic} Tips You Need to Know` : `The Complete Guide to Understanding ${topic}`}",
    "description": "A ${videoType === 'shorts' ? 'quick overview of essential' : 'comprehensive exploration of'} ${topic} ${videoType === 'shorts' ? 'tips' : 'concepts'} that will help viewers understand this topic better.",
    "estimatedLength": "${videoType === 'shorts' ? '45 seconds' : '15 minutes'}"
  }
]`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `You are a YouTube content strategist who creates highly relevant and engaging video ideas. Your primary goal is to ensure EVERY idea is directly related to the specified topic - no generic or off-topic content allowed. Focus on topic relevance first, engagement second. ${aiAutomatable ? 'Generate only ideas that can be fully automated with AI (narration over stock footage/graphics).' : ''} ${videoType === 'shorts' ? 'Create ideas perfect for YouTube Shorts (15-60 seconds).' : 'Create ideas for full-length YouTube videos (8+ minutes).'} You must return ONLY valid JSON arrays with no additional text, explanations, or formatting. Never include markdown code blocks or any text outside the JSON array.`,
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            max_tokens: 2000,
            temperature: 0.8, // Slightly reduced for better topic adherence
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

            // Validate each idea has required fields
            ideas = ideas.map((idea, index) => ({
                title: idea.title || `INSANE ${topic} Video Idea ${index + 1}`,
                description: idea.description || 'Mind-blowing content that will shock viewers.',
                estimatedLength: idea.estimatedLength || '10 minutes'
            }));

        } catch (parseError) {
            console.error('JSON parsing failed:', parseError);
            console.error('Raw response:', responseText);

            // Fallback: create a single idea with the raw text
            ideas = [{
                title: `CRAZY ${topic} Ideas That Will BLOW YOUR MIND!`,
                description: responseText,
                estimatedLength: 'Various'
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