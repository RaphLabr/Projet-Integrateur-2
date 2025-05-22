// needed to access a private method in joining-page.service
/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { FIVE_SECONDS } from '@app/constants/map-edition-constants';
import { JoiningPageService } from '@app/services/joining-page-service/joining-page.service';
import { SnackBarService } from '@app/services/snack-bar-service/snack-bar.service';
import { of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

describe('JoiningPageService', () => {
    let service: JoiningPageService;
    let httpSpy: jasmine.SpyObj<HttpClient>;
    let routerSpy: jasmine.SpyObj<Router>;
    let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
    const url = environment.serverUrl;

    beforeEach(() => {
        spyOn(window, 'alert');
        httpSpy = jasmine.createSpyObj('HttpClient', ['post']);
        routerSpy = jasmine.createSpyObj('Router', ['navigate']);

        const snackBarRefSpy = jasmine.createSpyObj('MatSnackBarRef', ['onAction', 'dismiss']);
        snackBarRefSpy.onAction.and.returnValue(of());

        snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
        snackBarSpy.open.and.returnValue(snackBarRefSpy);

        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule],
            providers: [
                JoiningPageService,
                { provide: HttpClient, useValue: httpSpy },
                { provide: Router, useValue: routerSpy },
                { provide: MatSnackBar, useValue: snackBarSpy },
            ],
        });

        service = TestBed.inject(JoiningPageService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('postLobbyId should call http.post with correct parameters', () => {
        service.lobbyId = '1234';
        httpSpy.post.and.returnValue(of('Room exists'));
        service.postLobbyId().subscribe((res) => {
            expect(res).toBe('Room exists');
        });
        expect(httpSpy.post).toHaveBeenCalledWith(url + '/api/game', { room: '1234' }, { responseType: 'text' as 'json' });
    });

    it('onSubmit should navigate to creation-character page when response is "Room exists"', () => {
        service.lobbyId = 'XYZ789';
        spyOn(service, 'postLobbyId').and.returnValue(of('Room exists'));
        service.onSubmit();
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/creation/creation-character/' + service.lobbyId], { state: { joining: true } });
    });

    it('onSubmit should alert "Invalid game code" when response is "Room does not exists"', () => {
        service.lobbyId = 'XYZ789';
        spyOn(service, 'postLobbyId').and.returnValue(of('Room does not exist'));
        service.onSubmit();
        expect(snackBarSpy.open).toHaveBeenCalledWith('Code de partie invalide', 'OK', { duration: FIVE_SECONDS, panelClass: 'snackbar' });
    });

    it('onSubmit should alert "Invalid game code" when response is "Room is Lock"', () => {
        service.lobbyId = 'XYZ789';
        spyOn(service, 'postLobbyId').and.returnValue(of('Room is locked'));
        service.onSubmit();
        expect(snackBarSpy.open).toHaveBeenCalledWith('La partie est vérouillée', 'OK', {
            duration: FIVE_SECONDS,
            panelClass: 'snackbar',
        });
    });

    it('onSubmit should alert error message on error', () => {
        service.lobbyId = 'XYZ789';

        spyOn(service, 'postLobbyId').and.returnValue(throwError('Test error'));
        const snackBarService = TestBed.inject(SnackBarService);
        const showNotificationSpy = spyOn(snackBarService, 'showNotification');

        service.onSubmit();

        expect(showNotificationSpy).toHaveBeenCalledWith('Erreur de récupération des données API' + 'Test error', true);
    });

    it('should dismiss the snackbar when the action is triggered', () => {
        const message = 'Test message';
        const snackBarRefSpy = jasmine.createSpyObj('MatSnackBarRef', ['onAction', 'dismiss']);
        snackBarRefSpy.onAction.and.returnValue(of(null));

        snackBarSpy.open.and.returnValue(snackBarRefSpy);

        const snackBarService = TestBed.inject(SnackBarService);
        snackBarService.showNotification(message, false);

        expect(snackBarSpy.open).toHaveBeenCalledWith(message, 'OK', { panelClass: 'snackbar' });
        expect(snackBarRefSpy.onAction).toHaveBeenCalled();
        expect(snackBarRefSpy.dismiss).toHaveBeenCalled();
    });
});
