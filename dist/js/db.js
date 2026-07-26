const KEY = 'cables_pro_v8_data';
const seed = {
    customers: [
        { id: 'C-1001', name: 'Manor House', address: 'Nottinghamshire', phone: '', email: '', created: new Date().toISOString() },
        { id: 'C-1002', name: 'Mrs Smith', address: 'Sutton-in-Ashfield', phone: '', email: '', created: new Date().toISOString() }
    ],
    jobs: [
        { id: 'J-1001', customerId: 'C-1001', title: 'Electrical inspection', module: 'Electrical', date: new Date().toISOString().slice(0, 10), time: '08:30', status: 'Booked', value: 250, notes: '' },
        { id: 'J-1002', customerId: 'C-1002', title: 'Alarm annual service', module: 'Intruder Alarm', date: new Date().toISOString().slice(0, 10), time: '13:30', status: 'Booked', value: 95, notes: '' }
    ],
    records: [
        { id: 'R-1', kind: 'Invoice', reference: 'INV-2026-0001', customerId: 'C-1002', title: 'Alarm service', status: 'Outstanding', date: new Date().toISOString().slice(0, 10), amount: 95, details: 'Payment due within 30 days.' },
        { id: 'R-2', kind: 'Contract', reference: 'SC-2026-0001', customerId: 'C-1001', title: 'Annual alarm maintenance', status: 'Active', date: new Date().toISOString().slice(0, 10), amount: 180, details: 'Next visit due annually.' },
        { id: 'R-3', kind: 'Asset', reference: 'ASSET-000101', customerId: 'C-1001', title: 'Risco alarm panel', status: 'Operational', date: new Date().toISOString().slice(0, 10), details: 'Main entrance cupboard.' }
    ]
};
export function loadData() {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw)
            return JSON.parse(raw);
    }
    catch { }
    saveData(seed);
    return structuredClone(seed);
}
export function saveData(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
}
export function exportData(data) {
    const blob = new Blob([JSON.stringify({ version: '8.0.0', exported: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cables-pro-v8-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
}
