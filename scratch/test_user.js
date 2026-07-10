async function run() {
  try {
    const { connectDB } = await import('../src/lib/db.js');
    const User = (await import('../src/models/User.js')).default;
    await connectDB();
    const users = await User.find({});
    console.log('ALL USERS:', JSON.stringify(users.map(u => ({
      name: u.name,
      email: u.email,
      role: u.role,
      permissions: u.permissions
    })), null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
