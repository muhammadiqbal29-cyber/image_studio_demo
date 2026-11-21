const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO_OWNER = process.env.GITHUB_OWNER || 'muhammadiqbal29-cyber';
const REPO_NAME = process.env.GITHUB_REPO || 'image_studio_demo';
const REPO_BRANCH = process.env.GITHUB_BRANCH || 'main';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const SECRET_KEY = process.env.ADMIN_SECRET || 'hanum-studio-image-2026-secret-salt-key';

// Password hashing
function hashPassword(password, salt) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
}

// Token creation (HMAC signed)
function createToken(payload, expiresInHours = 168) { // 7 days default
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + (expiresInHours * 3600);
  const data = { ...payload, exp };

  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsignedToken = `${encode(header)}.${encode(data)}`;
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(unsignedToken).digest('base64url');

  return `${unsignedToken}.${signature}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signature] = parts;
  const unsignedToken = `${headerB64}.${payloadB64}`;
  const expectedSig = crypto.createHmac('sha256', SECRET_KEY).update(unsignedToken).digest('base64url');

  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return payload;
  } catch (e) {
    return null;
  }
}

// Extract Bearer token from request headers
function getBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return null;
}

// Read JSON file (fallback to disk if available)
function readLocalJson(relPath, fallback) {
  try {
    const fullPath = path.resolve(process.cwd(), relPath);
    if (fs.existsSync(fullPath)) {
      const data = fs.readFileSync(fullPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error(`Error reading ${relPath}:`, e.message);
  }
  return fallback;
}

// GitHub API: Save / Commit file
async function commitFileToGitHub(filePath, base64Content, commitMessage) {
  if (!GITHUB_TOKEN) {
    // If running locally, write directly to disk
    const fullPath = path.resolve(process.cwd(), filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, Buffer.from(base64Content, 'base64'));
    return { success: true, local: true };
  }

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;

  // Check if file already exists to get SHA
  let existingSha = undefined;
  try {
    const checkRes = await fetch(url + `?ref=${REPO_BRANCH}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'ImageStudio-CMS'
      }
    });
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      existingSha = checkData.sha;
    }
  } catch (e) {
    console.warn('Could not check existing file SHA:', e.message);
  }

  const body = {
    message: commitMessage,
    content: base64Content,
    branch: REPO_BRANCH
  };
  if (existingSha) {
    body.sha = existingSha;
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'ImageStudio-CMS'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub API error (${res.status}): ${errText}`);
  }

  return await res.json();
}

// GitHub API: Delete file
async function deleteFileFromGitHub(filePath, commitMessage) {
  if (!GITHUB_TOKEN) {
    const fullPath = path.resolve(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    return { success: true, local: true };
  }

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;

  // Get SHA
  const checkRes = await fetch(url + `?ref=${REPO_BRANCH}`, {
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'ImageStudio-CMS'
    }
  });

  if (!checkRes.ok) {
    return { success: true, notFound: true };
  }

  const checkData = await checkRes.json();
  const sha = checkData.sha;

  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'ImageStudio-CMS'
    },
    body: JSON.stringify({
      message: commitMessage,
      sha: sha,
      branch: REPO_BRANCH
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub API delete error (${res.status}): ${errText}`);
  }

  return await res.json();
}

module.exports = {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  getBearerToken,
  readLocalJson,
  commitFileToGitHub,
  deleteFileFromGitHub,
  GITHUB_TOKEN,
  REPO_OWNER,
  REPO_NAME
};
