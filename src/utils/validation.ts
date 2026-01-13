/**
 * Validation utilities for list items
 * Ensures consistent validation across Categories, Skills, and Challenges
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates that a name is not empty (after trimming)
 */
export function validateName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: "Name cannot be empty",
    };
  }
  if (trimmed.length > 200) {
    return {
      isValid: false,
      error: "Name must be 200 characters or less",
    };
  }
  return { isValid: true };
}

/**
 * Validates that a description is within length limits (if provided)
 */
export function validateDescription(description: string | undefined): ValidationResult {
  if (!description) {
    return { isValid: true }; // Description is optional
  }
  if (description.length > 2000) {
    return {
      isValid: false,
      error: "Description must be 2000 characters or less",
    };
  }
  return { isValid: true };
}

/**
 * Validates XP reward value
 */
export function validateXPReward(xpReward: number): ValidationResult {
  if (!Number.isInteger(xpReward) || xpReward < 1) {
    return {
      isValid: false,
      error: "XP reward must be a positive integer",
    };
  }
  if (xpReward > 10000) {
    return {
      isValid: false,
      error: "XP reward cannot exceed 10,000",
    };
  }
  return { isValid: true };
}

/**
 * Validates a category, skill, or challenge before creation/update
 */
export function validateItem(data: {
  name: string;
  description?: string;
  xpReward?: number;
}): ValidationResult {
  const nameValidation = validateName(data.name);
  if (!nameValidation.isValid) {
    return nameValidation;
  }

  const descriptionValidation = validateDescription(data.description);
  if (!descriptionValidation.isValid) {
    return descriptionValidation;
  }

  if (data.xpReward !== undefined) {
    const xpValidation = validateXPReward(data.xpReward);
    if (!xpValidation.isValid) {
      return xpValidation;
    }
  }

  return { isValid: true };
}

/**
 * Provides user-friendly feedback for validation errors
 */
export function getValidationFeedback(result: ValidationResult): string | null {
  return result.error || null;
}
