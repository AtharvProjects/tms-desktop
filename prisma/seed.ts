import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  console.log('Cleaning up existing database records...')
  await prisma.invoice.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.dieselLog.deleteMany()
  await prisma.trip.deleteMany()
  await prisma.party.deleteMany()
  await prisma.vehicle.deleteMany()
  await prisma.driver.deleteMany()

  console.log('Seeding data...')

  // 1. Seed Parties (Customers)
  const partyTata = await prisma.party.create({
    data: {
      companyName: 'Tata Steel Ltd',
      contactPerson: 'Rahul Sharma',
      phone: '9876543210',
      email: 'logistics@tatasteel.com',
      gstNumber: '22AAAAA0000A1Z5',
      address: 'Jamshedpur Plant, Jharkhand - 831001',
      outstandingBalance: 150000,
      status: 'Active',
    },
  })

  const partyUltra = await prisma.party.create({
    data: {
      companyName: 'UltraTech Cement',
      contactPerson: 'Amit Patel',
      phone: '9876543211',
      email: 'transport@ultratech.com',
      gstNumber: '27AAAAA0000A1Z5',
      address: 'Wankhede Chambers, Mumbai, MH - 400020',
      outstandingBalance: 45000,
      status: 'Active',
    },
  })

  const partyReliance = await prisma.party.create({
    data: {
      companyName: 'Reliance Industries Ltd',
      contactPerson: 'Sanjay Mehta',
      phone: '9922110033',
      email: 'logistics.hubs@ril.com',
      gstNumber: '24AAAAA1111B1Z2',
      address: 'Jamnagar Refinery, Gujarat - 361140',
      outstandingBalance: 320000,
      status: 'Active',
    },
  })

  const partyJindal = await prisma.party.create({
    data: {
      companyName: 'Jindal Steel & Power',
      contactPerson: 'Karan Johar',
      phone: '9111222333',
      email: 'billing@jindal.com',
      gstNumber: '22BBBBB1111A1Z9',
      address: 'Raigarh, Chhattisgarh - 496001',
      outstandingBalance: 0,
      status: 'Active',
    },
  })

  const partyAdani = await prisma.party.create({
    data: {
      companyName: 'Adani Port Logistics',
      contactPerson: 'Vikas Adani',
      phone: '9000888777',
      email: 'ops@adaniports.com',
      gstNumber: '24CCCCC2222C1Z4',
      address: 'Mundra Port, Gujarat - 370421',
      outstandingBalance: 98000,
      status: 'Active',
    },
  })

  // 2. Seed Drivers
  const driverRamesh = await prisma.driver.create({
    data: {
      driverName: 'Ramesh Singh',
      mobileNumber: '9988776655',
      licenseNumber: 'MH-12-2015-1234567',
      aadhaarNumber: '1234 5678 9012',
      panNumber: 'ABCPS1234F',
      salary: 25000,
      advanceBalance: 5000,
      status: 'On-Trip',
    },
  })

  const driverSuresh = await prisma.driver.create({
    data: {
      driverName: 'Suresh Kumar',
      mobileNumber: '9988776644',
      licenseNumber: 'GJ-01-2018-7654321',
      aadhaarNumber: '9876 5432 1098',
      panNumber: 'DFGKP9876M',
      salary: 22000,
      advanceBalance: 0,
      status: 'Active',
    },
  })

  const driverJagtar = await prisma.driver.create({
    data: {
      driverName: 'Jagtar Singh',
      mobileNumber: '9123456789',
      licenseNumber: 'PB-08-2012-0099887',
      aadhaarNumber: '4455 6677 8899',
      panNumber: 'JKPPS9988G',
      salary: 28000,
      advanceBalance: 15000,
      status: 'On-Trip',
    },
  })

  const driverManpreet = await prisma.driver.create({
    data: {
      driverName: 'Manpreet Singh',
      mobileNumber: '9234567890',
      licenseNumber: 'PB-10-2019-0011223',
      aadhaarNumber: '5566 7788 9900',
      panNumber: 'MPSSS4455H',
      salary: 24000,
      advanceBalance: 2000,
      status: 'Active',
    },
  })

  const driverGurpreet = await prisma.driver.create({
    data: {
      driverName: 'Gurpreet Dhillon',
      mobileNumber: '9345678901',
      licenseNumber: 'HR-26-2014-9988221',
      aadhaarNumber: '6677 8899 0011',
      panNumber: 'GPDSS1122K',
      salary: 30000,
      advanceBalance: 0,
      status: 'Inactive',
    },
  })

  // 3. Seed Vehicles
  const today = new Date()
  const addDays = (days: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() + days)
    return d
  }

  const vehicleMH12 = await prisma.vehicle.create({
    data: {
      vehicleNumber: 'MH 12 AB 1234',
      vehicleType: 'Trailer 40ft',
      capacity: '32 Tons',
      insuranceExpiry: addDays(10), // Critical (<= 15 days)
      fitnessExpiry: addDays(45),   // Valid
      permitExpiry: addDays(25),    // Warning (<= 30 days)
      pollutionExpiry: addDays(-5),  // Expired (negative days)
      driverId: driverRamesh.id,
      status: 'On-Trip',
    },
  })

  const vehicleGJ01 = await prisma.vehicle.create({
    data: {
      vehicleNumber: 'GJ 01 CD 5678',
      vehicleType: 'Open Truck 20ft',
      capacity: '15 Tons',
      insuranceExpiry: addDays(200),
      fitnessExpiry: addDays(150),
      permitExpiry: addDays(80),
      pollutionExpiry: addDays(60),
      driverId: driverSuresh.id,
      status: 'Active',
    },
  })

  const vehicleHR55 = await prisma.vehicle.create({
    data: {
      vehicleNumber: 'HR 55 XY 9999',
      vehicleType: 'Container 32ft',
      capacity: '20 Tons',
      insuranceExpiry: addDays(28), // Warning (<= 30 days)
      fitnessExpiry: addDays(2),   // Critical (<= 15 days)
      permitExpiry: addDays(90),
      pollutionExpiry: addDays(12), // Critical (<= 15 days)
      driverId: driverJagtar.id,
      status: 'On-Trip',
    },
  })

  const vehicleDL01 = await prisma.vehicle.create({
    data: {
      vehicleNumber: 'DL 01 Z 8888',
      vehicleType: 'Dumper 10-Wheeler',
      capacity: '18 Tons',
      insuranceExpiry: addDays(180),
      fitnessExpiry: addDays(120),
      permitExpiry: addDays(100),
      pollutionExpiry: addDays(90),
      driverId: driverManpreet.id,
      status: 'Active',
    },
  })

  // 4. Seed Trips
  const dateAgo = (days: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() - days)
    return d
  }

  // TRP-1001: Tata Steel - Pending POD (overdue since trip date is 7 days ago)
  const trip1 = await prisma.trip.create({
    data: {
      tripNo: 'TRP-1001',
      tripDate: dateAgo(7),
      vehicleId: vehicleMH12.id,
      partyId: partyTata.id,
      driverId: driverRamesh.id,
      from: 'Jamshedpur',
      to: 'Pune',
      material: 'Steel Coils',
      sizeWeight: '30 Tons',
      billingType: 'Per Ton',
      freightAmount: 85000,
      dieselAmount: 25000,
      driverCash: 5000,
      toll: 8000,
      advance: 10000,
      podStatus: 'Pending',
      paymentStatus: 'Pending',
      notes: 'Urgent cargo dispatch',
    },
  })

  // TRP-1002: UltraTech Cement - Completed & Invoiced
  const trip2 = await prisma.trip.create({
    data: {
      tripNo: 'TRP-1002',
      tripDate: dateAgo(4),
      vehicleId: vehicleGJ01.id,
      partyId: partyUltra.id,
      driverId: driverSuresh.id,
      from: 'Mumbai Port',
      to: 'Ahmedabad Plant',
      material: 'Cement Bags',
      sizeWeight: '14.5 Tons',
      billingType: 'Fixed',
      freightAmount: 45000,
      dieselAmount: 12000,
      driverCash: 3000,
      toll: 4500,
      advance: 5000,
      podStatus: 'Received',
      paymentStatus: 'Paid',
      notes: 'Standard cement delivery',
    },
  })

  // TRP-1003: Reliance - Submitted POD, Pending invoice payment
  const trip3 = await prisma.trip.create({
    data: {
      tripNo: 'TRP-1003',
      tripDate: dateAgo(3),
      vehicleId: vehicleHR55.id,
      partyId: partyReliance.id,
      driverId: driverJagtar.id,
      from: 'Reliance Jamnagar',
      to: 'Delhi NCR Depot',
      material: 'PP Polymers',
      sizeWeight: '18 Tons',
      billingType: 'Per Ton',
      freightAmount: 120000,
      dieselAmount: 35000,
      driverCash: 8000,
      toll: 12000,
      advance: 15000,
      podStatus: 'Submitted',
      paymentStatus: 'Partial',
      notes: 'Double driver route logs',
    },
  })

  // TRP-1004: Tata Steel - POD Received, Invoice Generated but Unpaid
  const trip4 = await prisma.trip.create({
    data: {
      tripNo: 'TRP-1004',
      tripDate: dateAgo(2),
      vehicleId: vehicleDL01.id,
      partyId: partyTata.id,
      driverId: driverManpreet.id,
      from: 'Jamshedpur',
      to: 'Bengaluru Hub',
      material: 'Steel Sheets',
      sizeWeight: '17 Tons',
      billingType: 'Fixed',
      freightAmount: 145000,
      dieselAmount: 40000,
      driverCash: 9000,
      toll: 15000,
      advance: 20000,
      podStatus: 'Received',
      paymentStatus: 'Pending',
      notes: 'Avoid NH-48 toll queues',
    },
  })

  // 5. Seed Diesel Logs (Proper odometer increments to test efficiency calculator)
  // For MH 12 AB 1234
  await prisma.dieselLog.create({
    data: {
      vehicleId: vehicleMH12.id,
      date: dateAgo(10),
      fuelStation: 'HP Refuel - Jamshedpur',
      litres: 150,
      ratePerLitre: 92.5,
      totalCost: 13875,
      odometer: 120000,
    },
  })

  await prisma.dieselLog.create({
    data: {
      vehicleId: vehicleMH12.id,
      date: dateAgo(6),
      fuelStation: 'Reliance Pump - NH2',
      litres: 160,
      ratePerLitre: 93.0,
      totalCost: 14880,
      odometer: 120650, // Delta: 650km. Mileage: 650/160 = 4.06 km/L
    },
  })

  await prisma.dieselLog.create({
    data: {
      vehicleId: vehicleMH12.id,
      date: dateAgo(2),
      fuelStation: 'Indian Oil - Pune Bypass',
      litres: 150,
      ratePerLitre: 94.2,
      totalCost: 14130,
      odometer: 121300, // Delta: 650km. Mileage: 650/150 = 4.33 km/L
    },
  })

  // For GJ 01 CD 5678
  await prisma.dieselLog.create({
    data: {
      vehicleId: vehicleGJ01.id,
      date: dateAgo(5),
      fuelStation: 'Shell Station - Kalamboli',
      litres: 100,
      ratePerLitre: 95.0,
      totalCost: 9500,
      odometer: 85000,
    },
  })

  await prisma.dieselLog.create({
    data: {
      vehicleId: vehicleGJ01.id,
      date: dateAgo(2),
      fuelStation: 'HP Pump - Ahmedabad Highway',
      litres: 110,
      ratePerLitre: 93.5,
      totalCost: 10285,
      odometer: 85605, // Delta: 605km. Mileage: 605/110 = 5.50 km/L
    },
  })

  // 6. Seed Expenses
  await prisma.expense.create({
    data: {
      category: 'Repairs & Maintenance',
      description: 'MH 12 AB 1234 Front Suspension Leaf Spring Replacement',
      amount: 14500,
      paidBy: 'Office Cash',
      date: dateAgo(5),
    },
  })

  await prisma.expense.create({
    data: {
      category: 'Tolls & Taxes',
      description: 'Fastag Bulk Top-up - NHAI Account',
      amount: 20000,
      paidBy: 'Bank Transfer',
      date: dateAgo(4),
    },
  })

  await prisma.expense.create({
    data: {
      category: 'Driver Salaries',
      description: 'Suresh Kumar - Salary Payment (April 2026)',
      amount: 22000,
      paidBy: 'Bank Transfer',
      date: dateAgo(3),
    },
  })

  await prisma.expense.create({
    data: {
      category: 'Office Expenses',
      description: 'Stationery and Printing Ink Cartridges',
      amount: 1800,
      paidBy: 'Petty Cash',
      date: dateAgo(2),
    },
  })

  await prisma.expense.create({
    data: {
      category: 'Driver Advances',
      description: 'Driver Advance Settlement: Ramesh Singh. Notes: Settle advance offset',
      amount: 5000,
      paidBy: 'Cash Deduction',
      date: dateAgo(1),
    },
  })

  // 7. Seed Invoices
  // Invoice for Trip 2 (UltraTech)
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2001',
      date: dateAgo(3),
      tripId: trip2.id,
      subtotal: 45000,
      gstAmount: 5400, // 12% GST
      totalAmount: 50400,
      amountPaid: 50400,
      status: 'Paid',
    },
  })

  // Invoice for Trip 4 (Tata Steel)
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2002',
      date: dateAgo(1),
      tripId: trip4.id,
      subtotal: 145000,
      gstAmount: 7250, // 5% GST
      totalAmount: 152250,
      amountPaid: 0,
      status: 'Unpaid',
    },
  })

  console.log('Seed data inserted successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
