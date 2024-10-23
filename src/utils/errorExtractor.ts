// errorExtractor.ts
import errorCodes from "./errors.json"

interface ParsedError {
    message: string;
    code?: string | number;
    details?: string;
    originalError?: any;
}

function searchForErrorCode(data: string): string | null {
    if (!data || typeof data !== 'string') return null;
    
    // Remove '0x' prefix if present
    const cleanedData = data.startsWith('0x') ? data.slice(2) : data;

    for (const [errorName, errorCode] of Object.entries(errorCodes)) {
        if (cleanedData.includes(errorCode)) {
            return errorName;
        }
    }
    return null;
}

export function extractErrorMessage(error: any): ParsedError {
    try {
        let jsonObj = typeof error === 'string' ? JSON.parse(error) : error;
        let parsedError: ParsedError = {
            message: "Unknown error",
            originalError: error
        };

        // Handle nested error structures
        if (jsonObj?.error?.data?.data) {
            const knownError = searchForErrorCode(jsonObj.error.data.data);
            if (knownError) {
                return {
                    message: knownError,
                    code: jsonObj.error.data.code,
                    details: jsonObj.error.data.data,
                    originalError: jsonObj
                };
            }
        }

        // Handle direct error data
        if (jsonObj?.error?.data) {
            if (typeof jsonObj.error.data === 'string') {
                const knownError = searchForErrorCode(jsonObj.error.data);
                if (knownError) {
                    return {
                        message: knownError,
                        code: jsonObj.error.code,
                        details: jsonObj.error.data,
                        originalError: jsonObj
                    };
                }
            } else if (jsonObj.error.data.message) {
                return {
                    message: jsonObj.error.data.message,
                    code: jsonObj.error.data.code,
                    details: JSON.stringify(jsonObj.error.data),
                    originalError: jsonObj
                };
            }
        }

        // Check for error message
        if (jsonObj?.error?.message) {
            return {
                message: jsonObj.error.message,
                code: jsonObj.error.code,
                details: jsonObj.reason || undefined,
                originalError: jsonObj
            };
        }

        // Check for reason
        if (jsonObj?.reason) {
            return {
                message: jsonObj.reason,
                code: jsonObj.code,
                originalError: jsonObj
            };
        }

        // Direct error string
        if (typeof jsonObj?.error === 'string') {
            return {
                message: jsonObj.error,
                originalError: jsonObj
            };
        }

        return parsedError;
    } catch (e) {
        console.error("Error while extracting error message:", e);
        return {
            message: "Failed to extract error message",
            details: e instanceof Error ? e.message : "Unknown error occurred",
            originalError: error
        };
    }
}
