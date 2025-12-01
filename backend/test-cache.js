/**
 * Test script for cache performance
 * Run with: node test-cache.js
 */

const http = require('http');

const makeRequest = (path) => {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        
        http.get(`http://localhost:3000${path}`, (res) => {
            let data = '';
            
            res.on('data', chunk => {
                data += chunk;
            });
            
            res.on('end', () => {
                const duration = Date.now() - start;
                resolve({ duration, statusCode: res.statusCode, data: JSON.parse(data) });
            });
        }).on('error', reject);
    });
};

const testEndpoint = async (path, name) => {
    console.log(`\n📊 Testing ${name}...`);
    console.log('─'.repeat(60));
    
    // First request (no cache)
    console.log('1st request (cache miss):');
    const first = await makeRequest(path);
    console.log(`   Duration: ${first.duration}ms`);
    console.log(`   Status: ${first.statusCode}`);
    
    // Second request (should be cached)
    console.log('2nd request (cache hit):');
    const second = await makeRequest(path);
    console.log(`   Duration: ${second.duration}ms`);
    console.log(`   Status: ${second.statusCode}`);
    
    // Third request (should be cached)
    console.log('3rd request (cache hit):');
    const third = await makeRequest(path);
    console.log(`   Duration: ${third.duration}ms`);
    console.log(`   Status: ${third.statusCode}`);
    
    const avgCached = (second.duration + third.duration) / 2;
    const improvement = ((first.duration - avgCached) / first.duration * 100).toFixed(1);
    
    console.log(`\n✨ Performance improvement: ${improvement}% faster with cache`);
    console.log(`   Without cache: ${first.duration}ms`);
    console.log(`   With cache: ${avgCached.toFixed(1)}ms`);
};

const testCache = async () => {
    console.log('\n🚀 Cache Performance Test');
    console.log('═'.repeat(60));
    
    try {
        // Test different endpoints
        await testEndpoint('/research-types', 'Research Types');
        await testEndpoint('/research-techniques', 'Research Techniques');
        await testEndpoint('/module-templates', 'Module Templates');
        
        // Get cache stats
        console.log('\n📈 Cache Statistics');
        console.log('─'.repeat(60));
        const stats = await makeRequest('/cache/stats');
        console.log(`   Cache entries: ${stats.data.size}`);
        console.log(`   Timestamp: ${stats.data.timestamp}`);
        
        console.log('\n✅ Cache test completed!\n');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.log('\n💡 Make sure the server is running: npm run dev\n');
    }
};

// Run tests
testCache();
