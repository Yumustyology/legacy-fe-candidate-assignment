export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};


export const validateOtp = (otp: string): boolean => {
  const otpRegex = /^\d{6}$/;
  return otpRegex.test(otp);
};


export const validateEmailWithMessage = (email: string): ValidationResult => {
  if (!email) {
    return { isValid: false, error: "Email is required" };
  }
  
  if (!validateEmail(email)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }
  
  return { isValid: true };
};

export const validateOtpWithMessage = (otp: string): ValidationResult => {
  if (!otp) {
    return { isValid: false, error: "Verification code is required" };
  }
  
  if (otp.length !== 6) {
    return { isValid: false, error: "Code must be exactly 6 digits" };
  }
  
  if (!validateOtp(otp)) {
    return { isValid: false, error: "Code must contain only numbers" };
  }
  
  return { isValid: true };
};

export const sanitizeOtpInput = (input: string): string => {
  const numericValue = input.replace(/\D/g, '');
  return numericValue.slice(0, 6);
};
