export type Role = 'admin' | 'worker';

export interface User {
    id: number;
    email: string;
    name: string;
    role: Role;
}

export interface Appointment {
    id: number;
    worker_id: number;
    client_name: string;
    client_phone?: string;
    service_name: string;
    price: number;
    date: string;
    time: string;
    status: 'pending' | 'completed';
    payment_method?: string;
    payment_proof?: string;
    worker_name?: string;
}

export interface Service {
    id: number;
    name: string;
    price: number;
}

export interface Loan {
    id: number;
    worker_id: number;
    amount: number;
    observation: string;
    date: string;
    worker_name?: string;
}

export interface WorkerStats {
    id: number;
    name: string;
    total_services: number;
    total_revenue: number;
    worker_share: number;
    spa_share: number;
    total_loans: number;
    net_worker_share: number;
}