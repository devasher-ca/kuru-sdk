import errorCodes from "./errors.json"

function searchForErrorCode(data: string): string | null {
    // Remove '0x' prefix if present
    const cleanedData = data.startsWith('0x') ? data.slice(2) : data;

    for (const [errorName, errorCode] of Object.entries(errorCodes)) {
        if (cleanedData.includes(errorCode)) {
            return errorName;
        }
    }
    return null;
}

function decodeErrorData(data: string): string | null {
    try {
        // Remove '0x' prefix if present
        const cleanedData = data.startsWith('0x') ? data.slice(2) : data;
        const decodedString = Buffer.from(cleanedData, 'hex').toString('utf8');
        const match = decodedString.match(/(?:execution reverted: )?(.*)/);
        return match && match[1] ? match[1] : null;
    } catch (e) {
        return null;
    }
}

export function extractErrorMessage(error: any): Error {
    try {
        let jsonObj = typeof error === 'string' ? JSON.parse(error) : error;

        // Check for nested error structures
        if (jsonObj.error && typeof jsonObj.error === 'object') {
            if (jsonObj.error.body) {
                try {
                    const bodyError = JSON.parse(jsonObj.error.body);
                    if (bodyError.error && bodyError.error.data) {
                        const knownError = searchForErrorCode(bodyError.error.data);
                        if (knownError) return new Error(knownError);

                        const decodedError = decodeErrorData(bodyError.error.data);
                        if (decodedError) return new Error(decodedError);
                    }
                } catch (e) {
                    // If parsing fails, continue with other checks
                }
            }

            if (jsonObj.error.data) {
                const knownError = searchForErrorCode(jsonObj.error.data);
                if (knownError) return new Error(knownError);

                const decodedError = decodeErrorData(jsonObj.error.data);
                if (decodedError) return new Error(decodedError);
            }

            if (jsonObj.error.message) {
                return new Error(jsonObj.error.message);
            }
        }

        // Check for other common error locations
        if (jsonObj.reason) {
            return new Error(jsonObj.reason);
        }

        if (typeof jsonObj.error === 'string') {
            return new Error(jsonObj.error);
        }

        return new Error("Unknown error");
    } catch (e) {
        console.error("Error while extracting error message:", e);
        return new Error("Failed to extract error message");
    }
}
