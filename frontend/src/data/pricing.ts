export const AED_RATE = 3.67;

export const pricing = {
  hookupFee: { name: "Hookup Fee", usd: 49, type: "one-time" },
  officeRental: { name: "Virtual Office Rental", usd: 99, type: "monthly" },
  mailbox: { name: "Mailbox", usd: 19, type: "monthly" },
  voip: { name: "VoIP Number", usd: 29, type: "monthly" },
  meetingRooms: { name: "Meeting Rooms", usd: 49, type: "monthly" },
  zoom: { name: "Zoom Pro", usd: 19, type: "monthly" },
  crm: { name: "CRM Software", usd: 25, type: "monthly" },
  microsoft365: { name: "Microsoft 365", usd: 19, type: "monthly" },
};

export function toAED(usd: number) {
  return Math.round(usd * AED_RATE);
}

export function money(usd: number) {
  return `$${usd.toFixed(2)} / AED ${toAED(usd)}`;
}