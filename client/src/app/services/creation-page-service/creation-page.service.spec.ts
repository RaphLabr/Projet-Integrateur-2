import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { CreationPageService } from '@app/services/creation-page-service/creation-page.service';
import { of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

describe('CreationPageService', () => {
    let service: CreationPageService;
    let httpClientSpy: jasmine.SpyObj<HttpClient>;
    const url = environment.serverUrl;

    beforeEach(() => {
        httpClientSpy = jasmine.createSpyObj('HttpClient', ['get']);
        TestBed.configureTestingModule({
            providers: [CreationPageService, { provide: HttpClient, useValue: httpClientSpy }],
        });
        service = TestBed.inject(CreationPageService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should call the correct API endpoint', () => {
        httpClientSpy.get.and.returnValue(of([]));
        service.fetchData().subscribe();
        expect(httpClientSpy.get).toHaveBeenCalledWith(url + '/api/map');
    });

    it('should return filtered data with visibility true', (done) => {
        const mockData = [
            { id: 1, visibility: true },
            { id: 2, visibility: false },
            { id: 3, visibility: true },
        ];
        httpClientSpy.get.and.returnValue(of(mockData));
        service.fetchData().subscribe((result) => {
            expect(result.length).toBe(2);
            expect(result.every((item) => item.visibility)).toBeTrue();
            done();
        });
    });

    it('should return empty array when no items are visible', (done) => {
        const mockData = [
            { id: 1, visibility: false },
            { id: 2, visibility: false },
        ];
        httpClientSpy.get.and.returnValue(of(mockData));
        service.fetchData().subscribe((result) => {
            expect(result).toEqual([]);
            done();
        });
    });

    it('should handle errors by returning empty observable', (done) => {
        httpClientSpy.get.and.returnValue(throwError(() => new Error('error')));
        service.fetchData().subscribe({
            next: () => fail('should not emit data'),
            error: () => fail('should not emit error'),
            complete: () => {
                expect(true).toBeTrue();
                done();
            },
        });
    });
});
