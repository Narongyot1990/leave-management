
import mongoose from 'mongoose';
import dbConnect from './src/lib/mongodb';
import { User } from './src/models/User';

async function checkData() {
  await dbConnect();
  const users = await User.find({}).select('name surname branch role');
  console.log('Total Users:', users.length);
  
  const branchCounts: Record<string, number> = {};
  users.forEach(u => {
    const b = u.branch || 'MISSING';
    branchCounts[b] = (branchCounts[b] || 0) + 1;
  });
  
  console.log('Branch Distribution:', branchCounts);
  
  const driversInMT = users.filter(u => u.branch?.toUpperCase() === 'MT' && u.role === 'driver');
  console.log('Drivers in MT (any case):', driversInMT.length);
  
  process.exit(0);
}

checkData();
