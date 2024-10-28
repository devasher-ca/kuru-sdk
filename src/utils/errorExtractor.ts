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

function parseJsonBody(body: string): any {
    try {
        return JSON.parse(body);
    } catch (e) {
        return null;
    }
}

export function extractErrorMessage(error: any): ParsedError {
    try {
        // Handle null or undefined input
        if (!error) {
            return {
                message: "Failed to extract error message",
                originalError: error
            };
        }

        // Don't parse if already an object
        let jsonObj = error;
        if (typeof error === 'string') {
            try {
                jsonObj = JSON.parse(error);
            } catch (e) {
                return {
                    message: "Failed to extract error message",
                    details: e instanceof Error ? e.message : "Unknown error occurred",
                    originalError: error
                };
            }
        }

        // NEW CASE: Handle nested ethers error structure with error.error
        if (jsonObj?.error?.error?.body) {
            const bodyError = parseJsonBody(jsonObj.error.error.body);
            if (bodyError?.error?.data) {
                const knownError = searchForErrorCode(bodyError.error.data);
                if (knownError) {
                    return {
                        message: knownError,
                        code: bodyError.error.code,
                        details: jsonObj.reason || jsonObj.message,
                        originalError: jsonObj
                    };
                }
            }
        }

        // Case: Handle UNPREDICTABLE_GAS_LIMIT error with nested error.error structure
        if (jsonObj?.code === 'UNPREDICTABLE_GAS_LIMIT' && jsonObj?.error?.error?.body) {
            const bodyError = parseJsonBody(jsonObj.error.error.body);
            if (bodyError?.error?.data) {
                const knownError = searchForErrorCode(bodyError.error.data);
                if (knownError) {
                    return {
                        message: knownError,
                        code: bodyError.error.code,
                        details: jsonObj.reason || jsonObj.message,
                        originalError: jsonObj
                    };
                }
            }
            // Return unpredictable gas limit error if no known error found
            return {
                message: jsonObj.message || jsonObj.reason,
                code: jsonObj.code,
                details: jsonObj.error?.reason || jsonObj.error?.message,
                originalError: jsonObj
            };
        }

        // Case: Handle Privy wallet error format
        if (jsonObj?.body && jsonObj?.error?.data) {
            const bodyError = parseJsonBody(jsonObj.body);
            if (bodyError?.error?.data) {
                const knownError = searchForErrorCode(bodyError.error.data);
                if (knownError) {
                    return {
                        message: knownError,
                        code: bodyError.error.code,
                        details: bodyError.error.message,
                        originalError: jsonObj
                    };
                }
            }
            // Try direct error data if body parsing fails
            const knownError = searchForErrorCode(jsonObj.error.data);
            if (knownError) {
                return {
                    message: knownError,
                    code: jsonObj.error.code,
                    details: bodyError?.error?.message || "Unknown error",
                    originalError: jsonObj
                };
            }
        }

        // Case 1: Already parsed error with known error code
        if (jsonObj?.message && jsonObj?.originalError?.error?.body) {
            const bodyError = parseJsonBody(jsonObj.originalError.error.body);
            if (bodyError?.error?.data) {
                const knownError = searchForErrorCode(bodyError.error.data);
                if (knownError) {
                    return {
                        message: knownError,
                        code: bodyError.error.code,
                        details: jsonObj.originalError.reason || jsonObj.details,
                        originalError: jsonObj.originalError
                    };
                }
            }
            return jsonObj as ParsedError;
        }

        // Case 2: Nested error structure from ethers.js
        if (jsonObj?.originalError?.error?.body) {
            const bodyError = parseJsonBody(jsonObj.originalError.error.body);
            if (bodyError?.error?.data) {
                const knownError = searchForErrorCode(bodyError.error.data);
                if (knownError) {
                    return {
                        message: knownError,
                        code: bodyError.error.code,
                        details: jsonObj.reason || jsonObj.message,
                        originalError: jsonObj
                    };
                }
            }
        }

        // Case 3: Direct error body structure
        if (jsonObj?.error?.body) {
            const bodyError = parseJsonBody(jsonObj.error.body);
            if (bodyError?.error?.data) {
                const knownError = searchForErrorCode(bodyError.error.data);
                if (knownError) {
                    return {
                        message: knownError,
                        code: bodyError.error.code,
                        details: jsonObj.reason || jsonObj.message,
                        originalError: jsonObj
                    };
                }
            }
        }

        // Case 4: Wrapped RPC error
        if (jsonObj?.error?.data?.data) {
            const knownError = searchForErrorCode(jsonObj.error.data.data);
            if (knownError) {
                return {
                    message: knownError,
                    code: jsonObj.error.data.code,
                    details: jsonObj.error.data.message,
                    originalError: jsonObj
                };
            }
        }

        // Case 5: Direct RPC error
        if (jsonObj?.data?.data) {
            const knownError = searchForErrorCode(jsonObj.data.data);
            if (knownError) {
                return {
                    message: knownError,
                    code: jsonObj.data.code,
                    details: jsonObj.data.message,
                    originalError: jsonObj
                };
            }
        }

        // Case 6: Check error.data directly if it has a known error code
        if (jsonObj?.error?.data) {
            const knownError = searchForErrorCode(jsonObj.error.data);
            if (knownError) {
                return {
                    message: knownError,
                    code: jsonObj.error.code,
                    details: jsonObj.error.message,
                    originalError: jsonObj
                };
            }
        }

        // Fallback to original message/reason
        return {
            message: jsonObj.reason || jsonObj.message || "Unknown error",
            code: jsonObj.code,
            details: jsonObj.details,
            originalError: jsonObj
        };
    } catch (e) {
        console.error("Error while extracting error message:", e);
        return {
            message: "Failed to extract error message",
            details: e instanceof Error ? e.message : "Unknown error occurred",
            originalError: error
        };
    }
}
