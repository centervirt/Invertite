const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmZGQyNTA2YS1iNDg2LTQyOTUtOThhNS03ZjM4ZTUwZDY1YWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzgxOTEzNDk5LCJleHAiOjE3ODQ0MzM2MDB9.-RGSws-de17Ad6PrrBxAz-T6s1BJo2M1z9tBUw9Vkxs';
  const baseUrl = 'https://n8n.neurasolutions.com.ar/api/v1';
  const workflowId = 'zrJggRka9DIiwSP4YwDvR';
  
  const workflowPath = path.join(__dirname, '../..', 'docs/n8n-workflow-tutor-rag.json');
  console.log('Reading local workflow from:', workflowPath);
  
  if (!fs.existsSync(workflowPath)) {
    console.error('Workflow file not found!');
    return;
  }
  
  const fileContent = fs.readFileSync(workflowPath, 'utf8');
  const workflowData = JSON.parse(fileContent);
  
  // Map settings.onError to root onError, and delete settings
  const cleanedNodes = workflowData.nodes.map(node => {
    const newNode = { ...node };
    if (newNode.settings && newNode.settings.onError) {
      newNode.onError = newNode.settings.onError;
    }
    delete newNode.settings;
    return newNode;
  });
  
  // Clean workflow data to match API expectations
  const payload = {
    name: workflowData.name,
    nodes: cleanedNodes,
    connections: workflowData.connections,
    settings: workflowData.settings || {}
  };
  
  console.log(`Updating workflow ID: ${workflowId} in cloud...`);
  
  try {
    const res = await fetch(`${baseUrl}/workflows/${workflowId}`, {
      method: 'PUT',
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to update workflow. Status: ${res.status}, Response: ${errorText}`);
    }
    
    const responseData = await res.json();
    console.log('Workflow successfully updated in the cloud! Response ID:', responseData.id);
  } catch (err) {
    console.error('Error updating workflow:', err.message);
  }
}

main();
