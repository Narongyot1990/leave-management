
const mongoose = require('mongoose');

const mongoUri = "mongodb+srv://Vercel-Admin-driver_request:2Cqr22ZxLPigEdjL@driver-request.w11djig.mongodb.net/?retryWrites=true&w=majority";

const LeaderSchema = new mongoose.Schema({
  email: String,
  branch: String,
  role: String
}, { collection: 'leaders' });

const Leader = mongoose.model('Leader', LeaderSchema);

async function fixLeader() {
  await mongoose.connect(mongoUri);
  // Set leader@itl.com to AYA branch
  const result = await Leader.updateOne(
    { email: 'leader@itl.com' },
    { $set: { branch: 'AYA', role: 'leader' } }
  );
  console.log('Update Result for leader@itl.com:', result);
  
  // Set admin@fls.com to admin role
  const resultAdmin = await Leader.updateOne(
    { email: 'admin@fls.com' },
    { $set: { role: 'admin' } }
  );
  console.log('Update Result for admin@fls.com:', resultAdmin);

  process.exit(0);
}

fixLeader();
