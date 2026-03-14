
const mongoose = require('mongoose');

const mongoUri = "mongodb+srv://Vercel-Admin-driver_request:2Cqr22ZxLPigEdjL@driver-request.w11djig.mongodb.net/?retryWrites=true&w=majority";

const UserSchema = new mongoose.Schema({
  branch: String,
  role: String
}, { collection: 'users' });

const LeaveRequestSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  status: String,
  leaveType: String,
  startDate: Date,
  endDate: Date
}, { collection: 'leaverequests' });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const LeaveRequest = mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', LeaveRequestSchema);

async function checkData() {
  try {
    await mongoose.connect(mongoUri);
    
    const ayaUsers = await User.find({ branch: 'AYA' }).select('_id');
    const ayaUserIds = ayaUsers.map(u => u._id);
    
    console.log('AYA User IDs Count:', ayaUserIds.length);
    
    const leaves = await LeaveRequest.find({ 
      userId: { $in: ayaUserIds },
      status: 'approved'
    });
    
    console.log('Approved Leaves for AYA branch:', leaves.length);
    if (leaves.length > 0) {
      console.log('Sample Leave:', JSON.stringify(leaves[0], null, 2));
    }

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkData();
