
const token = process.env.VERCEL_TOKEN || 'YOUR_VERCEL_TOKEN_HERE';

async function listDeployments() {
  try {
    const res = await fetch('https://api.vercel.com/v6/deployments?limit=3', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    data.deployments.forEach(d => {
      console.log(`UID: ${d.uid} | State: ${d.state} | Created: ${new Date(d.createdAt).toLocaleString()} | URL: ${d.url}`);
    });
  } catch (err) {
    console.error(err);
  }
}

listDeployments();
