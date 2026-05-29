import Papa from 'papaparse';

export const CSV_HEADERS = [
  'Trip No', 'Date', 'Report Date', 'Loading Date', 'Unloading Date',
  'Vehicle', 'Driver', 'Party', 'From', 'To', 'Material', 'Billing Type',
  'Freight', 'Party Advance', 'Driver Advance', 'Commission', 'Maintenance',
  'Fastag/Toll', 'Diesel', 'Liquid Diesel', 'Driver Cash', 'Extra Running',
  'Detention Time', 'Extra Charges', 'POD Status', 'Payment Status', 'Notes'
];

export async function processCSVImport(file: File, onSuccess: () => void, onError: (err: string) => void) {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      try {
        const rows = results.data as any[];
        if (rows.length === 0) throw new Error("CSV file is empty");

        for (const row of rows) {
          if (!row['Trip No'] || !row['Vehicle'] || !row['Party'] || !row['From'] || !row['To']) {
            throw new Error("Missing required fields: Trip No, Vehicle, Party, From, To");
          }

          // 1. Resolve Vehicle
          const vehicleNumber = row['Vehicle'].trim();
          let vehicleRes = await window.electronAPI.prisma.query('vehicle', 'findUnique', {
            where: { vehicleNumber }
          });
          if (!vehicleRes.data) {
            vehicleRes = await window.electronAPI.prisma.query('vehicle', 'create', {
              data: { vehicleNumber, vehicleType: 'Truck', status: 'Active' }
            });
            if (vehicleRes.error) throw new Error(`Failed to create vehicle ${vehicleNumber}: ${vehicleRes.error}`);
          }
          const vehicleId = vehicleRes.data.id;

          // 2. Resolve Party
          const companyName = row['Party'].trim();
          let partyRes = await window.electronAPI.prisma.query('party', 'findUnique', {
            where: { companyName }
          });
          if (!partyRes.data) {
            partyRes = await window.electronAPI.prisma.query('party', 'create', {
              data: { companyName, status: 'Active' }
            });
            if (partyRes.error) throw new Error(`Failed to create party ${companyName}: ${partyRes.error}`);
          }
          const partyId = partyRes.data.id;

          // 3. Resolve Driver (Optional)
          let driverId = null;
          if (row['Driver']?.trim()) {
            const driverName = row['Driver'].trim();
            let driverRes = await window.electronAPI.prisma.query('driver', 'findFirst', {
              where: { driverName }
            });
            if (!driverRes.data) {
              driverRes = await window.electronAPI.prisma.query('driver', 'create', {
                data: { driverName, mobileNumber: '0000000000', status: 'Active' }
              });
              if (driverRes.error) throw new Error(`Failed to create driver ${driverName}: ${driverRes.error}`);
            }
            driverId = driverRes.data.id;
          }

          // 4. Upsert Trip
          const tripNo = row['Trip No'].trim();
          
          const parseFloatSafe = (val: string) => {
            const parsed = parseFloat(val);
            return isNaN(parsed) ? 0 : parsed;
          };

          const parseDateSafe = (val: string) => {
            if (!val) return null;
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d;
          };

          const freightAmount = parseFloatSafe(row['Freight']);
          const partyAdvance = parseFloatSafe(row['Party Advance']);
          const balance = freightAmount - partyAdvance;

          const tripData = {
            tripNo,
            tripDate: parseDateSafe(row['Date']) || new Date(),
            vehicleId,
            partyId,
            driverId,
            from: row['From'] || '',
            to: row['To'] || '',
            material: row['Material'] || null,
            billingType: row['Billing Type'] || 'Fixed',
            freightAmount,
            dieselAmount: parseFloatSafe(row['Diesel']),
            liquidDiesel: parseFloatSafe(row['Liquid Diesel']),
            driverCash: parseFloatSafe(row['Driver Cash']),
            toll: parseFloatSafe(row['Fastag/Toll']),
            partyAdvance,
            driverAdvance: parseFloatSafe(row['Driver Advance']),
            commission: parseFloatSafe(row['Commission']),
            maintenance: parseFloatSafe(row['Maintenance']),
            extraRunning: parseFloatSafe(row['Extra Running']),
            detentionTime: row['Detention Time'] || null,
            loadingDate: parseDateSafe(row['Loading Date']),
            unloadingDate: parseDateSafe(row['Unloading Date']),
            reportDate: parseDateSafe(row['Report Date']),
            extraCharges: parseFloatSafe(row['Extra Charges']),
            balance,
            podStatus: row['POD Status'] || 'Pending',
            paymentStatus: row['Payment Status'] || 'Pending',
            notes: row['Notes'] || null
          };

          const tripRes = await window.electronAPI.prisma.query('trip', 'upsert', {
            where: { tripNo },
            update: tripData,
            create: tripData
          });

          if (tripRes.error) {
            throw new Error(`Failed to import trip ${tripNo}: ${tripRes.error}`);
          }
        }
        
        onSuccess();
      } catch (err: any) {
        onError(err.message || 'Error processing CSV');
      }
    },
    error: (error: any) => {
      onError(`CSV Parse error: ${error.message}`);
    }
  });
}
