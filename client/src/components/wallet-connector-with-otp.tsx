import { FC, FormEventHandler, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet } from "lucide-react";
import {
  useConnectWithOtp,
  useDynamicContext,
  useIsLoggedIn,
  useMfa,
} from "@dynamic-labs/sdk-react-core";
import { useToast } from "@/hooks/use-toast";
import {
  validateEmail,
  validateOtp,
  sanitizeOtpInput,
  validateEmailWithMessage,
  validateOtpWithMessage,
} from "@/lib/form-utils";
import { MfaManager } from "./mfa-manager-headless";
import MfaAuthenticator from "./mfa-authenticator";

const WalletConnectorWithOTP: FC = () => {
  const { connectWithEmail, verifyOneTimePassword } = useConnectWithOtp();
  const { userWithMissingInfo } = useDynamicContext();
  const { getUserDevices } = useMfa();
  const isLoggedIn = useIsLoggedIn();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"email" | "otp" | "mfa-setup" | "mfa-auth">(
    "email"
  );
  const [error, setError] = useState<string | null>(null);
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  useEffect(() => {
    const checkUserStatus = async () => {
      if (userWithMissingInfo?.scope?.includes("requiresAdditionalAuth")) {
        setRequiresMfa(true);
        try {
          const devices = await getUserDevices();

          if (devices.length === 0) {
            setStep("mfa-setup");
          } else {
            setStep("mfa-auth");
          }
        } catch (err) {
          setStep("mfa-setup");
        }
        return;
      }
    };

    if (step === "otp" && userWithMissingInfo) {
      checkUserStatus();
    }
  }, [userWithMissingInfo, step, getUserDevices]);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setError(null);

    const validation = validateEmailWithMessage(value);
    setEmailError(validation.isValid ? null : validation.error || null);
  };

  const handleOtpChange = (value: string) => {
    const sanitizedValue = sanitizeOtpInput(value);
    setOtp(sanitizedValue);
    setError(null);

    if (sanitizedValue) {
      const validation = validateOtpWithMessage(sanitizedValue);
      setOtpError(validation.isValid ? null : validation.error || null);
    } else {
      setOtpError(null);
    }
  };

  if (isLoggedIn && !requiresMfa) {
    return null;
  }

  const onSubmitEmailHandler: FormEventHandler<HTMLFormElement> = async (
    event
  ) => {
    event.preventDefault();

    if (!email || !validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setEmailError(null);
      await connectWithEmail(email);
      setStep("otp");

      toast({
        title: "Verification code sent!",
        description: `We've sent a verification code to ${email}. Please check your inbox.`,
        variant: "default",
      });
    } catch (err: any) {
      const errorMessage =
        err?.message ||
        err?.toString() ||
        "An error occurred while sending the verification email. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitOtpHandler: FormEventHandler<HTMLFormElement> = async (
    event
  ) => {
    event.preventDefault();

    if (!otp || !validateOtp(otp)) {
      setOtpError("Please enter a valid 6-digit code");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setOtpError(null);
      await verifyOneTimePassword(otp);
    } catch (err: any) {
      console.log(err);
      const errorMessage =
        err?.message ||
        err?.toString() ||
        "Invalid verification code. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Wallet className="text-primary-foreground text-2xl" size={32} />
            </div>
            <h2 className="text-2xl font-bold">Sign in with Dynamic</h2>
            <p className="text-muted-foreground mt-2">
              Use your email and one-time code
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {step === "email" && (
            <form onSubmit={onSubmitEmailHandler} className="space-y-4">
              <div className="space-y-2">
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="Enter your email"
                  className={`text-black w-full px-4 py-2 border rounded-lg ${
                    emailError
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-300 focus:border-blue-500"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  required
                />
                {emailError && (
                  <p className="text-sm text-red-600">{emailError}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !email || !!emailError}
                data-testid="button-connect-dynamic-email"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  "Send code"
                )}
              </Button>
            </form>
          )}

          {step === "otp" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">
                  Enter verification code
                </h3>
                <p className="text-sm text-muted-foreground">
                  We've sent a 6-digit code to your email
                </p>
              </div>
              <form onSubmit={onSubmitOtpHandler} className="space-y-4">
                <div className="space-y-2">
                  <input
                    type="text"
                    name="otp"
                    value={otp}
                    onChange={(e) => handleOtpChange(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className={`text-black w-full px-4 py-2 border rounded-lg text-center tracking-widest text-lg font-mono ${
                      otpError
                        ? "border-red-500 focus:border-red-500"
                        : "border-gray-300 focus:border-blue-500"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    required
                    maxLength={6}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                  {otpError && (
                    <p className="text-sm text-red-600 text-center">
                      {otpError}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !otp || otp.length !== 6 || !!otpError}
                  data-testid="button-connect-dynamic-otp"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify code"
                  )}
                </Button>
              </form>
            </div>
          )}

          {step === "mfa-setup" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">
                  Multi-Factor Authentication Setup
                </h3>
                <p className="text-sm text-muted-foreground">
                  Set up MFA to secure your account
                </p>
              </div>
              <MfaManager />
            </div>
          )}

          {step === "mfa-auth" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">
                  Multi-Factor Authentication Required
                </h3>
                <p className="text-sm text-muted-foreground">
                  Please authenticate using your registered device
                </p>
              </div>
              <MfaAuthenticator
                onSuccess={() => {
                  setRequiresMfa(false);
                  toast({
                    title: "Authentication Complete",
                    description: "You have been successfully authenticated.",
                    variant: "default",
                  });
                }}
                onError={(error) => {
                  setError(error);
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WalletConnectorWithOTP;
