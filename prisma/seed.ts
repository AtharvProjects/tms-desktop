import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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

  // Drivers
  const driver1 = await prisma.driver.create({ data: { driverName: 'Ramesh Singh', mobileNumber: '9876543210', licenseNumber: 'MH-12-2020-1234', salary: 15000, advanceBalance: 500, status: 'Active' } })
  const driver2 = await prisma.driver.create({ data: { driverName: 'Suresh Kumar', mobileNumber: '9876543211', licenseNumber: 'MH-14-2019-5678', salary: 18000, advanceBalance: 0, status: 'Active' } })
  const driver3 = await prisma.driver.create({ data: { driverName: 'Ali Khan', mobileNumber: '9876543212', licenseNumber: 'GJ-01-2018-9012', salary: 20000, advanceBalance: 1500, status: 'On-Trip' } })

  // Vehicles
  const v1 = await prisma.vehicle.create({ data: { vehicleNumber: 'MH 12 AB 1234', vehicleType: 'Trailer 40ft', capacity: '30 Tons', currentKms: 45000, status: 'Active', driverId: driver1.id, insuranceExpiry: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) } })
  const v2 = await prisma.vehicle.create({ data: { vehicleNumber: 'MH 14 CD 5678', vehicleType: 'Open Truck', capacity: '20 Tons', currentKms: 120000, status: 'Active', driverId: driver2.id, fitnessExpiry: new Date(new Date().setDate(new Date().getDate() + 10)) } })
  const v3 = await prisma.vehicle.create({ data: { vehicleNumber: 'GJ 01 EF 9012', vehicleType: 'Container 32ft', capacity: '25 Tons', currentKms: 32000, status: 'On-Trip', driverId: driver3.id, permitExpiry: new Date() } })

  // Parties
  const p1 = await prisma.party.create({ data: { companyName: 'Reliance Industries', contactPerson: 'Mukesh Bhai', phone: '9000000001', outstandingBalance: 50000, status: 'Active', address: 'Navi Mumbai, MH' } })
  const p2 = await prisma.party.create({ data: { companyName: 'Tata Motors', contactPerson: 'Ratan Sir', phone: '9000000002', outstandingBalance: 120000, status: 'Active', address: 'Pimpri Chinchwad, MH' } })
  const p3 = await prisma.party.create({ data: { companyName: 'Larsen & Toubro', contactPerson: 'S.N. Subrahmanyan', phone: '9000000003', outstandingBalance: 0, status: 'Active', address: 'Powai, MH' } })

  // Party Ledgers
  await prisma.partyLedger.create({ data: { partyId: p1.id, type: 'Adjustment', amount: 50000, description: 'Opening Balance' } })
  await prisma.partyLedger.create({ data: { partyId: p2.id, type: 'Adjustment', amount: 120000, description: 'Opening Balance' } })

  // Trips
  await prisma.trip.create({
    data: {
      tripNo: 'TRP-2026-001',
      tripDate: new Date(),
      vehicleId: v3.id,
      partyId: p1.id,
      driverId: driver3.id,
      from: 'Mumbai',
      to: 'Ahmedabad',
      material: 'Chemicals',
      sizeWeight: '25 Tons',
      freightAmount: 35000,
      dieselAmount: 12000,
      driverAdvance: 5000,
      toll: 1500,
      balance: 16500,
      status: 'In Transit',
      eWayBillNumber: '123456789012',
      route: 'Surat - Vadodara',
    }
  })

  await prisma.trip.create({
    data: {
      tripNo: 'TRP-2026-002',
      tripDate: new Date(new Date().setDate(new Date().getDate() - 5)),
      vehicleId: v1.id,
      partyId: p2.id,
      driverId: driver1.id,
      from: 'Pune',
      to: 'Bangalore',
      material: 'Steel Coils',
      sizeWeight: '30 Tons',
      freightAmount: 45000,
      dieselAmount: 18000,
      driverAdvance: 8000,
      toll: 2500,
      balance: 16500,
      status: 'Completed',
      eWayBillNumber: '987654321098',
      route: 'Kolhapur - Belgaum',
    }
  })
  
  await prisma.trip.create({
    data: {
      tripNo: 'TRP-2026-003',
      tripDate: new Date(new Date().setDate(new Date().getDate() + 1)),
      vehicleId: v2.id,
      partyId: p3.id,
      driverId: driver2.id,
      from: 'Delhi',
      to: 'Jaipur',
      material: 'Electronics',
      sizeWeight: '15 Tons',
      freightAmount: 20000,
      dieselAmount: 5000,
      driverAdvance: 2000,
      toll: 500,
      balance: 12500,
      status: 'Scheduled',
      eWayBillNumber: '456789012345',
      route: 'Gurgaon - Neemrana',
    }
  })

  // Driver Ledgers
  await prisma.driverLedger.create({ data: { driverId: driver1.id, type: 'Advance', amount: 500, description: 'Initial Advance' } })
  await prisma.driverLedger.create({ data: { driverId: driver3.id, type: 'Advance', amount: 1500, description: 'Trip TRP-2026-001 Advance' } })

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
