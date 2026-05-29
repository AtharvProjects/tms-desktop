import React from 'react';
import { usePreferences } from '../contexts/PreferencesContext';

const formatDate = (dateString: string | Date | null) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
};

export const TripReportView = ({ trips, dateFilter: _unused }: { trips: any[]; dateFilter?: string; _unused?: any }) => {
  const { t } = usePreferences();
  return (
    <div className="w-full bg-white text-black p-4 text-[10px] sm:text-xs font-sans print:p-0 print:m-0">
      <table className="w-full border-collapse border border-black text-center">
        <thead>
          <tr className="bg-gray-200 uppercase font-bold">
            <th className="border border-black p-1 w-[8%]">{t('DATE')}</th>
            <th className="border border-black p-1 w-[11%]">{t('VEHICLE NO')}</th>
            <th className="border border-black p-1 w-[14%]">{t('PARTY NAME')}</th>
            <th className="border border-black p-1 w-[10%]">{t('FROM')}</th>
            <th className="border border-black p-1 w-[10%]">{t('TO')}</th>
            <th className="border border-black p-1 w-[7%]">{t('SIZE')}</th>
            <th className="border border-black p-1 w-[8%]">{t('RATE')}</th>
            <th className="border border-black p-1 w-[8%]">{t('ADVANCE')}</th>
            <th className="border border-black p-1 w-[8%]">{t('COMMATION')}</th>
            <th className="border border-black p-1 w-[5%]">{t('EXTRA')}</th>
            <th className="border border-black p-1 w-[7%]">{t('BALANCE')}</th>
            <th className="border border-black p-1 w-[4%]">{t('ME')}</th>
          </tr>
        </thead>
        <tbody>
          {trips.map((trip, i) => (
            <React.Fragment key={trip.id || i}>
              {/* Main Trip Row */}
              <tr className="break-words">
                <td className="border border-black p-1">{formatDate(trip.tripDate)}</td>
                <td className="border border-black p-1">{trip.vehicle?.vehicleNumber || ''}</td>
                <td className="border border-black p-1 font-medium">{trip.party?.companyName || ''}</td>
                <td className="border border-black p-1">{trip.from}</td>
                <td className="border border-black p-1">{trip.to}</td>
                <td className="border border-black p-1">{trip.sizeWeight || ''}</td>
                <td className="border border-black p-1 font-semibold">{trip.freightAmount || ''}</td>
                <td className="border border-black p-1">{trip.partyAdvance || ''}</td>
                <td className="border border-black p-1">{trip.commission || ''}</td>
                <td className="border border-black p-1">{trip.extraCharges || ''}</td>
                <td className="border border-black p-1 font-semibold">
                  {trip.balance !== undefined ? trip.balance : ((trip.freightAmount || 0) - (trip.partyAdvance || 0))}
                </td>
                <td className="border border-black p-1">{trip.maintenance || ''}</td>
              </tr>

              {/* Sub Row Header for Expenses */}
              <tr className="bg-gray-50 italic font-bold">
                <td className="border border-black p-1">{t('FASTAG')}</td>
                <td className="border border-black p-1">{t('DIESEL')}</td>
                <td className="border border-black p-1">{t('CASH')}</td>
                <td className="border border-black p-1">{t('LIQUID')}</td>
                <td colSpan={8} rowSpan={2} className="border border-black p-2 text-left not-italic font-normal align-top bg-white text-gray-700 whitespace-pre-wrap">
                  {trip.notes || ' '}
                </td>
              </tr>
              {/* Sub Row Values for Expenses */}
              <tr>
                <td className="border border-black p-1 font-semibold">{trip.toll || ''}</td>
                <td className="border border-black p-1 font-semibold">{trip.dieselAmount || ''}</td>
                <td className="border border-black p-1 font-semibold">{trip.driverCash || ''}</td>
                <td className="border border-black p-1 font-semibold">{trip.liquidDiesel || ''}</td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};
