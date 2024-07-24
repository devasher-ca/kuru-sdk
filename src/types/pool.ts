export interface Pool {
    baseToken: string,
    quoteToken: string,
    orderbook: string,
    takerFeeBps: number,
}

export interface Route {
    path: Pool[],
    tokenIn: string,
    tokenOut: string,
}

export interface RouteOutput {
    route: Route,
    isBuy: boolean[],
    nativeSend: boolean[],
    output: number,
    feeInBase: number
}
