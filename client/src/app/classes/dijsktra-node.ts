import { toString } from '@app/utils/coordinate-utils';
import { Coordinates } from '@common/coordinates';

export class DijkstraNode {
    neighbors: DijkstraNode[] = [];
    movementPointsFromStart: number = Infinity;
    previousNode: DijkstraNode | undefined;
    private _coordinates: Coordinates;
    private _movementCostToEnter: number;
    private _key: string;
    private _keyOfNodeToRight: string;
    private _keyOfNodeUnder: string;

    constructor(coordinates: Coordinates, movementCostToEnter: number) {
        this._coordinates = coordinates;
        this._movementCostToEnter = movementCostToEnter;
        this._key = toString(this._coordinates);
        this._keyOfNodeToRight = this._coordinates.x + 1 + ',' + this._coordinates.y;
        this._keyOfNodeUnder = this._coordinates.x + ',' + (this._coordinates.y + 1);
    }

    get coordinates(): Coordinates {
        return this._coordinates;
    }

    get x(): number {
        return this._coordinates.x;
    }

    get y(): number {
        return this._coordinates.y;
    }

    get key(): string {
        return this._key;
    }

    get keyOfNodeToRight(): string {
        return this._keyOfNodeToRight;
    }

    get keyOfNodeUnder(): string {
        return this._keyOfNodeUnder;
    }

    get movementCostToEnter(): number {
        return this._movementCostToEnter;
    }
}
