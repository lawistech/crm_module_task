import { Contact } from "./contact.model";

export interface Call {
    id: string;
    contact_id: string;
    contact?: Contact;  // Make sure this is properly defined
    user_id?: string;
    scheduled_at: string;
    completed_at?: string;
    duration_minutes?: number;
    method?: string;
    status: string; 
    reason: string;
    notes?: string;
    recording_url?: string;
    follow_up_date?: string;
    created_at?: string;
    updated_at?: string;
}