interface ErrorCode {
    [key: string]: string;
}

const errorCodes: ErrorCode = require('./errors.json');

export function extractErrorMessage(jsonString: string): Error {
    try {
        const jsonObj = JSON.parse(jsonString);
        let errorData: string | undefined;

        // Check different possible error structures
        if (jsonObj.error && jsonObj.error.data) {
            errorData = jsonObj.error.data;
        } else if (jsonObj.data) {
            errorData = jsonObj.data;
        }

        if (errorData) {
            // Remove '0x' prefix if present
            const cleanedErrorData = errorData.startsWith('0x') ? errorData.slice(2) : errorData;

            // Check if the error data matches any known error code
            for (const [errorName, errorCode] of Object.entries(errorCodes)) {
                if (cleanedErrorData.includes(errorCode)) {
                    return new Error(errorName);
                }
            }

            // If no match found, try to extract a custom error message
            const decodedString = Buffer.from(cleanedErrorData, 'hex').toString('utf8');
            const match = decodedString.match(/(?:execution reverted: )?(.*)/);
            if (match && match[1]) {
                return new Error(match[1]);
            }
        }

        // If all else fails, check for a generic error message
        if (jsonObj.error && jsonObj.error.message) {
            return new Error(jsonObj.error.message);
        }

        return new Error("Unknown error");
    } catch (e) {
        console.error(e);
        return new Error("Invalid JSON string or unexpected error format");
    }
}
