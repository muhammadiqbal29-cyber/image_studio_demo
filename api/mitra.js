const {
  verifyToken,
  getBearerToken,
  getJson,
  readLocalJson,
  commitFileToGitHub,
  deleteFileFromGitHub
} = require('./_helper');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const MITRA_JSON_PATH = 'mitra.json';

  // GET: Public fetch of partner logos
  if (req.method === 'GET') {
    const items = await getJson(MITRA_JSON_PATH, []);
    return res.status(200).json({ success: true, items });
  }

  // Admin auth check for POST / DELETE
  const token = getBearerToken(req);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Sesi Anda telah kedaluwarsa. Silakan login kembali.' });
  }

  // POST: Add new partner logo or update existing
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      let { id, name, base64Data } = body;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Nama mitra / brand wajib diisi.' });
      }

      const items = await getJson(MITRA_JSON_PATH, []);
      let targetItem = id ? items.find(i => String(i.id) === String(id)) : null;

      let publicSrc = targetItem ? targetItem.src : '';

      // If new image provided
      if (base64Data) {
        let ext = 'png';
        let cleanB64 = base64Data;
        if (cleanB64.includes(';base64,')) {
          const mime = cleanB64.split(';base64,')[0];
          if (mime.includes('webp')) ext = 'webp';
          else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
          cleanB64 = cleanB64.split(';base64,')[1];
        }

        const approxByteLength = Buffer.from(cleanB64, 'base64').length;
        if (approxByteLength > 4.5 * 1024 * 1024) {
          return res.status(400).json({ success: false, message: 'Ukuran logo maksimal 4.5 MB.' });
        }

        // If replacing existing custom logo, clean up old file
        if (targetItem && targetItem.src) {
          let oldPath = targetItem.src.split('?')[0];
          if (oldPath.startsWith('/')) oldPath = oldPath.substring(1);
          if (oldPath.startsWith('logo_mitra/mitra-')) {
            try {
              await deleteFileFromGitHub(oldPath, `chore(mitra): hapus berkas logo lama ${oldPath}`);
            } catch (e) {
              console.warn('Could not delete old logo file:', e.message);
            }
          }
        }

        const timestamp = Date.now();
        const safeFilename = `mitra-${timestamp}.${ext}`;
        const repoFilePath = `logo_mitra/${safeFilename}`;
        publicSrc = `/logo_mitra/${safeFilename}`;

        // Commit file to GitHub/disk
        await commitFileToGitHub(repoFilePath, cleanB64, `feat(mitra): unggah logo mitra ${name.trim()} (${safeFilename})`);
      } else if (!targetItem) {
        return res.status(400).json({ success: false, message: 'Berkas logo mitra wajib disertakan.' });
      }

      if (targetItem) {
        targetItem.name = name.trim();
        targetItem.src = publicSrc;
      } else {
        const newItem = {
          id: String(Date.now()),
          name: name.trim(),
          src: publicSrc
        };
        items.push(newItem);
      }

      // Update mitra.json
      const updatedJsonString = JSON.stringify(items, null, 2);
      const updatedJsonBase64 = Buffer.from(updatedJsonString, 'utf8').toString('base64');
      await commitFileToGitHub(MITRA_JSON_PATH, updatedJsonBase64, `chore(mitra): update mitra.json (${name.trim()})`);

      return res.status(200).json({
        success: true,
        message: targetItem ? 'Data mitra berhasil diperbarui!' : 'Mitra baru berhasil ditambahkan!',
        items
      });
    } catch (err) {
      console.error('Error handling mitra POST:', err);
      return res.status(500).json({ success: false, message: 'Gagal memproses data mitra: ' + err.message });
    }
  }

  // DELETE: Remove partner logo
  if (req.method === 'DELETE') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const id = body.id || (req.query && req.query.id);

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID mitra wajib disertakan.' });
      }

      const items = await getJson(MITRA_JSON_PATH, []);
      const targetIndex = items.findIndex(i => String(i.id) === String(id));
      if (targetIndex === -1) {
        return res.status(404).json({ success: false, message: 'Data mitra tidak ditemukan.' });
      }

      const [removed] = items.splice(targetIndex, 1);

      // Commit updated mitra.json
      const updatedJsonString = JSON.stringify(items, null, 2);
      const updatedJsonBase64 = Buffer.from(updatedJsonString, 'utf8').toString('base64');
      await commitFileToGitHub(MITRA_JSON_PATH, updatedJsonBase64, `chore(mitra): hapus mitra ${removed.name} (${removed.id})`);

      // If custom file uploaded (starts with /logo_mitra/mitra-), try delete
      let filePath = removed.src.startsWith('/') ? removed.src.substring(1) : removed.src;
      if (filePath.startsWith('logo_mitra/mitra-')) {
        try {
          await deleteFileFromGitHub(filePath, `chore(mitra): hapus berkas logo ${filePath}`);
        } catch (e) {
          console.warn('Could not delete physical logo file:', e.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: `Mitra "${removed.name}" berhasil dihapus.`,
        items
      });
    } catch (err) {
      console.error('Error handling mitra DELETE:', err);
      return res.status(500).json({ success: false, message: 'Gagal menghapus mitra: ' + err.message });
    }
  }

  return res.status(405).json({ success: false, message: 'Method Not Allowed' });
};
