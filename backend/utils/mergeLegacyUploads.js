const fs = require('fs');
const path = require('path');
const { uploadsRoot } = require('./uploadsPath');

/**
 * Eski kurulumlarda PM2 cwd proje köküyken dosyalar `../uploads` altına düşmüş olabilir;
 * Express ise `backend/uploads` sunar. Eksik dosyaları birleştirir (üzerine yazmaz).
 * @returns {{ movedFiles: number; scannedRoots: string[] }}
 */
function mergeLegacyUploads() {
    const backendDir = path.join(__dirname, '..');
    const repoRoot = path.join(backendDir, '..');
    const candidates = [
        path.join(repoRoot, 'uploads'),
        path.join(backendDir, 'uploads', 'uploads'),
    ];
    const scannedRoots = [];
    let movedFiles = 0;

    const copyFileIfMissing = (src, dest) => {
        if (!fs.existsSync(src) || !fs.statSync(src).isFile()) return;
        if (fs.existsSync(dest)) return;
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.renameSync(src, dest);
        movedFiles += 1;
    };

    const walk = (srcDir, destDir) => {
        if (!fs.existsSync(srcDir)) return;
        const st = fs.statSync(srcDir);
        if (!st.isDirectory()) return;
        for (const name of fs.readdirSync(srcDir)) {
            const src = path.join(srcDir, name);
            const dest = path.join(destDir, name);
            const entry = fs.statSync(src);
            if (entry.isDirectory()) {
                walk(src, dest);
            } else if (entry.isFile()) {
                copyFileIfMissing(src, dest);
            }
        }
    };

    for (const legacy of candidates) {
        const resolvedLegacy = path.resolve(legacy);
        const resolvedTarget = path.resolve(uploadsRoot);
        if (resolvedLegacy === resolvedTarget) continue;
        if (!fs.existsSync(resolvedLegacy)) continue;
        scannedRoots.push(resolvedLegacy);
        walk(resolvedLegacy, resolvedTarget);
    }

    return { movedFiles, scannedRoots };
}

module.exports = { mergeLegacyUploads };
