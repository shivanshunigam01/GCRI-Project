# GCRAI client demo logins (November 2026)

Run on **production** after deploy (uses `MONGODB_URI` from `backend/.env`):

```bash
cd /var/www/GCRI-Project/backend
git pull origin main
npm run seed:client-accounts
```

**MFA:** Super Admin and Organization Admin must complete MFA at login. Until an authenticator is enrolled, use **one recovery code** below (each code is single-use).

**Auditor:** Password login only — no MFA.

---

## Super Administrator (platform-wide)

| Field | Value |
|--------|--------|
| **Email** | `gcrai.superadmin@gcrai.com` |
| **Password** | `GcraiSuper#Client2026!` |
| **MFA recovery codes** | See seed script output or list below |

**Recovery codes (single-use):**

1. `GCRAI-SA-284910`
2. `GCRAI-SA-573829`
3. `GCRAI-SA-619304`
4. `GCRAI-SA-842751`
5. `GCRAI-SA-105638`
6. `GCRAI-SA-397264`
7. `GCRAI-SA-720485`
8. `GCRAI-SA-958173`

---

## Organization Admin

| Field | Value |
|--------|--------|
| **Email** | `gcrai.admin@gcrai.com` |
| **Password** | `GcraiAdmin#Client2026!` |
| **Organization** | First active company in DB (or “GitHub Enterprise Org”) |

**Recovery codes (single-use):**

1. `GCRAI-AD-381902`
2. `GCRAI-AD-647520`
3. `GCRAI-AD-829174`
4. `GCRAI-AD-150863`
5. `GCRAI-AD-492716`
6. `GCRAI-AD-760348`
7. `GCRAI-AD-918523`
8. `GCRAI-AD-235849`

---

## Auditor / Assessor

| Field | Value |
|--------|--------|
| **Email** | `gcrai.auditor@gcrai.com` |
| **Password** | `GcraiAuditor#Client2026!` |
| **MFA** | Not required |

---

## Login URL

Production frontend: **https://gcrai-fe.vercel.app/login**

After login, Super Admin can use **dashboard scope** and all admin routes. Change passwords after first client sign-in if required by your security policy.
