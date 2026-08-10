# Security Spec

## Data Invariants
1. A user document cannot be modified by anyone other than the user themselves.
2. An admin can do anything.
3. Requests can only be created by authenticated users.
4. Requests can only be modified (approved/rejected) by ADMINs or APPROVERs who are authorized for that project.
5. Projects and Activities can only be modified by ADMINs.
6. A request cannot be modified if its status is not PENDING, unless the user is an ADMIN.

## The Dirty Dozen Payloads
1. Create a user document with a different UID than `request.auth.uid`.
2. Update another user's profile.
3. Update own role to "ADMIN".
4. Create a project without being an ADMIN.
5. Create a request with an amount of -500.
6. Create a request for a project that doesn't exist.
7. Approve a request without being an ADMIN or authorized APPROVER.
8. Update a request that is already APPROVED.
9. Inject a 1MB string into a request's reason.
10. Query for another user's requests.
11. Create a sub-activity without an ADMIN role.
12. Modify a project's allocatedBudget directly without an associated approved request (sync violation).
