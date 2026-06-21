const axios = require('axios');

async function main() {
  const loginUrl = 'http://localhost:3005/api/v1/auth/login';
  const chatUrl = 'http://localhost:3005/api/v1/tutor/chat';
  
  try {
    // Login to get token
    console.log('Logging in...');
    const loginRes = await axios.post(loginUrl, {
      email: 'jorge@test.com', // Let's try the user's test email
      password: 'password123'
    });
    
    const token = loginRes.data.data.accessToken;
    console.log('Token obtained.');
    
    // Call tutor chat
    console.log('Calling tutor chat...');
    const chatRes = await axios.post(chatUrl, {
      message: 'Cuando cotizo el dolar mep hoy ?'
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('API Response data:', JSON.stringify(chatRes.data, null, 2));
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

main();
