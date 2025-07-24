// Examples of how to use the Script Generation API

export const scriptApiExamples = {
    // Example 1: Generate script using video idea ID
    generateScriptFromId: async (videoIdeaId: number) => {
        const response = await fetch('/api/generate-script', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                videoIdeaId
            }),
        });

        return response.json();
    },

    // Example 2: Generate script using video idea object directly
    generateScriptFromIdea: async (videoIdea: { title: string; description: string; estimatedLength: string }) => {
        const response = await fetch('/api/generate-script', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                videoIdea
            }),
        });

        return response.json();
    },

    // Example 3: Retrieve generated scripts
    getScripts: async (options?: { scriptId?: number; videoIdeaId?: number; includeSections?: boolean }) => {
        const params = new URLSearchParams();
        if (options?.scriptId) params.append('scriptId', options.scriptId.toString());
        if (options?.videoIdeaId) params.append('videoIdeaId', options.videoIdeaId.toString());
        if (options?.includeSections) params.append('includeSections', 'true');

        const response = await fetch(`/api/get-scripts?${params.toString()}`);
        return response.json();
    }
};

// Test cases showing how estimatedLength affects script structure
export const estimatedLengthTestCases = [
    {
        case: 'Short Video (5 minutes)',
        input: {
            title: 'Quick React Hooks Tutorial',
            description: 'Learn the basics of React hooks in just 5 minutes',
            estimatedLength: '5 minutes'
        },
        expectedSections: [
            'intro',
            'main_content',
            'conclusion'
        ],
        totalSections: 3
    },
    {
        case: 'Medium Video (15 minutes)',
        input: {
            title: 'Complete Guide to TypeScript',
            description: 'A comprehensive tutorial covering TypeScript fundamentals and advanced features',
            estimatedLength: '15 minutes'
        },
        expectedSections: [
            'intro',
            'main_content_1',
            'main_content_2',
            'conclusion'
        ],
        totalSections: 4
    },
    {
        case: 'Long Video (30 minutes)',
        input: {
            title: 'Full Stack Web Development Course',
            description: 'Build a complete web application from scratch using modern technologies',
            estimatedLength: '30 minutes'
        },
        expectedSections: [
            'intro',
            'main_content_1',
            'main_content_2',
            'main_content_3',
            'conclusion'
        ],
        totalSections: 5
    },
    {
        case: 'Very Long Video (60 minutes)',
        input: {
            title: 'Advanced JavaScript Masterclass',
            description: 'Deep dive into advanced JavaScript concepts, patterns, and best practices',
            estimatedLength: '60 minutes'
        },
        expectedSections: [
            'intro',
            'main_content_1',
            'main_content_2',
            'main_content_3',
            'main_content_4',
            'main_content_5',
            'conclusion'
        ],
        totalSections: 7
    },
    {
        case: 'Edge Case - Text with range',
        input: {
            title: 'JavaScript Interview Prep',
            description: 'Prepare for JavaScript interviews with common questions and answers',
            estimatedLength: '20-25 minutes'
        },
        expectedSections: [
            'intro',
            'main_content_1',
            'main_content_2',
            'conclusion'
        ],
        totalSections: 4,
        note: 'Parses first number (20) from range'
    }
];

// Example API responses
export const exampleApiResponses = {
    successfulGeneration: {
        success: true,
        script: {
            id: 1,
            videoIdeaId: 1,
            title: 'Quick React Hooks Tutorial',
            estimatedLength: '5 minutes',
            totalSections: 3,
            status: 'completed',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:05:00Z'
        },
        sections: [
            {
                id: 1,
                scriptId: 1,
                sectionType: 'intro',
                title: 'Introduction & Hook',
                content: 'Hey everyone! Welcome back to my channel...',
                orderIndex: 0,
                estimatedDuration: '1-2 minutes'
            },
            {
                id: 2,
                scriptId: 1,
                sectionType: 'main_content',
                title: 'Main Content',
                content: 'Let\'s dive right into React hooks...',
                orderIndex: 1,
                estimatedDuration: '2 minutes'
            },
            {
                id: 3,
                scriptId: 1,
                sectionType: 'conclusion',
                title: 'Conclusion & Call to Action',
                content: 'That\'s a wrap on React hooks! If you found this helpful...',
                orderIndex: 2,
                estimatedDuration: '1-2 minutes'
            }
        ],
        message: 'Successfully generated script with 3 sections'
    },

    errorResponse: {
        error: 'Either videoIdeaId or videoIdea is required'
    }
};

// Note: Section generation is now handled dynamically by AI
// The API uses generateDynamicScriptSections() which creates topic-specific sections
// instead of hardcoded generic sections. This provides better synergy and flow.
export function getScriptGenerationInfo() {
    return {
        note: "Script sections are now generated dynamically by AI based on the video topic",
        features: [
            "Topic-specific section titles",
            "Natural flow between sections",
            "No repetitive greetings",
            "Deeper content exploration",
            "Better synergy throughout the script"
        ],
        previousApproach: "Hardcoded generic sections (Introduction, Main Content, Conclusion)",
        currentApproach: "AI-generated sections tailored to each video topic"
    };
} 