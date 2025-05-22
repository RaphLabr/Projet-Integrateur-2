import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MapTile } from '@app/classes/map-tile';
import { ITEM_DESCRIPTIONS } from '@app/constants/map-edition-constants';
import * as mouseConstants from '@app/constants/mouse-button-constants';
import { DeepReadonly } from '@app/types/deep-read-only';
import { Coordinates } from '@common/coordinates';
import { ItemType } from '@common/item-type';
import { MapSize } from '@common/map-size';

@Component({
    selector: 'app-game-map',
    imports: [CommonModule],
    templateUrl: './game-map.component.html',
    styleUrls: ['./game-map.component.scss'],
})
export class GameMapComponent {
    @Input() size: MapSize = MapSize.Small;
    @Input() gameMap: DeepReadonly<MapTile[][]>;
    @Input() isInGamePage: boolean = false;

    @Output() tileLeftMouseDown: EventEmitter<{ tileCoordinates: Coordinates; mouseEvent: MouseEvent }> = new EventEmitter<{
        tileCoordinates: Coordinates;
        mouseEvent: MouseEvent;
    }>();
    @Output() tileRightMouseDown: EventEmitter<Coordinates> = new EventEmitter<Coordinates>();
    @Output() tileDrop: EventEmitter<Coordinates> = new EventEmitter<Coordinates>();
    @Output() tileEnter: EventEmitter<{ tileCoordinates: Coordinates; mouseEvent: MouseEvent }> = new EventEmitter<{
        tileCoordinates: Coordinates;
        mouseEvent: MouseEvent;
    }>();
    @Output() itemDragStart: EventEmitter<{ item: ItemType; tileCoordinates: Coordinates }> = new EventEmitter<{
        item: ItemType;
        tileCoordinates: Coordinates;
    }>();
    @Output() itemDragEnd: EventEmitter<void> = new EventEmitter<void>();
    @Output() tileRightMouseUp: EventEmitter<Coordinates> = new EventEmitter<Coordinates>();
    @Output() tileMouseLeave: EventEmitter<void> = new EventEmitter<void>();
    readonly itemDescriptions: Map<ItemType, string> = ITEM_DESCRIPTIONS;

    emitTileMouseDown(mouseEvent: MouseEvent, tileCoordinates: Coordinates): void {
        if (mouseEvent.buttons === mouseConstants.MOUSE_LEFT_CLICK) {
            this.tileLeftMouseDown.emit({ tileCoordinates, mouseEvent });
        } else if (mouseEvent.buttons === mouseConstants.MOUSE_RIGHT_CLICK) {
            this.tileRightMouseDown.emit(tileCoordinates);
        }
    }

    emitTileDrop(mouseEvent: MouseEvent, tileCoordinates: Coordinates): void {
        mouseEvent.preventDefault();
        this.tileDrop.emit(tileCoordinates);
    }

    emitTileEnter(mouseEvent: MouseEvent, tileCoordinates: Coordinates): void {
        this.tileEnter.emit({ tileCoordinates, mouseEvent });
    }

    emitTileMouseUp(mouseEvent: MouseEvent, tileCoordinates: Coordinates): void {
        if (mouseEvent.button === mouseConstants.MOUSE_RIGHT_CLICK) {
            this.tileRightMouseUp.emit(tileCoordinates);
        }
    }

    emitItemDragStart(item: ItemType, tileCoordinates: Coordinates): void {
        this.itemDragStart.emit({ item, tileCoordinates });
    }

    emitItemDragEnd(): void {
        this.itemDragEnd.emit();
    }
    emitTileMouseLeave(): void {
        this.tileMouseLeave.emit();
    }
}
