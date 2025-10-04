const fs = require('fs');
const path = require('path');

console.log('🚀 Building application for production...');

// Créer le dossier dist si il n'existe pas
const distDir = 'dist';
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

// Copier tous les fichiers du dossier public vers dist
const publicDir = 'public';
const files = fs.readdirSync(publicDir);

files.forEach(file => {
    const srcPath = path.join(publicDir, file);
    const destPath = path.join(distDir, file);
    
    if (fs.statSync(srcPath).isDirectory()) {
        // Copier récursivement les dossiers
        copyDir(srcPath, destPath);
    } else {
        // Copier les fichiers
        fs.copyFileSync(srcPath, destPath);
    }
});

// Fonction pour copier récursivement les dossiers
function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest);
    }
    
    const files = fs.readdirSync(src);
    files.forEach(file => {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);
        
        if (fs.statSync(srcPath).isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    });
}

console.log('✅ Build completed! Files copied to dist/ folder');
console.log('📁 Ready for Netlify deployment');
