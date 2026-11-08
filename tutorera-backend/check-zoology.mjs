import mongoose from 'mongoose';
import AcademicDiscipline from './dist/models/AcademicDiscipline.model.js';

async function checkAndCreateZoology() {
  await mongoose.connect('mongodb+srv://tutorera:9xyKSjcZViasz6Sr@cluster0.7mtq37y.mongodb.net/tutorera?retryWrites=true&w=majority', { autoIndex: false, autoCreate: false });
  
  // Check existing disciplines
  const existing = await AcademicDiscipline.find({ status: 'active' }).lean();
  console.log('Existing active disciplines:');
  existing.forEach(d => console.log(  - ));
  
  // Check if Zoology exists
  const zoology = await AcademicDiscipline.findOne({ name: /^zoology$/i });
  if (!zoology) {
    console.log('\nCreating Zoology discipline...');
    await AcademicDiscipline.create({
      name: 'Zoology',
      status: 'active',
      description: 'Zoology degree program'
    });
    console.log('✓ Zoology discipline created');
  }
  
  await mongoose.disconnect();
}

checkAndCreateZoology().catch(e => { console.error(e); process.exit(1); });
