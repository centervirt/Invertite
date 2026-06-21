require('dotenv').config();

async function main() {
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmZGQyNTA2YS1iNDg2LTQyOTUtOThhNS03ZjM4ZTUwZDY1YWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzgxOTEzNDk5LCJleHAiOjE3ODQ0MzM2MDB9.-RGSws-de17Ad6PrrBxAz-T6s1BJo2M1z9tBUw9Vkxs';
  const baseUrl = 'https://n8n.neurasolutions.com.ar/api/v1';
  const wId = 'zrJggRka9DIiwSP4YwDvR';
  
  try {
    const execsRes = await fetch(`${baseUrl}/executions?workflowId=${wId}&limit=1`, {
      headers: {
        'X-N8N-API-KEY': apiKey
      }
    });
    const execsData = await execsRes.json();
    if (!execsData.data || execsData.data.length === 0) {
      console.log('No executions found');
      return;
    }
    
    const latestExec = execsData.data[0];
    console.log(`Latest Execution ID: ${latestExec.id}, Status: ${latestExec.status}`);
    console.log('Execution properties:', Object.keys(latestExec));
    console.log('Full Execution:', JSON.stringify(latestExec, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
