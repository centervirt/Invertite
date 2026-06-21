const QDRANT_URL = 'https://proyecto-qdrant-db.tmmjdr.easypanel.host';
const COLLECTION_NAME = 'invertite_knowledge';

async function main() {
  console.log('Querying Qdrant collection info...');
  try {
    const res = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`);
    if (!res.ok) {
      console.error('Error fetching collection info:', res.status, await res.text());
      return;
    }
    
    const data = await res.json();
    console.log('Collection Info:', JSON.stringify(data.result, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
