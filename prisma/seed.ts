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

const VEHICLE_TYPES = ['Trailer 40ft', 'Container 32ft', 'Open Body 10-Wheeler', 'Tanker 24KL', 'Taurus 16-Wheeler', 'Tata 407'];

const PARTIES_DATA = [
  { name: 'Tata Steel BSL Limited', contact: 'Rajesh Varma', phone: '9820123456', city: 'Jamshedpur, Jharkhand' },
  { name: 'Reliance Industries Logistics', contact: 'Anil Desai', phone: '9822987654', city: 'Jamnagar, Gujarat' },
  { name: 'Adani Ports & SEZ Logistics', contact: 'Vikram Mehta', phone: '9712345678', city: 'Mundra, Gujarat' },
  { name: 'UltraTech Cement Dispatch', contact: 'Manoj Tiwari', phone: '9425112233', city: 'Nagpur, Maharashtra' },
  { name: 'Mahindra Logistics Hub', contact: 'Sachin Joshi', phone: '9860445566', city: 'Chakan, Pune' },
  { name: 'ITC FMCG Supply Chain', contact: 'Amit Sengupta', phone: '9830556677', city: 'Kolkata, West Bengal' },
  { name: 'Asian Paints Cargo Division', contact: 'Pooja Nair', phone: '9847112244', city: 'Kochi, Kerala' },
  { name: 'JSW Steel Plant Transport', contact: 'Ramesh Reddy', phone: '9849223344', city: 'Bellary, Karnataka' },
  { name: 'Larsen & Toubro ECC Infra', contact: 'Karthik Raman', phone: '9840334455', city: 'Chennai, Tamil Nadu' },
  { name: 'Maruti Suzuki Auto Cargo', contact: 'Deepak Sharma', phone: '9811445566', city: 'Manesar, Haryana' },
  { name: 'Ambuja Cements North Depot', contact: 'Suresh Kumar', phone: '9816001122', city: 'Ropar, Punjab' },
  { name: 'Bhakra Agro Commodities', contact: 'Harpreet Singh', phone: '9876554433', city: 'Ludhiana, Punjab' },
  { name: 'Bharat Petroleum Terminal', contact: 'Nitin Kulkarni', phone: '9823001122', city: 'Sewree, Mumbai' },
  { name: 'Vedanta Aluminium Dispatch', contact: 'Sunil Patnaik', phone: '9437112233', city: 'Jharsuguda, Odisha' },
  { name: 'Pidilite Industries Cargo', contact: 'Dhaval Patel', phone: '9825119988', city: 'Vapi, Gujarat' }
];

const DRIVERS_DATA = [
  { name: 'Jagtar Singh Dhillon', phone: '9872112233', salary: 28000 },
  { name: 'Rameshwar Yadav', phone: '9829223344', salary: 24000 },
  { name: 'Gurpreet Singh Gill', phone: '9814334455', salary: 29000 },
  { name: 'Suresh Kumar Meena', phone: '9414445566', salary: 25000 },
  { name: 'Manpreet Singh Sandhu', phone: '9876556677', salary: 27000 },
  { name: 'Bablu Ram Prajapati', phone: '9893667788', salary: 23000 },
  { name: 'Jaswant Singh Kalsi', phone: '9815778899', salary: 30000 },
  { name: 'Mukesh Chandra Pandey', phone: '9450889900', salary: 24500 },
  { name: 'Kuldeep Singh Sidhu', phone: '9878990011', salary: 28500 },
  { name: 'Dharmendra Singh Tomar', phone: '9425001122', salary: 26000 },
  { name: 'Surjit Singh Brar', phone: '9814112244', salary: 27500 },
  { name: 'Vinod Kumar Maurya', phone: '9451223355', salary: 23500 },
  { name: 'Amrik Singh Virk', phone: '9876334466', salary: 29500 },
  { name: 'Santosh Kumar Mishra', phone: '9415445577', salary: 25500 },
  { name: 'Balwinder Singh Deol', phone: '9872556688', salary: 31000 },
  { name: 'Anil Kumar Chauhan', phone: '9837667799', salary: 24000 },
  { name: 'Harbhajan Singh Bedi', phone: '9815889911', salary: 28000 },
  { name: 'Raju Bhai Rabari', phone: '9824990022', salary: 26500 },
  { name: 'Tarsem Singh Chahal', phone: '9878001133', salary: 29000 },
  { name: 'Pappu Lal Gurjar', phone: '9413112244', salary: 24500 }
];

const VEHICLE_NUMBERS = [
  'MH-12-RN-4821', 'MH-04-GP-7823', 'MH-43-BP-9912', 'MH-46-AR-1144',
  'GJ-01-TX-3399', 'GJ-06-AZ-5521', 'GJ-12-BW-7788', 'GJ-03-AX-6612',
  'DL-01-AA-8822', 'HR-55-AC-4411', 'HR-38-S-9012', 'PB-08-CR-6622',
  'RJ-14-GB-5544', 'MP-09-HH-3311', 'KA-04-MF-8800', 'TN-01-AM-9911'
];

const ROUTES = [
  { from: 'Kalamboli, Navi Mumbai', to: 'Bhiwadi, Rajasthan', distance: 1380 },
  { from: 'JNPT Port, Uran', to: 'Okhla, New Delhi', distance: 1420 },
  { from: 'Chakan MIDC, Pune', to: 'Peenya, Bangalore', distance: 840 },
  { from: 'Sanand GIDC, Ahmedabad', to: 'Sitapura, Jaipur', distance: 680 },
  { from: 'Sri City, Andhra Pradesh', to: 'Balanagar, Hyderabad', distance: 630 },
  { from: 'Dankuni, Kolkata', to: 'Fatuha, Patna', distance: 580 },
  { from: 'Kundli, Haryana', to: 'Baddi Industrial Area, HP', distance: 290 },
  { from: 'Hazira, Surat', to: 'Pithampur SEZ, Indore', distance: 490 },
  { from: 'Hingna MIDC, Nagpur', to: 'Urla Industrial Complex, Raipur', distance: 290 },
  { from: 'Hosur, Tamil Nadu', to: 'Ambattur, Chennai', distance: 310 },
  { from: 'Verna Industrial Area, Goa', to: 'Waluj MIDC, Aurangabad', distance: 610 },
  { from: 'Jamshedpur Steel Plant', to: 'Faridabad, Haryana', distance: 1280 }
];

const MATERIALS = [
  'Steel Coils & TMT Bars',
  'Automotive Engine Blocks',
  'Packaged FMCG Goods',
  'Polymer Granules & Resin',
  'Industrial Machineries',
  'Ceramic Tiles & Sanitaryware',
  'Textile Rolls & Fabrics',
  'Cement Bags in Pallets',
  'Agricultural Fertilizer',
  'Electronics & Electrical Panels'
];

async function main() {
  console.log('--- Seeding TMS Comprehensive Database Mock Data ---');

  // Clean all existing tables cleanly
  console.log('Cleaning old data...');
  await prisma.tripLink.deleteMany();
  await prisma.liquidEntry.deleteMany();
  await prisma.standaloneDriverLedger.deleteMany();
  await prisma.maintenanceEntry.deleteMany();
  await prisma.tollEntry.deleteMany();
  await prisma.driverSettlement.deleteMany();
  await prisma.driverChangeHistory.deleteMany();
  await prisma.driverAdvance.deleteMany();
  await prisma.directDriver.deleteMany();
  await prisma.partyLedger.deleteMany();
  await prisma.driverLedger.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.dieselLog.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.party.deleteMany();
  await prisma.driver.deleteMany();

  // 1. Seed Parties
  console.log(`Seeding ${PARTIES_DATA.length} Corporate Parties...`);
  const parties = [];
  for (const p of PARTIES_DATA) {
    const party = await prisma.party.create({
      data: {
        companyName: p.name,
        contactPerson: p.contact,
        phone: p.phone,
        address: p.city,
        outstandingBalance: 0,
        status: 'Active',
      }
    });
    parties.push(party);
  }

  // 2. Seed Drivers
  console.log(`Seeding ${DRIVERS_DATA.length} Fleet Drivers...`);
  const drivers = [];
  for (const d of DRIVERS_DATA) {
    const driver = await prisma.driver.create({
      data: {
        driverName: d.name,
        mobileNumber: d.phone,
        salary: d.salary,
        advanceBalance: randomInt(0, 8000),
        status: 'Active',
      }
    });
    drivers.push(driver);
  }

  // 3. Seed Vehicles
  console.log(`Seeding ${VEHICLE_NUMBERS.length} Commercial Vehicles...`);
  const vehicles = [];
  for (let i = 0; i < VEHICLE_NUMBERS.length; i++) {
    const vNum = VEHICLE_NUMBERS[i];
    const assignedDriver = drivers[i % drivers.length];
    const futureDate = (days: number) => new Date(Date.now() + days * 24 * 3600 * 1000);

    const vehicle = await prisma.vehicle.create({
      data: {
        vehicleNumber: vNum,
        vehicleType: VEHICLE_TYPES[i % VEHICLE_TYPES.length],
        capacity: `${randomItem([16, 21, 25, 32, 40])} Tons`,
        currentKms: randomInt(80000, 380000),
        insuranceExpiry: futureDate(randomInt(30, 300)),
        fitnessExpiry: futureDate(randomInt(45, 365)),
        permitExpiry: futureDate(randomInt(20, 280)),
        pollutionExpiry: futureDate(randomInt(15, 180)),
        driverId: assignedDriver.id,
        status: 'Active',
        notes: `Regular maintenance scheduled quarterly. Fitted with GPS tracker.`
      }
    });
    vehicles.push(vehicle);
  }

  // 4. Seed Trips & Integrated Operational Transactions
  console.log('Seeding 250 Detailed Trips with Linked Invoices, Fuel Logs, and Ledgers...');
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const now = new Date();

  let tripSeq = 1001;
  let invoiceSeq = 2001;

  for (let i = 0; i < 250; i++) {
    const tripDate = randomDate(oneYearAgo, now);
    const vehicle = randomItem(vehicles);
    const driver = drivers.find(d => d.id === vehicle.driverId) || randomItem(drivers);
    const party = randomItem(parties);
    const route = randomItem(ROUTES);
    const material = randomItem(MATERIALS);

    const daysAgo = Math.floor((now.getTime() - tripDate.getTime()) / (1000 * 3600 * 24));
    
    // Status distribution
    let status = 'Completed';
    let podStatus = 'Received';
    if (daysAgo < 2) {
      status = 'In Transit';
      podStatus = 'Pending';
    } else if (daysAgo < 5) {
      status = 'Completed';
      podStatus = 'Submitted';
    } else {
      status = 'Completed';
      podStatus = 'Verified';
    }

    const freightAmount = randomInt(40000, 120000);
    const partyAdvance = randomInt(15000, 40000);
    const driverAdvanceAmount = randomInt(5000, 15000);
    const commission = randomInt(1000, 3500);
    const toll = randomInt(1500, 6000);
    const dieselAmount = randomInt(15000, 45000);
    const extraCharges = randomItem([0, 0, 1500, 2500]);
    const balance = Math.max(0, freightAmount + extraCharges - partyAdvance - commission);

    const tripNo = `TRP-${tripSeq++}`;
    const loadingDate = tripDate;
    const unloadingDate = status === 'Completed' ? new Date(tripDate.getTime() + (route.distance / 35) * 3600 * 1000) : null;

    const paymentStatus = daysAgo > 35 ? 'Paid' : (daysAgo > 12 ? 'Partial' : 'Pending');

    const trip = await prisma.trip.create({
      data: {
        tripNo,
        tripName: `${route.from.split(',')[0]} to ${route.to.split(',')[0]} - ${material.split(' ')[0]}`,
        tripDate,
        vehicleId: vehicle.id,
        partyId: party.id,
        driverId: driver.id,
        from: route.from,
        to: route.to,
        material,
        sizeWeight: `${randomInt(15, 38)} MT`,
        loadingDate,
        unloadingDate,
        reportDate: tripDate,
        billingType: 'Fixed',
        freightAmount,
        dieselAmount,
        liquidDiesel: 0,
        driverCash: randomInt(2000, 6000),
        toll,
        partyAdvance,
        driverAdvance: driverAdvanceAmount,
        commission,
        maintenance: randomItem([0, 0, 1200, 3000]),
        extraCharges,
        balance,
        status,
        podStatus,
        paymentStatus,
        route: `${route.from} → ${route.to}`,
        notes: `Trip via NH-48 / Express corridor. Verified loading weighbridge receipt.`,

        directDrivers: {
          create: [
            { driverName: driver.driverName }
          ]
        },

        driverAdvances: {
          create: [
            {
              amount: driverAdvanceAmount,
              date: tripDate,
              remarks: `Loading advance released via UPI for trip ${tripNo}`
            }
          ]
        },

        tollEntries: {
          create: [
            {
              tollName: `Fastag Plaza - ${route.from.split(',')[0]} Highway`,
              amount: toll,
              date: tripDate,
              remarks: 'Electronic Fastag auto-debit'
            }
          ]
        }
      }
    });

    // Linked Diesel Log
    if (status === 'Completed' || status === 'In Transit') {
      const fuelRate = randomInt(89, 94);
      const litres = Math.round(dieselAmount / fuelRate);
      await prisma.dieselLog.create({
        data: {
          vehicleId: vehicle.id,
          tripId: trip.id,
          date: new Date(tripDate.getTime() + 6 * 3600 * 1000),
          fuelStation: `IOCL / BPCL Highway Station, ${route.from.split(',')[0]}`,
          litres,
          ratePerLitre: fuelRate,
          totalCost: dieselAmount,
          odometer: vehicle.currentKms - (daysAgo * 180) + randomInt(10, 50)
        }
      });
    }

    // Linked Driver Ledger
    await prisma.driverLedger.create({
      data: {
        driverId: driver.id,
        date: tripDate,
        type: 'Advance',
        amount: driverAdvanceAmount,
        description: `Advance issued for trip ${tripNo} (${route.from.split(',')[0]} to ${route.to.split(',')[0]})`,
        tripId: trip.id
      }
    });

    // Linked Invoice (for completed trips older than 3 days)
    if (status === 'Completed' && daysAgo > 3) {
      const subtotal = freightAmount + extraCharges;
      const gstRate = 5;
      const gstAmount = Math.round((subtotal * gstRate) / 100);
      const shortageAmount = randomItem([0, 0, 0, 800, 1500]);
      const damageAmount = randomItem([0, 0, 0, 0, 1200]);
      const totalAmount = subtotal + gstAmount - shortageAmount - damageAmount;

      const advanceReceived = partyAdvance;
      const invoiceStatus = paymentStatus === 'Paid' ? 'Paid' : (paymentStatus === 'Partial' ? 'Partial' : 'Unpaid');
      const amountPaid = invoiceStatus === 'Paid' ? totalAmount : (invoiceStatus === 'Partial' ? advanceReceived + Math.round((totalAmount - advanceReceived) * 0.5) : advanceReceived);

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-${invoiceSeq++}`,
          date: unloadingDate || new Date(tripDate.getTime() + 2 * 24 * 3600 * 1000),
          tripId: trip.id,
          subtotal,
          gstPercentage: gstRate,
          gstAmount,
          shortageAmount,
          damageAmount,
          commissionAmount: commission,
          totalAmount,
          amountPaid,
          status: invoiceStatus,
          notes: `Billed to ${party.companyName} for transportation services under consignment note.`
        }
      });

      // Party Ledger entries
      await prisma.partyLedger.create({
        data: {
          partyId: party.id,
          date: invoice.date,
          type: 'Invoice',
          amount: totalAmount,
          description: `Invoice ${invoice.invoiceNumber} generated for ${tripNo}`,
          invoiceId: invoice.id,
          tripId: trip.id
        }
      });

      await prisma.partyLedger.create({
        data: {
          partyId: party.id,
          date: tripDate,
          type: 'Payment',
          amount: advanceReceived,
          description: `Advance payment received for trip ${tripNo}`,
          tripId: trip.id
        }
      });

      if (amountPaid > advanceReceived) {
        await prisma.partyLedger.create({
          data: {
            partyId: party.id,
            date: new Date(invoice.date.getTime() + 7 * 24 * 3600 * 1000),
            type: 'Payment',
            amount: amountPaid - advanceReceived,
            description: `Balance settlement against Invoice ${invoice.invoiceNumber}`,
            invoiceId: invoice.id
          }
        });
      }

      // Update party outstanding
      const balanceDue = totalAmount - amountPaid;
      if (balanceDue > 0) {
        await prisma.party.update({
          where: { id: party.id },
          data: {
            outstandingBalance: {
              increment: balanceDue
            }
          }
        });
      }
    }
  }

  // 5. Seed General Fleet Expenses (50 entries)
  console.log('Seeding 60 General Fleet Expenses...');
  const EXPENSE_CATEGORIES = [
    { cat: 'Office Rent & Utilities', desc: 'Monthly logistics transport office rent & electricity bill' },
    { cat: 'Fastag Bulk Recharge', desc: 'NHAI commercial fleet Fastag wallet recharge' },
    { cat: 'RTO Permits & Fitness', desc: 'National permit endorsement and road tax renewal fee' },
    { cat: 'Driver Welfare & Medical', desc: 'Driver rest-house supplies and medical emergency kit' },
    { cat: 'Tyre Retreading & Replacement', desc: 'Apollo 10.00R20 radial tyres batch purchase' },
    { cat: 'Administrative & Printing', desc: 'Printing LR books, bilty pads, and stationary' }
  ];

  for (let i = 0; i < 60; i++) {
    const exp = randomItem(EXPENSE_CATEGORIES);
    const expDate = randomDate(oneYearAgo, now);
    await prisma.expense.create({
      data: {
        category: exp.cat,
        amount: randomInt(2500, 35000),
        description: exp.desc,
        paidBy: randomItem(['Bank Transfer', 'Office Cash', 'Company Card']),
        date: expDate
      }
    });
  }

  // 6. Seed Maintenance Logs (75 entries)
  console.log('Seeding 75 Fleet Vehicle Maintenance Logs...');
  const MAINTENANCE_JOBS = [
    { type: 'Tyre', cost: [12000, 48000], desc: 'Front axle radial tyre replacement & wheel alignment' },
    { type: 'Oil', cost: [6000, 16000], desc: 'Engine lube oil change (Castrol CRB 15W-40) and oil filter replacement' },
    { type: 'Repair', cost: [4000, 22000], desc: 'Brake liner relining, air pressure brake booster servicing' },
    { type: 'Spares', cost: [3500, 18000], desc: 'Leaf spring bush kit and suspension pin replacement' },
    { type: 'Other', cost: [1500, 8000], desc: 'Electrical wiring checkup, headlamp bulb and reflector replacement' }
  ];

  for (let i = 0; i < 75; i++) {
    const job = randomItem(MAINTENANCE_JOBS);
    const vehicle = randomItem(vehicles);
    const mDate = randomDate(oneYearAgo, now);

    await prisma.maintenanceLog.create({
      data: {
        vehicleId: vehicle.id,
        date: mDate,
        type: job.type,
        cost: randomInt(job.cost[0], job.cost[1]),
        odometer: vehicle.currentKms - randomInt(1000, 25000),
        description: `${vehicle.vehicleNumber}: ${job.desc}`,
        notes: 'Authorized commercial garage servicing. Invoiced with GST receipt.'
      }
    });
  }

  // 7. Seed Driver Settlements
  console.log('Seeding Driver Settlements...');
  for (const driver of drivers) {
    const given = randomInt(25000, 45000);
    const received = randomInt(20000, given);
    await prisma.driverSettlement.create({
      data: {
        driverId: driver.id,
        amountGiven: given,
        amountReceived: received,
        balance: given - received,
        transactionDate: randomDate(oneYearAgo, now),
        remarks: `Trip trip-sheet settlement & balance salary reconciliation for ${driver.driverName}`
      }
    });
  }

  console.log('====================================================');
  console.log('  MOCK DATA SEEDING COMPLETED SUCCESSFULLY!');
  console.log(`  - Parties: ${parties.length}`);
  console.log(`  - Drivers: ${drivers.length}`);
  console.log(`  - Vehicles: ${vehicles.length}`);
  console.log(`  - Trips: 250 with linked diesel, tolls, advances`);
  console.log(`  - Invoices: ~200+ with GST, commission, status`);
  console.log(`  - Expenses: 60`);
  console.log(`  - Maintenance: 75`);
  console.log('====================================================');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
