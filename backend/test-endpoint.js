/**
 * Test script to verify the add-welcome-thankyou endpoint
 */

const testEndpoint = async () => {
    const researchId = '92c67aaa-fa3f-4634-89b4-32beb0937907';
    const testUrl = `https://emotio.cx/api/research/${researchId}/add-welcome-thankyou`;
    
    console.log('Testing endpoint:', testUrl);
    console.log('Method: POST');
    
    try {
        const response = await fetch(testUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        console.log('\nResponse Status:', response.status);
        console.log('Response Status Text:', response.statusText);
        console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
        
        const text = await response.text();
        console.log('\nResponse Body:', text.substring(0, 500));
        
        if (response.status === 403) {
            console.log('\n❌ 403 Forbidden - Server is blocking the request before it reaches the backend');
        } else if (response.status === 404) {
            console.log('\n❌ 404 Not Found - Endpoint not found in backend');
        } else if (response.status === 401) {
            console.log('\n✅ 401 Unauthorized - Endpoint exists but requires authentication (this is expected)');
        } else {
            console.log('\n✅ Endpoint responded with status:', response.status);
        }
    } catch (error) {
        console.error('Error testing endpoint:', error);
    }
};

testEndpoint();
