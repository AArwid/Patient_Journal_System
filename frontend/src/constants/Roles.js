export const ROLES = {
    DOCTOR: 'doctor',
    NURSE: 'nurse',
    CLINIC: 'clinic',
    PATIENT: 'patient',
    UNAUTHORIZED: 'unauthorized',
};

export const STAFF_ROLES = [ROLES.DOCTOR, ROLES.NURSE, ROLES.CLINIC];

export const ROLE_LABELS = {
    [ROLES.DOCTOR]: 'Doctor',
    [ROLES.NURSE]: 'Nurse / Paramedic',
    [ROLES.CLINIC]: 'Medical Clinic',
    [ROLES.PATIENT]: 'Patient',
    [ROLES.UNAUTHORIZED]: 'Unauthorized',
};

// Mirrors backend/src/server/db/seed.js. Picking a role only prefills the email -
// the API authenticates the credentials and decides the real role.
export const DEMO_EMAILS = {
    [ROLES.DOCTOR]: 'doctor@example.com',
    [ROLES.NURSE]: 'nurse@example.com',
    [ROLES.CLINIC]: 'clinic@example.com',
    [ROLES.PATIENT]: 'patient@example.com',
    [ROLES.UNAUTHORIZED]: 'unauthorized@example.com',
};