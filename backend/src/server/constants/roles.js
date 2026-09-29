// Central place for the assignment's five roles, so every module (routes,
// middleware, repositories) agrees on the same spelling and grouping.
const STAFF_ROLES = ['doctor', 'nurse', 'clinic'];
const ALL_ROLES = [...STAFF_ROLES, 'patient', 'unauthorized'];

module.exports = { STAFF_ROLES, ALL_ROLES };
