/**
 * Test script for Kokoro TTS integration
 * Verifies that the LocalAudioProcessor can generate audio using Kokoro TTS
 */

async function testKokoroTTS() {
    console.log('🧪 Testing Kokoro TTS Integration...\n');

    try {
        // Import the LocalAudioProcessor using require with ts-node configured for CommonJS
        require('ts-node').register({
            transpileOnly: true,
            compilerOptions: {
                module: 'commonjs',
                moduleResolution: 'node',
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
                target: 'es2017',
                skipLibCheck: true
            }
        });

        const { LocalAudioProcessor } = require('./src/lib/local-audio-utils.ts');

        // Initialize audio processor with Kokoro TTS
        const audioProcessor = new LocalAudioProcessor({
            preferGPU: true,
            ttsEngine: 'kokoro'
        });

        console.log('📋 Initializing audio processor...');
        await audioProcessor.initialize();

        // Check capabilities
        const capabilities = await audioProcessor.checkCapabilities();
        console.log('🎯 TTS Capabilities:', capabilities);

        // Test text
        const testSections = [
            {
                content: "Hello! This is a test of the Kokoro TTS system. It should generate high-quality, natural-sounding speech quickly and efficiently.",
                title: "Test Section 1",
                orderIndex: 0
            },
            {
                content: "Kokoro TTS is an ultra-fast text-to-speech model with only 82 million parameters, making it much faster than larger models.",
                title: "Test Section 2",
                orderIndex: 1
            }
        ];

        console.log('\n🎤 Starting audio generation test...');
        const startTime = Date.now();

        // Generate audio
        const audioSegments = await audioProcessor.generateConsistentAudio(testSections, {
            addPauseBetweenSections: true,
            pauseDuration: 0.5,
            language: 'en'
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`✅ Audio generation completed in ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
        console.log(`📊 Generated ${audioSegments.length} audio segments`);

        // Check if any audio was actually generated
        if (audioSegments.length === 0) {
            throw new Error('No audio segments were generated! Kokoro TTS failed to produce any output.');
        }

        // Filter out placeholder segments
        const actualAudioSegments = audioSegments.filter(segment =>
            segment.metadata.type === 'audio' && !segment.metadata.isPlaceholder
        );

        if (actualAudioSegments.length === 0) {
            throw new Error('Only placeholder segments were generated! All actual audio generation failed.');
        }

        console.log(`🎵 Successfully generated ${actualAudioSegments.length} actual audio segments (${audioSegments.length - actualAudioSegments.length} placeholders)`);

        // Combine segments
        const combinedAudio = audioProcessor.combineAudioSegments(audioSegments);
        console.log(`🔗 Combined audio size: ${(combinedAudio.length / 1024 / 1024).toFixed(2)}MB`);

        if (combinedAudio.length === 0) {
            throw new Error('Combined audio is empty! No actual audio data was produced.');
        }

        // Save the generated audio to a file for testing
        const fs = require('fs');
        const path = require('path');
        const outputFileName = `test-kokoro-output-${Date.now()}.wav`;
        const outputPath = path.join(__dirname, outputFileName);

        try {
            fs.writeFileSync(outputPath, combinedAudio);
            console.log(`💾 Audio saved to: ${outputFileName}`);
            console.log(`📂 Full path: ${outputPath}`);
            console.log(`🎧 You can now play this file to hear the Kokoro TTS output!`);
        } catch (saveError) {
            console.warn(`⚠️ Could not save audio file: ${saveError.message}`);
            console.log(`🔍 Audio was generated successfully but couldn't be saved to disk`);
        }

        console.log('\n🎉 Kokoro TTS test completed successfully!');
        console.log('\n📈 Performance Summary:');
        console.log(`   • Total processing time: ${(duration / 1000).toFixed(2)}s`);
        console.log(`   • Audio segments: ${audioSegments.length}`);
        console.log(`   • Average time per segment: ${(duration / audioSegments.length).toFixed(0)}ms`);
        console.log(`   • Audio output size: ${(combinedAudio.length / 1024 / 1024).toFixed(2)}MB`);

    } catch (error) {
        console.error('\n❌ Kokoro TTS test failed:', error.message);
        console.error('\n🔍 Troubleshooting:');
        console.error('   1. Make sure Kokoro TTS is installed: pip install kokoro>=0.9.2 soundfile');
        console.error('   2. Install system dependencies: apt-get install espeak-ng');
        console.error('   3. Check Python path in environment variables');
        console.error('   4. Verify audio output directory permissions');

        process.exit(1);
    }
}

// Run the test
testKokoroTTS();

module.exports = { testKokoroTTS }; 