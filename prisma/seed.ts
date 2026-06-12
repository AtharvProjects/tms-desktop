import { PrismaClient } from '@prisma/client'
import { fakerEN_IN as faker } from '@faker-js/faker'

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

const VEHICLE_TYPES = ['Open Body', 'Container', 'Trailer', 'Tanker'];
const ROUTES = [
  { from: 'Mumbai', to: 'Delhi', distance: 1400 },
  { from: 'Pune', to: 'Bangalore', distance: 840 },
  { from: 'Ahmedabad', to: 'Jaipur', distance: 680 },
  { from: 'Chennai', to: 'Hyderabad', distance: 630 },
  { from: 'Kolkata', to: 'Patna', distance: 580 },
  { from: 'Delhi', to: 'Chandigarh', distance: 250 },
  { from: 'Surat', to: 'Indore', distance: 450 },
  { from: 'Nagpur', to: 'Raipur', distance: 280 },
  { from: 'Bangalore', to: 'Chennai', distance: 350 },
  { from: 'Mumbai', to: 'Goa', distance: 590 }
];
const MATERIALS = ['Steel Pipes', 'Auto Parts', 'FMCG Goods', 'Electronics', 'Textiles', 'Chemicals', 'Cement', 'Agricultural Products'];

async function main() {
  console.log('Cleaning database...');
  await prisma.invoice.deleteMany();
  await prisma.dieselLog.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.driverLedger.deleteMany();
  await prisma.partyLedger.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.party.deleteMany();
  await prisma.driver.deleteMany();

  console.log('Seeding Parties...');
  const parties = [];
  for (let i = 0; i < 10; i++) {
    const party = await prisma.party.create({
      data: {
        companyName: faker.company.name(),
        contactPerson: faker.person.fullName(),
        phone: faker.phone.number({ style: 'national' }),
        email: faker.internet.email(),
        gstNumber: `27${faker.string.alphanumeric({ length: 10, casing: 'upper' })}1Z${faker.string.alphanumeric({ length: 1, casing: 'upper' })}`,
        address: faker.location.streetAddress() + ', ' + faker.location.city(),
        outstandingBalance: 0,
        status: 'Active',
      }
    });
    parties.push(party);
  }

  console.log('Seeding Drivers...');
  const drivers = [];
  for (let i = 0; i < 20; i++) {
    const driver = await prisma.driver.create({
      data: {
        driverName: faker.person.fullName(),
        mobileNumber: faker.phone.number({ style: 'national' }),
        licenseNumber: `DL-${randomInt(10, 99)}-${randomInt(1000, 9999)}`,
        licenseExpiry: faker.date.future({ years: 5 }),
        aadhaarNumber: faker.string.numeric(12),
        panNumber: `${faker.string.alpha({ length: 5, casing: 'upper' })}${faker.string.numeric(4)}${faker.string.alpha({ length: 1, casing: 'upper' })}`,
        salary: randomInt(15000, 25000),
        address: faker.location.streetAddress() + ', ' + faker.location.city(),
        status: 'Active',
        guarantorName: faker.person.fullName(),
        guarantorPhone: faker.phone.number({ style: 'national' }),
      }
    });
    drivers.push(driver);
  }

  console.log('Seeding Vehicles...');
  const vehicles = [];
  for (let i = 0; i < 15; i++) {
    const rtoPrefixes = ['MH-12', 'MH-14', 'MH-04', 'MH-43', 'MH-46'];
    const vehicle = await prisma.vehicle.create({
      data: {
        vehicleNumber: `${randomItem(rtoPrefixes)}-${faker.string.alpha({ length: 2, casing: 'upper' })}-${randomInt(1000, 9999)}`,
        vehicleType: randomItem(VEHICLE_TYPES),
        capacity: `${randomItem([9, 14, 18, 21, 24, 32])} Tons`,
        currentKms: randomInt(50000, 300000),
        insuranceExpiry: faker.date.future({ years: 1 }),
        fitnessExpiry: faker.date.future({ years: 1 }),
        permitExpiry: faker.date.future({ years: 1 }),
        pollutionExpiry: faker.date.future({ years: 1 }),
        driverId: randomItem(drivers).id,
        status: 'Active',
      }
    });
    vehicles.push(vehicle);
  }

  console.log('Seeding Trips & Operational Data...');
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const now = new Date();

  let tripCounter = 1000;
  let invoiceCounter = 5000;

  for (let i = 0; i < 300; i++) {
    const tripDate = randomDate(oneYearAgo, now);
    const vehicle = randomItem(vehicles);
    const driverId = vehicle.driverId || randomItem(drivers).id;
    const party = randomItem(parties);
    const route = randomItem(ROUTES);
    
    const daysSinceTrip = Math.floor((now.getTime() - tripDate.getTime()) / (1000 * 3600 * 24));
    let status = 'Completed';
    let podStatus = 'Received';
    if (daysSinceTrip < 2) {
        status = 'In Transit';
        podStatus = 'Pending';
    } else if (daysSinceTrip < 7) {
        status = 'Completed';
        podStatus = 'Pending';
    }

    const freightAmount = randomInt(15000, 60000);
    const partyAdvance = randomInt(5000, 15000);
    const driverAdvance = randomInt(3000, 10000);
    const toll = randomInt(500, 3000);
    const dieselAmount = randomInt(5000, 20000);
    
    const trip = await prisma.trip.create({
      data: {
        tripNo: `TRP-${tripCounter++}`,
        tripDate,
        vehicleId: vehicle.id,
        partyId: party.id,
        driverId,
        from: route.from,
        to: route.to,
        material: randomItem(MATERIALS),
        sizeWeight: `${randomInt(5, 30)} MT`,
        loadingDate: tripDate,
        unloadingDate: status === 'Completed' ? new Date(tripDate.getTime() + route.distance * 3600 * 1000 / 40) : null,
        billingType: 'Fixed',
        freightAmount,
        dieselAmount,
        toll,
        partyAdvance,
        driverAdvance,
        balance: freightAmount - partyAdvance,
        status,
        podStatus,
        paymentStatus: daysSinceTrip > 30 ? 'Paid' : (daysSinceTrip > 10 ? 'Partial' : 'Pending'),
        eWayBillNumber: faker.string.numeric(12),
        route: `${route.from} to ${route.to}`,
        lrNumber: `LR-${randomInt(10000, 99999)}`,
      }
    });

    if (status !== 'Scheduled' && status !== 'Loading') {
      const fuelRate = randomInt(88, 95);
      const litres = Math.floor(dieselAmount / fuelRate);
      if (litres > 0) {
        await prisma.dieselLog.create({
          data: {
            vehicleId: vehicle.id,
            date: new Date(tripDate.getTime() + 12 * 3600 * 1000),
            fuelStation: `Reliance Petrol Pump, ${route.from}`,
            litres,
            ratePerLitre: fuelRate,
            totalCost: dieselAmount,
            odometer: vehicle.currentKms + randomInt(10, 50),
          }
        });
      }
    }

    await prisma.driverLedger.create({
      data: {
        driverId,
        date: tripDate,
        type: 'Advance',
        amount: driverAdvance,
        description: `Advance for Trip ${trip.tripNo}`,
        tripId: trip.id
      }
    });

    if (status === 'Completed') {
      const gstAmount = freightAmount * 0.05;
      const totalAmount = freightAmount + gstAmount;
      const amountPaid = trip.paymentStatus === 'Paid' ? totalAmount - partyAdvance : (trip.paymentStatus === 'Partial' ? totalAmount * 0.5 : 0);

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-${new Date().getFullYear()}-${invoiceCounter++}`,
          date: trip.unloadingDate || new Date(tripDate.getTime() + 2 * 24 * 3600 * 1000),
          tripId: trip.id,
          subtotal: freightAmount,
          gstAmount,
          totalAmount,
          amountPaid: partyAdvance + amountPaid,
          status: trip.paymentStatus === 'Paid' ? 'Paid' : (trip.paymentStatus === 'Partial' ? 'Partial' : 'Unpaid'),
        }
      });

      await prisma.partyLedger.create({
        data: {
          partyId: party.id,
          date: invoice.date,
          type: 'Invoice',
          amount: totalAmount,
          description: `Invoice ${invoice.invoiceNumber} for Trip ${trip.tripNo}`,
          invoiceId: invoice.id,
          tripId: trip.id
        }
      });
      
      await prisma.partyLedger.create({
        data: {
          partyId: party.id,
          date: tripDate,
          type: 'Payment',
          amount: partyAdvance,
          description: `Advance for Trip ${trip.tripNo}`,
          tripId: trip.id
        }
      });
      
      if (amountPaid > 0) {
        await prisma.partyLedger.create({
          data: {
            partyId: party.id,
            date: new Date(invoice.date.getTime() + 5 * 24 * 3600 * 1000),
            type: 'Payment',
            amount: amountPaid,
            description: `Payment against Invoice ${invoice.invoiceNumber}`,
            invoiceId: invoice.id
          }
        });
      }
      
      await prisma.party.update({
        where: { id: party.id },
        data: {
          outstandingBalance: {
            increment: totalAmount - (partyAdvance + amountPaid)
          }
        }
      });
    }
  }

  console.log('Seeding Miscellaneous Expenses and Maintenance...');
  const expenseCategories = ['Office Rent', 'Electricity', 'Stationery', 'Staff Welfare', 'Miscellaneous'];
  const maintenanceTypes = ['Tyre', 'Oil', 'Repair', 'Spares', 'Other'];

  for (let i = 0; i < 50; i++) {
    const expenseDate = randomDate(oneYearAgo, now);
    await prisma.expense.create({
      data: {
        category: randomItem(expenseCategories),
        amount: randomInt(1000, 15000),
        description: `General ${randomItem(expenseCategories).toLowerCase()} expense`,
        date: expenseDate,
        paidBy: 'Admin'
      }
    });
  }

  for (let i = 0; i < 80; i++) {
    const maintDate = randomDate(oneYearAgo, now);
    const vehicle = randomItem(vehicles);
    await prisma.maintenanceLog.create({
      data: {
        vehicleId: vehicle.id,
        date: maintDate,
        type: randomItem(maintenanceTypes),
        cost: randomInt(2000, 25000),
        description: `Routine ${randomItem(maintenanceTypes).toLowerCase()} replacement/repair`,
        odometer: vehicle.currentKms - randomInt(1000, 20000)
      }
    });
  }

  console.log('Mock Data Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
