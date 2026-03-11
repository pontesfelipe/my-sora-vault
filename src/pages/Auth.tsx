import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Watch } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable/index";

import { BetaBadge } from "@/components/BetaBadge";
import { PrivacyDialog } from "@/components/PrivacyDialog";
import { TermsDialog } from "@/components/TermsDialog";
import { MfaVerification } from "@/components/MfaVerification";
import { recordLoginAttempt } from "@/utils/loginTracking";
import heroImage from "@/assets/hero-collection.jpg";

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [showMfaVerification, setShowMfaVerification] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error("Please enter your email");
      return;
    }

    setSigningIn(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: resetEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Magic sign-in link sent! Check your inbox.");
        setShowPasswordReset(false);
        setResetEmail("");
      }
    } catch (error) {
      console.error("Magic link error:", error);
      toast.error("Failed to send sign-in link");
    } finally {
      setSigningIn(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    if (isSignUp) {
      if (!firstName.trim() || !lastName.trim()) {
        toast.error("Please enter your first and last name");
        return;
      }
      if (!acceptedTerms || !acceptedPrivacy) {
        toast.error("Please accept Terms & Conditions and Privacy Policy");
        return;
      }
    }

    setSigningIn(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
            },
          },
        });

        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Account created! You can now sign in.");
          setIsSignUp(false);
          setAcceptedTerms(false);
          setAcceptedPrivacy(false);
          setFirstName("");
          setLastName("");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast.error(error.message);
          // Record failed login attempt - we need to find the user ID or skip recording
          // For failed logins, we can't record without user_id due to RLS
        } else if (data.session && data.user) {
          // Record successful login
          recordLoginAttempt(data.user.id, true);
          
          // Check if MFA is required
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          const verifiedFactors = factorsData?.totp.filter(f => f.status === 'verified') || [];
          
          if (verifiedFactors.length > 0) {
            // User has MFA enabled, show verification screen
            setShowMfaVerification(true);
          }
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast.error("Authentication failed");
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (error) {
        toast.error(error.message);
      }
    } catch (error) {
      console.error("Sign in error:", error);
      toast.error("Failed to sign in");
    } finally {
      setSigningIn(false);
    }
  };

  const handleAppleSignIn = async () => {
    setSigningIn(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
      });

      if (error) {
        toast.error(error.message);
      }
    } catch (error) {
      console.error("Apple sign in error:", error);
      toast.error("Failed to sign in with Apple");
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show MFA verification screen
  if (showMfaVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/10 p-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-3 mb-4">
               <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-xl font-bold text-accent shadow-lg shadow-accent/20">
                LV
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-textMain">Luxury Vault</h1>
                <BetaBadge />
              </div>
            </div>
          </div>
          <MfaVerification
            onSuccess={() => {
              setShowMfaVerification(false);
              navigate("/");
            }}
            onCancel={async () => {
              await supabase.auth.signOut();
              setShowMfaVerification(false);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Hero Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img 
          src={heroImage} 
          alt="Luxury collection" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-background/20" />
        
        {/* Hero Content */}
        <div className="relative z-10 flex flex-col justify-end p-12 pb-16">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 backdrop-blur-sm text-lg font-bold text-accent shadow-lg">
                LV
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Luxury Vault</h1>
            </div>
            
            <p className="text-xl text-foreground/80 max-w-md leading-relaxed">
              The premier platform for managing your luxury watch collection with precision and elegance.
            </p>
            
            <div className="flex gap-4 pt-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-foreground/10 backdrop-blur-sm">
                <Watch className="h-4 w-4 text-accent" />
                <span className="text-sm text-foreground/90">Watches</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 p-4 lg:p-8">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-xl font-bold text-accent shadow-lg shadow-accent/20">
                LV
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-textMain">Luxury Vault</h1>
                <BetaBadge />
              </div>
            </div>
            <p className="text-center text-textMuted max-w-md text-sm">
              Your premium watch collection studio
            </p>
            
            {/* Mobile collection type badge */}
            <div className="flex gap-2 mt-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10">
                <Watch className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs text-foreground/80">Watches</span>
              </div>
            </div>
          </div>
          
          {/* Desktop header */}
          <div className="hidden lg:block mb-8">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
              <BetaBadge />
            </div>
            <p className="text-muted-foreground">
              Sign in to access your collection
            </p>
          </div>
        
        <div className="w-full">
          <div>
            <Card>
              <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-bold">
                  {showPasswordReset ? "Email Sign-In Link" : isSignUp ? "Create Account" : "Sign In"}
                </CardTitle>
                <CardDescription>
                  {showPasswordReset 
                    ? "We'll email you a magic link that logs you in instantly"
                    : isSignUp 
                    ? "Create an account to start tracking your watch collection" 
                    : "Sign in to access your collection"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {showPasswordReset ? (
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="you@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        disabled={signingIn}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={signingIn}
                      className="w-full"
                      size="lg"
                    >
                      {signingIn ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                          Sending...
                        </>
                      ) : (
                        "Send Sign-In Link"
                      )}
                    </Button>
                    <div className="text-center">
                      <Button
                        variant="link"
                        onClick={() => setShowPasswordReset(false)}
                        disabled={signingIn}
                        className="text-sm"
                      >
                        Back to sign in
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleEmailAuth} className="space-y-4">
                    {isSignUp && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            type="text"
                            placeholder="John"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            disabled={signingIn}
                            maxLength={50}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            type="text"
                            placeholder="Doe"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            disabled={signingIn}
                            maxLength={50}
                          />
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={signingIn}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        {!isSignUp && (
                          <Button
                            variant="link"
                            onClick={() => setShowPasswordReset(true)}
                            className="text-xs h-auto p-0"
                            type="button"
                          >
                            Email me a sign-in link
                          </Button>
                        )}
                      </div>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={signingIn}
                      />
                    </div>
                    {isSignUp && (
                      <div className="space-y-3">
                        <div className="flex items-start space-x-2">
                          <Checkbox
                            id="terms"
                            checked={acceptedTerms}
                            onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                            disabled={signingIn}
                          />
                          <label
                            htmlFor="terms"
                            className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            I accept the{" "}
                            <button
                              type="button"
                              onClick={() => setTermsOpen(true)}
                              className="text-primary underline hover:text-primary/80"
                            >
                              Terms & Conditions
                            </button>{" "}
                            (required)
                          </label>
                        </div>
                        <div className="flex items-start space-x-2">
                          <Checkbox
                            id="privacy"
                            checked={acceptedPrivacy}
                            onCheckedChange={(checked) => setAcceptedPrivacy(checked as boolean)}
                            disabled={signingIn}
                          />
                          <label
                            htmlFor="privacy"
                            className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            I accept the{" "}
                            <button
                              type="button"
                              onClick={() => setPrivacyOpen(true)}
                              className="text-primary underline hover:text-primary/80"
                            >
                              Privacy Policy
                            </button>{" "}
                            (required)
                          </label>
                        </div>
                      </div>
                    )}
                    <Button
                      type="submit"
                      disabled={signingIn}
                      className="w-full"
                      size="lg"
                    >
                      {signingIn ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                          {isSignUp ? "Creating account..." : "Signing in..."}
                        </>
                      ) : (
                        isSignUp ? "Create Account" : "Sign In"
                      )}
                    </Button>
                  </form>
                )}

                {!showPasswordReset && (
                  <div className="text-center">
                    <Button
                      variant="link"
                      onClick={() => setIsSignUp(!isSignUp)}
                      disabled={signingIn}
                      className="text-sm"
                    >
                      {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                    </Button>
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button
                  onClick={handleGoogleSignIn}
                  disabled={signingIn}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>

                <Button
                  onClick={handleAppleSignIn}
                  disabled={signingIn}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Continue with Apple
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  By continuing, you agree to our terms of service
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <TermsDialog open={termsOpen} onOpenChange={setTermsOpen} />
        <PrivacyDialog open={privacyOpen} onOpenChange={setPrivacyOpen} />
        </div>
      </div>
    </div>
  );
}
