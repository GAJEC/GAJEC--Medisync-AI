// Staff portal controllers, split by page under ./staff/.
export { GetDashboard, GetReport, ListActivity } from './staff/reports.js';
export { ListAppointments, GetAppointment, CreateAppointment, UpdateAppointment } from './staff/appointments.js';
export { ListDoctors, CreateDoctor, UpdateDoctor, GetWeekSchedule, SetSchedule } from './staff/doctors.js';
export { ListPatients, GetPatient, CreatePatient, UpdatePatient, SearchPatientOptions } from './staff/patients.js';
export { ListDepartments, CreateDepartment, UpdateDepartment } from './staff/departments.js';
