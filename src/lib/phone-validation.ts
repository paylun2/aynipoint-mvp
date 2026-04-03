/**
 * Helper definitions and functions for International Phone Validation
 */

// Basic interface defining the structure from country_phone_rules table
export interface CountryPhoneRule {
    country_code: string;
    country_name: string;
    dial_code: string;
    phone_length: number;
    phone_regex: string;
    example_number: string;
}

/**
 * Cleans a phone number, removing spaces, dashes, parentheses and + signs.
 * Use this BEFORE saving to DB or sending to validation.
 * @param phone Raw phone string
 * @returns Cleaned numeric string
 */
export function cleanPhoneNumber(phone: string): string {
    if (!phone) return '';
    return phone.replace(/[\s\-\(\)\+]/g, '');
}

/**
 * Validates a cleaned phone number against a specific country's regex rules.
 * @param phone Cleaned numeric string
 * @param rule Country Phone Rule object from DB
 * @returns boolean indication of validity
 */
export function validatePhoneFormat(phone: string, rule: CountryPhoneRule): boolean {
    if (!phone || !rule || !rule.phone_regex) return false;
    
    try {
        const regex = new RegExp(rule.phone_regex);
        return regex.test(phone);
    } catch (e) {
        console.error(`Invalid regex for country ${rule.country_code}`, e);
        return false;
    }
}

/**
 * Generates a user-friendly error message based on the country rule.
 * @param rule Country Phone Rule object from DB
 * @returns Formatted error string
 */
export function getPhoneFormatErrorMessage(rule: CountryPhoneRule): string {
    if (!rule) return "Formato de teléfono inválido para este país.";
    return `En ${rule.country_name}, el número debe tener ${rule.phone_length} dígitos y usar un formato válido (Ej: ${rule.example_number}).`;
}
