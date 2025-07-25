/**
 * Maps video topics to appropriate emoji icons
 */
export const topicIconMap: Record<string, string> = {
    // Sleep & Wellness
    'Sleep': '😴',
    'Mental Health': '🧘',
    'Wellness': '🧘',
    'Health': '💪',

    // Technology
    'Technology': '💻',
    'Programming': '💻',
    'Science': '🔬',

    // Entertainment
    'Music': '🎵',
    'Comedy': '🎭',
    'Movies': '🎬',

    // Lifestyle
    'Photography': '📷',
    'Homes': '🏡',
    'Pets': '🐾',
    'Cars': '🚗',

    // Personal Development
    'Personal Development': '🌟',
    'Self-Improvement': '🌟',
    'Personal Growth': '🌟',
    'Productivity': '📋',

    // Business & Finance
    'Business': '💰',
    'Personal Finance': '💰',

    // Stories & Content
    'Fictional Stories': '📖',
    'Crime Stories': '🕵️',

    // Other
    'Sports': '⚽',
    'History': '🏛️',
};

/**
 * Get the appropriate icon for a given topic
 * @param topic - The video topic
 * @returns The emoji icon for the topic, or a default icon if not found
 */
export function getTopicIcon(topic: string): string {
    // Try exact match first
    if (topicIconMap[topic]) {
        return topicIconMap[topic];
    }

    // Try partial matches for more flexible matching
    const lowerTopic = topic.toLowerCase();

    // Check for partial matches
    for (const [key, icon] of Object.entries(topicIconMap)) {
        if (lowerTopic.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerTopic)) {
            return icon;
        }
    }

    // Check for common keywords
    if (lowerTopic.includes('sleep') || lowerTopic.includes('bed') || lowerTopic.includes('rest')) {
        return '😴';
    }
    if (lowerTopic.includes('tech') || lowerTopic.includes('programming') || lowerTopic.includes('code')) {
        return '💻';
    }
    if (lowerTopic.includes('health') || lowerTopic.includes('wellness') || lowerTopic.includes('mental')) {
        return '🧘';
    }
    if (lowerTopic.includes('music') || lowerTopic.includes('audio')) {
        return '🎵';
    }
    if (lowerTopic.includes('comedy') || lowerTopic.includes('funny')) {
        return '🎭';
    }
    if (lowerTopic.includes('movie') || lowerTopic.includes('film')) {
        return '🎬';
    }
    if (lowerTopic.includes('photo') || lowerTopic.includes('camera')) {
        return '📷';
    }
    if (lowerTopic.includes('home') || lowerTopic.includes('house')) {
        return '🏡';
    }
    if (lowerTopic.includes('pet') || lowerTopic.includes('animal')) {
        return '🐾';
    }
    if (lowerTopic.includes('car') || lowerTopic.includes('automotive')) {
        return '🚗';
    }
    if (lowerTopic.includes('personal') || lowerTopic.includes('development') || lowerTopic.includes('growth') || lowerTopic.includes('improvement')) {
        return '🌟';
    }
    if (lowerTopic.includes('productivity') || lowerTopic.includes('organization')) {
        return '📋';
    }
    if (lowerTopic.includes('business') || lowerTopic.includes('finance') || lowerTopic.includes('money')) {
        return '💰';
    }
    if (lowerTopic.includes('science') || lowerTopic.includes('scientific')) {
        return '🔬';
    }
    if (lowerTopic.includes('sport') || lowerTopic.includes('athletic')) {
        return '⚽';
    }
    if (lowerTopic.includes('history') || lowerTopic.includes('historical')) {
        return '🏛️';
    }
    if (lowerTopic.includes('fictional') || lowerTopic.includes('story')) {
        return '📖';
    }
    if (lowerTopic.includes('crime') || lowerTopic.includes('mystery')) {
        return '🕵️';
    }

    // Default fallback
    return '🎤';
}

/**
 * Get a list of all available topics with their icons
 * @returns Array of topic-icon pairs
 */
export function getAllTopicIcons(): Array<{ topic: string; icon: string }> {
    return Object.entries(topicIconMap).map(([topic, icon]) => ({
        topic,
        icon
    }));
} 