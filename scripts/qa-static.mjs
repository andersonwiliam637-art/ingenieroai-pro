import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const failures = [];
const pkg = JSON.parse(read("package.json"));
const env = read(".env.example");
const sql = read("db/migrations/0001_neon_schema_review.sql");
const headers = read("next.config.ts");
const sourceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel);
    else if (/\.(ts|tsx|mjs)$/.test(entry.name)) sourceFiles.push(rel);
  }
}
walk("src"); walk("scripts");
const source = sourceFiles.map(read).join("\n");
if (pkg.dependencies?.["@supabase/ssr"] || pkg.dependencies?.["@supabase/supabase-js"]) failures.push("Old database SDK still listed in dependencies");
if (!pkg.dependencies?.pg || !pkg.dependencies?.["@auth/pg-adapter"] || !pkg.dependencies?.["next-auth"]) failures.push("Neon/Auth.js dependencies missing");
if (!env.includes("DATABASE_URL=") || !env.includes("AUTH_SECRET=")) failures.push("Neon/Auth.js environment variables missing");
if (!fs.existsSync(path.join(root, "src/lib/db/pool.ts"))) failures.push("PostgreSQL pool missing");
if (!fs.existsSync(path.join(root, "src/auth.ts"))) failures.push("Auth.js configuration missing");
if (!sql.includes("memberships_select_self") || !sql.includes("memberships_no_client_insert")) failures.push("Membership RLS write-denial policies missing");
if (!sql.includes("private.is_org_member(uuid)")) failures.push("Tenant RLS helper missing");
if (!fs.existsSync(path.join(root, "db/operations/02-runtime-role-grants.template.sql"))) failures.push("Least-privilege runtime grants template missing");
if (!headers.includes("X-Content-Type-Options") || !headers.includes("Content-Security-Policy")) failures.push("Baseline security headers missing");
if (!read("src/app/api/health/route.ts").includes("SELECT 1")) failures.push("Database readiness probe missing");
if (/from\s+["']@\/lib\/supabase|createClient\(\).*supabase/i.test(source)) failures.push("Old database client references remain in runtime source");
if (failures.length) {
  console.error("NEON_TRANSITION_STATIC_CHECK_FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("NEON_TRANSITION_STATIC_CHECK_PASSED");
console.log(`Checked ${sourceFiles.length} source/script files for provider SDK removal and Neon/Auth.js scaffolding.`);
console.log("This check does not validate SQL migrations, tenant isolation, authentication delivery, build, or production readiness.");
