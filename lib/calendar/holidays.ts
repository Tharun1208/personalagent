export interface GovtHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  type: 'national' | 'gazetted' | 'restricted' | 'festival';
  description?: string;
  emoji?: string;
}

export const GOVT_HOLIDAYS: GovtHoliday[] = [
  // ── 2025 Holidays ──
  { date: '2025-01-01', name: "New Year's Day", type: 'restricted', description: 'Celebration of the first day of the year' },
  { date: '2025-01-14', name: 'Makar Sankranti / Pongal', type: 'gazetted', description: 'Harvest festival celebrated across India' },
  { date: '2025-01-26', name: 'Republic Day', type: 'national', description: 'National Holiday celebrating the Constitution of India' },
  { date: '2025-02-26', name: 'Maha Shivratri', type: 'gazetted', description: 'Festival in reverence of Lord Shiva' },
  { date: '2025-03-14', name: 'Holi', type: 'gazetted', description: 'Festival of colors and spring' },
  { date: '2025-03-31', name: 'Eid-ul-Fitr (Ramzan Id)', type: 'gazetted', description: 'Islamic festival marking the end of Ramadan' },
  { date: '2025-04-10', name: 'Mahavir Jayanti', type: 'gazetted', description: 'Birth anniversary of Lord Mahavira' },
  { date: '2025-04-14', name: 'Dr. B.R. Ambedkar Jayanti', type: 'gazetted', description: 'Commemorating the father of the Indian Constitution' },
  { date: '2025-04-18', name: 'Good Friday', type: 'gazetted', description: 'Christian holiday commemorating the crucifixion of Jesus' },
  { date: '2025-05-12', name: 'Buddha Purnima', type: 'gazetted', description: 'Birth anniversary of Gautama Buddha' },
  { date: '2025-06-07', name: 'Bakrid / Eid al-Adha', type: 'gazetted', description: 'Feast of the Sacrifice' },
  { date: '2025-07-06', name: 'Muharram', type: 'gazetted', description: 'First month of the Islamic calendar' },
  { date: '2025-08-15', name: 'Independence Day', type: 'national', description: 'National Holiday marking Indian Independence (1947)' },
  { date: '2025-08-16', name: 'Janmashtami', type: 'gazetted', description: 'Birth celebration of Lord Krishna' },
  { date: '2025-08-27', name: 'Ganesh Chaturthi', type: 'gazetted', description: 'Festival celebrating the arrival of Lord Ganesha' },
  { date: '2025-09-05', name: 'Milad-un-Nabi (Id-e-Milad)', type: 'gazetted', description: 'Birthday of Prophet Muhammad' },
  { date: '2025-10-02', name: 'Mahatma Gandhi Jayanti', type: 'national', description: 'National Holiday honoring the Father of the Nation' },
  { date: '2025-10-02', name: 'Dussehra (Vijayadashami)', type: 'gazetted', description: 'Victory of good over evil' },
  { date: '2025-10-20', name: 'Diwali (Deepavali)', type: 'gazetted', description: 'Festival of Lights' },
  { date: '2025-10-22', name: 'Govardhan Puja / Bhai Dooj', type: 'restricted', description: 'Post-Diwali celebrations' },
  { date: '2025-11-05', name: 'Guru Nanak Jayanti', type: 'gazetted', description: 'Birth anniversary of Guru Nanak Dev Ji' },
  { date: '2025-12-25', name: 'Christmas Day', type: 'gazetted', description: 'Celebration of the birth of Jesus Christ' },

  // ── 2026 Holidays ──
  { date: '2026-01-01', name: "New Year's Day", type: 'restricted', description: 'Celebration of the first day of the year 2026' },
  { date: '2026-01-14', name: 'Makar Sankranti / Pongal', type: 'gazetted', description: 'Harvest festival celebrated across India' },
  { date: '2026-01-26', name: 'Republic Day', type: 'national', description: 'National Holiday celebrating the Constitution of India' },
  { date: '2026-02-15', name: 'Maha Shivratri', type: 'gazetted', description: 'Great Night of Shiva celebration' },
  { date: '2026-03-03', name: 'Holi (Dol Jatra)', type: 'gazetted', description: 'Grand festival of colors' },
  { date: '2026-03-20', name: 'Eid-ul-Fitr (Ramzan Id)', type: 'gazetted', description: 'Islamic festival marking the culmination of Ramadan' },
  { date: '2026-03-31', name: 'Mahavir Jayanti', type: 'gazetted', description: 'Birth anniversary of Lord Mahavira' },
  { date: '2026-04-03', name: 'Good Friday', type: 'gazetted', description: 'Commemoration of the Crucifixion' },
  { date: '2026-04-14', name: 'Dr. B.R. Ambedkar Jayanti', type: 'gazetted', description: 'Birth anniversary of Babasaheb Dr. B.R. Ambedkar' },
  { date: '2026-05-01', name: 'May Day / Labor Day / Maharashtra Day', type: 'restricted', description: 'International Workers Day' },
  { date: '2026-05-01', name: 'Buddha Purnima', type: 'gazetted', description: 'Birth, enlightenment and parinirvana of Gautama Buddha' },
  { date: '2026-05-27', name: 'Bakrid / Eid al-Adha', type: 'gazetted', description: 'Feast of the Sacrifice' },
  { date: '2026-06-25', name: 'Muharram (Ashura)', type: 'gazetted', description: 'Tenth day of Muharram' },
  { date: '2026-08-15', name: 'Independence Day', type: 'national', description: '79th Indian Independence Day National Celebration' },
  { date: '2026-08-28', name: 'Raksha Bandhan', type: 'restricted', description: 'Celebration of the bond between siblings' },
  { date: '2026-09-04', name: 'Janmashtami (Krishna Jayanti)', type: 'gazetted', description: 'Birth festival of Lord Krishna' },
  { date: '2026-09-14', name: 'Ganesh Chaturthi', type: 'gazetted', description: 'Vinayaka Chaturthi festival of Lord Ganesha' },
  { date: '2026-09-25', name: 'Milad-un-Nabi (Id-e-Milad)', type: 'gazetted', description: 'Birthday of the Prophet' },
  { date: '2026-10-02', name: 'Mahatma Gandhi Jayanti', type: 'national', description: 'National Holiday celebrating Mahatma Gandhi’s birth anniversary' },
  { date: '2026-10-11', name: 'First Day of Sharad Navratri', type: 'festival', description: 'Beginning of Navratri festival' },
  { date: '2026-10-17', name: 'First Day of Durga Puja', type: 'festival', description: 'Start of Durga Puja celebrations' },
  { date: '2026-10-18', name: 'Maha Saptami', type: 'restricted', description: 'Seventh day of Durga Puja / Navratri' },
  { date: '2026-10-19', name: 'Maha Ashtami', type: 'restricted', description: 'Eighth day of Durga Puja / Durga Ashtami' },
  { date: '2026-10-20', name: 'Dussehra (Vijayadashami)', type: 'gazetted', description: 'Triumph of righteousness and Vijayadashami' },
  { date: '2026-10-26', name: 'Maharishi Valmiki Jayanti', type: 'restricted', description: 'Birth anniversary of sage Valmiki' },
  { date: '2026-10-29', name: 'Karaka Chaturthi (Karwa Chauth)', type: 'restricted', description: 'Karwa Chauth festival' },
  { date: '2026-11-08', name: 'Diwali (Deepavali / Lakshmi Puja)', type: 'gazetted', description: 'Grand Festival of Lights across the nation' },
  { date: '2026-11-09', name: 'Govardhan Puja / Nutan Varsh', type: 'restricted', description: 'New year & Govardhan worship' },
  { date: '2026-11-10', name: 'Bhai Dooj (Yama Dwitiya)', type: 'restricted', description: 'Celebration of sister-brother relationship' },
  { date: '2026-11-24', name: 'Guru Nanak Jayanti (Gurpurab)', type: 'gazetted', description: 'Birth anniversary of the first Sikh Guru' },
  { date: '2026-12-25', name: 'Christmas Day', type: 'gazetted', description: 'Celebration of Christmas' },

  // ── 2027 Holidays ──
  { date: '2027-01-01', name: "New Year's Day", type: 'restricted', description: 'Celebration of the new year' },
  { date: '2027-01-14', name: 'Makar Sankranti / Pongal', type: 'gazetted', description: 'Harvest festival' },
  { date: '2027-01-26', name: 'Republic Day', type: 'national', description: 'National Holiday of India' },
  { date: '2027-03-07', name: 'Maha Shivratri', type: 'gazetted', description: 'Maha Shivratri festival' },
  { date: '2027-03-23', name: 'Holi', type: 'gazetted', description: 'Festival of Colors' },
  { date: '2027-03-26', name: 'Good Friday', type: 'gazetted', description: 'Christian holiday' },
  { date: '2027-04-14', name: 'Dr. B.R. Ambedkar Jayanti', type: 'gazetted', description: 'Ambedkar Jayanti' },
  { date: '2027-08-15', name: 'Independence Day', type: 'national', description: 'National Independence Day' },
  { date: '2027-10-02', name: 'Mahatma Gandhi Jayanti', type: 'national', description: 'Gandhi Jayanti National Holiday' },
  { date: '2027-10-09', name: 'Dussehra (Vijayadashami)', type: 'gazetted', description: 'Vijayadashami festival' },
  { date: '2027-10-29', name: 'Diwali (Deepavali)', type: 'gazetted', description: 'Festival of Lights' },
  { date: '2027-12-25', name: 'Christmas Day', type: 'gazetted', description: 'Christmas celebration' },
];

export function getHolidayForDate(date: Date | string): GovtHoliday | undefined {
  let dateStr: string;
  if (typeof date === 'string') {
    dateStr = date.split('T')[0];
  } else {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    dateStr = `${y}-${m}-${d}`;
  }
  return GOVT_HOLIDAYS.find((h) => h.date === dateStr);
}

export function getAllHolidaysForDate(date: Date | string): GovtHoliday[] {
  let dateStr: string;
  if (typeof date === 'string') {
    dateStr = date.split('T')[0];
  } else {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    dateStr = `${y}-${m}-${d}`;
  }
  return GOVT_HOLIDAYS.filter((h) => h.date === dateStr);
}

export function getHolidaysForMonth(year: number, monthIndex: number): GovtHoliday[] {
  const m = String(monthIndex + 1).padStart(2, '0');
  const prefix = `${year}-${m}-`;
  return GOVT_HOLIDAYS.filter((h) => h.date.startsWith(prefix));
}

export function getHolidaysForYear(year: number): GovtHoliday[] {
  const prefix = `${year}-`;
  return GOVT_HOLIDAYS.filter((h) => h.date.startsWith(prefix));
}

export function isGovernmentHoliday(date: Date | string): boolean {
  return getHolidayForDate(date) !== undefined;
}

export function getUpcomingHolidays(fromDate: Date = new Date(), count = 5): GovtHoliday[] {
  const dateStr = fromDate.toISOString().split('T')[0];
  return GOVT_HOLIDAYS.filter((h) => h.date >= dateStr).slice(0, count);
}
