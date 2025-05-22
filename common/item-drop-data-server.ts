import { Coordinates } from "@common/coordinates";

export interface ItemDropDataToServer {
    gameId: string;
    itemIndex: number;
    itemPosition: Coordinates;
}