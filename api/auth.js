const { verifyPassword, createToken, verifyToken, getBearerToken, readLocalJson } = require('./_helper');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Check token validity
  if (req.method === 'GET') {
    const token = getBearerToken(req);
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ authenticated: false, message: 'Sesi tidak valid atau telah berakhir.' });
    }
    return res.status(200).json({ authenticated: true, user: { email: payload.email } });
  }

  // POST: Login
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { email, password } = body;

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email dan password wajib diisi.' });
      }

      // Read admin credentials from data/admin.json
      const adminData = readLocalJson('data/admin.json', {
        email: 'admin@imagestudio.id',
        salt: 'f277faa74f827014094727eacb7b5ae9',
        passwordHash: 'd73e9c9eca2f3ce3aefac098e6cdea766a9760f7d8a3343f2713a06f26a749ff7676ab64f4cf99efa14b97f3a8c9c2c4facb2fdacb68489ce0569b2f823f2fa7'
      });

      // Verify email (case-insensitive)
      if (email.trim().toLowerCase() !== adminData.email.trim().toLowerCase()) {
        return res.status(401).json({ success: false, message: 'Email atau password salah.' });
      }

      // Verify password
      const isMatch = verifyPassword(password, adminData.salt, adminData.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Email atau password salah.' });
      }

      // Generate token
      const token = createToken({ email: adminData.email });
      return res.status(200).json({
        success: true,
        message: 'Login berhasil.',
        token: token,
        user: { email: adminData.email }
      });
    } catch (e) {
      console.error('Login error:', e);
      return res.status(500).json({ success: false, message: 'Terjadi kesalahan internal server.' });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
};
