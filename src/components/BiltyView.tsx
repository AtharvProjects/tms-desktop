import { usePreferences } from '../contexts/PreferencesContext';

export function BiltyView({ trip }: { trip: any }) {
  const { t } = usePreferences();
  
  if (!trip) return null;
  const tripDate = new Date(trip.tripDate).toLocaleDateString('en-IN');

  return (
    <div className="w-full bg-white text-black p-8 text-sm" style={{ minHeight: '11.69in', width: '8.27in', margin: '0 auto' }}>
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
        <div>
          <h1 className="text-3xl font-extrabold uppercase tracking-widest text-gray-900">{t('LORRY RECEIPT')}</h1>
          <p className="text-sm font-semibold text-gray-600 mt-1">{t('TRANSPORT MANAGEMENT CO.')}</p>
        </div>
        <div className="text-right">
          <div className="font-bold text-lg">{t('LR NO:')} {trip.lrNumber || trip.tripNo}</div>
          <div className="text-gray-600 font-medium">{t('Date:')} {tripDate}</div>
        </div>
      </div>

      {/* Main Info Grid */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Consignor/Consignee Info (Mocked as Customer Party) */}
        <div className="border border-gray-400 p-4 rounded bg-gray-50">
          <h3 className="font-bold text-gray-500 mb-2 border-b border-gray-300 pb-1">{t('CUSTOMER / PARTY')}</h3>
          <p className="font-bold text-lg">{trip.party?.companyName}</p>
          <p>{trip.party?.contactPerson}</p>
          <p>Ph: {trip.party?.phone}</p>
        </div>
        <div className="border border-gray-400 p-4 rounded bg-gray-50">
          <h3 className="font-bold text-gray-500 mb-2 border-b border-gray-300 pb-1">{t('ROUTE DETAILS')}</h3>
          <table className="w-full text-left">
            <tbody>
              <tr><th className="py-1 w-1/3">{t('From:')}</th><td className="font-bold">{trip.from}</td></tr>
              <tr><th className="py-1">{t('To:')}</th><td className="font-bold">{trip.to}</td></tr>
              <tr><th className="py-1">{t('Vehicle No:')}</th><td className="font-bold">{trip.vehicle?.vehicleNumber}</td></tr>
              <tr><th className="py-1">{t('Driver:')}</th><td>{trip.driver?.driverName}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Material Details Table */}
      <div className="mb-6">
        <h3 className="font-bold text-gray-500 mb-2">{t('CONSIGNMENT DETAILS')}</h3>
        <table className="w-full border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-4 py-2 text-left">{t('Sr No.')}</th>
              <th className="border border-gray-400 px-4 py-2 text-left">{t('Description of Goods')}</th>
              <th className="border border-gray-400 px-4 py-2 text-left">{t('Weight / Volume')}</th>
              <th className="border border-gray-400 px-4 py-2 text-right">{t('Value (Estimated)')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-400 px-4 py-6">1</td>
              <td className="border border-gray-400 px-4 py-6 font-semibold">{trip.material || '-'}</td>
              <td className="border border-gray-400 px-4 py-6 font-semibold">{trip.sizeWeight || '-'}</td>
              <td className="border border-gray-400 px-4 py-6 text-right">-</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Billing/Freight Info */}
      <div className="flex justify-between items-start gap-6 mb-16">
        <div className="w-1/2">
          <div className="border border-gray-400 p-4 rounded">
            <h3 className="font-bold text-gray-500 mb-2 border-b border-gray-300 pb-1">{t('TERMS & CONDITIONS')}</h3>
            <ul className="list-disc pl-5 text-xs text-gray-600 space-y-1">
              <li>{t("Goods booked at owner's risk.")}</li>
              <li>{t("We are not responsible for leakage or breakage.")}</li>
              <li>{t("Demurrage will be charged after 24 hrs.")}</li>
              <li>{t("Subject to local jurisdiction only.")}</li>
            </ul>
          </div>
        </div>
        <div className="w-1/2">
          <table className="w-full border-collapse border border-gray-400 h-full">
            <tbody>
              <tr>
                <th className="border border-gray-400 px-4 py-2 text-left bg-gray-50">{t('Total Freight:')}</th>
                <td className="border border-gray-400 px-4 py-2 text-right font-bold">Rs. {trip.freightAmount?.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <th className="border border-gray-400 px-4 py-2 text-left bg-gray-50">{t('Advance Paid:')}</th>
                <td className="border border-gray-400 px-4 py-2 text-right font-bold text-red-600">Rs. {trip.partyAdvance?.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <th className="border border-gray-400 px-4 py-2 text-left bg-gray-50">{t('Balance To Pay:')}</th>
                <td className="border border-gray-400 px-4 py-2 text-right font-bold text-green-600 text-lg">
                  Rs. {((trip.freightAmount || 0) - (trip.partyAdvance || 0)).toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Signatures */}
      <div className="flex justify-between mt-12 pt-12 border-t-2 border-gray-300">
        <div className="text-center">
          <div className="border-t border-black w-40 mb-2"></div>
          <span className="font-semibold text-gray-600">{t("Consignor's Signature")}</span>
        </div>
        <div className="text-center">
          <div className="border-t border-black w-40 mb-2"></div>
          <span className="font-semibold text-gray-600">{t("Driver's Signature")}</span>
        </div>
        <div className="text-center">
          <div className="border-t border-black w-40 mb-2"></div>
          <span className="font-semibold text-gray-600">{t("Authorized Signatory")}</span>
        </div>
      </div>
    </div>
  );
}
