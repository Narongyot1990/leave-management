
const mongoose = require('mongoose');

const mongoUri = "mongodb+srv://Vercel-Admin-driver_request:2Cqr22ZxLPigEdjL@driver-request.w11djig.mongodb.net/?retryWrites=true&w=majority";

const UserSchema = new mongoose.Schema({
  name: String,
  surname: String,
  branch: String,
  role: String
}, { collection: 'users' });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function checkData() {
  try {
    await mongoose.connect(mongoUri);
    const users = await User.find({}).select('name surname branch role');
    console.log('Total Users:', users.length);
    
    const branchCounts = {};
    users.forEach(u => {
      const b = u.branch || 'MISSING';
      branchCounts[b] = (branchCounts[b] || 0) + 1;
    });
    
    console.log('Branch Distribution:', JSON.stringify(branchCounts, null, 2));
    
    const drivers = users.filter(u => u.role === 'driver');
    console.log('Total Drivers:', drivers.length);
    
    const driversInMT = users.filter(u => u.branch && u.branch.toUpperCase() === 'MT' && u.role === 'driver');
    console.log('Drivers in MT (any case):', driversInMT.length);
    
    const mtUsers = users.filter(u => u.branch && u.branch.toUpperCase() === 'MT');
    console.log('Distinct MT spellings:', [...new Set(mtUsers.map(u => u.branch))]);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkData();
