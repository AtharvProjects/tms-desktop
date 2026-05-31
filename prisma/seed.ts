import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('Seeding mock data...')

  // Clean DB
  await prisma.invoice.deleteMany()
  await prisma.dieselLog.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.maintenanceLog.deleteMany()
  await prisma.driverLedger.deleteMany()
  await prisma.partyLedger.deleteMany()
  await prisma.trip.deleteMany()
  await prisma.vehicle.deleteMany()
  await prisma.party.deleteMany()
  await prisma.driver.deleteMany()



  console.log('Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
