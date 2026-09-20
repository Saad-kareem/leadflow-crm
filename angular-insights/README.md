# Lead Insights (Part D)

A single standalone Angular component showing a read-only summary of the CRM
pipeline: total leads, counts by status, and the top five leads by score.

```bash
npm install
npm start      # http://localhost:4200
npm run build
```

It needs the API running on `http://localhost:4000` (see `../api`) and signs in
with the same admin account as the React dashboard.

Authentication is the simplified version the brief allows: the same
`POST /api/auth/login` endpoint, with the JWT held in `sessionStorage` for the
tab's lifetime. Setup, architecture and the reasoning behind the rest of the
system are in the [root README](../README.md).

## Files

```
src/app/
  leadflow.ts            types for the slice of the API this page reads
  leadflow.service.ts    HttpClient wrapper: sign in, summary, meta
  app.component.ts       state as signals, status rows derived with computed()
  app.component.html     built-in control flow (@if / @for)
  app.component.css      component-scoped, sharing the dashboard's tokens
```
