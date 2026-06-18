# Auth is handled by a managed provider; role lives in our DB

Authentication (identity, sessions, tokens) is fully delegated to an external provider (Clerk, Auth0, or Supabase Auth). This system owns only the `role` field (`user` | `admin`) and the user profile, keyed to the provider's user ID. Admin access is determined by `role = admin` on our users table — there is no second auth stack or separate admin login. This avoids building and maintaining credential storage, password reset flows, and session management from scratch.
