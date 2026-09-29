/**
 * Stand-in for @clerk/clerk-react in the design gallery only (aliased by
 * vite.visual.config.ts). The gallery renders the real screens without a Clerk
 * instance; add ?signedout=1 to see the signed-out variants.
 */
const signedIn = !new URLSearchParams(window.location.search).has("signedout");

export const useAuth = () => ({ isLoaded: true, isSignedIn: signedIn, getToken: async () => null });
export const useClerk = () => ({ signOut: async () => {} });
export const SignIn = () => <div className="gate-card">Sign in (Clerk)</div>;
export const SignUp = () => <div className="gate-card">Sign up (Clerk)</div>;
export const ClerkProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
