import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 8,
    fontFamily: 'Helvetica',
    flexDirection: 'column',
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    fontWeight: 'bold',
  },
  tableCol: {
    borderRightWidth: 1,
    borderRightColor: '#000',
    padding: 3,
    justifyContent: 'center',
  },
  colDate: { width: '8%' },
  colVehicle: { width: '10%' },
  colParty: { width: '12%' },
  colFrom: { width: '10%' },
  colTo: { width: '10%' },
  colSize: { width: '6%' },
  colRate: { width: '8%' },
  colAdvance: { width: '8%' },
  colCommation: { width: '8%' },
  colExtra: { width: '6%' },
  colBalance: { width: '8%' },
  colMe: { width: '6%', borderRightWidth: 0 },
  
  cellText: {
    fontSize: 7,
    textAlign: 'center',
  },
  boldText: {
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  subRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  subColHeader: {
    width: '25%',
    borderRightWidth: 1,
    borderRightColor: '#000',
    padding: 2,
    backgroundColor: '#fafafa',
  },
  subColValue: {
    width: '25%',
    borderRightWidth: 1,
    borderRightColor: '#000',
    padding: 2,
  },
  subTableContainer: {
    width: '40%',
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  subTableRow: {
    flexDirection: 'row',
  },
  notesCol: {
    width: '60%',
    padding: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    justifyContent: 'center',
  },
  emptyCol: {
    borderRightWidth: 1,
    borderRightColor: '#000',
  }
});

const formatDate = (dateString: string | Date | null) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
};

interface TripReportPDFProps {
  trips: any[];
}

export const TripReportPDF: React.FC<TripReportPDFProps> = ({ trips }) => {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.table}>
          {/* Main Header */}
          <View style={styles.tableHeaderRow}>
            <View style={[styles.tableCol, styles.colDate]}><Text style={[styles.cellText, styles.boldText]}>DATE</Text></View>
            <View style={[styles.tableCol, styles.colVehicle]}><Text style={[styles.cellText, styles.boldText]}>VEHICLE NO</Text></View>
            <View style={[styles.tableCol, styles.colParty]}><Text style={[styles.cellText, styles.boldText]}>PARTY NAME</Text></View>
            <View style={[styles.tableCol, styles.colFrom]}><Text style={[styles.cellText, styles.boldText]}>FROM</Text></View>
            <View style={[styles.tableCol, styles.colTo]}><Text style={[styles.cellText, styles.boldText]}>TO</Text></View>
            <View style={[styles.tableCol, styles.colSize]}><Text style={[styles.cellText, styles.boldText]}>SIZE</Text></View>
            <View style={[styles.tableCol, styles.colRate]}><Text style={[styles.cellText, styles.boldText]}>RATE</Text></View>
            <View style={[styles.tableCol, styles.colAdvance]}><Text style={[styles.cellText, styles.boldText]}>ADVANCE</Text></View>
            <View style={[styles.tableCol, styles.colCommation]}><Text style={[styles.cellText, styles.boldText]}>COMMATION</Text></View>
            <View style={[styles.tableCol, styles.colExtra]}><Text style={[styles.cellText, styles.boldText]}>EXTRA</Text></View>
            <View style={[styles.tableCol, styles.colBalance]}><Text style={[styles.cellText, styles.boldText]}>BALANCE</Text></View>
            <View style={[styles.tableCol, styles.colMe]}><Text style={[styles.cellText, styles.boldText]}>ME</Text></View>
          </View>

          {trips.map((trip, i) => (
            <React.Fragment key={trip.id || i}>
              {/* Main Trip Row */}
              <View style={[styles.tableRow, { borderBottomWidth: 1, borderBottomColor: '#000' }]}>
                <View style={[styles.tableCol, styles.colDate]}><Text style={styles.cellText}>{formatDate(trip.tripDate)}</Text></View>
                <View style={[styles.tableCol, styles.colVehicle]}><Text style={styles.cellText}>{trip.vehicle?.vehicleNumber || ''}</Text></View>
                <View style={[styles.tableCol, styles.colParty]}><Text style={styles.cellText}>{trip.party?.companyName || ''}</Text></View>
                <View style={[styles.tableCol, styles.colFrom]}><Text style={styles.cellText}>{trip.from}</Text></View>
                <View style={[styles.tableCol, styles.colTo]}><Text style={styles.cellText}>{trip.to}</Text></View>
                <View style={[styles.tableCol, styles.colSize]}><Text style={styles.cellText}>{trip.sizeWeight || ''}</Text></View>
                <View style={[styles.tableCol, styles.colRate]}><Text style={styles.cellText}>{trip.freightAmount || ''}</Text></View>
                <View style={[styles.tableCol, styles.colAdvance]}><Text style={styles.cellText}>{trip.partyAdvance || ''}</Text></View>
                <View style={[styles.tableCol, styles.colCommation]}><Text style={styles.cellText}>{trip.commission || ''}</Text></View>
                <View style={[styles.tableCol, styles.colExtra]}><Text style={styles.cellText}>{trip.extraCharges || ''}</Text></View>
                <View style={[styles.tableCol, styles.colBalance]}><Text style={styles.cellText}>{trip.balance !== undefined ? trip.balance : ((trip.freightAmount || 0) - (trip.partyAdvance || 0))}</Text></View>
                <View style={[styles.tableCol, styles.colMe]}><Text style={styles.cellText}>{trip.maintenance || ''}</Text></View>
              </View>

              {/* Sub Row Header for Expenses */}
              <View style={styles.subRow}>
                <View style={styles.subTableContainer}>
                  <View style={[styles.tableRow, { borderBottomWidth: 1, borderBottomColor: '#000' }]}>
                    <View style={[styles.subColHeader, { width: '20%' }]}><Text style={[styles.cellText, styles.boldText, { fontStyle: 'italic' }]}>FASTAG</Text></View>
                    <View style={[styles.subColHeader, { width: '25%' }]}><Text style={[styles.cellText, styles.boldText, { fontStyle: 'italic' }]}>DIESEL</Text></View>
                    <View style={[styles.subColHeader, { width: '30%' }]}><Text style={[styles.cellText, styles.boldText, { fontStyle: 'italic' }]}>CASH</Text></View>
                    <View style={[styles.subColHeader, { width: '25%', borderRightWidth: 0 }]}><Text style={[styles.cellText, styles.boldText, { fontStyle: 'italic' }]}>LIQUID</Text></View>
                  </View>
                  <View style={styles.tableRow}>
                    <View style={[styles.subColValue, { width: '20%' }]}><Text style={styles.cellText}>{trip.toll || ''}</Text></View>
                    <View style={[styles.subColValue, { width: '25%' }]}><Text style={styles.cellText}>{trip.dieselAmount || ''}</Text></View>
                    <View style={[styles.subColValue, { width: '30%' }]}><Text style={styles.cellText}>{trip.driverCash || ''}</Text></View>
                    <View style={[styles.subColValue, { width: '25%', borderRightWidth: 0 }]}><Text style={styles.cellText}>{trip.liquidDiesel || ''}</Text></View>
                  </View>
                </View>
                
                {/* Notes/Memo section on the right of the subtable */}
                <View style={styles.notesCol}>
                  {trip.notes ? (
                    <Text style={[styles.cellText, { textAlign: 'left', paddingLeft: 5 }]}>{trip.notes}</Text>
                  ) : (
                    <Text style={styles.cellText}> </Text>
                  )}
                </View>
              </View>
            </React.Fragment>
          ))}
        </View>
      </Page>
    </Document>
  );
};
