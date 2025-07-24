interface TavilySearchOptions {
    query: string;
    topic?: 'general' | 'news';
    max_results?: number;
    include_answer?: boolean;
    include_raw_content?: boolean;
    include_domains?: string[];
    exclude_domains?: string[];
}

interface TavilySearchResult {
    title: string;
    url: string;
    content: string;
    score: number;
    published_date?: string;
}

interface TavilySearchResponse {
    query: string;
    answer?: string;
    results: TavilySearchResult[];
    response_time: number;
}

class TavilyService {
    private apiKey: string;
    private baseUrl = 'https://api.tavily.com';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Search the web using Tavily's AI-optimized search
     */
    async search(options: TavilySearchOptions): Promise<TavilySearchResponse> {
        const searchPayload = {
            api_key: this.apiKey,
            query: options.query,
            search_depth: options.topic === 'news' ? 'basic' : 'advanced',
            include_answer: options.include_answer !== false,
            include_raw_content: options.include_raw_content || false,
            max_results: Math.min(options.max_results || 5, 10),
            include_domains: options.include_domains || [],
            exclude_domains: options.exclude_domains || []
        };

        try {
            const response = await fetch(`${this.baseUrl}/search`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(searchPayload)
            });

            if (!response.ok) {
                throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Tavily search error:', error);
            throw error;
        }
    }

    /**
     * Search for current news and trending topics
     */
    async searchNews(query: string, maxResults: number = 5): Promise<TavilySearchResponse> {
        return this.search({
            query: `${query} latest news current events`,
            topic: 'news',
            max_results: maxResults,
            include_answer: true
        });
    }

    /**
     * Search for general information with detailed content
     */
    async searchGeneral(query: string, maxResults: number = 5): Promise<TavilySearchResponse> {
        return this.search({
            query,
            topic: 'general',
            max_results: maxResults,
            include_answer: true,
            include_raw_content: true
        });
    }

    /**
     * Format search results for LLM consumption
     */
    formatSearchResults(searchResponse: TavilySearchResponse): string {
        let formatted = `Search Query: "${searchResponse.query}"\n\n`;

        if (searchResponse.answer) {
            formatted += `Quick Answer: ${searchResponse.answer}\n\n`;
        }

        formatted += `Search Results:\n`;
        searchResponse.results.forEach((result, index) => {
            formatted += `${index + 1}. ${result.title}\n`;
            formatted += `   ${result.content}\n`;
            formatted += `   Source: ${result.url}\n`;
            if (result.published_date) {
                formatted += `   Published: ${result.published_date}\n`;
            }
            formatted += `\n`;
        });

        return formatted;
    }

    /**
     * Check if Tavily is configured
     */
    static isConfigured(): boolean {
        return !!process.env.TAVILY_API_KEY;
    }
}

// Export singleton instance
export const tavilyService = new TavilyService(process.env.TAVILY_API_KEY || '');
export type { TavilySearchOptions, TavilySearchResponse, TavilySearchResult }; 