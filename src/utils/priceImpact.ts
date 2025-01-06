import { RouteOutput } from "../types/pool";

export function calculatePriceImpact(routeOutputForUser: RouteOutput, routeOutputForSingle: RouteOutput, size: number) {
    const price = 1 / Number(routeOutputForSingle.output);
    const freshPrice = Number(size) / Number(routeOutputForUser.output);
    const priceImpact = ((100*freshPrice/price) - 100);
    return priceImpact.toFixed(2);
}