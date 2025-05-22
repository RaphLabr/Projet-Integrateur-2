import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameMapComponent } from '@app/components/game-map/game-map.component';
import { ITEM_DESCRIPTIONS } from '@app/constants/map-edition-constants';
import { GameMapEditionService } from '@app/services/game-map-edition-service/game-map-edition.service';
import { ItemType } from '@common/item-type';

describe('GameMapComponent', () => {
    let component: GameMapComponent;
    let fixture: ComponentFixture<GameMapComponent>;
    let httpMock: HttpTestingController;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            providers: [GameMapEditionService, provideHttpClient(), provideHttpClientTesting()],
            imports: [GameMapComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameMapComponent);
        component = fixture.componentInstance;
        httpMock = TestBed.inject(HttpTestingController);
        fixture.detectChanges();
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize itemDescriptions with ITEM_DESCRIPTIONS', () => {
        expect(component.itemDescriptions).toEqual(ITEM_DESCRIPTIONS);
    });

    describe('emitTileMouseDown', () => {
        it('should emit tileLeftMouseDown when left mouse button is pressed', () => {
            const tileCoordinates = { x: 0, y: 0 };
            const mouseEvent = new MouseEvent('mousedown', { buttons: 1 });
            spyOn(component.tileLeftMouseDown, 'emit');

            component.emitTileMouseDown(mouseEvent, tileCoordinates);

            expect(component.tileLeftMouseDown.emit).toHaveBeenCalledWith({ tileCoordinates, mouseEvent });
        });

        it('should emit tileRightMouseDown when right mouse button is pressed', () => {
            const tileCoordinates = { x: 1, y: 1 };

            const mouseEvent = new MouseEvent('mousedown', { buttons: 2 });
            spyOn(component.tileRightMouseDown, 'emit');

            component.emitTileMouseDown(mouseEvent, tileCoordinates);

            expect(component.tileRightMouseDown.emit).toHaveBeenCalledWith(tileCoordinates);
        });

        it('should not emit any event when mouse buttons is neither 1 nor 2', () => {
            const tileCoordinates = { x: 2, y: 2 };

            const mouseEvent = new MouseEvent('mousedown', { buttons: 4 });
            spyOn(component.tileLeftMouseDown, 'emit');
            spyOn(component.tileRightMouseDown, 'emit');

            component.emitTileMouseDown(mouseEvent, tileCoordinates);

            expect(component.tileLeftMouseDown.emit).not.toHaveBeenCalled();
            expect(component.tileRightMouseDown.emit).not.toHaveBeenCalled();
        });
    });

    describe('emitTileDrop', () => {
        it('should call preventDefault on the event and emit tileDrop', () => {
            const tileCoordinates = { x: 3, y: 3 };
            const mouseEvent = new MouseEvent('drop');
            spyOn(mouseEvent, 'preventDefault');
            spyOn(component.tileDrop, 'emit');

            component.emitTileDrop(mouseEvent, tileCoordinates);

            expect(mouseEvent.preventDefault).toHaveBeenCalled();
            expect(component.tileDrop.emit).toHaveBeenCalledWith(tileCoordinates);
        });
    });

    describe('emitTileEnter', () => {
        it('should emit tileEnter with the tile coordinates and the mouse event', () => {
            const tileCoordinates = { x: 4, y: 4 };
            const mouseEvent = new MouseEvent('mouseenter');
            spyOn(component.tileEnter, 'emit');

            component.emitTileEnter(mouseEvent, tileCoordinates);

            expect(component.tileEnter.emit).toHaveBeenCalledWith({ tileCoordinates, mouseEvent });
        });
    });

    describe('emitTileMouseUp', () => {
        it('should emit tileRightMouseUp when the right mouse button is released', () => {
            const tileCoordinates = { x: 5, y: 5 };

            const mouseEvent = new MouseEvent('mouseup', { button: 2 });
            spyOn(component.tileRightMouseUp, 'emit');

            component.emitTileMouseUp(mouseEvent, tileCoordinates);

            expect(component.tileRightMouseUp.emit).toHaveBeenCalledWith(tileCoordinates);
        });

        it('should not emit tileRightMouseUp when a button other than the right mouse button is released', () => {
            const tileCoordinates = { x: 5, y: 5 };

            const mouseEvent = new MouseEvent('mouseup', { button: 0 });
            spyOn(component.tileRightMouseUp, 'emit');

            component.emitTileMouseUp(mouseEvent, tileCoordinates);

            expect(component.tileRightMouseUp.emit).not.toHaveBeenCalled();
        });
    });

    describe('emitItemDragStart', () => {
        it('should emit itemDragStart with the provided item and tile coordinates', () => {
            const tileCoordinates = { x: 6, y: 6 };

            spyOn(component.itemDragStart, 'emit');

            component.emitItemDragStart(ItemType.Potion1, tileCoordinates);

            expect(component.itemDragStart.emit).toHaveBeenCalledWith({ item: ItemType.Potion1, tileCoordinates });
        });
    });

    describe('emitItemDragEnd', () => {
        it('should emit itemDragEnd', () => {
            spyOn(component.itemDragEnd, 'emit');

            component.emitItemDragEnd();

            expect(component.itemDragEnd.emit).toHaveBeenCalled();
        });
    });

    describe('emitTileMouseLeave', () => {
        it('should emit tileMouseLeave', () => {
            spyOn(component.tileMouseLeave, 'emit');

            component.emitTileMouseLeave();

            expect(component.tileMouseLeave.emit).toHaveBeenCalled();
        });
    });
});
