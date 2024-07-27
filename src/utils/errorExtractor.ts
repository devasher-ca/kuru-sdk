export function extractErrorMessage(jsonString: string): Error {
    try {
        const jsonObj = JSON.parse(jsonString);
        const errorMessage = jsonObj.error.message;
        const match = errorMessage.match(/execution reverted: (.*)/);
        if (match && match[1]) {
            return new Error(match[1]);
        }
        return new Error("Unknown error");
    } catch (e) {
        console.error(e);
        return new Error("Invalid JSON string");
    }
}
