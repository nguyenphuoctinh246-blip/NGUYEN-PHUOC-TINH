// Đóng gói supabase/schema.sql vào ứng dụng để nút "Sao chép mã SQL" dùng được mà không cần mở file.
import { readFileSync, writeFileSync } from "node:fs";

const sql = readFileSync("supabase/schema.sql", "utf8");
writeFileSync(
  "lib/cloud/schema-sql.ts",
  `// TỰ ĐỘNG SINH từ supabase/schema.sql bởi scripts/gen-schema.mjs. Không sửa tay.\nexport const SCHEMA_SQL = ${JSON.stringify(sql)};\n`,
);
console.log("lib/cloud/schema-sql.ts", (sql.length / 1024).toFixed(1) + " KB");
