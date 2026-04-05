import bcryptjs from "bcryptjs";
import pkg from "pg";

const { Client } = pkg;

const client = new Client(process.env.DATABASE_URL);

async function main() {
  await client.connect();

  const password = "#duly2108";
  const hashedPassword = await bcryptjs.hash(password, 10);

  const openId = `super-admin-${Date.now()}`;

    await client.query(
    `INSERT INTO users (
      "openId", name, email, role, "groupAccess", 
      "loginUsername", "loginPasswordHash", status, "lgpdAccepted"
    ) VALUES (\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, \$9)`,
    [
      openId,
      "Admin PAI",
      "braguil@gmail.com",
      "super_admin",
      "reads_writes",
      "braguil",
      hashedPassword,
      "active",
      true,
    ]
  );

  console.log("✅ Super Admin criado!");
  console.log("Usuário: braguil");
  console.log("Senha: #duly2108");

  await client.end();
}

main().catch(console.error);