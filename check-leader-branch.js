
const mongoose = require('mongoose');

const mongoUri = "mongodb+srv://Vercel-Admin-driver_request:2Cqr22ZxLPigEdjL@driver-request.w11djig.mongodb.net/?retryWrites=true&w=majority";

const LeaderSchema = new mongoose.Schema({
  email: String,
  branch: String,
  role: String
}, { collection: 'leaders' });

const Leader = mongoose.model('Leader', LeaderSchema);

async function checkLeader() {
  await mongoose.connect(mongoUri);
  const leaders = await Leader.find({});
  console.log('Total Leaders:', leaders.length);
  leaders.forEach(l => {
    console.log(`Leader: ${l.email}, Branch: [${l.branch}], Role: [${l.role}]`);
  });
  process.exit(0);
}

checkLeader();
