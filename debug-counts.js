
const mongoose = require('mongoose');

const mongoUri = "mongodb+srv://Vercel-Admin-driver_request:2Cqr22ZxLPigEdjL@driver-request.w11djig.mongodb.net/?retryWrites=true&w=majority";

const UserSchema = new mongoose.Schema({
  branch: String,
  role: String,
  status: String,
  name: String,
  surname: String
}, { collection: 'users' });

const LeaveRequestSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  status: String,
  leaveType: String
}, { collection: 'leaverequests' });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const LeaveRequest = mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', LeaveRequestSchema);

async function debugCounts() {
  try {
    await mongoose.connect(mongoUri);
    
    // 1. Check Pending Drivers
    const allPendingDrivers = await User.find({ status: { $ne: 'active' }, role: 'driver' });
    console.log('Total Pending Drivers (all branches/none):', allPendingDrivers.length);
    allPendingDrivers.forEach(u => {
      console.log(`- ${u.name} ${u.surname}: branch=[${u.branch}], status=[${u.status}]`);
    });

    // 2. Check Pending Leaves for AYA
    const ayaUsers = await User.find({ branch: { $regex: /^AYA$/i } }).select('_id');
    const ayaUserIds = ayaUsers.map(u => u._id);
    
    const pendingLeaves = await LeaveRequest.find({ 
      userId: { $in: ayaUserIds },
      status: 'pending'
    }).populate('userId');

    console.log('Pending Leaves for AYA branch:', pendingLeaves.length);
    pendingLeaves.forEach(l => {
      console.log(`- Request ID: ${l._id}, User: ${l.userId ? l.userId.name : 'Unknown'}, Status: ${l.status}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

debugCounts();
