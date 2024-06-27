export interface Pool {
    baseToken: string,
    quoteToken: string,
    orderbook: string,
}

export interface Route {
    path: Pool[],
    tokenIn: string,
    tokenOut: string,
}

export interface RouteOutput {
    route: Route,
    isBuy: boolean[],
    output: number,
}
