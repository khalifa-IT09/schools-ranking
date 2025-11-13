// Photo Recovery Script
// This script helps identify orphaned photos and attempts to recover them
// Run this on the server to see what photos exist and help match them

const fs = require('fs');
const path = require('path');
const dbManager = require('./database');

async function recoverPhotos() {
  try {
    console.log('🔍 Starting photo recovery process...\n');

    // 1. Get all photos in uploads directory
    const uploadsDir = path.join(__dirname, 'public', 'uploads', 'tutors');
    
    if (!fs.existsSync(uploadsDir)) {
      console.log('❌ Uploads directory does not exist');
      return;
    }

    const photoFiles = fs.readdirSync(uploadsDir)
      .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
      .map(file => ({
        filename: file,
        path: `/uploads/tutors/${file}`,
        fullPath: path.join(uploadsDir, file),
        stats: fs.statSync(path.join(uploadsDir, file))
      }));

    console.log(`📸 Found ${photoFiles.length} photo files in uploads directory\n`);

    // 2. Get all teachers from database
    await dbManager.initialize();
    const teachers = await dbManager.getTeachers({});

    console.log(`👨‍🏫 Found ${teachers.length} teachers in database\n`);

    // 3. Find teachers with null/missing photo_path
    const teachersWithoutPhotos = teachers.filter(t => !t.photo_path || t.photo_path === '');
    console.log(`⚠️  Found ${teachersWithoutPhotos.length} teachers without photos\n`);

    // 4. Try to match photos by creation date (if photos were uploaded around teacher creation time)
    console.log('🔗 Attempting to match photos by creation date...\n');
    
    const matches = [];
    for (const teacher of teachersWithoutPhotos) {
      const teacherCreated = new Date(teacher.created_at);
      
      // Find photos created within 1 hour of teacher creation
      const potentialMatches = photoFiles.filter(photo => {
        const photoCreated = photo.stats.birthtime || photo.stats.mtime;
        const timeDiff = Math.abs(photoCreated - teacherCreated);
        return timeDiff < 3600000; // 1 hour in milliseconds
      });

      if (potentialMatches.length > 0) {
        matches.push({
          teacher: {
            id: teacher.id,
            name: teacher.teacher_name,
            phone: teacher.teacher_phone,
            created_at: teacher.created_at
          },
          potentialPhotos: potentialMatches.map(p => ({
            filename: p.filename,
            path: p.path,
            created_at: p.stats.birthtime || p.stats.mtime
          }))
        });
      }
    }

    // 5. Display results
    console.log('📋 RECOVERY REPORT\n');
    console.log('='.repeat(60));
    
    if (matches.length > 0) {
      console.log(`\n✅ Found ${matches.length} potential matches:\n`);
      
      matches.forEach((match, index) => {
        console.log(`${index + 1}. Teacher: ${match.teacher.name} (ID: ${match.teacher.id})`);
        console.log(`   Phone: ${match.teacher.phone}`);
        console.log(`   Created: ${match.teacher.created_at}`);
        console.log(`   Potential photos:`);
        match.potentialPhotos.forEach(photo => {
          console.log(`     - ${photo.filename} (created: ${photo.created_at})`);
        });
        console.log('');
      });

      console.log('\n⚠️  MANUAL REVIEW REQUIRED:');
      console.log('   These are potential matches based on creation time.');
      console.log('   Please review and manually update the database if correct.\n');
    } else {
      console.log('\n❌ No automatic matches found based on creation time.');
      console.log('   Photos may need to be manually matched or re-uploaded.\n');
    }

    // 6. List all orphaned photos
    const teachersWithPhotos = teachers
      .filter(t => t.photo_path)
      .map(t => t.photo_path.replace('/uploads/tutors/', ''));
    
    const orphanedPhotos = photoFiles.filter(photo => 
      !teachersWithPhotos.includes(photo.filename)
    );

    if (orphanedPhotos.length > 0) {
      console.log(`\n📁 Found ${orphanedPhotos.length} orphaned photos (not linked to any teacher):\n`);
      orphanedPhotos.forEach(photo => {
        console.log(`   - ${photo.filename}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('   1. Review the potential matches above');
    console.log('   2. Manually update teachers with correct photo_path values');
    console.log('   3. Or ask tutors to re-upload their photos');
    console.log('   4. Consider implementing a photo recovery admin interface\n');

  } catch (error) {
    console.error('❌ Error during photo recovery:', error);
  }
}

// Run recovery
if (require.main === module) {
  recoverPhotos().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { recoverPhotos };

