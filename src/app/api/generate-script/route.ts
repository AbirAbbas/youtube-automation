import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
    createVideoScript,
    createMultipleScriptSections,
    updateVideoScript,
    deleteScriptsByIdeaId
} from '@/lib/db/videoScripts';
import { getVideoIdeaById as getIdeaById, updateVideoIdea } from '@/lib/db/videoIdeas';
import { tavilyService, TavilySearchResponse } from '@/lib/tavily';

const openai = new OpenAI({
    apiKey: process.env.OPEN_API_KEY,
});

interface ScriptSection {
    sectionType: string;
    title: string;
    estimatedDuration: string;
    orderIndex: number;
}

// Function definitions for web search
const searchFunctions = [
    {
        type: "function" as const,
        function: {
            name: "searchCurrentInfo",
            description: "Search the web for current information, recent news, or up-to-date facts related to the video topic",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "The search query to find current information about the topic"
                    },
                    type: {
                        type: "string",
                        enum: ["general", "news"],
                        description: "Type of search - 'general' for broad information, 'news' for recent news and developments"
                    },
                    max_results: {
                        type: "number",
                        description: "Maximum number of search results to return (1-10, default: 5)"
                    }
                },
                required: ["query"]
            }
        }
    }
];

// Helper function to handle search function calls
async function handleSearchFunction(args: any): Promise<string> {
    try {
        if (!tavilyService || !process.env.TAVILY_API_KEY) {
            return JSON.stringify({
                error: "Web search not available - Tavily API key not configured",
                success: false
            });
        }

        const { query, type = 'general', max_results = 5 } = args;

        if (!query || typeof query !== 'string') {
            return JSON.stringify({
                error: "Search query is required and must be a string",
                success: false
            });
        }

        let searchResponse: TavilySearchResponse;

        if (type === 'news') {
            searchResponse = await tavilyService.searchNews(query, max_results);
        } else {
            searchResponse = await tavilyService.searchGeneral(query, max_results);
        }

        const formattedResults = tavilyService.formatSearchResults(searchResponse);

        return JSON.stringify({
            success: true,
            query: searchResponse.query,
            answer: searchResponse.answer,
            results_count: searchResponse.results.length,
            formatted_results: formattedResults,
            search_results: searchResponse.results.slice(0, 3) // Limit to top 3 for context
        });

    } catch (error) {
        console.error('Search function error:', error);
        return JSON.stringify({
            error: "Failed to search the web",
            success: false,
            message: error instanceof Error ? error.message : "Unknown search error"
        });
    }
}

function parseEstimatedLength(estimatedLength: string): number {
    // Extract number from strings like "10 minutes", "5 min", "20-30 minutes", etc.
    const match = estimatedLength.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 10; // Default to 10 minutes
}

async function generateDynamicScriptSections(
    videoTitle: string,
    videoDescription: string,
    estimatedLengthInMinutes: number,
    enableWebSearch: boolean = false
): Promise<ScriptSection[]> {
    const prompt = `You are an expert YouTube script planner. Create a dynamic, topic-specific section structure for a video titled "${videoTitle}".

Video Description: ${videoDescription}
Total Video Length: ${estimatedLengthInMinutes} minutes

LANGUAGE & COMPLEXITY REQUIREMENTS:
- Use clear, accessible language that anyone can understand
- Avoid jargon and overly complex terminology
- Explain concepts simply and clearly
- Plan sections that will use stories, examples, and relatable comparisons

INCLUSIVE LANGUAGE REQUIREMENTS:
- NEVER assume the age, gender, or demographics of your audience
- Use inclusive terms like "everyone", "viewers", "people", or "folks" instead of age/gender-specific terms
- Avoid phrases like "you kids", "you guys", "ladies and gentlemen", etc.
- Address the audience respectfully without making assumptions about who they are

STRUCTURE REQUIREMENTS:
1. Create ${estimatedLengthInMinutes <= 8 ? '3-4' : estimatedLengthInMinutes <= 15 ? '4-6' : '5-8'} sections that flow naturally
2. Each section title should be SPECIFIC to the video topic, not generic
3. Sections should dive deep into different aspects of the topic
4. Create logical progression that builds understanding
5. Avoid generic titles like "Introduction", "Main Content", "Conclusion"
6. Each section should have a clear, valuable purpose

SECTION TYPES TO USE:
- "hook" - Opening hook (1-2 minutes)
- "context" - Background/setup (varies based on topic)
- "deep_dive_[topic]" - Deep exploration of specific aspects
- "analysis" - Analysis or breakdown
- "examples" - Real examples or case studies
- "implications" - What this means/consequences
- "actionable" - Practical takeaways
- "wrap_up" - Final thoughts and call to action (1-2 minutes)

${enableWebSearch ? 'Consider current trends and recent developments that should be covered in the sections.' : ''}

Calculate durations so they add up to approximately ${estimatedLengthInMinutes} minutes total.

Return ONLY a JSON array of sections with this exact format:
[
  {
    "sectionType": "hook",
    "title": "[Specific, engaging title related to the topic]",
    "estimatedDuration": "2 minutes",
    "orderIndex": 0
  }
]

Make section titles specific and compelling - they should make viewers want to keep watching to learn about that particular aspect.`;

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            {
                role: 'system',
                content: 'You are an expert YouTube script planner who creates engaging, topic-specific section structures using clear, accessible language. Plan sections that use simple words, stories, and examples that anyone can understand. NEVER assume the age, gender, or demographics of the audience. Use inclusive language like "everyone", "viewers", or "people". Always return valid JSON arrays with no additional text or formatting.'
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        max_tokens: 1000,
        temperature: 0.7
    });

    const responseText = completion.choices[0]?.message?.content?.trim();

    if (!responseText) {
        // Fallback to basic structure if AI fails
        return [
            {
                sectionType: 'hook',
                title: 'Opening Hook',
                estimatedDuration: '2 minutes',
                orderIndex: 0
            },
            {
                sectionType: 'main_content',
                title: 'Main Content',
                estimatedDuration: `${estimatedLengthInMinutes - 4} minutes`,
                orderIndex: 1
            },
            {
                sectionType: 'wrap_up',
                title: 'Wrap Up & Call to Action',
                estimatedDuration: '2 minutes',
                orderIndex: 2
            }
        ];
    }

    try {
        // Clean response if it has markdown
        let cleanedResponse = responseText;
        if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const sections = JSON.parse(cleanedResponse);

        // Validate and ensure proper ordering
        if (Array.isArray(sections)) {
            return sections.map((section, index) => ({
                ...section,
                orderIndex: index // Ensure proper ordering
            }));
        }

        throw new Error('Invalid sections format');
    } catch (error) {
        console.error('Error parsing AI-generated sections:', error);
        // Fallback to basic structure
        return [
            {
                sectionType: 'hook',
                title: 'Opening Hook',
                estimatedDuration: '2 minutes',
                orderIndex: 0
            },
            {
                sectionType: 'main_content',
                title: 'Main Content',
                estimatedDuration: `${estimatedLengthInMinutes - 4} minutes`,
                orderIndex: 1
            },
            {
                sectionType: 'wrap_up',
                title: 'Wrap Up & Call to Action',
                estimatedDuration: '2 minutes',
                orderIndex: 2
            }
        ];
    }
}

async function generateSectionContent(
    sectionInfo: ScriptSection,
    videoTitle: string,
    videoDescription: string,
    allSections: ScriptSection[],
    previousSections: { title: string; content: string }[] = [],
    enableWebSearch: boolean = false
): Promise<string> {
    const isFirstSection = sectionInfo.orderIndex === 0;
    const isLastSection = sectionInfo.orderIndex === allSections.length - 1;
    const sectionType = sectionInfo.sectionType;

    // Build limited context from only the last 2 sections to avoid token overflow
    const recentSections = previousSections.slice(-2); // Only last 2 sections
    const previousContext = recentSections.length > 0
        ? `\n\nRECENT CONTEXT:\n${recentSections.map((section, index) => {
            const isLast = index === recentSections.length - 1;
            return `${section.title}${isLast ? ' (PREVIOUS SECTION)' : ''}: ${section.content.substring(0, 100)}...`;
        }).join('\n\n')}\n\nFLOW REQUIREMENTS: Connect naturally to previous content, avoid repetition.`
        : '\n\nOPENING SECTION: Establish engagement and set foundation.';

    // Create section-specific prompts based on the dynamic section type
    let prompt = '';

    if (isFirstSection || sectionType === 'hook') {
        prompt = `Write an engaging opening script for the "${sectionInfo.title}" section of a YouTube video titled "${videoTitle}".

Video Description: ${videoDescription}
Section Duration: ${sectionInfo.estimatedDuration}

REQUIREMENTS:
- Use clear, accessible language that anyone can understand
- Start with immediate hook, no greetings or welcomes
- Create instant curiosity about the topic
- Grab attention with first sentence
- Preview compelling points without spoiling
- NEVER assume the age, gender, or demographics of your audience
- Use inclusive terms like "everyone", "viewers", "people", or "folks"
- FORBIDDEN PHRASES: Never use "Welcome back", "Welcome", "Hey everyone", or any greeting
- Jump straight into compelling content

${enableWebSearch ? 'Use searchCurrentInfo for any current events, recent developments, or timely information that would make this opening more compelling.' : ''}

Write ONLY the spoken words. No stage directions.`;
    } else if (isLastSection || sectionType === 'wrap_up' || sectionType === 'conclusion') {
        prompt = `Write a compelling wrap-up script for the "${sectionInfo.title}" section of a YouTube video titled "${videoTitle}".

Video Description: ${videoDescription}
Section Duration: ${sectionInfo.estimatedDuration}${previousContext}

REQUIREMENTS:
- Use clear, accessible language that anyone can understand
- Transition smoothly from previous section without greetings
- Summarize key insights briefly using simple language
- Provide clear, actionable takeaways
- Include strong call-to-action
- End with energy and motivation
- Encourage engagement (subscribe, comment, share)
- NEVER assume the age, gender, or demographics of your audience
- Use inclusive terms like "everyone", "viewers", "people", or "folks"
- FORBIDDEN PHRASES: Never use "Welcome back", "Welcome", or any greeting transitions
- Continue the flow naturally without reintroducing the audience

${enableWebSearch ? 'Reference any final current information or recent developments that reinforce the main points.' : ''}

Write ONLY the spoken words. No stage directions.`;
    } else {
        // Handle all other dynamic section types
        prompt = `Write an in-depth script for the "${sectionInfo.title}" section of a YouTube video titled "${videoTitle}".

Video Description: ${videoDescription}
Section Duration: ${sectionInfo.estimatedDuration}
Section Purpose: ${sectionType}
Position: Section ${sectionInfo.orderIndex + 1} of ${allSections.length}${previousContext}

REQUIREMENTS:
- Use clear, accessible language that anyone can understand
- Focus on what the section title promises
- Provide substantial, valuable information in simple terms
- Use concrete examples and real-world stories
- Break complex concepts into simple steps
- Keep viewers engaged with stories and analogies
- Be conversational but authoritative
- Maintain energy throughout
- NEVER assume the age, gender, or demographics of your audience
- Use inclusive terms like "everyone", "viewers", "people", or "folks"
- FORBIDDEN PHRASES: Never use "Welcome back", "Welcome", "Hey everyone", or any greeting transitions
- Continue naturally from previous section without reintroducing the audience
- Jump straight into the content this section promises

${enableWebSearch ? 'IMPORTANT: Use searchCurrentInfo to get the latest information, recent studies, current statistics, or breaking developments related to this specific section topic. This will make your content more authoritative and current.' : ''}

Write ONLY the spoken words. No stage directions or technical notes.`;
    }

    const systemMessage = enableWebSearch
        ? 'Expert YouTube script writer. Use clear, accessible language that anyone can understand. Create valuable content with stories and examples. Flow naturally between sections WITHOUT greetings or "Welcome back" phrases. NEVER assume audience age/gender - use inclusive terms like "everyone", "viewers", or "people". FORBIDDEN: Never use "Welcome back", "Welcome", "Hey everyone", or any greeting transitions between sections. Jump straight into content. Use searchCurrentInfo for current facts when needed.'
        : 'Expert YouTube script writer. Use clear, accessible language that anyone can understand. Create valuable content with stories and examples. Flow naturally between sections WITHOUT greetings or "Welcome back" phrases. NEVER assume audience age/gender - use inclusive terms like "everyone", "viewers", or "people". FORBIDDEN: Never use "Welcome back", "Welcome", "Hey everyone", or any greeting transitions between sections. Jump straight into content.';

    const messages: any[] = [
        {
            role: 'system',
            content: systemMessage,
        },
        {
            role: 'user',
            content: prompt,
        },
    ];

    const completionOptions: any = {
        model: 'gpt-4o',
        messages,
        max_tokens: 1200,
        temperature: 0.7,
    };

    // Add function calling if web search is enabled
    if (enableWebSearch && tavilyService && process.env.TAVILY_API_KEY) {
        completionOptions.tools = searchFunctions;
        completionOptions.tool_choice = 'auto';
    }

    let completion = await openai.chat.completions.create(completionOptions);

    // Handle function calls
    while (completion.choices[0]?.message?.tool_calls && completion.choices[0].message.tool_calls.length > 0) {
        // Add the assistant's message with tool calls to the conversation
        messages.push(completion.choices[0].message);

        // Process each tool call
        for (const toolCall of completion.choices[0].message.tool_calls) {
            if (toolCall.function.name === 'searchCurrentInfo') {
                try {
                    const args = JSON.parse(toolCall.function.arguments);
                    const searchResult = await handleSearchFunction(args);

                    messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: searchResult
                    });
                } catch (error) {
                    console.error('Error processing search function:', error);
                    messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify({ error: 'Failed to process search request' })
                    });
                }
            }
        }

        // Get the final response with search results
        completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages,
            max_tokens: 1200,
            temperature: 0.7,
        });
    }

    return completion.choices[0]?.message?.content?.trim() || 'Failed to generate content for this section.';
}

export async function POST(request: NextRequest) {
    try {
        console.log('🎬 Starting script generation process...');
        const { videoIdeaId, videoIdea, enableWebSearch = false, regenerate = false } = await request.json();
        console.log(`📋 Request details: videoIdeaId=${videoIdeaId}, enableWebSearch=${enableWebSearch}, regenerate=${regenerate}`);

        // Get video idea either by ID or use provided idea object
        let idea;
        if (videoIdeaId) {
            idea = await getIdeaById(videoIdeaId);
            if (!idea) {
                return NextResponse.json(
                    { error: 'Video idea not found' },
                    { status: 404 }
                );
            }
        } else if (videoIdea) {
            idea = videoIdea;
        } else {
            return NextResponse.json(
                { error: 'Either videoIdeaId or videoIdea is required' },
                { status: 400 }
            );
        }

        const { title, description, estimatedLength } = idea;
        console.log(`📝 Video idea loaded: "${title}" (${estimatedLength})`);

        // If regenerating and we have a videoIdeaId, delete existing scripts
        if (regenerate && videoIdeaId) {
            console.log('🗑️  Deleting existing scripts for regeneration...');
            await deleteScriptsByIdeaId(videoIdeaId);
        }

        // Parse estimated length and generate dynamic script sections
        const estimatedLengthInMinutes = parseEstimatedLength(estimatedLength || '10 minutes');
        console.log(`⏱️  Parsed video length: ${estimatedLengthInMinutes} minutes`);
        console.log('🔧 Generating dynamic script sections...');
        const scriptSections = await generateDynamicScriptSections(
            title,
            description,
            estimatedLengthInMinutes,
            enableWebSearch
        );
        console.log(`📚 Generated ${scriptSections.length} script sections:`, scriptSections.map(s => s.title));

        // Create the script record
        console.log('💾 Creating script record in database...');
        const script = await createVideoScript({
            videoIdeaId: videoIdeaId || null,
            title,
            estimatedLength: estimatedLength || '10 minutes',
            totalSections: scriptSections.length,
            status: 'generating'
        });
        console.log(`✅ Script record created with ID: ${script.id}`);

        // Generate content for each section sequentially for better synergy
        console.log('🤖 Starting AI content generation for each section...');
        const sectionsWithContent = [];
        const previousSections: { title: string; content: string }[] = [];

        for (const sectionInfo of scriptSections) {
            console.log(`\n📝 Generating content for section ${sectionInfo.orderIndex + 1}/${scriptSections.length}: "${sectionInfo.title}" (${sectionInfo.estimatedDuration})`);
            console.log(`🔄 Using context from ${previousSections.length} previous sections`);
            try {
                const content = await generateSectionContent(
                    sectionInfo,
                    title,
                    description,
                    scriptSections,
                    previousSections,
                    enableWebSearch
                );
                console.log(`✅ Successfully generated content for "${sectionInfo.title}" (${content.length} characters)`);

                const sectionWithContent = {
                    scriptId: script.id,
                    sectionType: sectionInfo.sectionType,
                    title: sectionInfo.title,
                    content,
                    orderIndex: sectionInfo.orderIndex,
                    estimatedDuration: sectionInfo.estimatedDuration
                };

                sectionsWithContent.push(sectionWithContent);

                // Add this section to previous sections for the next iteration
                previousSections.push({
                    title: sectionInfo.title,
                    content: content
                });

            } catch (error) {
                console.error(`❌ Error generating section ${sectionInfo.sectionType}:`, error);

                // Add a fallback section with error message
                const errorSection = {
                    scriptId: script.id,
                    sectionType: sectionInfo.sectionType,
                    title: sectionInfo.title,
                    content: `[Error generating content for this section. Please try regenerating.]`,
                    orderIndex: sectionInfo.orderIndex,
                    estimatedDuration: sectionInfo.estimatedDuration
                };

                sectionsWithContent.push(errorSection);

                // Still add to previous sections to maintain continuity
                previousSections.push({
                    title: sectionInfo.title,
                    content: errorSection.content
                });
            }
        }

        // Save all sections to database
        console.log(`\n💾 Saving ${sectionsWithContent.length} sections to database...`);
        const savedSections = await createMultipleScriptSections(sectionsWithContent);
        console.log('✅ All sections saved to database');

        // Update script status to completed
        console.log('🏁 Updating script status to completed...');
        const updatedScript = await updateVideoScript(script.id, { status: 'completed' });

        // Mark the video idea as converted to script instead of deleting it
        if (videoIdeaId) {
            console.log('📝 Marking video idea as converted to script...');
            await updateVideoIdea(videoIdeaId, { status: 'converted_to_script' });
        }

        console.log(`🎉 Script generation completed successfully! Generated ${savedSections.length} sections`);
        return NextResponse.json({
            success: true,
            script: updatedScript,
            sections: savedSections,
            message: `Successfully generated script with ${savedSections.length} sections`
        });

    } catch (error) {
        console.error('💥 Fatal error during script generation:', error);
        return NextResponse.json(
            { error: 'Failed to generate video script' },
            { status: 500 }
        );
    }
} 