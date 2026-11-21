const {
  verifyPassword,
  hashPassword,
  verifyToken,
  getBearerToken,
  readLocalJson,
  commitFileToGitHub
} = require('./_helper');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const token = getBearerToken(req);
    const session = verifyToken(token);
    if (!session) {
      return res.status(401).json({ success: false, message: 'Sesi Anda telah kedaluwarsa. Silakan login kembali.' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Password lama dan password baru wajib diisi.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password baru minimal harus 6 karakter.' });
    }

    // Read current admin credentials
    const adminData = readLocalJson('data/admin.json', {
      email: session.email || 'admin@imagestudio.id',
      salt: 'f277faa74f827014094727eacb7b5ae9',
      passwordHash: 'd73e9c9eca2f3ce3aefac098e6cdea766a9760f7d8a3343f2713a06f26a749ff7676ab64f4cf99efa14b97f3a8c9c2c4facb2fdacb68489ce0569b2f823f2fa7'
    });

    // Check old password
    const isOldValid = verifyPassword(oldPassword, adminData.salt, adminData.passwordHash);
    if (!isOldValid) {
      return res.status(400).json({ success: false, message: 'Password lama yang Anda masukkan tidak sesuai.' });
    }

    // Hash new password
    const { salt: newSalt, hash: newHash } = hashPassword(newPassword);

    const updatedAdmin = {
      email: adminData.email,
      salt: newSalt,
      passwordHash: newHash,
      updatedAt: new Date().toISOString()
    };

    const jsonString = JSON.stringify(updatedAdmin, null, 2);
    const base64Content = Buffer.from(jsonString, 'utf8').toString('base64');

    // Commit change to GitHub repo or local disk
    await commitFileToGitHub('data/admin.json', base64Content, 'chore: update admin password');

    return res.status(200).json({
      success: true,
      message: 'Password berhasil diperbarui! Gunakan password baru untuk login berikutnya.'
    });
  } catch (e) {
    console.error('Change password error:', e);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui password: ' + e.message });
  }
};
