const {
  verifyToken,
  getBearerToken,
  getJson,
  readLocalJson,
  commitFileToGitHub,
  deleteFileFromGitHub
} = require('./_helper');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Fetch list of gallery photos
  if (req.method === 'GET') {
    try {
      const items = await getJson('galeri.json', [
        { id: '1', src: '/galeri/1.jpg' },
        { id: '2', src: '/galeri/2.jpg' },
        { id: '3', src: '/galeri/3.jpg' },
        { id: '4', src: '/galeri/4.jpg' },
        { id: '5', src: '/galeri/5.jpg' },
        { id: '6', src: '/galeri/6.jpg' }
      ]);
      return res.status(200).json({ success: true, items });
    } catch (e) {
      console.error('Fetch gallery error:', e);
      return res.status(500).json({ success: false, message: 'Gagal mengambil data galeri.' });
    }
  }

  // POST: Upload new photo
  if (req.method === 'POST') {
    const token = getBearerToken(req);
    const session = verifyToken(token);
    if (!session) {
      return res.status(401).json({ success: false, message: 'Sesi Anda telah kedaluwarsa. Silakan login kembali.' });
    }

    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      let { base64Data, filename, title } = body;

      if (!base64Data) {
        return res.status(400).json({ success: false, message: 'Data foto (base64) wajib disertakan.' });
      }

      // Clean base64 header if present (e.g. data:image/jpeg;base64,...)
      let ext = 'jpg';
      if (base64Data.includes(';base64,')) {
        const mime = base64Data.split(';base64,')[0];
        if (mime.includes('png')) ext = 'png';
        else if (mime.includes('webp')) ext = 'webp';
        else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
        base64Data = base64Data.split(';base64,')[1];
      }

      // Check binary payload size (max 4.5 MB to comply with Vercel serverless limit)
      const approxByteLength = Buffer.from(base64Data, 'base64').length;
      if (approxByteLength > 4.5 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: 'Ukuran foto melebihi batas maksimal server (4.5 MB). Silakan gunakan foto yang lebih kecil atau tunggu kompresi otomatis.'
        });
      }

      const timestamp = Date.now();
      const safeFilename = `foto-${timestamp}.${ext}`;
      const repoFilePath = `galeri/${safeFilename}`;
      const publicSrc = `/galeri/${safeFilename}`;

      // 1. Commit/save image file to repo
      await commitFileToGitHub(repoFilePath, base64Data, `feat(galeri): tambah foto ${safeFilename}`);

      // 2. Update galeri.json (via GitHub or local)
      const items = await getJson('galeri.json', []);
      const newItem = {
        id: String(timestamp),
        src: publicSrc,
        title: title || `Dokumentasi Studio ${items.length + 1}`
      };

      // Add to list (at end or beginning)
      items.push(newItem);

      const updatedJsonString = JSON.stringify(items, null, 2);
      const updatedJsonBase64 = Buffer.from(updatedJsonString, 'utf8').toString('base64');

      await commitFileToGitHub('galeri.json', updatedJsonBase64, `feat(galeri): perbarui daftar galeri.json`);

      return res.status(200).json({
        success: true,
        message: 'Foto berhasil diunggah ke galeri studio!',
        item: newItem,
        items: items
      });
    } catch (e) {
      console.error('Upload gallery photo error:', e);
      return res.status(500).json({ success: false, message: 'Gagal mengunggah foto: ' + e.message });
    }
  }

  // DELETE: Delete a photo
  if (req.method === 'DELETE') {
    const token = getBearerToken(req);
    const session = verifyToken(token);
    if (!session) {
      return res.status(401).json({ success: false, message: 'Sesi Anda telah kedaluwarsa. Silakan login kembali.' });
    }

    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { id, src } = body;

      if (!id && !src) {
        return res.status(400).json({ success: false, message: 'ID atau src foto wajib diisi untuk menghapus.' });
      }

      const items = await getJson('galeri.json', []);
      const targetItem = items.find(item => item.id === String(id) || item.src === src);

      if (!targetItem) {
        return res.status(404).json({ success: false, message: 'Foto tidak ditemukan di galeri.' });
      }

      // Filter out item
      const updatedItems = items.filter(item => item !== targetItem);

      // 1. Update galeri.json
      const updatedJsonString = JSON.stringify(updatedItems, null, 2);
      const updatedJsonBase64 = Buffer.from(updatedJsonString, 'utf8').toString('base64');
      await commitFileToGitHub('galeri.json', updatedJsonBase64, `chore(galeri): hapus foto ${targetItem.id} dari galeri.json`);

      // 2. Delete file if it's in galeri/
      let filePath = targetItem.src.startsWith('/') ? targetItem.src.substring(1) : targetItem.src;
      if (filePath.startsWith('galeri/')) {
        try {
          await deleteFileFromGitHub(filePath, `chore(galeri): hapus berkas ${filePath}`);
        } catch (delErr) {
          console.warn('Could not delete physical file, but removed from list:', delErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Foto berhasil dihapus dari galeri.',
        items: updatedItems
      });
    } catch (e) {
      console.error('Delete gallery photo error:', e);
      return res.status(500).json({ success: false, message: 'Gagal menghapus foto: ' + e.message });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
};
