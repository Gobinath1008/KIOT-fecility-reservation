async function run() {
  try {
    const { connectDB } = await import('./src/lib/db.js');
    const User = (await import('./src/models/User.js')).default;
    await connectDB();
    const u = await User.findOne({ email: 'admin@kiot.ac.in' });
    console.log('User found:', JSON.stringify(u, null, 2));
    console.log('assignedServices type:', typeof u.assignedServices);
    console.log('Is Array?', Array.isArray(u.assignedServices));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
