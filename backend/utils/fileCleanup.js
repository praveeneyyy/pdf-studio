const fs = require('fs');

/**
 * Robust file cleanup utility to ensure temporary files are wiped from the system
 * @param {Array|Object|string} files - File path string, req.file object, or array of req.files
 */
const cleanup = (files) => {
    if (!files) return;
    
    const fileArray = Array.isArray(files) ? files : [files];
    
    fileArray.forEach(file => {
        if (!file) return;
        const targetPath = file.path || file;
        if (typeof targetPath === 'string' && fs.existsSync(targetPath)) {
            try {
                fs.unlinkSync(targetPath);
            } catch (err) {
                console.error(`Error cleaning up file ${targetPath}:`, err.message);
            }
        }
    });
};

module.exports = { cleanup };
