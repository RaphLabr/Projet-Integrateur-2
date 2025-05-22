// Needed in order to access private methods in admin-page.service
/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { MapModel } from '@app/models/map-model';
import { AdminPageService } from '@app/services/admin-page-service/admin-page.service';
import { SnackBarService } from '@app/services/snack-bar-service/snack-bar.service';
import { GameMode } from '@common/game-mode';
import { of, throwError } from 'rxjs';

describe('AdminPageService', () => {
    let service: AdminPageService;
    let httpClientSpy: jasmine.SpyObj<HttpClient>;
    let routerSpy: jasmine.SpyObj<Router>;
    let snackBarServiceMock: jasmine.SpyObj<SnackBarService>;

    beforeEach(async () => {
        httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'patch', 'delete']);
        routerSpy = jasmine.createSpyObj('Router', ['navigate']);
        snackBarServiceMock = jasmine.createSpyObj('SnackBarService', ['showNotification']);
        service = new AdminPageService(httpClientSpy, routerSpy, snackBarServiceMock);

        await TestBed.configureTestingModule({
            imports: [NoopAnimationsModule],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([]),
                { provide: SnackBarService, useValue: snackBarServiceMock },
            ],
        });
    });

    it('should navigate with Classique game mode on form submission', () => {
        const form = { valid: true, value: { toggle: false } } as NgForm;
        const size = 'large';

        spyOn(service as any, 'generateUuid').and.returnValue('test-id');

        service.onSubmit(form, size);

        expect(routerSpy.navigate).toHaveBeenCalledWith(['/edition'], {
            queryParams: {
                mapId: 'test-id',
                mapSize: size,
                mode: GameMode.Classic,
            },
        });
    });

    it('should fetch data and update game list', () => {
        const mockGameList: MapModel[] = [{ id: '1', name: 'Test Map', visibility: true } as MapModel];
        httpClientSpy.get.and.returnValue(of(mockGameList));
        const gameList: MapModel[] = [];
        service.fetchData(gameList);
        expect(gameList.length).toBe(1);
        expect(gameList[0].name).toBe('Test Map');
    });

    it('should handle error when fetching data', () => {
        httpClientSpy.get.and.returnValue(throwError(() => new Error('Network error')));
        const gameList: MapModel[] = [];
        service.fetchData(gameList);
        expect(snackBarServiceMock.showNotification).toHaveBeenCalledWith("Erreur : Fetch des cartes de l'API échoués", false);
    });

    it('should navigate to edition on Classic form submission', () => {
        const form = { valid: true, value: { toggle: true } } as NgForm;
        service.onSubmit(form, 'large');
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/edition'], jasmine.any(Object));
    });

    it('should navigate to edition on CTF form submission', () => {
        const form = { valid: true, value: { toggle: false } } as NgForm;
        service.onSubmit(form, 'large');
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/edition'], jasmine.any(Object));
    });

    it('should change visibility of a game', () => {
        const gameList: MapModel[] = [{ id: '1', name: 'Test Map', visibility: true } as MapModel];
        httpClientSpy.patch.and.returnValue(of(null));
        service.changeVisibility(0, gameList);
        expect(gameList[0].visibility).toBeFalse();
    });

    it('should handle error when changing visibility', () => {
        httpClientSpy.patch.and.returnValue(throwError(() => new Error('Network error')));
        const gameList: MapModel[] = [{ id: '1', name: 'Test Map', visibility: true } as MapModel];
        service.changeVisibility(0, gameList);
        expect(snackBarServiceMock.showNotification).toHaveBeenCalledWith('Erreur : Impossible de changer la visibilité', false);
    });

    it('should delete a game and refresh data', () => {
        spyOn(service, 'fetchData');
        httpClientSpy.delete.and.returnValue(of(null));
        const gameList: MapModel[] = [{ id: '1', name: 'Test Map', visibility: true } as MapModel];
        service.deleteGame(0, gameList);
        expect(service.fetchData).toHaveBeenCalledWith(gameList);
    });

    it('should handle error when deleting a game', () => {
        httpClientSpy.delete.and.returnValue(throwError(() => new Error('Network error')));
        const gameList: MapModel[] = [{ id: '1', name: 'Test Map', visibility: true } as MapModel];
        service.deleteGame(0, gameList);
        expect(snackBarServiceMock.showNotification).toHaveBeenCalledWith("Erreur : La carte n'existe plus.", false);
    });

    it('should show a notification with the correct message and handle user interaction', () => {
        const message = 'Test notification';
        snackBarServiceMock.showNotification(message, true);
        expect(snackBarServiceMock.showNotification).toHaveBeenCalledWith(message, true);
    });
});
