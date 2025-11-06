// A utility for calculating Nigerian public holidays and investment windows.

// --- Helper function to calculate Easter Sunday using the "Anonymous Gregorian" algorithm.
function getEaster(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

// --- List of fixed Nigerian public holidays
const fixedHolidays = (year: number) => [
    { month: 0, day: 1, name: "New Year's Day" },
    { month: 4, day: 1, name: "Workers' Day" },
    { month: 4, day: 27, name: "Children's Day" },
    { month: 4, day: 29, name: "Democracy Day Handover" }, // Note: May 29 was the former date
    { month: 5, day: 12, name: "Democracy Day" },
    { month: 9, day: 1, name: "Independence Day" },
    { month: 11, day: 25, name: "Christmas Day" },
    { month: 11, day: 26, name: "Boxing Day" },
];

// --- List of floating holidays relative to Easter
const getFloatingHolidays = (year: number) => {
    const easterSunday = getEaster(year);
    return [
        { date: new Date(easterSunday.getTime() - 2 * 24 * 60 * 60 * 1000), name: "Good Friday" },
        { date: new Date(easterSunday.getTime() + 1 * 24 * 60 * 60 * 1000), name: "Easter Monday" },
    ];
};

// --- Approximations for Islamic holidays (these are based on sightings and can vary)
// Note: This is a simplified calculation and might be off by a day. For full accuracy, an external API is needed.
const getIslamicHolidays = (year: number) => {
    // These are rough estimates and will need annual adjustments.
    const eidAlFitr = new Date(year, 3, 10); // Approximation for 2024
    const eidAlAdha = new Date(year, 5, 17); // Approximation for 2024
    const eidElMaulud = new Date(year, 8, 16); // Approximation for 2024
    return [
        { date: eidAlFitr, name: "Eid al-Fitr" },
        { date: new Date(eidAlFitr.getTime() + 1 * 24 * 60 * 60 * 1000), name: "Eid al-Fitr Holiday" },
        { date: eidAlAdha, name: "Eid al-Adha" },
        { date: new Date(eidAlAdha.getTime() + 1 * 24 * 60 * 60 * 1000), name: "Eid al-Adha Holiday" },
        { date: eidElMaulud, name: "Eid-el-Maulud" }
    ];
};

const allNigerianHolidays = (year: number): Date[] => {
    const holidays = [
        ...fixedHolidays(year).map(h => new Date(year, h.month, h.day)),
        ...getFloatingHolidays(year).map(h => h.date),
        ...getIslamicHolidays(year).map(h => h.date),
    ];
    return holidays;
};

// Main function to check if a date is a public holiday or a weekend
export const isPublicHolidayOrWeekend = (date: Date): boolean => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    // Check for weekends (Saturday or Sunday)
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return true;
    }

    const holidays = allNigerianHolidays(year);
    return holidays.some(holiday => 
        holiday.getFullYear() === year &&
        holiday.getMonth() === month &&
        holiday.getDate() === day
    );
};

// Function to find the next business day
const getNextBusinessDay = (date: Date): Date => {
    let nextDay = new Date(date);
    while (isPublicHolidayOrWeekend(nextDay)) {
        nextDay.setDate(nextDay.getDate() + 1);
    }
    return nextDay;
};

// Function to get the current valid investment window
export const getInvestmentWindowDetails = (year: number, month: number): { startDay: number, endDay: number } => {
    const investmentStart = new Date(year, month, 1);
    const investmentEnd = new Date(year, month, 2);

    const effectiveStart = getNextBusinessDay(investmentStart);
    let effectiveEnd = getNextBusinessDay(investmentEnd);

    // If the 2nd is a holiday and the next business day is the same as the start day's next business day
    // (e.g., 1st is Sat, 2nd is Sun, effective start is Mon 3rd), then the window should be just one day.
    // So we add one more business day to the end.
    if (effectiveEnd <= effectiveStart) {
        effectiveEnd = getNextBusinessDay(new Date(effectiveStart.getTime() + 24 * 60 * 60 * 1000));
    }
    
    // A simplified view for the popover text, just returning the normal window days.
    // The actual check `isInvestmentWindowOpen` handles the logic.
    return { startDay: 1, endDay: 2 };
};

// Main function to check if the investment window is currently open
export const isInvestmentWindowOpen = (today: Date): boolean => {
    const year = today.getFullYear();
    const month = today.getMonth();

    const investmentStart = new Date(year, month, 1);
    const investmentEnd = new Date(year, month, 2);

    const effectiveStart = getNextBusinessDay(investmentStart);
    let effectiveEnd = getNextBusinessDay(investmentEnd);

    if (effectiveEnd <= effectiveStart) {
        effectiveEnd = getNextBusinessDay(new Date(effectiveStart.getTime() + 24 * 60 * 60 * 1000));
    }

    // Normalize dates to ignore time component
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startDateOnly = new Date(effectiveStart.getFullYear(), effectiveStart.getMonth(), effectiveStart.getDate());
    const endDateOnly = new Date(effectiveEnd.getFullYear(), effectiveEnd.getMonth(), effectiveEnd.getDate());

    return todayDateOnly >= startDateOnly && todayDateOnly <= endDateOnly;
};
