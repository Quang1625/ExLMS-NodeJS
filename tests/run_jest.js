const { execSync } = require('child_process');
try {
  const out = execSync('npx jest tests/joinRequest.test.js --color=false', { stdio: 'pipe' });
  console.log(out.toString());
} catch (e) {
  console.log("STDOUT\n", e.stdout.toString());
  console.log("STDERR\n", e.stderr.toString());
}
