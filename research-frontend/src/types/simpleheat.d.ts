declare module 'simpleheat' {
    interface SimpleHeatInstance {
        data(data: Array<[number, number, number?]>): SimpleHeatInstance;
        max(max: number): SimpleHeatInstance;
        add(point: [number, number, number?]): SimpleHeatInstance;
        clear(): SimpleHeatInstance;
        radius(r: number, blur?: number): SimpleHeatInstance;
        gradient(grad: Record<number, string>): SimpleHeatInstance;
        draw(minOpacity?: number): SimpleHeatInstance;
        resize(): SimpleHeatInstance;
    }

    function simpleheat(canvas: HTMLCanvasElement): SimpleHeatInstance;
    export = simpleheat;
}
