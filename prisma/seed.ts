import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      iMessagePhone: "",
      emailAddress: "",
      morningTime: "06:30",
      middayTime: "12:30",
      eveningTime: "20:30",
      timezone: "America/Chicago",
      macLocalIp: "",
    },
  });
  console.log("Seeded default settings");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
