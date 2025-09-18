const { create } = require('ipfs-http-client');

// IPFS client factory
// Supports Infura IPFS, local IPFS, or any IPFS-compatible gateway
// Env examples:
// - IPFS_API_URL=https://ipfs.infura.io:5001
// - IPFS_PROJECT_ID=...
// - IPFS_PROJECT_SECRET=...
// - IPFS_GATEWAY=https://ipfs.io/ipfs

let ipfsClient;

function getIpfsClient() {
  if (ipfsClient) return ipfsClient;

  const url = process.env.IPFS_API_URL || 'https://ipfs.infura.io:5001';
  const projectId = process.env.IPFS_PROJECT_ID;
  const projectSecret = process.env.IPFS_PROJECT_SECRET;

  const auth = projectId && projectSecret
    ? 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64')
    : undefined;

  ipfsClient = create({
    url,
    headers: auth ? { Authorization: auth } : undefined,
  });

  return ipfsClient;
}

// Add JSON object to IPFS and return CID + gateway URL
async function addJSON(data) {
  const client = getIpfsClient();
  const { cid } = await client.add({
    content: Buffer.from(JSON.stringify(data)),
  });
  return {
    cid: cid.toString(),
    url: toGatewayUrl(cid.toString()),
  };
}

// Add raw file/buffer/stream
async function addFile(content, options = {}) {
  const client = getIpfsClient();
  const { cid } = await client.add(content, options);
  return {
    cid: cid.toString(),
    url: toGatewayUrl(cid.toString()),
  };
}

function toGatewayUrl(cid) {
  const gateway = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs';
  return `${gateway}/${cid}`;
}

async function getJSON(cid) {
  const client = getIpfsClient();
  const chunks = [];
  for await (const chunk of client.cat(cid)) {
    chunks.push(chunk);
  }
  const buf = Buffer.concat(chunks);
  return JSON.parse(buf.toString('utf8'));
}

module.exports = {
  getIpfsClient,
  addJSON,
  addFile,
  getJSON,
  toGatewayUrl,
};
