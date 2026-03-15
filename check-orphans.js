
const mongoose = require('mongoose');

const mongoUri = "mongodb+srv://Vercel-Admin-driver_request:2Cqr22ZxLPigEdjL@driver-request.w11djig.mongodb.net/?retryWrites=true&w=majority";

const UserSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const LeaveSchema = new mongoose.Schema({}, { strict: false, collection: 'leaverequests' });

const User = mongoose.model('User', UserSchema);
const LeaveRequest = mongoose.model('LeaveRequest', LeaveSchema);

async function checkOrphans() {
  await mongoose.connect(mongoUri);
  const leaves = await LeaveRequest.find({ status: 'pending' });
  console.log('Pending Leaves Raw:', leaves.length);
  
  for (const l of leaves) {
    const u = await User.findById(l.userId);
    console.log(`Leave ${l._id}: userId=${l.userId}, UserFound=${!!u}, Branch=${u ? u.branch : 'N/A'}`);
  }
  
  process.exit(0);
}

checkOrphans();
