export interface EnabledDemographic {
    key: string;
    label: string;
    validValues: string[];
}

export const DEMOGRAPHIC_LABELS: Record<string, string> = {
    age: 'Age',
    country: 'Country',
    gender: 'Gender',
    educationLevel: 'Education Level',
    annualIncome: 'Annual Income',
    employmentStatus: 'Employment Status',
    dailyHoursOnline: 'Daily Hours Online',
    technicalProficiency: 'Technical Proficiency',
};
