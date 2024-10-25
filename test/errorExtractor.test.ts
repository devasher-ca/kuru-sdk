import { extractErrorMessage } from '../src/utils/errorExtractor';

describe('Error Extractor Tests', () => {
    it('should handle nested ethers.js UNPREDICTABLE_GAS_LIMIT error', () => {
        const ethersError = {
            message: 'cannot estimate gas; transaction may fail or may require manual gas limit',
            code: 'UNPREDICTABLE_GAS_LIMIT',
            details: undefined,
            originalError: Error('cannot estimate gas; transaction may fail or may require manual gas limit'),
            error: {},
            reason: 'cannot estimate gas; transaction may fail or may require manual gas limit',
            tx: {
                data: '0x40e79b1b000000000000000000000000000000000000000000000000000000000000002800000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000001',
                to: {},
                from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
                type: 2,
                maxFeePerGas: { type: 'BigNumber', hex: '0x596836d0' },
                maxPriorityFeePerGas: { type: 'BigNumber', hex: '0x59682f00' },
                nonce: {},
                gasLimit: {},
                chainId: {}
            }
        };

        // Add the nested error structure that contains the actual error data
        ethersError.error = {
            reason: 'cannot estimate gas; transaction may fail or may require manual gas limit',
            code: 'UNPREDICTABLE_GAS_LIMIT',
            error: {
                reason: 'processing response error',
                code: 'SERVER_ERROR',
                body: '{"jsonrpc":"2.0","error":{"code":-32603,"message":"execution reverted","data":"0x0a5c4f1f"},"id":51}',
                error: {
                    code: -32603,
                    data: '0x0a5c4f1f'
                },
                requestBody: '{"method":"eth_estimateGas","params":[{"type":"0x2","maxFeePerGas":"0x596836d0","maxPriorityFeePerGas":"0x59682f00","from":"0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266","to":"0x9865f96cdf1a158c6d835a833cd668c17a58a083","data":"0x40e79b1b000000000000000000000000000000000000000000000000000000000000002800000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000001"}],"id":51,"jsonrpc":"2.0"}',
                requestMethod: 'POST',
                url: 'https://devnet1.monad.xyz/rpc/WbScX50z7Xsvsuk6UB1uMci8Ekee3PJqhBZ2RRx0xSjyqx9hjipbfMh60vr7a1gS'
            },
            method: 'estimateGas',
            transaction: {
                from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
                maxPriorityFeePerGas: { type: 'BigNumber', hex: '0x59682f00' },
                maxFeePerGas: { type: 'BigNumber', hex: '0x596836d0' },
                to: '0x9865F96Cdf1A158c6D835a833Cd668C17a58A083',
                data: '0x40e79b1b000000000000000000000000000000000000000000000000000000000000002800000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000001',
                type: 2,
                accessList: null
            }
        };

        const result = extractErrorMessage(ethersError);
        console.log('Nested Ethers.js UNPREDICTABLE_GAS_LIMIT Error Result:', JSON.stringify(result, null, 2));
        expect(result.message).toBe("Size Error");
        expect(result.code).toBe(-32603);
        expect(result.details).toBe('cannot estimate gas; transaction may fail or may require manual gas limit');
        expect(result.originalError).toBeDefined();
    });

    it('should extract Size Error from ethers.js error with error property', () => {
        const ethersError = {
            message: 'cannot estimate gas; transaction may fail or may require manual gas limit',
            code: 'UNPREDICTABLE_GAS_LIMIT',
            details: undefined,
            originalError: {
                reason: 'cannot estimate gas; transaction may fail or may require manual gas limit',
                code: 'UNPREDICTABLE_GAS_LIMIT',
                error: {
                    reason: 'processing response error',
                    code: 'SERVER_ERROR',
                    body: '{"jsonrpc":"2.0","error":{"code":-32603,"message":"execution reverted","data":"0x0a5c4f1f"},"id":51}',
                    error: {
                        code: -32603,
                        data: '0x0a5c4f1f'
                    },
                    requestBody: '{"method":"eth_estimateGas","params":[{"type":"0x2","maxFeePerGas":"0x596836d0","maxPriorityFeePerGas":"0x59682f00","from":"0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266","to":"0x9865f96cdf1a158c6d835a833cd668c17a58a083","data":"0x40e79b1b000000000000000000000000000000000000000000000000000000000000002800000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000001"}],"id":51,"jsonrpc":"2.0"}',
                    requestMethod: 'POST',
                    url: 'https://devnet1.monad.xyz/rpc/WbScX50z7Xsvsuk6UB1uMci8Ekee3PJqhBZ2RRx0xSjyqx9hjipbfMh60vr7a1gS'
                },
                method: 'estimateGas',
                transaction: {
                    from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
                    maxPriorityFeePerGas: { type: 'BigNumber', hex: '0x59682f00' },
                    maxFeePerGas: { type: 'BigNumber', hex: '0x596836d0' },
                    to: '0x9865F96Cdf1A158c6D835a833Cd668C17a58A083',
                    data: '0x40e79b1b000000000000000000000000000000000000000000000000000000000000002800000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000001',
                    type: 2,
                    accessList: null
                }
            }
        };

        const result = extractErrorMessage(ethersError);
        console.log('Ethers.js Complex Error Result:', JSON.stringify(result, null, 2));
        expect(result.message).toBe("Size Error");
        expect(result.code).toBe(-32603);
    });

    it('should extract Size Error for already parsed error', () => {
        const parsedError = {
            message: 'Size Error',
            code: -32603,
            details: 'cannot estimate gas; transaction may fail or may require manual gas limit',
            originalError: {
                reason: 'cannot estimate gas; transaction may fail or may require manual gas limit',
                code: 'UNPREDICTABLE_GAS_LIMIT',
                error: {
                    reason: 'processing response error',
                    code: 'SERVER_ERROR',
                    body: '{"jsonrpc":"2.0","error":{"code":-32603,"message":"execution reverted","data":"0x0a5c4f1f"},"id":46}',
                    error: {
                        code: -32603,
                        data: '0x0a5c4f1f'
                    }
                },
                method: 'estimateGas',
                transaction: {
                    from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
                    to: '0x9865F96Cdf1A158c6D835a833Cd668C17a58A083',
                    data: '0x40e79b1b000000000000000000000000000000000000000000000000000000000000002800000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000001',
                    accessList: null
                }
            }
        };

        const result = extractErrorMessage(parsedError);
        expect(result.message).toBe("Size Error");
        expect(result.code).toBe(-32603);
        expect(result.details).toBe('cannot estimate gas; transaction may fail or may require manual gas limit');
        console.log('Parsed Error Result:', JSON.stringify(result, null, 2));
    });

    it('should extract Size Error from unparsed ethers.js error', () => {
        const ethersError = {
            message: 'cannot estimate gas; transaction may fail or may require manual gas limit',
            code: 'UNPREDICTABLE_GAS_LIMIT',
            details: undefined,
            originalError: {
                reason: 'cannot estimate gas; transaction may fail or may require manual gas limit',
                code: 'UNPREDICTABLE_GAS_LIMIT',
                error: {
                    reason: 'processing response error',
                    code: 'SERVER_ERROR',
                    body: '{"jsonrpc":"2.0","error":{"code":-32603,"message":"execution reverted","data":"0x0a5c4f1f"},"id":51}',
                    error: {
                        code: -32603,
                        data: '0x0a5c4f1f'
                    }
                },
                method: 'estimateGas',
                transaction: {
                    from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
                    maxPriorityFeePerGas: {
                        type: 'BigNumber',
                        hex: '0x59682f00'
                    },
                    maxFeePerGas: {
                        type: 'BigNumber',
                        hex: '0x596836d0'
                    },
                    to: '0x9865F96Cdf1A158c6D835a833Cd668C17a58A083',
                    data: '0x40e79b1b000000000000000000000000000000000000000000000000000000000000002800000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000001',
                    type: 2,
                    accessList: null
                }
            }
        };

        const result = extractErrorMessage(ethersError);
        expect(result.message).toBe("Size Error");
        expect(result.code).toBe(-32603);
        expect(result.details).toBeDefined();
        console.log('Ethers Error Result:', JSON.stringify(result, null, 2));
    });

    // Test for RPC error format
    it('should handle direct RPC error format', () => {
        const rpcError = {
            code: -32603,
            message: "Internal JSON-RPC error.",
            data: {
                code: -32603,
                message: "execution reverted",
                data: "0x8199f5f3", // Slippage Exceeded
                cause: null
            }
        };

        const result = extractErrorMessage(rpcError);
        expect(result.message).toBe("Slippage Exceeded");
        expect(result.code).toBe(-32603);
        expect(result.details).toBe("execution reverted");
        console.log('RPC Error Result:', JSON.stringify(result, null, 2));
    });

    // Test for wrapped RPC error
    it('should handle wrapped RPC error', () => {
        const wrappedError = {
            error: {
                code: -32603,
                message: "Internal JSON-RPC error.",
                data: {
                    code: -32603,
                    message: "execution reverted",
                    data: "0x8199f5f3", // Slippage Exceeded
                    cause: null
                }
            }
        };

        const result = extractErrorMessage(wrappedError);
        expect(result.message).toBe("Slippage Exceeded");
        expect(result.code).toBe(-32603);
        expect(result.details).toBeDefined();
        console.log('Wrapped RPC Error Result:', JSON.stringify(result, null, 2));
    });

    // Test for invalid input
    it('should handle invalid input gracefully', () => {
        const invalidError = "not a valid error object";
        const result = extractErrorMessage(invalidError);
        expect(result.message).toBe("Failed to extract error message");
        expect(result.originalError).toBeDefined();
        console.log('Invalid Error Result:', JSON.stringify(result, null, 2));
    });

    // Test for null input
    it('should handle null input gracefully', () => {
        const result = extractErrorMessage(null);
        expect(result.message).toBe("Failed to extract error message");
        expect(result.originalError).toBe(null);
        console.log('Null Error Result:', JSON.stringify(result, null, 2));
    });
});
