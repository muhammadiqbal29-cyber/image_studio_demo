const {
  verifyToken,
  getBearerToken,
  getJson,
  readLocalJson,
  commitFileToGitHub,
  deleteFileFromGitHub
} = require('./_helper');

const DEFAULT_SLOTS = {
  logo: {
    key: 'logo',
    name: 'Logo Utama Studio',
    section: 'Header & Footer Website',
    src: '/images/logo-baru.jpg',
    defaultSrc: '/images/logo-baru.jpg',
    aspect: 'Landscape horizontal (± 300x80px PNG/JPG)',
    previewFit: 'contain'
  },
  hero_desktop: {
    key: 'hero_desktop',
    name: 'Foto Banner Hero (Desktop)',
    section: 'Banner Utama Layar Komputer / Laptop',
    src: '/images/hero.png',
    defaultSrc: '/images/hero.png',
    aspect: 'Landscape lebar (± 1920x900px)',
    previewFit: 'cover'
  },
  hero_mobile: {
    key: 'hero_mobile',
    name: 'Foto Banner Hero (Mobile)',
    section: 'Banner Utama Layar Smartphone / HP',
    src: '/images/hero-mobile-new.png',
    defaultSrc: '/images/hero-mobile-new.png',
    aspect: 'Portrait vertikal (± 900x1200px)',
    previewFit: 'cover'
  },
  consultant_photo: {
    key: 'consultant_photo',
    name: 'Foto Profil Konsultan (Nabilah Hanum)',
    section: 'Section 04: Meet Your Consultant',
    src: '/images/hero-mobile-new.png',
    defaultSrc: '/images/hero-mobile-new.png',
    aspect: 'Portrait vertikal (± 600x800px)',
    previewFit: 'cover'
  },
  service_color: {
    key: 'service_color',
    name: 'Foto Layanan 01: Personal Color Analysis',
    section: 'Section 01: Our Services (Kartu 1)',
    src: '/images/personalcolor.jpeg',
    defaultSrc: '/images/personalcolor.jpeg',
    aspect: 'Portrait rasio 4:5 (± 800x1000px)',
    previewFit: 'cover'
  },
  service_face: {
    key: 'service_face',
    name: 'Foto Layanan 02: Face Analysis & Makeup',
    section: 'Section 01: Our Services (Kartu 2)',
    src: '/images/faceanalys.jpeg',
    defaultSrc: '/images/faceanalys.jpeg',
    aspect: 'Portrait rasio 4:5 (± 800x1000px)',
    previewFit: 'cover'
  },
  service_fashion: {
    key: 'service_fashion',
    name: 'Foto Layanan 03: Body Shape & Fashion Style',
    section: 'Section 01: Our Services (Kartu 3)',
    src: '/images/fashionanalys.jpeg',
    defaultSrc: '/images/fashionanalys.jpeg',
    aspect: 'Portrait rasio 4:5 (± 800x1000px)',
    previewFit: 'cover'
  },
  service_wardrobe: {
    key: 'service_wardrobe',
    name: 'Foto Layanan 04: Discovery Wardrobe Consultation',
    section: 'Section 01: Our Services (Kartu 4)',
    src: '/images/wardrobe.jpeg',
    defaultSrc: '/images/wardrobe.jpeg',
    aspect: 'Portrait rasio 4:5 (± 800x1000px)',
    previewFit: 'cover'
  }
};

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const SITE_IMAGES_PATH = 'data/site-images.json';

  // GET: Public fetch of active site image slots
  if (req.method === 'GET') {
    let slots = await getJson(SITE_IMAGES_PATH, DEFAULT_SLOTS);
    if (!slots || Object.keys(slots).length === 0) slots = { ...DEFAULT_SLOTS };
    return res.status(200).json({ success: true, slots });
  }

  // POST: Admin update or reset image for a slot
  if (req.method === 'POST') {
    const token = getBearerToken(req);
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Sesi Anda telah kedaluwarsa. Silakan login kembali.' });
    }

    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { key, action, base64Data } = body;

      let slots = await getJson(SITE_IMAGES_PATH, DEFAULT_SLOTS);
      if (!slots || Object.keys(slots).length === 0) slots = { ...DEFAULT_SLOTS };

      if (!key || !slots[key]) {
        return res.status(400).json({ success: false, message: `Slot foto "${key}" tidak ditemukan.` });
      }

      // Handle Reset to Default (clean up custom file if exists)
      if (action === 'reset') {
        const oldSrc = slots[key].src || '';
        let oldPath = oldSrc.split('?')[0];
        if (oldPath.startsWith('/')) oldPath = oldPath.substring(1);

        if (oldPath.startsWith('images/site-')) {
          try {
            await deleteFileFromGitHub(oldPath, `chore(site-images): hapus berkas kustom slot ${key} (${oldPath})`);
          } catch (e) {
            console.warn('Could not delete old custom file:', e.message);
          }
        }

        slots[key].src = slots[key].defaultSrc;
        const jsonSha = slots.__sha;
        const updatedJsonString = JSON.stringify(slots, null, 2);
        const updatedJsonBase64 = Buffer.from(updatedJsonString, 'utf8').toString('base64');
        await commitFileToGitHub(SITE_IMAGES_PATH, updatedJsonBase64, `chore(site-images): reset slot ${key} ke default`, jsonSha);

        return res.status(200).json({
          success: true,
          message: `Foto untuk "${slots[key].name}" berhasil dikembalikan ke default.`,
          slot: slots[key],
          slots
        });
      }

      // Handle Upload new photo for slot
      if (!base64Data) {
        return res.status(400).json({ success: false, message: 'Data foto (base64) wajib disertakan.' });
      }

      let ext = 'jpg';
      let cleanB64 = base64Data;
      if (cleanB64.includes(';base64,')) {
        const mime = cleanB64.split(';base64,')[0];
        if (mime.includes('png')) ext = 'png';
        else if (mime.includes('webp')) ext = 'webp';
        else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
        cleanB64 = cleanB64.split(';base64,')[1];
      }

      const approxByteLength = Buffer.from(cleanB64, 'base64').length;
      if (approxByteLength > 4.5 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: 'Ukuran foto melebihi batas maksimal server (4.5 MB). Gunakan foto yang lebih kecil.'
        });
      }

      // Fixed filename per slot: images/site-${key}.${ext}
      // If file with same name exists, commitFileToGitHub OVERWRITES (menimpa) it directly!
      const safeFilename = `site-${key}.${ext}`;
      const repoFilePath = `images/${safeFilename}`;
      const publicSrc = `/images/${safeFilename}?v=${Date.now()}`;

      // Check if previous custom file had a different extension (e.g. .png replaced by .jpg), clean it up
      const oldSrc = slots[key].src || '';
      let oldPath = oldSrc.split('?')[0];
      if (oldPath.startsWith('/')) oldPath = oldPath.substring(1);
      if (oldPath.startsWith('images/site-') && oldPath !== repoFilePath) {
        try {
          await deleteFileFromGitHub(oldPath, `chore(site-images): hapus berkas format lama ${oldPath}`);
        } catch (delOldErr) {
          console.warn('Could not delete old extension file:', delOldErr.message);
        }
      }

      // 1. Commit/overwrite image file in GitHub/disk
      await commitFileToGitHub(repoFilePath, cleanB64, `feat(site-images): perbarui foto ${slots[key].name} (${safeFilename})`);

      // 2. Update site-images.json
      slots[key].src = publicSrc;
      const jsonSha = slots.__sha;
      const updatedJsonString = JSON.stringify(slots, null, 2);
      const updatedJsonBase64 = Buffer.from(updatedJsonString, 'utf8').toString('base64');
      await commitFileToGitHub(SITE_IMAGES_PATH, updatedJsonBase64, `chore(site-images): update path slot ${key} di site-images.json`, jsonSha);

      return res.status(200).json({
        success: true,
        message: `Foto untuk "${slots[key].name}" berhasil diperbarui!`,
        slot: slots[key],
        slots
      });

    } catch (err) {
      console.error('Error updating site image slot:', err);
      return res.status(500).json({
        success: false,
        message: 'Gagal memperbarui foto slot website: ' + err.message
      });
    }
  }

  return res.status(405).json({ success: false, message: 'Method Not Allowed' });
};
