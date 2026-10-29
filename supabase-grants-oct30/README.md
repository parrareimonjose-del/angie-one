# Supabase: cambio del 30-oct-2026 (GRANT explícitos)

Auditoría (21-oct-2026): Angie One NO usa Supabase. Datos en Cloudflare Workers + KV. 0 tablas, 0 migraciones. Nada que aplicar.

Regla para el futuro, si alguna vez se adopta Supabase:
- Cada migración que cree una tabla incluye sus GRANT explícitos (anon/authenticated solo si la app los necesita, más RLS).
- Las tablas sensibles (pagos, ledger, auditoría, datos, salud, configuración, panel de fundador) son solo service_role. Lo decide Jose.
- Nada se aplica en producción sin el toque de Jose.
