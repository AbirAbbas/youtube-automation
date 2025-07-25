import OpenAI from 'openai';
import { VideoScript } from './db/schema';

const openai = new OpenAI({
    apiKey: process.env.OPEN_API_KEY,
});

export interface GeneratedContent {
    description: string;
    tags: string[];
}

export class AIContentGenerator {
    /**
     * Generate YouTube video description and tags based on script content
     */
    async generateVideoContent(script: VideoScript, scriptSections: any[]): Promise<GeneratedContent> {
        try {
            // Combine all script sections content
            const fullContent = scriptSections
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map(section => section.content)
                .join('\n\n');

            const prompt = `You are a YouTube content optimization expert. Based on the following video script, generate an engaging YouTube video description and relevant tags.

Video Title: ${script.title}

Script Content:
${fullContent}

Requirements:
1. Description: Create an engaging, SEO-optimized description (max 4000 characters) that includes:
   - A compelling hook in the first 2-3 lines
   - Key points from the video
   - Call to action
   - Relevant hashtags
   - Timestamps if applicable

2. Tags: Generate 10-15 relevant, trending tags that are:
   - Related to the video content
   - Popular on YouTube
   - Include both broad and specific terms
   - Maximum 100 characters per tag

IMPORTANT: Respond ONLY with valid JSON. Do not include any text before or after the JSON object. Ensure all quotes are properly escaped and the JSON is syntactically correct.

Expected format:
{
  "description": "Your description here...",
  "tags": ["tag1", "tag2", "tag3", ...]
}`;

            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a YouTube content optimization expert. You MUST respond with ONLY valid JSON. No additional text, no explanations, no markdown formatting. Just pure JSON that can be parsed by JSON.parse().'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3, // Lower temperature for more consistent JSON output
                max_tokens: 2000,
            });

            const response = completion.choices[0]?.message?.content;
            if (!response) {
                throw new Error('No response from OpenAI');
            }

            // Debug: Log the raw response to see what we're dealing with
            console.log('Raw AI response:', response);

            // Try to parse JSON response with better error handling
            let parsed;
            try {
                parsed = JSON.parse(response);
            } catch (parseError) {
                console.error('JSON parsing failed, attempting to extract JSON from response:', parseError);
                console.log('Response that failed to parse:', response);

                // Try to extract JSON from the response if it contains extra text
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        const extractedJson = jsonMatch[0];
                        console.log('Extracted JSON attempt:', extractedJson);
                        parsed = JSON.parse(extractedJson);
                    } catch (secondParseError) {
                        console.error('Second JSON parsing attempt failed:', secondParseError);

                        // Try to clean the JSON by removing problematic characters
                        try {
                            const cleanedJson = jsonMatch[0]
                                .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
                                .replace(/\n/g, '\\n') // Escape newlines
                                .replace(/\r/g, '\\r') // Escape carriage returns
                                .replace(/\t/g, '\\t'); // Escape tabs

                            console.log('Cleaned JSON attempt:', cleanedJson);
                            parsed = JSON.parse(cleanedJson);
                        } catch (thirdParseError) {
                            console.error('Third JSON parsing attempt (cleaned) failed:', thirdParseError);
                            throw new Error('Invalid JSON response from AI after cleaning attempts');
                        }
                    }
                } else {
                    throw new Error('No valid JSON found in AI response');
                }
            }

            return {
                description: parsed.description || this.generateFallbackDescription(script),
                tags: parsed.tags || this.generateFallbackTags(script)
            };

        } catch (error) {
            console.error('Error generating AI content:', error);

            // Fallback content without AI disclosure
            return {
                description: this.generateFallbackDescription(script),
                tags: this.generateFallbackTags(script)
            };
        }
    }

    /**
     * Generate a fallback description without AI disclosure
     */
    private generateFallbackDescription(script: VideoScript): string {
        return `${script.title}\n\nDiscover the latest insights and tips in this comprehensive guide. Don't forget to like, subscribe, and hit the notification bell for more content like this!\n\n#${script.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '#')}`;
    }

    /**
     * Generate fallback tags without AI disclosure
     */
    private generateFallbackTags(script: VideoScript): string[] {
        const baseTags = ['education', 'tips', 'guide', 'howto', 'tutorial'];
        const titleWords = script.title.toLowerCase().split(/\s+/).filter(word => word.length > 2);
        return [...baseTags, ...titleWords.slice(0, 5)];
    }

    /**
     * Generate a more engaging title for the video
     */
    async generateVideoTitle(script: VideoScript, scriptSections: any[]): Promise<string> {
        try {
            const fullContent = scriptSections
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map(section => section.content)
                .join('\n\n');

            const prompt = `You are a master YouTube clickbait creator. Transform this boring title into an IRRESISTIBLE clickbait title that gets 10M+ views.

Current Title: ${script.title}

Script Content Preview: ${fullContent.substring(0, 500)}...

🔥 CREATIVE TRANSFORMATION REQUIREMENTS:
- MAX 60 characters (shorter = better)
- Be WILDLY CREATIVE and UNPREDICTABLE
- Don't follow obvious patterns or formulas
- Think of completely unexpected angles
- Use varied emotional triggers: mystery, controversy, shock, curiosity, urgency, surprise
- Mix different styles: casual, dramatic, scientific, personal, mysterious

🎯 CREATIVE APPROACHES (PICK ONE THAT FITS):
- Turn it into a mystery or conspiracy
- Make it personal and relatable  
- Add shocking scientific angle
- Create urgency or time pressure
- Use controversial perspective
- Add surprising numbers or facts
- Make it about hidden truths
- Focus on transformation or change
- Use emotional storytelling
- Add conspiracy or secret elements

❌ AVOID BORING FORMULAS:
- Don't just add "shocking" or "secret" to everything
- Avoid overused patterns like "[X] is killing you"
- Don't make it sound like every other clickbait title
- Skip generic educational language

🎨 BE CREATIVE AND UNEXPECTED:
Analyze the current title "${script.title}" and find a completely unique angle that nobody would expect. Make people curious in a fresh way that stands out from typical YouTube titles.

Return ONLY the new clickbait title - nothing else. Make it impossible to scroll past but totally unique!`;

            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a master YouTube clickbait creator who generates UNIQUE titles with 10M+ views. Your priority is CREATIVITY and UNPREDICTABILITY - never follow repetitive formulas. Each title should feel completely original and unexpected. Focus on finding unique angles that make people curious in fresh ways. Return ONLY the title - no quotes, no explanations, no additional text.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 1.0, // Maximum creativity for unique titles
                max_tokens: 50, // Short response for title only
            });

            const title = completion.choices[0]?.message?.content?.trim();
            // Remove surrounding quotes if present and enforce character limit
            const cleanTitle = title?.replace(/^["']|["']$/g, '').substring(0, 60) || script.title;
            return cleanTitle.length > 0 ? cleanTitle : script.title;

        } catch (error) {
            console.error('Error generating clickbait title:', error);
            return script.title;
        }
    }
}

export const aiContentGenerator = new AIContentGenerator(); 