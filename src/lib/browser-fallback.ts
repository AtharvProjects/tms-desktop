// Browser LocalStorage Fallback for window.electronAPI
// This enables complete CRUD functionality inside standard web browsers like Chrome

if (typeof window !== 'undefined' && !window.electronAPI) {
  console.warn("electronAPI not detected. Injecting localStorage mock database fallback for web testing.");

  // Helper to generate UUID
  const uuid = () => Math.random().toString(36).substring(2, 9);

  // Default mock seed data
  const defaultParties = [
    {
      id: "party-tata",
      companyName: 'Tata Steel Ltd',
      contactPerson: 'Rahul Sharma',
      phone: '9876543210',
      email: 'logistics@tatasteel.com',
      gstNumber: '22AAAAA0000A1Z5',
      address: 'Jamshedpur Plant, Jharkhand - 831001',
      outstandingBalance: 150000,
      status: 'Active',
      createdAt: new Date().toISOString()
    },
    {
      id: "party-ultra",
      companyName: 'UltraTech Cement',
      contactPerson: 'Amit Patel',
      phone: '9876543211',
      email: 'transport@ultratech.com',
      gstNumber: '27AAAAA0000A1Z5',
      address: 'Wankhede Chambers, Mumbai, MH - 400020',
      outstandingBalance: 45000,
      status: 'Active',
      createdAt: new Date().toISOString()
    },
    {
      id: "party-reliance",
      companyName: 'Reliance Industries Ltd',
      contactPerson: 'Sanjay Mehta',
      phone: '9922110033',
      email: 'logistics.hubs@ril.com',
      gstNumber: '24AAAAA1111B1Z2',
      address: 'Jamnagar Refinery, Gujarat - 361140',
      outstandingBalance: 320000,
      status: 'Active',
      createdAt: new Date().toISOString()
    },
    {
      id: "party-jindal",
      companyName: 'Jindal Steel & Power',
      contactPerson: 'Karan Johar',
      phone: '9111222333',
      email: 'billing@jindal.com',
      gstNumber: '22BBBBB1111A1Z9',
      address: 'Raigarh, Chhattisgarh - 496001',
      outstandingBalance: 0,
      status: 'Active',
      createdAt: new Date().toISOString()
    },
    {
      id: "party-adani",
      companyName: 'Adani Port Logistics',
      contactPerson: 'Vikas Adani',
      phone: '9000888777',
      email: 'ops@adaniports.com',
      gstNumber: '24CCCCC2222C1Z4',
      address: 'Mundra Port, Gujarat - 370421',
      outstandingBalance: 98000,
      status: 'Active',
      createdAt: new Date().toISOString()
    }
  ];

  const defaultDrivers = [
    {
      id: "driver-ramesh",
      driverName: 'Ramesh Singh',
      mobileNumber: '9988776655',
      licenseNumber: 'MH-12-2015-1234567',
      aadhaarNumber: '1234 5678 9012',
      panNumber: 'ABCPS1234F',
      salary: 25000,
      advanceBalance: 5000,
      status: 'On-Trip',
      createdAt: new Date().toISOString()
    },
    {
      id: "driver-suresh",
      driverName: 'Suresh Kumar',
      mobileNumber: '9988776644',
      licenseNumber: 'GJ-01-2018-7654321',
      aadhaarNumber: '9876 5432 1098',
      panNumber: 'DFGKP9876M',
      salary: 22000,
      advanceBalance: 0,
      status: 'Active',
      createdAt: new Date().toISOString()
    },
    {
      id: "driver-jagtar",
      driverName: 'Jagtar Singh',
      mobileNumber: '9123456789',
      licenseNumber: 'PB-08-2012-0099887',
      aadhaarNumber: '4455 6677 8899',
      panNumber: 'JKPPS9988G',
      salary: 28000,
      advanceBalance: 15000,
      status: 'On-Trip',
      createdAt: new Date().toISOString()
    },
    {
      id: "driver-manpreet",
      driverName: 'Manpreet Singh',
      mobileNumber: '9234567890',
      licenseNumber: 'PB-10-2019-0011223',
      aadhaarNumber: '5566 7788 9900',
      panNumber: 'MPSSS4455H',
      salary: 24000,
      advanceBalance: 2000,
      status: 'Active',
      createdAt: new Date().toISOString()
    },
    {
      id: "driver-gurpreet",
      driverName: 'Gurpreet Dhillon',
      mobileNumber: '9345678901',
      licenseNumber: 'HR-26-2014-9988221',
      aadhaarNumber: '6677 8899 0011',
      panNumber: 'GPDSS1122K',
      salary: 30000,
      advanceBalance: 0,
      status: 'Inactive',
      createdAt: new Date().toISOString()
    }
  ];

  const today = new Date();
  const addDays = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  const defaultVehicles = [
    {
      id: "vehicle-mh12",
      vehicleNumber: 'MH 12 AB 1234',
      vehicleType: 'Trailer 40ft',
      capacity: '32 Tons',
      insuranceExpiry: addDays(10), // Critical (<= 15 days)
      fitnessExpiry: addDays(45),
      permitExpiry: addDays(25),    // Warning (<= 30 days)
      pollutionExpiry: addDays(-5),  // Expired
      driverId: "driver-ramesh",
      status: 'On-Trip',
      createdAt: new Date().toISOString()
    },
    {
      id: "vehicle-gj01",
      vehicleNumber: 'GJ 01 CD 5678',
      vehicleType: 'Open Truck 20ft',
      capacity: '15 Tons',
      insuranceExpiry: addDays(200),
      fitnessExpiry: addDays(150),
      permitExpiry: addDays(80),
      pollutionExpiry: addDays(60),
      driverId: "driver-suresh",
      status: 'Active',
      createdAt: new Date().toISOString()
    },
    {
      id: "vehicle-hr55",
      vehicleNumber: 'HR 55 XY 9999',
      vehicleType: 'Container 32ft',
      capacity: '20 Tons',
      insuranceExpiry: addDays(28), // Warning (<= 30 days)
      fitnessExpiry: addDays(2),   // Critical (<= 15 days)
      permitExpiry: addDays(90),
      pollutionExpiry: addDays(12), // Critical (<= 15 days)
      driverId: "driver-jagtar",
      status: 'On-Trip',
      createdAt: new Date().toISOString()
    },
    {
      id: "vehicle-dl01",
      vehicleNumber: 'DL 01 Z 8888',
      vehicleType: 'Dumper 10-Wheeler',
      capacity: '18 Tons',
      insuranceExpiry: addDays(180),
      fitnessExpiry: addDays(120),
      permitExpiry: addDays(100),
      pollutionExpiry: addDays(90),
      driverId: "driver-manpreet",
      status: 'Active',
      createdAt: new Date().toISOString()
    }
  ];

  const dateAgo = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return d.toISOString();
  };

  const defaultTrips = [
    {
      id: "trip-1001",
      tripNo: 'TRP-1001',
      tripDate: dateAgo(7),
      vehicleId: "vehicle-mh12",
      partyId: "party-tata",
      driverId: "driver-ramesh",
      from: 'Jamshedpur',
      to: 'Pune',
      material: 'Steel Coils',
      sizeWeight: '30 Tons',
      billingType: 'Per Ton',
      freightAmount: 85000,
      dieselAmount: 25000,
      driverCash: 5000,
      toll: 8000,
      partyAdvance: 10000,
      driverAdvance: 0,
      commission: 0,
      maintenance: 0,
      extraRunning: 0,
      balance: 75000,
      detentionTime: null,
      podStatus: 'Pending',
      paymentStatus: 'Pending',
      notes: 'Urgent cargo dispatch',
      createdAt: dateAgo(7)
    },
    {
      id: "trip-1002",
      tripNo: 'TRP-1002',
      tripDate: dateAgo(4),
      vehicleId: "vehicle-gj01",
      partyId: "party-ultra",
      driverId: "driver-suresh",
      from: 'Mumbai Port',
      to: 'Ahmedabad Plant',
      material: 'Cement Bags',
      sizeWeight: '14.5 Tons',
      billingType: 'Fixed',
      freightAmount: 45000,
      dieselAmount: 12000,
      driverCash: 3000,
      toll: 4500,
      partyAdvance: 5000,
      driverAdvance: 0,
      commission: 0,
      maintenance: 0,
      extraRunning: 0,
      balance: 40000,
      detentionTime: null,
      podStatus: 'Received',
      paymentStatus: 'Paid',
      notes: 'Standard cement delivery',
      createdAt: dateAgo(4)
    },
    {
      id: "trip-1003",
      tripNo: 'TRP-1003',
      tripDate: dateAgo(3),
      vehicleId: "vehicle-hr55",
      partyId: "party-reliance",
      driverId: "driver-jagtar",
      from: 'Reliance Jamnagar',
      to: 'Delhi NCR Depot',
      material: 'PP Polymers',
      sizeWeight: '18 Tons',
      billingType: 'Per Ton',
      freightAmount: 120000,
      dieselAmount: 35000,
      driverCash: 8000,
      toll: 12000,
      partyAdvance: 15000,
      driverAdvance: 0,
      commission: 0,
      maintenance: 0,
      extraRunning: 0,
      balance: 105000,
      detentionTime: null,
      podStatus: 'Submitted',
      paymentStatus: 'Partial',
      notes: 'Double driver route logs',
      createdAt: dateAgo(3)
    },
    {
      id: "trip-1004",
      tripNo: 'TRP-1004',
      tripDate: dateAgo(2),
      vehicleId: "vehicle-dl01",
      partyId: "party-tata",
      driverId: "driver-manpreet",
      from: 'Jamshedpur',
      to: 'Bengaluru Hub',
      material: 'Steel Sheets',
      sizeWeight: '17 Tons',
      billingType: 'Fixed',
      freightAmount: 145000,
      dieselAmount: 40000,
      driverCash: 9000,
      toll: 15000,
      partyAdvance: 20000,
      driverAdvance: 0,
      commission: 0,
      maintenance: 0,
      extraRunning: 0,
      balance: 125000,
      detentionTime: null,
      podStatus: 'Received',
      paymentStatus: 'Pending',
      notes: 'Avoid NH-48 toll queues',
      createdAt: dateAgo(2)
    }
  ];

  const defaultDiesel = [
    {
      id: "diesel-1",
      vehicleId: "vehicle-mh12",
      date: dateAgo(10),
      fuelStation: 'HP Refuel - Jamshedpur',
      litres: 150,
      ratePerLitre: 92.5,
      totalCost: 13875,
      odometer: 120000,
      createdAt: dateAgo(10)
    },
    {
      id: "diesel-2",
      vehicleId: "vehicle-mh12",
      date: dateAgo(6),
      fuelStation: 'Reliance Pump - NH2',
      litres: 160,
      ratePerLitre: 93.0,
      totalCost: 14880,
      odometer: 120650,
      createdAt: dateAgo(6)
    },
    {
      id: "diesel-3",
      vehicleId: "vehicle-mh12",
      date: dateAgo(2),
      fuelStation: 'Indian Oil - Pune Bypass',
      litres: 150,
      ratePerLitre: 94.2,
      totalCost: 14130,
      odometer: 121300,
      createdAt: dateAgo(2)
    },
    {
      id: "diesel-4",
      vehicleId: "vehicle-gj01",
      date: dateAgo(5),
      fuelStation: 'Shell Station - Kalamboli',
      litres: 100,
      ratePerLitre: 95.0,
      totalCost: 9500,
      odometer: 85000,
      createdAt: dateAgo(5)
    },
    {
      id: "diesel-5",
      vehicleId: "vehicle-gj01",
      date: dateAgo(2),
      fuelStation: 'HP Pump - Ahmedabad Highway',
      litres: 110,
      ratePerLitre: 93.5,
      totalCost: 10285,
      odometer: 85605,
      createdAt: dateAgo(2)
    }
  ];

  const defaultExpenses = [
    {
      id: "exp-1",
      category: 'Repairs & Maintenance',
      description: 'MH 12 AB 1234 Front Suspension Leaf Spring Replacement',
      amount: 14500,
      paidBy: 'Office Cash',
      date: dateAgo(5),
      createdAt: dateAgo(5)
    },
    {
      id: "exp-2",
      category: 'Tolls & Taxes',
      description: 'Fastag Bulk Top-up - NHAI Account',
      amount: 20000,
      paidBy: 'Bank Transfer',
      date: dateAgo(4),
      createdAt: dateAgo(4)
    },
    {
      id: "exp-3",
      category: 'Driver Salaries',
      description: 'Suresh Kumar - Salary Payment (April 2026)',
      amount: 22000,
      paidBy: 'Bank Transfer',
      date: dateAgo(3),
      createdAt: dateAgo(3)
    },
    {
      id: "exp-4",
      category: 'Office Expenses',
      description: 'Stationery and Printing Ink Cartridges',
      amount: 1800,
      paidBy: 'Petty Cash',
      date: dateAgo(2),
      createdAt: dateAgo(2)
    },
    {
      id: "exp-5",
      category: 'Driver Advances',
      description: 'Driver Advance Settlement: Ramesh Singh. Notes: Settle advance offset',
      amount: 5000,
      paidBy: 'Cash Deduction',
      date: dateAgo(1),
      createdAt: dateAgo(1)
    }
  ];

  const defaultInvoices = [
    {
      id: "inv-1",
      invoiceNumber: 'INV-2001',
      date: dateAgo(3),
      tripId: "trip-1002",
      subtotal: 45000,
      gstAmount: 5400,
      totalAmount: 50400,
      amountPaid: 50400,
      status: 'Paid',
      createdAt: dateAgo(3)
    },
    {
      id: "inv-2",
      invoiceNumber: 'INV-2002',
      date: dateAgo(1),
      tripId: "trip-1004",
      subtotal: 145000,
      gstAmount: 7250,
      totalAmount: 152250,
      amountPaid: 0,
      status: 'Unpaid',
      createdAt: dateAgo(1)
    }
  ];

  // Initialize store databases if empty
  const initDb = (key: string, data: any) => {
    if (!localStorage.getItem(`tms_db_${key}`)) {
      localStorage.setItem(`tms_db_${key}`, JSON.stringify(data));
    }
  };

  initDb('party', defaultParties);
  initDb('driver', defaultDrivers);
  initDb('vehicle', defaultVehicles);
  initDb('trip', defaultTrips);
  initDb('dieselLog', defaultDiesel);
  initDb('expense', defaultExpenses);
  initDb('invoice', defaultInvoices);

  // Helper to read database from localStorage
  const readDb = (key: string): any[] => {
    return JSON.parse(localStorage.getItem(`tms_db_${key}`) || '[]');
  };

  // Helper to write database to localStorage
  const writeDb = (key: string, data: any[]) => {
    localStorage.setItem(`tms_db_${key}`, JSON.stringify(data));
  };

  // Populate relationship objects dynamically to mimic Prisma returns
  const populateRelations = (model: string, item: any, allDb: any) => {
    if (!item) return item;
    const cloned = { ...item };
    
    if (model === 'trip') {
      cloned.vehicle = allDb.vehicle.find((v: any) => v.id === cloned.vehicleId);
      cloned.party = allDb.party.find((p: any) => p.id === cloned.partyId);
      cloned.driver = allDb.driver.find((d: any) => d.id === cloned.driverId);
      cloned.invoices = allDb.invoice.filter((inv: any) => inv.tripId === cloned.id);
    } else if (model === 'vehicle') {
      cloned.driver = allDb.driver.find((d: any) => d.id === cloned.driverId);
    } else if (model === 'invoice') {
      cloned.trip = populateRelations('trip', allDb.trip.find((t: any) => t.id === cloned.tripId), allDb);
    }
    return cloned;
  };

  // @ts-ignore
  window.electronAPI = {
    prisma: {
      query: async (model: string, operation: string, args: any = {}) => {
        try {
          const table = readDb(model);
          const allDb = {
            party: readDb('party'),
            driver: readDb('driver'),
            vehicle: readDb('vehicle'),
            trip: readDb('trip'),
            dieselLog: readDb('dieselLog'),
            expense: readDb('expense'),
            invoice: readDb('invoice'),
          };

          if (operation === 'findMany') {
            let results = [...table];

            // Handle basic where filters
            if (args.where) {
              results = results.filter(item => {
                for (const key in args.where) {
                  const filterVal = args.where[key];
                  if (filterVal && typeof filterVal === 'object') {
                    // E.g. { not: null } or similar operators
                    if ('not' in filterVal && filterVal.not === null) {
                      if (item[key] === null || item[key] === undefined) return false;
                    }
                  } else {
                    if (item[key] !== filterVal) return false;
                  }
                }
                return true;
              });
            }

            // Handle orderBy
            if (args.orderBy) {
              const sortKey = Object.keys(args.orderBy)[0];
              const sortDir = args.orderBy[sortKey];
              results.sort((a, b) => {
                const valA = a[sortKey];
                const valB = b[sortKey];
                
                if (typeof valA === 'string') {
                  return sortDir === 'asc' 
                    ? valA.localeCompare(valB) 
                    : valB.localeCompare(valA);
                }
                return sortDir === 'asc' ? valA - valB : valB - valA;
              });
            }

            // Handle relations inclusions
            if (args.include) {
              results = results.map(item => populateRelations(model, item, allDb));
            }

            return { data: results, error: null };
          } 
          
          else if (operation === 'findUnique' || operation === 'findFirst') {
            let results = [...table];
            if (args.where) {
              results = results.filter(item => {
                for (const key in args.where) {
                  if (item[key] !== args.where[key]) return false;
                }
                return true;
              });
            }
            if (args.orderBy) {
              const sortKey = Object.keys(args.orderBy)[0];
              const sortDir = args.orderBy[sortKey];
              results.sort((a, b) => {
                const valA = a[sortKey];
                const valB = b[sortKey];
                return sortDir === 'asc' ? valA - valB : valB - valA;
              });
            }
            const found = results[0] ? populateRelations(model, results[0], allDb) : null;
            return { data: found, error: null };
          } 
          
          else if (operation === 'create') {
            const newItem = {
              id: uuid(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              ...args.data
            };
            
            // Adjust balances on driver/party creations if specified
            if (model === 'party' && newItem.outstandingBalance) {
              newItem.outstandingBalance = parseFloat(newItem.outstandingBalance) || 0;
            }
            if (model === 'driver' && newItem.salary) {
              newItem.salary = parseFloat(newItem.salary) || 0;
              newItem.advanceBalance = parseFloat(newItem.advanceBalance) || 0;
            }
            if (model === 'trip') {
              newItem.freightAmount = parseFloat(newItem.freightAmount) || 0;
              newItem.dieselAmount = parseFloat(newItem.dieselAmount) || 0;
              newItem.driverCash = parseFloat(newItem.driverCash) || 0;
              newItem.toll = parseFloat(newItem.toll) || 0;
              newItem.partyAdvance = parseFloat(newItem.partyAdvance) || 0;
              newItem.driverAdvance = parseFloat(newItem.driverAdvance) || 0;
              newItem.commission = parseFloat(newItem.commission) || 0;
              newItem.maintenance = parseFloat(newItem.maintenance) || 0;
              newItem.extraRunning = parseFloat(newItem.extraRunning) || 0;
              newItem.balance = parseFloat(newItem.balance) || 0;
              newItem.extraCharges = parseFloat(newItem.extraCharges) || 0;
              
              // Side effect: update driver status if trip assigned
              if (newItem.driverId) {
                const drivers = readDb('driver');
                const dIdx = drivers.findIndex((d: any) => d.id === newItem.driverId);
                if (dIdx !== -1) {
                  drivers[dIdx].status = 'On-Trip';
                  // Add driver cash to their advance balance
                  drivers[dIdx].advanceBalance = (drivers[dIdx].advanceBalance || 0) + newItem.driverCash;
                  writeDb('driver', drivers);
                }
              }
              // Side effect: update vehicle status
              if (newItem.vehicleId) {
                const vehicles = readDb('vehicle');
                const vIdx = vehicles.findIndex((v: any) => v.id === newItem.vehicleId);
                if (vIdx !== -1) {
                  vehicles[vIdx].status = 'On-Trip';
                  writeDb('vehicle', vehicles);
                }
              }
              // Side effect: increase party outstanding balance by freightAmount
              if (newItem.partyId) {
                const parties = readDb('party');
                const pIdx = parties.findIndex((p: any) => p.id === newItem.partyId);
                if (pIdx !== -1) {
                  parties[pIdx].outstandingBalance = (parties[pIdx].outstandingBalance || 0) + newItem.freightAmount;
                  writeDb('party', parties);
                }
              }
            }

            if (model === 'dieselLog') {
              newItem.litres = parseFloat(newItem.litres) || 0;
              newItem.ratePerLitre = parseFloat(newItem.ratePerLitre) || 0;
              newItem.totalCost = parseFloat(newItem.totalCost) || 0;
              newItem.odometer = parseInt(newItem.odometer) || null;
            }

            if (model === 'expense') {
              newItem.amount = parseFloat(newItem.amount) || 0;
            }

            if (model === 'invoice') {
              newItem.subtotal = parseFloat(newItem.subtotal) || 0;
              newItem.gstAmount = parseFloat(newItem.gstAmount) || 0;
              newItem.totalAmount = parseFloat(newItem.totalAmount) || 0;
              
              // Side effect: update trip paymentStatus
              if (newItem.tripId) {
                const trips = readDb('trip');
                const tIdx = trips.findIndex((t: any) => t.id === newItem.tripId);
                if (tIdx !== -1) {
                  trips[tIdx].paymentStatus = 'Paid'; // Mock automatic paid on invoice completion for testing
                  writeDb('trip', trips);
                }
              }
            }

            table.push(newItem);
            writeDb(model, table);
            return { data: newItem, error: null };
          } 
          
          else if (operation === 'update') {
            const index = table.findIndex(item => item.id === args.where.id);
            if (index === -1) {
              return { data: null, error: `Record not found in ${model}` };
            }
            
            const oldItem = table[index];
            const updated = {
              ...oldItem,
              ...args.data,
              updatedAt: new Date().toISOString()
            };

            // Custom DB side-effects for updates (e.g. Settle advance, change statuses)
            if (model === 'driver' && args.data.advanceBalance !== undefined) {
              updated.advanceBalance = parseFloat(args.data.advanceBalance) || 0;
            }
            if (model === 'trip' && args.data.podStatus) {
              // Status updates
              updated.podStatus = args.data.podStatus;
            }

            table[index] = updated;
            writeDb(model, table);
            return { data: updated, error: null };
          } 
          
          else if (operation === 'count') {
            return { data: table.length, error: null };
          } 
          
          else if (operation === 'deleteMany') {
            writeDb(model, []);
            return { data: { count: table.length }, error: null };
          }

          return { data: null, error: `Operation ${operation} not supported in mock DB` };
        } catch (e: any) {
          return { data: null, error: e.message };
        }
      }
    },
    app: {
      printToPdf: async (htmlContent: string) => {
        console.log("Mock printToPdf");
        return "mockBase64Data";
      },
      backup: async () => {
        console.log("Mock backup database");
        alert("Database Backup is only available when running inside the native Desktop App.");
        return { success: false, error: "Not supported in web browser preview." };
      },
      restore: async () => {
        console.log("Mock restore database");
        alert("Database Restore is only available when running inside the native Desktop App.");
        return { success: false, error: "Not supported in web browser preview." };
      }
    },
    getPath: async (name: string) => {
      return `/mock-user-path/${name}`;
    },
    whatsapp: (() => {
      let qrListener: ((qr: string) => void) | null = null;
      let statusListener: ((status: string) => void) | null = null;
      return {
        init: async () => {
          console.log('Mock WhatsApp init');
          if (statusListener) statusListener('loading');
          
          setTimeout(() => {
            if (qrListener) qrListener('/whatsapp-qr.png');
            if (statusListener) statusListener('qr_ready');
          }, 1500);
        },
        getStatus: async () => 'disconnected',
        getLastQr: async () => '/whatsapp-qr.png',
        send: async (phone: string, text: string) => {
          console.log(`Mock WhatsApp send to ${phone}: ${text}`);
          return { success: true, error: null };
        },
        sendMedia: async (args: { phone: string, caption?: string, base64Data: string, mimetype: string, filename: string }) => {
          console.log(`Mock WhatsApp sendMedia to ${args.phone} (${args.filename}, ${args.mimetype}): ${args.caption}`);
          return { success: true, error: null };
        },
        disconnect: async () => {
          console.log('Mock WhatsApp disconnect');
          if (statusListener) statusListener('disconnected');
        },
        onQr: (_callback: (qr: string) => void) => {
          qrListener = _callback;
          return () => { qrListener = null; };
        },
        onStatus: (_callback: (status: string) => void) => {
          statusListener = _callback;
          return () => { statusListener = null; };
        }
      };
    })()
  };
}
